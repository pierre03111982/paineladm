/**
 * API Route: Refinamento de Look (Edição Incremental)
 * POST /api/refine-tryon
 * 
 * Adiciona 1 ou 2 acessórios a uma composição já gerada, preservando a pessoa e roupa base
 */

import { NextRequest, NextResponse } from "next/server";
import { getGeminiFlashImageService } from "@/lib/ai-services/gemini-flash-image";
import { logAPICost } from "@/lib/ai-services/cost-logger";
import { getAdminDb } from "@/lib/firebaseAdmin";

const db = getAdminDb();

export const dynamic = 'force-dynamic';

// Prompt Mestre de Edição Incremental
const REFINEMENT_PROMPT = `INSTRUÇÃO CRÍTICA ABSOLUTA: EDIÇÃO INCREMENTAL DE ACESSÓRIOS.
META: Receber a IMAGEM_BASE (primeira imagem: contém a pessoa e o look completo) e adicionar de forma fotorrealista e natural o(s) PRODUTO(S)_NOVO(S) (imagens subsequentes).
🎯 PRIORIZAÇÃO ABSOLUTA E INEGOCIÁVEL (P0): ESTABILIDADE MÁXIMA.

A IMAGEM_BASE (pessoa, roupa, pose, caimento, cenário, iluminação) é o TEMPLATE FINAL INTOCÁVEL. A IA NÃO TEM PERMISSÃO para alterar a identidade da pessoa, nem a roupa, caimento, proporção de estampa ou fundo já presentes.

A única mudança permitida é a INTEGRAÇÃO FÍSICA E NATURAL do(s) PRODUTO(S)_NOVO(S) (Prioridade 1 - P1).

REGRAS:

PRESERVAR IDENTIDADE: A pessoa na IMAGEM_BASE deve ser 100% IDÊNTICA.

PRESERVAR LOOK: O vestuário, caimento e estampa na IMAGEM_BASE devem ser 100% IDÊNTICOS.

FIDELIDADE DO PRODUTO NOVO: O(s) produto(s) novo(s) deve(m) ser integrados com realismo fotorrealista, correta iluminação e sombras.

QUALIDADE: Fotografia profissional ultra-realista 8K.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      baseImageUrl,
      newProductUrls,
      lojistaId,
      customerId,
      compositionId,
    } = body;

    // Validações
    if (!baseImageUrl || typeof baseImageUrl !== 'string') {
      return NextResponse.json(
        { error: "baseImageUrl é obrigatório e deve ser uma string" },
        { status: 400 }
      );
    }

    if (!newProductUrls || !Array.isArray(newProductUrls)) {
      return NextResponse.json(
        { error: "newProductUrls é obrigatório e deve ser um array" },
        { status: 400 }
      );
    }

    if (newProductUrls.length === 0 || newProductUrls.length > 2) {
      return NextResponse.json(
        { error: "newProductUrls deve conter entre 1 e 2 URLs de produtos" },
        { status: 400 }
      );
    }

    // Validar que todas as URLs são válidas
    for (const url of newProductUrls) {
      if (typeof url !== 'string' || !url.startsWith('http')) {
        return NextResponse.json(
          { error: "Todas as URLs de produtos devem ser válidas e começar com 'http'" },
          { status: 400 }
        );
      }
    }

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    console.log("[RefineTryOn] Iniciando refinamento:", {
      lojistaId,
      customerId,
      compositionId,
      baseImageUrl: baseImageUrl.substring(0, 100) + "...",
      newProductUrlsCount: newProductUrls.length,
      newProductUrls: newProductUrls.map((url: string) => url.substring(0, 80) + "..."),
    });

    // Construir array de imagens: primeira é a base, seguintes são os produtos novos
    const imageUrls = [
      baseImageUrl, // IMAGEM_BASE (primeira imagem)
      ...newProductUrls, // IMAGENS_DE_PRODUTO_NOVO (seguintes)
    ];

    // Chamar Gemini Flash Image Service com o prompt de refinamento
    const geminiService = getGeminiFlashImageService();
    const geminiResult = await geminiService.generateImage({
      prompt: REFINEMENT_PROMPT,
      imageUrls: imageUrls,
    });

    if (!geminiResult.success || !geminiResult.data) {
      console.error("[RefineTryOn] Erro ao gerar imagem refinada:", geminiResult.error);
      return NextResponse.json(
        {
          error: "Erro ao gerar imagem refinada",
          details: geminiResult.error || "Erro desconhecido",
        },
        { status: 500 }
      );
    }

    const refinedImageUrl = geminiResult.data.imageUrl;
    const cost = geminiResult.cost || 0;

    // Calcular custo reduzido (50% do custo de uma geração completa)
    // O custo já vem do Gemini, então vamos usar metade dele para o refinamento
    const refinementCost = cost * 0.5;

    console.log("[RefineTryOn] Imagem refinada gerada com sucesso:", {
      refinedImageUrl: refinedImageUrl.substring(0, 100) + "...",
      cost: refinementCost,
      originalCost: cost,
    });

    // Log do custo
    if (compositionId) {
      await logAPICost({
        lojistaId,
        compositionId,
        provider: "gemini-flash-image",
        operation: "refinement",
        cost: refinementCost,
        currency: "USD",
      }).catch((error) => {
        console.error("[RefineTryOn] Erro ao registrar custo:", error);
      });
    }

    // Atualizar composição no Firestore se compositionId foi fornecido
    if (compositionId && lojistaId) {
      try {
        const composicaoRef = db
          .collection("lojas")
          .doc(lojistaId)
          .collection("composicoes")
          .doc(compositionId);

        const composicaoDoc = await composicaoRef.get();
        if (composicaoDoc.exists) {
          const composicaoData = composicaoDoc.data();
          const looks = composicaoData?.looks || [];

          // Adicionar novo look refinado
          const refinedLook = {
            id: `refined-${Date.now()}`,
            titulo: "Look Refinado",
            descricao: `Look refinado com ${newProductUrls.length} acessório(s) adicional(is)`,
            imagemUrl: refinedImageUrl,
            produtoNome: composicaoData?.primaryProductName || "Produto",
            produtoPreco: composicaoData?.primaryProductPrice || null,
            createdAt: new Date(),
            isRefined: true,
            refinementProducts: newProductUrls,
          };

          looks.push(refinedLook);

          await composicaoRef.update({
            looks,
            updatedAt: new Date(),
            refinementCount: (composicaoData?.refinementCount || 0) + 1,
            totalCost: (composicaoData?.totalCost || 0) + refinementCost,
          });

          console.log("[RefineTryOn] Composição atualizada no Firestore");
        }
      } catch (error) {
        console.error("[RefineTryOn] Erro ao atualizar composição no Firestore:", error);
        // Não falhar a requisição se o Firestore falhar
      }
    }

    return NextResponse.json({
      success: true,
      refinedImageUrl,
      cost: refinementCost,
      originalCost: cost,
      compositionId,
      newProductsCount: newProductUrls.length,
    });
  } catch (error) {
    console.error("[RefineTryOn] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao refinar look",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

