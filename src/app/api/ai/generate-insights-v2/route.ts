/**
 * API Route: Gerar Insights Profissionais V2 (Motor de Inteligência Real)
 * POST /api/ai/generate-insights-v2
 * 
 * Usa o novo motor de inteligência com agregação de dados reais e Gemini 2.5 Flash
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { createInsight } from "@/lib/firestore/insights";
import { generateStoreInsights } from "@/lib/ai-services/insights-generator";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lojistaId: lojistaIdFromBody } = body;

    const lojistaIdFromAuth = lojistaIdFromBody ? null : await getCurrentLojistaId();
    const lojistaId = lojistaIdFromBody || lojistaIdFromAuth;

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    console.log("[GenerateInsightsV2] 🧠 Gerando insights para lojista:", lojistaId);

    // Gerar insights usando o motor de inteligência
    const insights = await generateStoreInsights(lojistaId);

    console.log("[GenerateInsightsV2] 📊 Insights gerados:", insights.length);

    // Salvar insights no Firestore
    const createdInsights = [];
    for (const insight of insights) {
      try {
        const insightId = await createInsight(lojistaId, insight);
        createdInsights.push({
          id: insightId,
          ...insight,
        });
        console.log("[GenerateInsightsV2] ✅ Insight criado:", {
          id: insightId,
          type: insight.type,
          title: insight.title.substring(0, 50),
        });
      } catch (error) {
        console.error("[GenerateInsightsV2] ❌ Erro ao criar insight:", error);
      }
    }

    return NextResponse.json({
      success: true,
      insightsCreated: createdInsights.length,
      insights: createdInsights,
      message: createdInsights.length > 0 
        ? `${createdInsights.length} insight(s) estratégico(s) gerado(s)!`
        : "Nenhum insight foi gerado.",
    });
  } catch (error) {
    console.error("[API/AI/GenerateInsightsV2] Erro:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}


