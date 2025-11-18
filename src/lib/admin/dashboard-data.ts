/**
 * Funções para buscar dados do Dashboard Administrativo
 */

import { getAdminDb } from "../firebaseAdmin";
import { getAPIUsageStats } from "../ai-services/cost-logger";

const db = getAdminDb();

export interface AdminDashboardData {
  // KPIs de Custo
  totalVTONCost: number; // Total de custos de Try-On
  totalImagenCost: number; // Total de custos de Imagen 3
  totalAPICost: number; // Custo total de API
  costTrend: Array<{ day: string; total: number; average: number }>;

  // KPIs de Receita
  totalLojistas: number;
  lojistasByPlan: {
    pro: number;
    lite: number;
    free: number;
  };
  mrr: number; // Monthly Recurring Revenue
  revenueTrend: Array<{ day: string; total: number }>;

  // Widgets
  topLojistasByUsage: Array<{
    id: string;
    nome: string;
    totalCost: number;
    totalComposicoes: number;
  }>;
  lojistasPendentesPagamento: Array<{
    id: string;
    nome: string;
    statusPagamento: string;
    dataVencimento: Date | null;
  }>;
  novosCadastros: Array<{
    id: string;
    nome: string;
    email: string;
    createdAt: Date;
    status: string;
  }>;
}

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * Busca todos os lojistas
 */
async function fetchAllLojistas() {
  try {
    const snapshot = await db.collection("lojas").get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        nome: data.nome || "",
        email: data.email || "",
        planoAtual: data.planoAtual || "free",
        statusPagamento: data.statusPagamento || "pendente",
        dataVencimento: data.dataVencimento || null,
        createdAt: data.createdAt || null,
        status: data.status || "pendente",
        ...data,
      };
    });
  } catch (error) {
    console.error("[AdminDashboard] Erro ao buscar lojistas:", error);
    return [];
  }
}

/**
 * Calcula tendência de custos
 */
function buildCostTrend(lojistas: any[], days: number = 7) {
  const costMap = new Map<string, number>();
  const countMap = new Map<string, number>();

  const today = new Date();
  const trend = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const key = day.toISOString().slice(0, 10);
    const label = DAY_LABELS[day.getDay()];

    // Buscar custos do dia (simplificado - na prática, buscaria dos logs)
    costMap.set(key, 0);
    countMap.set(key, 0);

    trend.push({
      day: label,
      total: costMap.get(key) || 0,
      average: countMap.get(key) && countMap.get(key)! > 0
        ? (costMap.get(key) || 0) / countMap.get(key)!
        : 0,
    });
  }

  return trend;
}

/**
 * Calcula tendência de receita
 */
function buildRevenueTrend(lojistas: any[], days: number = 7) {
  const revenueMap = new Map<string, number>();

  const today = new Date();
  const trend = [];

  // Valores de planos (exemplo)
  const planPrices: Record<string, number> = {
    pro: 299.0,
    lite: 99.0,
    free: 0,
  };

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const key = day.toISOString().slice(0, 10);
    const label = DAY_LABELS[day.getDay()];

    // Calcular receita do dia (simplificado)
    let dayRevenue = 0;
    lojistas.forEach((lojista) => {
      const plano = lojista.planoAtual || "free";
      const price = planPrices[plano] || 0;
      // Se o lojista foi criado antes ou no dia, conta a receita
      const createdAt = lojista.createdAt?.toDate?.() || new Date(lojista.createdAt);
      if (createdAt <= day) {
        dayRevenue += price;
      }
    });

    revenueMap.set(key, dayRevenue);
    trend.push({
      day: label,
      total: dayRevenue,
    });
  }

  return trend;
}

/**
 * Busca dados do dashboard administrativo
 */
export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  try {
    const lojistas = await fetchAllLojistas();

    // Calcular KPIs de Receita
    const totalLojistas = lojistas.length;
    const lojistasByPlan = {
      pro: lojistas.filter((l) => l.planoAtual === "pro").length,
      lite: lojistas.filter((l) => l.planoAtual === "lite").length,
      free: lojistas.filter((l) => l.planoAtual === "free" || !l.planoAtual).length,
    };

    // Calcular MRR (Monthly Recurring Revenue)
    const planPrices: Record<string, number> = {
      pro: 299.0,
      lite: 99.0,
      free: 0,
    };
    const mrr = lojistas.reduce((total, lojista) => {
      const plano = lojista.planoAtual || "free";
      const price = planPrices[plano] || 0;
      return total + price;
    }, 0);

    // Calcular custos totais de API
    let totalVTONCost = 0;
    let totalImagenCost = 0;
    let totalStabilityCost = 0;
    let totalGeminiCost = 0;
    let totalAPICost = 0;
    let totalRequests = 0;

    // Buscar custos de cada lojista
    for (const lojista of lojistas) {
      try {
        const stats = await getAPIUsageStats(lojista.id);
        totalAPICost += stats.totalCost;
        totalRequests += stats.totalRequests;
        
        // Separar por provider
        totalVTONCost += stats.byProvider["vertex-tryon"]?.cost || 0;
        totalImagenCost += stats.byProvider.imagen?.cost || 0;
        totalStabilityCost += stats.byProvider["stability-ai"]?.cost || 0;
        totalGeminiCost += stats.byProvider["gemini-flash-image"]?.cost || 0;
      } catch (error) {
        console.error(`[AdminDashboard] Erro ao buscar custos do lojista ${lojista.id}:`, error);
      }
    }

    // Top lojistas por uso
    const lojistasWithUsage = await Promise.all(
      lojistas.map(async (lojista) => {
        try {
          const stats = await getAPIUsageStats(lojista.id);
          
          // Buscar total de composições
          const composicoesSnapshot = await db
            .collection("lojas")
            .doc(lojista.id)
            .collection("composicoes")
            .get();
          
          return {
            id: lojista.id,
            nome: lojista.nome || "Loja sem nome",
            totalCost: stats.totalCost,
            totalComposicoes: composicoesSnapshot.size,
          };
        } catch (error) {
          return {
            id: lojista.id,
            nome: lojista.nome || "Loja sem nome",
            totalCost: 0,
            totalComposicoes: 0,
          };
        }
      })
    );

    const topLojistasByUsage = lojistasWithUsage
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);

    // Lojistas pendentes de pagamento
    const lojistasPendentesPagamento = lojistas
      .filter((l) => l.statusPagamento === "pendente" || l.statusPagamento === "atrasado")
      .map((l) => ({
        id: l.id,
        nome: l.nome || "Loja sem nome",
        statusPagamento: l.statusPagamento || "pendente",
        dataVencimento: l.dataVencimento?.toDate?.() || null,
      }))
      .slice(0, 10);

    // Novos cadastros (últimos 7 dias)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const novosCadastros = lojistas
      .filter((l) => {
        const createdAt = l.createdAt?.toDate?.() || new Date(l.createdAt);
        return createdAt >= sevenDaysAgo;
      })
      .map((l) => ({
        id: l.id,
        nome: l.nome || "Loja sem nome",
        email: l.email || "",
        createdAt: l.createdAt?.toDate?.() || new Date(),
        status: l.status || "pendente",
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    // Tendências
    const costTrend = buildCostTrend(lojistas, 7);
    const revenueTrend = buildRevenueTrend(lojistas, 7);

    return {
      totalVTONCost,
      totalImagenCost,
      totalAPICost,
      costTrend,
      totalLojistas,
      lojistasByPlan,
      mrr,
      revenueTrend,
      topLojistasByUsage,
      lojistasPendentesPagamento,
      novosCadastros,
    };
  } catch (error) {
    console.error("[AdminDashboard] Erro ao buscar dados:", error);
    // Retornar dados vazios em caso de erro
    return {
      totalVTONCost: 0,
      totalImagenCost: 0,
      totalAPICost: 0,
      costTrend: [],
      totalLojistas: 0,
      lojistasByPlan: { pro: 0, lite: 0, free: 0 },
      mrr: 0,
      revenueTrend: [],
      topLojistasByUsage: [],
      lojistasPendentesPagamento: [],
      novosCadastros: [],
    };
  }
}



