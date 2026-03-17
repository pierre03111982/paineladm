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
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");

    // Prioridade: query string (modo admin) > usuário logado > env var
    const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
    const lojistaId =
      lojistaIdFromQuery ||
      lojistaIdFromAuth ||
      process.env.NEXT_PUBLIC_LOJISTA_ID ||
      process.env.LOJISTA_ID ||
      "";

    if (!lojistaId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    // Definir limite de estoque baixo
    const lowStockThreshold = 5;

    // Calcular todas as métricas em paralelo com tratamento de erro individual
    const [roiMetrics, funnel, lowStockAlerts] = await Promise.all([
      calculateROIMetrics(lojistaId).catch(err => {
        console.error("[dashboard-metrics] Erro ao calcular ROI:", err);
        return {
          totalCostUSD: 0,
          totalCostBRL: 0,
          totalTryOns: 0,
          costPerTryOn: 0,
          estimatedRevenue: 0,
          roi: 0,
          roiMultiplier: 0,
        };
      }),
      calculateConversionFunnel(lojistaId).catch(err => {
        console.error("[dashboard-metrics] Erro ao calcular Funil:", err);
        return {
          visitantes: 0,
          tryOns: 0,
          favoritos: 0,
          compartilhamentos: 0,
          compras: 0,
          conversionRates: {
            tryOnToFavorito: 0,
            favoritoToCompartilhamento: 0,
            compartilhamentoToCompra: 0,
            tryOnToCompra: 0,
          },
        };
      }),
      getLowStockAlerts(lojistaId, lowStockThreshold).catch(err => {
        console.error("[dashboard-metrics] Erro ao buscar alertas de estoque:", err);
        return [];
      }),
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

