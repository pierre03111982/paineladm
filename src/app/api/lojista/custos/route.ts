/**
 * API Route: Consulta de Custos de API
 * GET /api/lojista/custos
 * 
 * Retorna estatísticas e custos de uso das APIs de IA
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getTotalAPICost,
  getCostSummaryByProvider,
  getAPIUsageStats,
  checkCostLimit,
} from "@/lib/ai-services/cost-logger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lojistaId = searchParams.get("lojistaId");

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    // Parâmetros opcionais de data
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    // Busca dados
    const [totalUSD, totalBRL, summaryByProvider, usageStats] =
      await Promise.all([
        getTotalAPICost(lojistaId, "USD"),
        getTotalAPICost(lojistaId, "BRL"),
        getCostSummaryByProvider(lojistaId, startDate, endDate),
        getAPIUsageStats(lojistaId, startDate, endDate),
      ]);

    // Verifica limite (se configurado)
    const limitStr = searchParams.get("limit");
    let limitCheck = null;

    if (limitStr) {
      const limit = parseFloat(limitStr);
      limitCheck = await checkCostLimit(lojistaId, limit);
    }

    return NextResponse.json({
      success: true,
      lojistaId,
      period: {
        startDate: startDate?.toISOString() || null,
        endDate: endDate?.toISOString() || null,
      },
      totals: {
        USD: totalUSD,
        BRL: totalBRL,
      },
      byProvider: summaryByProvider,
      usage: usageStats,
      limitCheck,
    });
  } catch (error) {
    console.error("[API] Erro ao buscar custos:", error);

    return NextResponse.json(
      {
        error: "Erro ao buscar custos",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}



