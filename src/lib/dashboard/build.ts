import { dashboardMockData, DashboardMock } from "../mocks/dashboard";
import {
  fetchLojaPerfil,
  fetchProdutos,
  fetchClientes,
  fetchComposicoesRecentes,
  fetchLojaMetrics,
} from "../firestore/server";
import { getAdminDb } from "../firebaseAdmin";
import type { ProdutoDoc, ClienteDoc, ComposicaoDoc, LojaMetrics } from "../firestore/types";
import { getAPIUsageStats } from "../ai-services/cost-logger";
import type { AIProvider } from "../ai-services/types";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const PALETTES = [
  { from: "#312e81", via: "#6366f1", to: "#c4b5fd" },
  { from: "#0f172a", via: "#38bdf8", to: "#bae6fd" },
  { from: "#1f2937", via: "#f97316", to: "#fed7aa" },
  { from: "#1e1b4b", via: "#a855f7", to: "#f0abfc" },
  { from: "#0f172a", via: "#22d3ee", to: "#cffafe" },
  { from: "#172554", via: "#f472b6", to: "#fbcfe8" },
];

function getPalette(index: number) {
  return PALETTES[index % PALETTES.length];
}

function formatRelative(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `há ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
  const diffWeeks = Math.round(diffDays / 7);
  return `há ${diffWeeks} semana${diffWeeks > 1 ? "s" : ""}`;
}

function countCompositionsByDay(composicoes: ComposicaoDoc[]) {
  const map = new Map<string, number>();
  composicoes.forEach((item) => {
    const key = item.createdAt.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return map;
}

function buildTrend(composicoes: ComposicaoDoc[]) {
  const map = countCompositionsByDay(composicoes);
  const today = new Date();
  const trend = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const key = day.toISOString().slice(0, 10);
    const label = DAY_LABELS[day.getDay()];
    trend.push({
      day: label,
      total: map.get(key) ?? 0,
    });
  }
  return trend;
}

function buildCostTrend(composicoes: ComposicaoDoc[]) {
  const costMap = new Map<string, number>();
  const countMap = new Map<string, number>();

  composicoes.forEach((item) => {
    const key = item.createdAt.toISOString().slice(0, 10);
    const cost =
      typeof (item as any).totalCostBRL === "number"
        ? (item as any).totalCostBRL
        : typeof item.metrics?.totalCostBRL === "number"
        ? (item.metrics.totalCostBRL as number)
        : 0;
    costMap.set(key, (costMap.get(key) ?? 0) + cost);
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  });

  const today = new Date();
  const trend = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const key = day.toISOString().slice(0, 10);
    const label = DAY_LABELS[day.getDay()];
    trend.push({
      day: label,
      total: costMap.get(key) ?? 0,
      average:
        countMap.get(key) && countMap.get(key)! > 0
          ? (costMap.get(key) ?? 0) / (countMap.get(key) ?? 1)
          : 0,
    });
  }
  return trend;
}

async function fetchUsdToBrlRate(): Promise<number> {
  try {
    const response = await fetch(
      "https://economia.awesomeapi.com.br/json/last/USD-BRL",
      { cache: "no-store" }
    );
    if (!response.ok) {
      throw new Error(`Rate request failed: ${response.status}`);
    }
    const payload = await response.json();
    const rate = parseFloat(payload?.USDBRL?.ask ?? "0");
    return Number.isFinite(rate) && rate > 0 ? rate : 5;
  } catch (error) {
    console.warn("[dashboard] Falha ao buscar câmbio USD-BRL. Usando fallback 5.0", error);
    return 5;
  }
}

function providerLabel(provider: AIProvider) {
  switch (provider) {
    case "vertex-tryon":
      return "Try-On (Vertex)";
    case "imagen":
      return "Imagen 3.0";
    case "nano-banana":
      return "Nano Banana (legado)";
    default:
      return provider;
  }
}

function countInRange(composicoes: ComposicaoDoc[], days: number) {
  const now = Date.now();
  const upperMs = days * 24 * 60 * 60 * 1000;
  return composicoes.filter(
    (item) => now - item.createdAt.getTime() <= upperMs
  ).length;
}

function buildProductBreakdown(
  composicoes: ComposicaoDoc[],
  produtos: ProdutoDoc[]
) {
  const counts = new Map<string, number>();
  composicoes.forEach((item) => {
    if (Array.isArray(item.products)) {
      item.products.forEach((product) => {
        const key = product.nome || product.id || "Produto";
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    }
  });

  if (counts.size === 0 && produtos.length > 0) {
    produtos.slice(0, 5).forEach((produto) => {
      counts.set(produto.nome, 1);
    });
  }

  const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0) || 1;
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value], index) => ({
      name,
      value: Math.round((value / total) * 100),
      color: getPalette(index).to,
    }));
}

function buildActiveCustomers(clientes: ClienteDoc[]) {
  return clientes.slice(0, 4).map((cliente) => {
    const initials = cliente.nome
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const lastActivity =
      cliente.updatedAt instanceof Date
        ? formatRelative(cliente.updatedAt)
        : `${cliente.totalComposicoes} comp.`;

    return {
      id: cliente.id,
      name: cliente.nome,
      avatarInitials: initials || "C",
      totalCompositions: cliente.totalComposicoes,
      lastActivity,
    };
  });
}

function resolveProductKey(product: ComposicaoDoc["products"][number] | undefined) {
  if (!product) return null;
  if (typeof product.id === "string" && product.id.length > 0) return product.id;
  if (product.nome) return `nome:${product.nome}`;
  return null;
}

function resolveCustomerKey(customer: ComposicaoDoc["customer"]) {
  if (!customer) return null;
  if (typeof customer.id === "string" && customer.id.length > 0) return customer.id;
  if (customer.nome) return `cliente:${customer.nome}`;
  return null;
}

function buildCompositions(composicoes: ComposicaoDoc[]) {
  return composicoes.slice(0, 6).map((item, index) => ({
    id: item.id,
    productName: item.products?.[0]?.nome || "Produto selecionado",
    productKey: resolveProductKey(item.products?.[0]),
    customerName: item.customer?.nome || "Cliente",
    customerKey: resolveCustomerKey(item.customer),
    createdAt: formatRelative(item.createdAt),
    liked: Boolean(item.liked),
    isAnonymous: Boolean(item.isAnonymous),
    shareCount: typeof item.shares === "number" ? item.shares : 0,
    palette: getPalette(index),
    totalCostBRL: item.totalCostBRL ?? item.metrics?.totalCostBRL ?? null,
    processingTime: item.processingTime ?? null,
  }));
}

function formatActionLabel(
  metrics?: LojaMetrics | null,
  fallbackDate?: Date | null
) {
  if (!metrics?.lastAction || !metrics.lastAction.createdAt) {
    if (metrics?.atualizadoEm) {
      return `Atualizado em ${metrics.atualizadoEm.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }
    if (fallbackDate instanceof Date) {
      return `Sincronizado ${formatRelative(fallbackDate)}`;
    }
    return "Sincronizado";
  }

  const actionMap: Record<string, string> = {
    like: "Curtida registrada",
    share: "Compartilhamento em andamento",
    checkout: "Checkout iniciado",
  };
  const label =
    actionMap[String(metrics.lastAction.action).toLowerCase()] || "Última ação";
  const time = metrics.lastAction.createdAt?.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const customer = metrics.lastAction.customerName
    ? ` por ${metrics.lastAction.customerName}`
    : "";
  return `${label}${customer} · ${time ?? "agora"}`;
}

export async function getDashboardData(
  lojistaId: string
): Promise<DashboardMock> {
  try {
    console.log("[getDashboardData] Buscando dados para lojistaId:", lojistaId);
    
    if (!lojistaId) {
      console.warn("[getDashboardData] lojistaId vazio, retornando dados mockados");
      return dashboardMockData;
    }

    const [perfil, produtos, clientes, composicoes, metrics] = await Promise.all([
      fetchLojaPerfil(lojistaId),
      fetchProdutos(lojistaId),
      fetchClientes(lojistaId, 1000), // Buscar mais clientes para calcular novos do dia
      fetchComposicoesRecentes(lojistaId, 50),
      fetchLojaMetrics(lojistaId),
    ]);

    console.log("[getDashboardData] Perfil encontrado:", perfil?.nome || "null");
    console.log("[getDashboardData] Produtos:", produtos.length);
    console.log("[getDashboardData] Composições:", composicoes.length);

    // Se não houver perfil, produtos e composições, mas o lojistaId foi fornecido,
    // ainda retornar dados vazios em vez de mockados para que o LojistaLayoutUpdater possa atualizar
    if (!perfil && produtos.length === 0 && composicoes.length === 0) {
      console.warn("[getDashboardData] Nenhum dado encontrado, mas lojistaId fornecido. Retornando dados vazios.");
      // Retornar estrutura vazia em vez de mockados para permitir atualização via LojistaLayoutUpdater
      return {
        ...dashboardMockData,
        brand: {
          name: "Carregando...",
          logoUrl: null,
          tagline: "",
          lastSync: "Aguardando dados",
        },
      };
    }

    const experimentsTrend = buildTrend(composicoes);
    const costTrend = buildCostTrend(composicoes);
    const experimentToday = countInRange(composicoes, 1);
    const experimentWeek = countInRange(composicoes, 7);
    const experimentMonth = countInRange(composicoes, 30);

    const computedLiked = composicoes.filter((item) => Boolean(item.liked)).length;
    // Compartilhamentos válidos: contar apenas clientes que se cadastraram através de links de compartilhamento
    const computedShares = clientes.filter((cliente) => cliente.referidoPor).length;
    const computedAnonymous = composicoes.filter((item) => Boolean(item.isAnonymous)).length;
    
    // Calcular métricas do dia
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    // Novos clientes do dia
    const novosClientesDia = clientes.filter((cliente) => {
      const createdAt = cliente.createdAt instanceof Date ? cliente.createdAt : new Date(cliente.createdAt);
      return createdAt >= today && createdAt <= todayEnd;
    }).length;
    const totalClientes = clientes.length;
    
    // Buscar todos os favoritos para calcular likes e dislikes
    const allFavoritos: any[] = [];
    try {
      const db = getAdminDb();
      const clientesIds = new Set(clientes.map(c => c.id));
      for (const clienteId of clientesIds) {
        try {
          const favoritosRef = db
            .collection("lojas")
            .doc(lojistaId)
            .collection("clientes")
            .doc(clienteId)
            .collection("favoritos");
          const favoritosSnapshot = await favoritosRef.get();
          favoritosSnapshot.forEach((doc) => {
            const data = doc.data();
            allFavoritos.push({
              action: data?.action || data?.tipo || data?.votedType || "like",
              createdAt: data?.createdAt?.toDate?.() || new Date(data?.createdAt || 0),
            });
          });
        } catch (error) {
          // Ignorar erros de clientes sem favoritos
        }
      }
    } catch (error) {
      console.warn("[getDashboardData] Erro ao buscar favoritos:", error);
    }
    
    // Calcular likes e dislikes por período
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);
    const monthStart = new Date(today);
    monthStart.setDate(today.getDate() - 30);
    
    const likesDia = allFavoritos.filter((fav) => {
      const isLike = fav.action === "like";
      if (!isLike) return false;
      return fav.createdAt >= today && fav.createdAt <= todayEnd;
    }).length;
    
    const likesSemana = allFavoritos.filter((fav) => {
      const isLike = fav.action === "like";
      if (!isLike) return false;
      return fav.createdAt >= weekStart;
    }).length;
    
    const likesMes = allFavoritos.filter((fav) => {
      const isLike = fav.action === "like";
      if (!isLike) return false;
      return fav.createdAt >= monthStart;
    }).length;
    
    const dislikesDia = allFavoritos.filter((fav) => {
      const isDislike = fav.action === "dislike";
      if (!isDislike) return false;
      return fav.createdAt >= today && fav.createdAt <= todayEnd;
    }).length;
    
    const dislikesSemana = allFavoritos.filter((fav) => {
      const isDislike = fav.action === "dislike";
      if (!isDislike) return false;
      return fav.createdAt >= weekStart;
    }).length;
    
    const dislikesMes = allFavoritos.filter((fav) => {
      const isDislike = fav.action === "dislike";
      if (!isDislike) return false;
      return fav.createdAt >= monthStart;
    }).length;
    
    const totalDislikes = allFavoritos.filter((fav) => fav.action === "dislike").length;
    
    // Compartilhamentos do dia: contar apenas clientes que se cadastraram hoje através de links
    const sharesDia = clientes.filter((cliente) => {
      if (!cliente.referidoPor) return false;
      const createdAt = cliente.createdAt instanceof Date ? cliente.createdAt : new Date(cliente.createdAt);
      return createdAt >= today && createdAt <= todayEnd;
    }).length;
    const totalCostBRL = composicoes.reduce((sum, item) => {
      const compositionCost =
        typeof (item as any).totalCostBRL === "number"
          ? (item as any).totalCostBRL
          : typeof item.metrics?.totalCostBRL === "number"
          ? (item.metrics.totalCostBRL as number)
          : 0;
      return sum + compositionCost;
    }, 0);
    const compositionsCount =
      composicoes.length > 0 ? composicoes.length : metrics?.totalComposicoes ?? 0;
    const averageCostBRL =
      compositionsCount > 0 ? totalCostBRL / compositionsCount : 0;

    const breakdown = buildProductBreakdown(composicoes, produtos);
    const activeCustomers = buildActiveCustomers(clientes);
    const compositionsCards = buildCompositions(composicoes);

    const totalLiked = metrics?.likedTotal ?? computedLiked;
    const totalShares = metrics?.sharesTotal ?? computedShares;
    const totalCheckouts = metrics?.checkoutTotal ?? 0;
    const totalAnonymous = metrics?.anonymousTotal ?? computedAnonymous;

    const lastCompositionDate =
      composicoes.length > 0 ? composicoes[0].createdAt ?? null : null;
    const lastSyncLabel = formatActionLabel(metrics, lastCompositionDate);

    const now = new Date();
    const currentPeriodStart = new Date(now);
    currentPeriodStart.setDate(now.getDate() - 7);
    const previousPeriodEnd = new Date(currentPeriodStart);
    const previousPeriodStart = new Date(currentPeriodStart);
    previousPeriodStart.setDate(currentPeriodStart.getDate() - 7);

    const [usdToBrl, currentUsage, previousUsage] = await Promise.all([
      fetchUsdToBrlRate(),
      getAPIUsageStats(lojistaId, currentPeriodStart, now),
      getAPIUsageStats(lojistaId, previousPeriodStart, previousPeriodEnd),
    ]);

    const providersSummary = Object.entries(currentUsage.byProvider).map(
      ([provider, info]) => ({
        provider,
        label: providerLabel(provider as AIProvider),
        costUSD: info.cost,
        costBRL: info.cost * usdToBrl,
        requests: info.requests,
      })
    );

    const operationsSummary = Object.entries(currentUsage.byOperation).map(
      ([operation, info]) => ({
        operation,
        costUSD: info.cost,
        costBRL: info.cost * usdToBrl,
        requests: info.requests,
      })
    );

    const currentCostBRL = currentUsage.totalCost * usdToBrl;
    const previousCostBRL = previousUsage.totalCost * usdToBrl;
    const deltaCostBRL = currentCostBRL - previousCostBRL;
    const deltaPercent =
      previousCostBRL > 0
        ? (deltaCostBRL / previousCostBRL) * 100
        : currentCostBRL > 0
        ? 100
        : 0;

    return {
      brand: {
        name: perfil?.nome || "Sua Loja",
        logoUrl: perfil?.logoUrl || null,
        tagline: perfil?.descricao || "Coleções digitais personalizadas em segundos.",
        lastSync: lastSyncLabel,
      },
      metrics: {
        experimentToday,
        experimentWeek,
        experimentMonth:
          metrics?.totalComposicoes && metrics.totalComposicoes > experimentMonth
            ? metrics.totalComposicoes
            : experimentMonth,
        likedTotal: totalLiked,
        sharesTotal: totalShares,
        checkoutTotal: totalCheckouts,
        anonymousTotal: totalAnonymous,
        totalCostBRL,
        averageCostBRL,
        conversionCheckoutRate:
          totalShares > 0 ? (totalCheckouts / totalShares) * 100 : 0,
        conversionLikeRate:
          totalLiked > 0 ? (totalCheckouts / totalLiked) * 100 : 0,
        lastActionLabel: lastSyncLabel,
        novosClientesDia,
        totalClientes,
        likesDia,
        sharesDia,
        planoLimite: null, // TODO: Buscar do perfil do lojista
        likesSemana,
        likesMes,
        dislikesDia,
        dislikesSemana,
        dislikesMes,
        totalDislikes,
      },
      experimentsTrend,
      costTrend,
      costSummary: {
        providers: providersSummary,
        operations: operationsSummary,
        period: {
          currentUSD: currentUsage.totalCost,
          currentBRL: currentCostBRL,
          previousUSD: previousUsage.totalCost,
          previousBRL: previousCostBRL,
          deltaUSD: currentUsage.totalCost - previousUsage.totalCost,
          deltaBRL: deltaCostBRL,
          deltaPercent,
          days: 7,
          usdToBrlRate: usdToBrl,
        },
      },
      productBreakdown: breakdown,
      activeCustomers,
      compositions: compositionsCards,
    };
  } catch (error) {
    console.error("[dashboard] Erro ao montar dados:", error);
    return dashboardMockData;
  }
}















