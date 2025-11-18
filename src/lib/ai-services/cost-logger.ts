/**
 * Sistema de logging e controle de custos de APIs
 */

import { getAdminDb } from "../firebaseAdmin";
import { APICostLog, AIProvider } from "./types";

const db = getAdminDb();

/**
 * Parâmetros para log de custo
 */
interface LogCostParams {
  lojistaId: string;
  compositionId?: string;
  provider: AIProvider;
  operation: "tryon" | "scene-generation" | "background-removal" | "creative-look" | "other";
  cost: number;
  currency: "USD" | "BRL";
  metadata?: Record<string, unknown>;
}

/**
 * Registra um custo de API no Firestore
 */
export async function logAPICost(params: LogCostParams): Promise<string> {
  try {
    const timestamp = new Date();

    const costLog = {
      lojistaId: params.lojistaId,
      compositionId: params.compositionId || null,
      provider: params.provider,
      operation: params.operation,
      cost: params.cost,
      currency: params.currency,
      timestamp: timestamp.toISOString(),
      metadata: params.metadata || {},
    };

    // Salva no Firestore em /lojas/{lojistaId}/custos_api/{id}
    const docRef = await db
      .collection("lojas")
      .doc(params.lojistaId)
      .collection("custos_api")
      .add(costLog);

    console.log("[CostLogger] Custo registrado", {
      id: docRef.id,
      lojistaId: params.lojistaId,
      provider: params.provider,
      cost: params.cost,
    });

    // Atualiza o total acumulado do lojista
    await updateTotalCost(params.lojistaId, params.cost, params.currency);

    return docRef.id;
  } catch (error) {
    console.error("[CostLogger] Erro ao registrar custo:", error);
    throw error;
  }
}

/**
 * Atualiza o custo total acumulado do lojista
 */
async function updateTotalCost(
  lojistaId: string,
  cost: number,
  currency: "USD" | "BRL"
): Promise<void> {
  try {
    const lojaRef = db.collection("lojas").doc(lojistaId);

    // Usa transaction para garantir atomicidade
    await db.runTransaction(async (transaction) => {
      const lojaDoc = await transaction.get(lojaRef);

      if (!lojaDoc.exists) {
        throw new Error(`Loja ${lojistaId} não encontrada`);
      }

      const currentData = lojaDoc.data();
      const currentTotal = currentData?.totalAPICosts?.[currency] || 0;

      transaction.update(lojaRef, {
        [`totalAPICosts.${currency}`]: currentTotal + cost,
        [`totalAPICosts.lastUpdated`]: new Date().toISOString(),
      });
    });
  } catch (error) {
    console.error("[CostLogger] Erro ao atualizar total de custos:", error);
    // Não propaga o erro para não bloquear o fluxo principal
  }
}

/**
 * Obtém custos de um lojista em um período
 */
export async function getLojistaAPICosts(
  lojistaId: string,
  startDate?: Date,
  endDate?: Date
): Promise<APICostLog[]> {
  try {
    let query = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("custos_api")
      .orderBy("timestamp", "desc");

    if (startDate) {
      query = query.where("timestamp", ">=", startDate);
    }

    if (endDate) {
      query = query.where("timestamp", "<=", endDate);
    }

    const snapshot = await query.get();

    const costs: APICostLog[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<APICostLog, "id">),
    }));

    return costs;
  } catch (error) {
    console.error("[CostLogger] Erro ao buscar custos:", error);
    return [];
  }
}

/**
 * Obtém resumo de custos por provider
 */
export async function getCostSummaryByProvider(
  lojistaId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Record<AIProvider, number>> {
  try {
    const costs = await getLojistaAPICosts(lojistaId, startDate, endDate);

    const summary: Record<AIProvider, number> = {
      "vertex-tryon": 0,
      imagen: 0,
      "nano-banana": 0,
      "stability-ai": 0,
      "gemini-flash-image": 0,
    };

    costs.forEach((cost) => {
      if (cost.currency === "USD") {
        summary[cost.provider] += cost.cost;
      } else if (cost.currency === "BRL") {
        // Converte BRL para USD (taxa fixa de 5.0 para simplificar)
        summary[cost.provider] += cost.cost / 5.0;
      }
    });

    // Remove providers que não fazem mais parte do stack ativo
    return summary;
  } catch (error) {
    console.error("[CostLogger] Erro ao gerar resumo:", error);
    return {
      "vertex-tryon": 0,
      imagen: 0,
      "nano-banana": 0,
      "stability-ai": 0,
      "gemini-flash-image": 0,
    };
  }
}

/**
 * Obtém o custo total de um lojista
 */
export async function getTotalAPICost(
  lojistaId: string,
  currency: "USD" | "BRL" = "USD"
): Promise<number> {
  try {
    const lojaDoc = await db.collection("lojas").doc(lojistaId).get();

    if (!lojaDoc.exists) {
      return 0;
    }

    const data = lojaDoc.data();
    return data?.totalAPICosts?.[currency] || 0;
  } catch (error) {
    console.error("[CostLogger] Erro ao buscar total de custos:", error);
    return 0;
  }
}

/**
 * Verifica se o lojista atingiu o limite de custos
 */
export async function checkCostLimit(
  lojistaId: string,
  limitUSD: number
): Promise<{
  exceeded: boolean;
  current: number;
  limit: number;
  percentage: number;
}> {
  try {
    const currentCost = await getTotalAPICost(lojistaId, "USD");
    const percentage = (currentCost / limitUSD) * 100;

    return {
      exceeded: currentCost >= limitUSD,
      current: currentCost,
      limit: limitUSD,
      percentage,
    };
  } catch (error) {
    console.error("[CostLogger] Erro ao verificar limite:", error);
    return {
      exceeded: false,
      current: 0,
      limit: limitUSD,
      percentage: 0,
    };
  }
}

/**
 * Obtém estatísticas de uso de APIs
 */
export async function getAPIUsageStats(
  lojistaId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalCost: number;
  totalRequests: number;
  byProvider: Record<AIProvider, { requests: number; cost: number }>;
  byOperation: Record<string, { requests: number; cost: number }>;
}> {
  try {
    const costs = await getLojistaAPICosts(lojistaId, startDate, endDate);

    const stats = {
      totalCost: 0,
      totalRequests: costs.length,
      byProvider: {
        "vertex-tryon": { requests: 0, cost: 0 },
        imagen: { requests: 0, cost: 0 },
        "nano-banana": { requests: 0, cost: 0 },
        "stability-ai": { requests: 0, cost: 0 },
        "gemini-flash-image": { requests: 0, cost: 0 },
      } as Record<AIProvider, { requests: number; cost: number }>,
      byOperation: {} as Record<string, { requests: number; cost: number }>,
    };

    costs.forEach((cost) => {
      const costUSD = cost.currency === "USD" ? cost.cost : cost.cost / 5.0;
      stats.totalCost += costUSD;

      // Por provider
      stats.byProvider[cost.provider].requests += 1;
      stats.byProvider[cost.provider].cost += costUSD;

      // Por operação
      if (!stats.byOperation[cost.operation]) {
        stats.byOperation[cost.operation] = { requests: 0, cost: 0 };
      }
      stats.byOperation[cost.operation].requests += 1;
      stats.byOperation[cost.operation].cost += costUSD;
    });

    return stats;
  } catch (error) {
    console.error("[CostLogger] Erro ao gerar estatísticas:", error);
    return {
      totalCost: 0,
      totalRequests: 0,
      byProvider: {
        "vertex-tryon": { requests: 0, cost: 0 },
        imagen: { requests: 0, cost: 0 },
        "nano-banana": { requests: 0, cost: 0 },
        "stability-ai": { requests: 0, cost: 0 },
        "gemini-flash-image": { requests: 0, cost: 0 },
      },
      byOperation: {},
    };
  }
}

/**
 * Obtém custos de todos os lojistas (para painel admin)
 */
export async function getAllLojistasCosts(
  startDate?: Date,
  endDate?: Date
): Promise<Array<{
  lojistaId: string;
  lojistaNome: string;
  totalCost: number;
  totalCostBRL: number;
  totalRequests: number;
  byProvider: Record<AIProvider, { requests: number; cost: number; costBRL: number }>;
  byOperation: Record<string, { requests: number; cost: number; costBRL: number }>;
}>> {
  try {
    const db = getAdminDb();
    const lojasSnapshot = await db.collection("lojas").get();
    
    const results = await Promise.all(
      lojasSnapshot.docs.map(async (lojaDoc) => {
        const lojistaId = lojaDoc.id;
        const lojaData = lojaDoc.data();
        const lojistaNome = lojaData?.nome || "Loja sem nome";
        
        try {
          const stats = await getAPIUsageStats(lojistaId, startDate, endDate);
          
          // Buscar taxa de câmbio (simplificado - usar 5.0 como fallback)
          const usdToBrl = 5.0;
          
          const byProvider: Record<AIProvider, { requests: number; cost: number; costBRL: number }> = {
            "vertex-tryon": {
              requests: stats.byProvider["vertex-tryon"]?.requests || 0,
              cost: stats.byProvider["vertex-tryon"]?.cost || 0,
              costBRL: (stats.byProvider["vertex-tryon"]?.cost || 0) * usdToBrl,
            },
            imagen: {
              requests: stats.byProvider.imagen?.requests || 0,
              cost: stats.byProvider.imagen?.cost || 0,
              costBRL: (stats.byProvider.imagen?.cost || 0) * usdToBrl,
            },
            "nano-banana": {
              requests: stats.byProvider["nano-banana"]?.requests || 0,
              cost: stats.byProvider["nano-banana"]?.cost || 0,
              costBRL: (stats.byProvider["nano-banana"]?.cost || 0) * usdToBrl,
            },
            "stability-ai": {
              requests: stats.byProvider["stability-ai"]?.requests || 0,
              cost: stats.byProvider["stability-ai"]?.cost || 0,
              costBRL: (stats.byProvider["stability-ai"]?.cost || 0) * usdToBrl,
            },
            "gemini-flash-image": {
              requests: stats.byProvider["gemini-flash-image"]?.requests || 0,
              cost: stats.byProvider["gemini-flash-image"]?.cost || 0,
              costBRL: (stats.byProvider["gemini-flash-image"]?.cost || 0) * usdToBrl,
            },
          };
          
          const byOperation: Record<string, { requests: number; cost: number; costBRL: number }> = {};
          Object.entries(stats.byOperation).forEach(([operation, info]) => {
            byOperation[operation] = {
              requests: info.requests,
              cost: info.cost,
              costBRL: info.cost * usdToBrl,
            };
          });
          
          return {
            lojistaId,
            lojistaNome,
            totalCost: stats.totalCost,
            totalCostBRL: stats.totalCost * usdToBrl,
            totalRequests: stats.totalRequests,
            byProvider,
            byOperation,
          };
        } catch (error) {
          console.error(`[getAllLojistasCosts] Erro ao buscar custos do lojista ${lojistaId}:`, error);
          return {
            lojistaId,
            lojistaNome,
            totalCost: 0,
            totalCostBRL: 0,
            totalRequests: 0,
            byProvider: {
              "vertex-tryon": { requests: 0, cost: 0, costBRL: 0 },
              imagen: { requests: 0, cost: 0, costBRL: 0 },
              "nano-banana": { requests: 0, cost: 0, costBRL: 0 },
              "stability-ai": { requests: 0, cost: 0, costBRL: 0 },
              "gemini-flash-image": { requests: 0, cost: 0, costBRL: 0 },
            },
            byOperation: {},
          };
        }
      })
    );
    
    return results;
  } catch (error) {
    console.error("[getAllLojistasCosts] Erro ao buscar custos:", error);
    return [];
  }
}

/**
 * Obtém resumo geral de custos (para painel admin)
 */
export async function getGlobalCostSummary(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalCost: number;
  totalCostBRL: number;
  totalRequests: number;
  totalLojistas: number;
  byProvider: Record<AIProvider, { requests: number; cost: number; costBRL: number }>;
  byOperation: Record<string, { requests: number; cost: number; costBRL: number }>;
}> {
  try {
    const allCosts = await getAllLojistasCosts(startDate, endDate);
    
    const summary = {
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
      } as Record<AIProvider, { requests: number; cost: number; costBRL: number }>,
      byOperation: {} as Record<string, { requests: number; cost: number; costBRL: number }>,
    };
    
    allCosts.forEach((lojistaCost) => {
      summary.totalCost += lojistaCost.totalCost;
      summary.totalCostBRL += lojistaCost.totalCostBRL;
      summary.totalRequests += lojistaCost.totalRequests;
      
      // Agregar por provider
      Object.entries(lojistaCost.byProvider).forEach(([provider, info]) => {
        summary.byProvider[provider as AIProvider].requests += info.requests;
        summary.byProvider[provider as AIProvider].cost += info.cost;
        summary.byProvider[provider as AIProvider].costBRL += info.costBRL;
      });
      
      // Agregar por operação
      Object.entries(lojistaCost.byOperation).forEach(([operation, info]) => {
        if (!summary.byOperation[operation]) {
          summary.byOperation[operation] = { requests: 0, cost: 0, costBRL: 0 };
        }
        summary.byOperation[operation].requests += info.requests;
        summary.byOperation[operation].cost += info.cost;
        summary.byOperation[operation].costBRL += info.costBRL;
      });
    });
    
    return summary;
  } catch (error) {
    console.error("[getGlobalCostSummary] Erro ao gerar resumo:", error);
    return {
      totalCost: 0,
      totalCostBRL: 0,
      totalRequests: 0,
      totalLojistas: 0,
      byProvider: {
        "vertex-tryon": { requests: 0, cost: 0, costBRL: 0 },
        imagen: { requests: 0, cost: 0, costBRL: 0 },
        "nano-banana": { requests: 0, cost: 0, costBRL: 0 },
        "stability-ai": { requests: 0, cost: 0, costBRL: 0 },
        "gemini-flash-image": { requests: 0, cost: 0, costBRL: 0 },
      },
      byOperation: {},
    };
  }
}






