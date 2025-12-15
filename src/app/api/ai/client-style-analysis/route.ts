/**
 * API Route: Análise de Estilo do Cliente (IA Consultiva)
 * GET /api/ai/client-style-analysis
 * 
 * Analisa o perfil comportamental do cliente usando IA
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getGeminiTextService } from "@/lib/ai-services/gemini-text";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clienteId = searchParams.get("clienteId");
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    
    const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
    const lojistaId = lojistaIdFromQuery || lojistaIdFromAuth;

    if (!lojistaId || !clienteId) {
      return NextResponse.json(
        { error: "lojistaId e clienteId são obrigatórios" },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // Buscar dados do cliente
    const clienteRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes")
      .doc(clienteId);
    
    const clienteDoc = await clienteRef.get();
    
    if (!clienteDoc.exists) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    const clienteData = clienteDoc.data();

    // Buscar ações (likes/dislikes) do cliente
    const actionsRef = db.collection("actions");
    const actionsSnapshot = await actionsRef
      .where("user_id", "==", clienteId)
      .where("lojista_id", "==", lojistaId)
      .orderBy("timestamp", "desc")
      .limit(50)
      .get();

    const actions = actionsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp, // Preservar timestamp do Firestore
      };
    }) as Array<{
      id: string;
      type?: string;
      timestamp?: any; // Firestore Timestamp ou Date
      [key: string]: any;
    }>;

    // Buscar produtos curtidos
    const likedProducts: any[] = [];
    const likedProductIds = new Set<string>();
    
    actions.forEach((action: any) => {
      if (action.type === "like" && action.product_id && !likedProductIds.has(action.product_id)) {
        likedProductIds.add(action.product_id);
        likedProducts.push({
          productId: action.product_id,
          timestamp: action.timestamp,
        });
      }
    });

    // Buscar dados dos produtos curtidos
    const productsData: any[] = [];
    for (const likedProduct of likedProducts.slice(0, 10)) {
      try {
        const productRef = db
          .collection("lojas")
          .doc(lojistaId)
          .collection("produtos")
          .doc(likedProduct.productId);
        
        const productDoc = await productRef.get();
        if (productDoc.exists) {
          productsData.push({
            id: productDoc.id,
            ...productDoc.data(),
          });
        }
      } catch (error) {
        console.warn(`[ClientStyleAnalysis] Erro ao buscar produto ${likedProduct.productId}:`, error);
      }
    }

    // Calcular dias sem acesso
    const lastAction = actions[0];
    let lastActionDate = new Date();
    if (lastAction?.timestamp) {
      // Firestore Timestamp tem método toDate()
      if (typeof lastAction.timestamp.toDate === "function") {
        lastActionDate = lastAction.timestamp.toDate();
      } else if (lastAction.timestamp instanceof Date) {
        lastActionDate = lastAction.timestamp;
      } else if (typeof lastAction.timestamp === "number") {
        lastActionDate = new Date(lastAction.timestamp);
      } else if (typeof lastAction.timestamp === "string") {
        lastActionDate = new Date(lastAction.timestamp);
      }
    }
    const now = new Date();
    const diffMs = now.getTime() - lastActionDate.getTime();
    const daysSinceLastAccess = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Calcular score de interesse
    const last30DaysActions = actions.filter((action: any) => {
      const actionDate = action.timestamp?.toDate?.() || new Date(action.timestamp);
      const diffMs = now.getTime() - actionDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays <= 30;
    }).length;

    const totalLikes = actions.filter((a: any) => a.type === "like").length;
    const totalComposicoes = clienteData?.composicoes?.length || 0;

    const interestScore = Math.min(
      100,
      (last30DaysActions * 2) + (totalLikes * 3) + (totalComposicoes * 2)
    );

    // Preparar contexto para a IA
    const contextData = {
      cliente: {
        nome: clienteData?.nome || "Cliente",
        totalLikes,
        totalDislikes: actions.filter((a: any) => a.type === "dislike").length,
        totalComposicoes,
        daysSinceLastAccess,
        last30DaysActions,
      },
      produtosCurtidos: productsData.map((p) => ({
        nome: p.nome,
        categoria: p.categoria,
        tags: p.tags || [],
      })),
      historicoTentativas: clienteData?.historicoTentativas || {},
    };

    // Prompt para análise de estilo
    const prompt = `Analise o perfil comportamental deste cliente de moda.

Baseado nos produtos que o cliente deu like, identifique:
1. ESTILO PREDOMINANTE: Defina o estilo em uma palavra (ex: "Romântico", "Urbano", "Casual", "Elegante", "Esportivo", "Feminino", "Masculino", "Minimalista", "Colorido", etc.)
2. DESCRIÇÃO DO ESTILO: Crie uma descrição textual de 2-3 frases que descreva o "moodboard verbal" do estilo do cliente (cores, texturas, silhuetas, atmosfera)
3. RISCO DE CHURN: Avalie o risco baseado em dias sem acesso (${daysSinceLastAccess} dias). Se > 30 dias = "high", se > 7 dias = "medium", senão = "low"
4. RECOMENDAÇÃO: Se possível, sugira uma categoria de produto que combine com o estilo identificado

IMPORTANTE: Retorne APENAS JSON válido no formato:
{
  "style": "Nome do estilo",
  "description": "Descrição textual do estilo",
  "interestScore": ${Math.round(interestScore)},
  "churnRisk": "low" | "medium" | "high",
  "daysSinceLastAccess": ${daysSinceLastAccess},
  "recommendedCategory": "categoria sugerida (opcional)"
}`;

    // Chamar Gemini para análise (com fallback)
    let insightResult: any = { success: false, data: null };
    try {
      const geminiService = getGeminiTextService();
      insightResult = await geminiService.generateInsight(prompt, contextData);
    } catch (aiError) {
      console.warn("[ClientStyleAnalysis] Erro na IA, usando análise básica:", aiError);
      // Fallback: análise básica sem IA
      insightResult = {
        success: true,
        data: {
          title: "Análise Manual",
          message: "Cliente com perfil de compras ativo. Continue acompanhando o comportamento para identificar padrões.",
          actionLink: null,
          relatedEntity: null,
        },
      };
    }

    // Buscar produto recomendado do estoque
    let recommendedProduct = null;
    if (insightResult.data.relatedEntity?.type === "product") {
      try {
        const productRef = db
          .collection("lojas")
          .doc(lojistaId)
          .collection("produtos")
          .doc(insightResult.data.relatedEntity.id);
        
        const productDoc = await productRef.get();
        if (productDoc.exists) {
          const productData = productDoc.data();
          recommendedProduct = {
            id: productDoc.id,
            name: productData?.nome || "Produto",
            category: productData?.categoria || "",
            imageUrl: productData?.imagemUrl || productData?.imagemUrlCatalogo,
            link: `/produtos/${productDoc.id}`,
          };
        }
      } catch (error) {
        console.warn("[ClientStyleAnalysis] Erro ao buscar produto recomendado:", error);
      }
    }

    // Se não tiver produto recomendado da IA, buscar um produto da categoria sugerida
    if (!recommendedProduct && insightResult.data.actionLink) {
      // Tentar buscar um produto aleatório da categoria sugerida
      try {
        const productsRef = db
          .collection("lojas")
          .doc(lojistaId)
          .collection("produtos");
        
        const productsSnapshot = await productsRef
          .where("categoria", "==", insightResult.data.actionLink)
          .limit(1)
          .get();

        if (!productsSnapshot.empty) {
          const productDoc = productsSnapshot.docs[0];
          const productData = productDoc.data();
          recommendedProduct = {
            id: productDoc.id,
            name: productData?.nome || "Produto",
            category: productData?.categoria || "",
            imageUrl: productData?.imagemUrl || productData?.imagemUrlCatalogo,
            link: `/produtos/${productDoc.id}`,
          };
        }
      } catch (error) {
        console.warn("[ClientStyleAnalysis] Erro ao buscar produto da categoria:", error);
      }
    }

    // Construir análise final
    const analysis = {
      style: insightResult.data.title || "Não identificado",
      description: insightResult.data.message || "Análise não disponível",
      interestScore: Math.round(interestScore),
      churnRisk: daysSinceLastAccess > 30 ? "high" : daysSinceLastAccess > 7 ? "medium" : "low",
      daysSinceLastAccess,
      recommendedProduct,
    };

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("[API/AI/ClientStyleAnalysis] Erro crítico:", error);
    
    // Retornar análise básica mesmo em caso de erro crítico
    const fallbackAnalysis = {
      style: "Em Análise",
      description: "Ainda coletando dados do comportamento do cliente para gerar insights personalizados.",
      interestScore: 50,
      churnRisk: "medium" as const,
      daysSinceLastAccess: 0,
      recommendedProduct: null,
    };
    
    return NextResponse.json({
      success: true,
      analysis: fallbackAnalysis,
      partial: true, // Indica que é análise parcial/fallback
    });
  }
}

