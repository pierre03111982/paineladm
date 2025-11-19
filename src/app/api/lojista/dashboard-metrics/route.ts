/**
 * API Route: Métricas do Dashboard
 * GET /api/lojista/dashboard-metrics
 * 
 * Retorna métricas avançadas para o dashboard:
 * - ROI e custo por Try-On
 * - Funil de conversão
 * - Alertas de estoque baixo
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import {
  calculateROIMetrics,
  calculateConversionFunnel,
  getLowStockAlerts,
} from "@/lib/firestore/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const lojistaId = await getCurrentLojistaId();
    if (!lojistaId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Buscar parâmetros opcionais
    const searchParams = request.nextUrl.searchParams;
    const lowStockThreshold = parseInt(searchParams.get("lowStockThreshold") || "10", 10);

    // Calcular todas as métricas em paralelo
    const [roiMetrics, funnel, lowStockAlerts] = await Promise.all([
      calculateROIMetrics(lojistaId),
      calculateConversionFunnel(lojistaId),
      getLowStockAlerts(lojistaId, lowStockThreshold),
    ]);

    return NextResponse.json({
      success: true,
      roi: roiMetrics,
      funnel,
      lowStockAlerts,
    });
  } catch (error) {
    console.error("[dashboard-metrics] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao calcular métricas",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

