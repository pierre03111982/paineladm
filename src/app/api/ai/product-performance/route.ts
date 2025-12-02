/**
 * API Route: Análise de Performance do Produto (IA Consultiva)
 * GET /api/ai/product-performance
 * 
 * Explica por que um produto não vende usando IA
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getGeminiTextService } from "@/lib/ai-services/gemini-text";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { calculateProductQualityMetrics } from "@/lib/firestore/product-quality";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("productId");
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    
    const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
    const lojistaId = lojistaIdFromQuery || lojistaIdFromAuth;

    if (!lojistaId || !productId) {
      return NextResponse.json(
        { error: "lojistaId e productId são obrigatórios" },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // Buscar dados do produto
    const productRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("produtos")
      .doc(productId);
    
    const productDoc = await productRef.get();
    
    if (!productDoc.exists) {
      return NextResponse.json(
        { error: "Produto não encontrado" },
        { status: 404 }
      );
    }

    const productData = productDoc.data();

    // Calcular métricas de qualidade
    const qualityMetrics = await calculateProductQualityMetrics(lojistaId, productId);
    
    // Buscar composições para obter totais (usar mesma lógica do product-quality.ts)
    const { fetchComposicoesRecentes } = await import("@/lib/firestore/server");
    const composicoes = await fetchComposicoesRecentes(lojistaId, 10000);
    const composicoesComProduto = composicoes.filter(
      (comp: any) => comp.products?.some((p: any) => p.id === productId)
    );
    
    // Adicionar totais ao qualityMetrics
    const qualityMetricsWithTotals = {
      ...qualityMetrics,
      totalComposicoes: composicoesComProduto.length,
      totalLikes: composicoesComProduto.filter((c: any) => c.liked).length,
      totalDislikes: composicoesComProduto.filter((c: any) => c.liked === false).length,
    };
    const complaintRate = qualityMetricsWithTotals.complaintRate;
    const conversionRate = qualityMetricsWithTotals.conversionRate;

    // Só analisar se houver problema
    if (complaintRate <= 20 && conversionRate >= 10) {
      return NextResponse.json({
        success: true,
        analysis: {
          hasIssue: false,
          issueType: null,
          diagnosis: "Produto com performance adequada",
          recommendation: "",
          priority: "low",
        },
      });
    }

    // Buscar ações (dislikes) do produto para entender os motivos
    const actionsRef = db.collection("actions");
    const actionsSnapshot = await actionsRef
      .where("product_id", "==", productId)
      .where("lojista_id", "==", lojistaId)
      .where("type", "==", "dislike")
      .limit(50)
      .get();

    const dislikes = actionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Contar motivos de dislike
    const dislikeReasons: Record<string, number> = {};
    dislikes.forEach((dislike: any) => {
      const reason = dislike.reason || "other";
      dislikeReasons[reason] = (dislikeReasons[reason] || 0) + 1;
    });

    // Identificar tipo de problema
    let issueType: "high_rejection" | "low_conversion" | "ai_distortion" | "fit_issue" | null = null;
    if (complaintRate > 20) {
      if (dislikeReasons.ai_distortion > (dislikeReasons.fit_issue || 0)) {
        issueType = "ai_distortion";
      } else if (dislikeReasons.fit_issue > 0) {
        issueType = "fit_issue";
      } else {
        issueType = "high_rejection";
      }
    } else if (conversionRate < 10) {
      issueType = "low_conversion";
    }

    // Preparar contexto para a IA
    const contextData = {
      produto: {
        nome: productData?.nome || "Produto",
        categoria: productData?.categoria || "",
        tags: productData?.tags || [],
      },
      metricas: {
        complaintRate: Math.round(complaintRate * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10,
        totalComposicoes: qualityMetricsWithTotals.totalComposicoes,
        totalLikes: qualityMetricsWithTotals.totalLikes,
        totalDislikes: qualityMetricsWithTotals.totalDislikes,
      },
      motivosRejeicao: dislikeReasons,
    };

    // Prompt para análise de performance
    const prompt = `Analise por que este produto de moda não está vendendo bem.

MÉTRICAS DO PRODUTO:
- Taxa de Rejeição: ${complaintRate.toFixed(1)}% (${complaintRate > 20 ? "ALTA - PROBLEMA" : "Normal"})
- Taxa de Conversão: ${conversionRate.toFixed(1)}% (${conversionRate < 10 ? "BAIXA - PROBLEMA" : "Normal"})
- Total de Composições: ${totalComposicoes || 0}
- Total de Likes: ${totalLikes || 0}
- Total de Dislikes: ${totalDislikes || 0}

MOTIVOS DE REJEIÇÃO:
${Object.entries(dislikeReasons)
  .map(([reason, count]) => `- ${reason}: ${count} vezes`)
  .join("\n")}

PRODUTO:
- Nome: ${productData?.nome || "N/A"}
- Categoria: ${productData?.categoria || "N/A"}

TAREFA:
1. IDENTIFICAR o problema principal:
   - Se complaintRate > 20% e muitos "ai_distortion": problema é distorção da IA no caimento virtual
   - Se complaintRate > 20% e muitos "fit_issue": problema é ajuste/tamanho
   - Se complaintRate > 20% e muitos "garment_style": problema é estilo não agradou
   - Se conversionRate < 10%: problema é baixa conversão (poucos likes)

2. CRIAR DIAGNÓSTICO: Explicar o problema de forma clara e técnica (2-3 frases)

3. CRIAR RECOMENDAÇÃO: Sugerir ação específica e acionável (ex: "Trocar a foto original por uma em manequim invisível", "Ajustar descrição do produto", "Revisar tags e categoria")

IMPORTANTE: Retorne APENAS JSON válido no formato:
{
  "hasIssue": true,
  "issueType": "high_rejection" | "low_conversion" | "ai_distortion" | "fit_issue" | null,
  "diagnosis": "Diagnóstico detalhado do problema",
  "recommendation": "Recomendação específica e acionável",
  "priority": "high" | "medium" | "low"
}`;

    // Chamar Gemini para análise
    const geminiService = getGeminiTextService();
    const insightResult = await geminiService.generateInsight(prompt, contextData);

    if (!insightResult.success || !insightResult.data) {
      throw new Error(insightResult.error || "Falha ao gerar análise");
    }

    // Construir análise final
    const analysis: {
      hasIssue: boolean;
      issueType: "high_rejection" | "low_conversion" | "ai_distortion" | "fit_issue" | null;
      diagnosis: string;
      recommendation: string;
      priority: "high" | "medium" | "low";
    } = {
      hasIssue: true,
      issueType: issueType,
      diagnosis: insightResult.data.message || "Análise não disponível",
      recommendation: insightResult.data.actionLabel || insightResult.data.title || "Recomendação não disponível",
      priority: insightResult.data.priority || (complaintRate > 30 ? "high" : complaintRate > 20 ? "medium" : "low"),
    };

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("[API/AI/ProductPerformance] Erro:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        analysis: null,
      },
      { status: 500 }
    );
  }
}

