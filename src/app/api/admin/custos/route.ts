import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { getAllLojistasCosts, getGlobalCostSummary } from "@/lib/ai-services/cost-logger";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verificar se o usuário é admin
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const lojistaId = searchParams.get("lojistaId");
    const provider = searchParams.get("provider");

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    // Buscar todos os custos
    let allCosts = await getAllLojistasCosts(startDate, endDate);

    // Filtrar por lojista se especificado
    if (lojistaId) {
      allCosts = allCosts.filter((cost) => cost.lojistaId === lojistaId);
    }

    // Filtrar por provider se especificado
    if (provider) {
      allCosts = allCosts.map((cost) => {
        const filteredProviders: Record<string, any> = {};
        filteredProviders[provider] = cost.byProvider[provider as keyof typeof cost.byProvider];
        
        return {
          ...cost,
          byProvider: filteredProviders as typeof cost.byProvider,
        };
      });
    }

    // Buscar resumo global (aplicar os mesmos filtros)
    let summary = await getGlobalCostSummary(startDate, endDate);
    
    // Se houver filtros, recalcular o resumo baseado nos custos filtrados
    if (lojistaId || provider) {
      const filteredSummary = {
        totalCost: 0,
        totalCostBRL: 0,
        totalRequests: 0,
        totalLojistas: allCosts.length,
        byProvider: {
          "vertex-tryon": { requests: 0, cost: 0, costBRL: 0 },
          imagen: { requests: 0, cost: 0, costBRL: 0 },
          "nano-banana": { requests: 0, cost: 0, costBRL: 0 },
          "stability-ai": { requests: 0, cost: 0, costBRL: 0 },
          "gemini-flash-image": { requests: 0, cost: 0, costBRL: 0 },
        } as typeof summary.byProvider,
        byOperation: {} as typeof summary.byOperation,
      };
      
      allCosts.forEach((lojistaCost) => {
        filteredSummary.totalCost += lojistaCost.totalCost;
        filteredSummary.totalCostBRL += lojistaCost.totalCostBRL;
        filteredSummary.totalRequests += lojistaCost.totalRequests;
        
        Object.entries(lojistaCost.byProvider).forEach(([prov, info]) => {
          if (info && typeof info === 'object' && 'cost' in info) {
            filteredSummary.byProvider[prov as keyof typeof filteredSummary.byProvider].requests += info.requests || 0;
            filteredSummary.byProvider[prov as keyof typeof filteredSummary.byProvider].cost += info.cost || 0;
            filteredSummary.byProvider[prov as keyof typeof filteredSummary.byProvider].costBRL += info.costBRL || 0;
          }
        });
        
        Object.entries(lojistaCost.byOperation).forEach(([operation, info]) => {
          if (!filteredSummary.byOperation[operation]) {
            filteredSummary.byOperation[operation] = { requests: 0, cost: 0, costBRL: 0 };
          }
          filteredSummary.byOperation[operation].requests += info.requests || 0;
          filteredSummary.byOperation[operation].cost += info.cost || 0;
          filteredSummary.byOperation[operation].costBRL += info.costBRL || 0;
        });
      });
      
      summary = filteredSummary;
    }

    return NextResponse.json({
      success: true,
      data: {
        lojistas: allCosts,
        summary,
      },
    });
  } catch (error: any) {
    console.error("[API Admin Custos] Erro:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao buscar custos",
      },
      { status: 500 }
    );
  }
}

