/**
 * API Route: Análise Diária da Loja (Geração de Insights)
 * POST /api/ai/analyze-daily
 * 
 * Gera insights proativos baseados nos dados da loja
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getGeminiTextService } from "@/lib/ai-services/gemini-text";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { createInsight } from "@/lib/firestore/insights";

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

    const db = getAdminDb();

    // Buscar dados da loja
    const lojaRef = db.collection("lojas").doc(lojistaId);
    const lojaDoc = await lojaRef.get();
    const lojaData = lojaDoc.exists ? lojaDoc.data() : null;

    // Contar produtos
    const produtosRef = lojaRef.collection("produtos");
    const produtosSnapshot = await produtosRef
      .where("arquivado", "!=", true)
      .get();
    const produtosCount = produtosSnapshot.size;

    // Buscar clientes ativos (últimas 72h)
    const actionsRef = db.collection("actions");
    const last72h = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const recentActionsSnapshot = await actionsRef
      .where("lojista_id", "==", lojistaId)
      .where("timestamp", ">", last72h)
      .limit(100)
      .get();

    const recentActions = recentActionsSnapshot.docs.map((doc) => doc.data());
    const hotLeads = new Set(recentActions.map((a: any) => a.user_id)).size;

    // Buscar produtos com baixa performance
    const produtos = produtosSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        nome: data.nome,
        categoria: data.categoria,
        qualityMetrics: data.qualityMetrics,
      };
    });

    const produtosComProblema = produtos.filter(
      (p: any) =>
        (p.qualityMetrics?.complaintRate || 0) > 20 ||
        (p.qualityMetrics?.conversionRate || 0) < 10
    );

    // Preparar contexto
    const contextData = {
      loja: {
        nome: lojaData?.nome || "Sua loja",
        produtosCount,
        hotLeads,
        produtosComProblema: produtosComProblema.length,
      },
      produtos: produtosComProblema.slice(0, 5).map((p: any) => ({
        nome: p.nome,
        categoria: p.categoria,
        complaintRate: p.qualityMetrics?.complaintRate || 0,
        conversionRate: p.qualityMetrics?.conversionRate || 0,
      })),
    };

    // Gerar insights usando Gemini
    const geminiService = getGeminiTextService();

    const insights: Array<{
      type: "opportunity" | "risk" | "trend" | "action";
      title: string;
      message: string;
      priority: "high" | "medium" | "low";
      actionLabel?: string;
      actionLink?: string;
    }> = [];

    // Insight 1: Hot Leads
    if (hotLeads > 0) {
      const prompt = `Analise esta oportunidade de venda:

- ${hotLeads} clientes ativos nas últimas 72 horas
- ${produtosCount} produtos cadastrados

Gere um insight do tipo "opportunity" sugerindo ações para converter esses leads em vendas.`;

      const result = await geminiService.generateInsight(prompt, contextData);
      if (result.success && result.data) {
        insights.push({
          type: result.data.type as any,
          title: result.data.title,
          message: result.data.message,
          priority: result.data.priority,
          actionLabel: result.data.actionLabel || "Ver Clientes",
          actionLink: result.data.actionLink || "/clientes",
        });
      }
    }

    // Insight 2: Produtos com Problema
    if (produtosComProblema.length > 0) {
      const prompt = `Analise este risco:

- ${produtosComProblema.length} produtos com baixa performance (alta rejeição ou baixa conversão)
- Produtos: ${produtosComProblema.map((p: any) => p.nome).join(", ")}

Gere um insight do tipo "risk" alertando sobre esses produtos e sugerindo ações.`;

      const result = await geminiService.generateInsight(prompt, contextData);
      if (result.success && result.data) {
        insights.push({
          type: result.data.type as any,
          title: result.data.title,
          message: result.data.message,
          priority: result.data.priority,
          actionLabel: result.data.actionLabel || "Ver Produtos",
          actionLink: result.data.actionLink || "/produtos",
        });
      }
    }

    // Salvar insights no Firestore
    const createdInsights = [];
    for (const insight of insights) {
      try {
        const insightId = await createInsight(lojistaId, {
          ...insight,
          expiresInDays: 7,
        });
        createdInsights.push(insightId);
      } catch (error) {
        console.error("[AnalyzeDaily] Erro ao criar insight:", error);
      }
    }

    return NextResponse.json({
      success: true,
      insightsCreated: createdInsights.length,
      insights,
    });
  } catch (error) {
    console.error("[API/AI/AnalyzeDaily] Erro:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}



