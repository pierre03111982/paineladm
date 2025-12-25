import {
  dashboardMockData,
  DashboardMock,
  OpportunityLead,
  ProductAlert,
} from "../mocks/dashboard";
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
    // Silenciar erro de fetch - é esperado quando a API externa não está disponível
    // O fallback de 5.0 é suficiente para o funcionamento do dashboard
    if (process.env.NODE_ENV === 'development') {
      console.warn("[dashboard] Falha ao buscar câmbio USD-BRL. Usando fallback 5.0");
    }
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

function buildActiveCustomers(clientes: ClienteDoc[], composicoes: ComposicaoDoc[]) {
  // Criar um mapa de cliente -> última composição (com imagem)
  const lastCompositionByCustomer = new Map<string, { imageUrl: string | null; createdAt: Date }>();
  
  console.log("[buildActiveCustomers] Processando composições:", composicoes.length);
  
  composicoes.forEach((comp) => {
    if (!comp.customer?.id) return;
    
    const customerId = comp.customer.id;
    const existing = lastCompositionByCustomer.get(customerId);
    
    // Buscar URL da imagem da composição (pode estar em vários campos)
    const imageUrl = 
      comp.imagemUrl || 
      (comp as any).imageUrl || 
      (comp as any).final_image_url ||
      (comp as any).looks?.[0]?.imagemUrl ||
      (comp as any).looks?.[0]?.imageUrl ||
      (comp as any).generation?.imagemUrl ||
      null;
    
    // Se não tem imagem, pular
    if (!imageUrl) {
      console.log("[buildActiveCustomers] Composição sem imagem para cliente:", customerId);
      return;
    }
    
    // Se não existe ou esta é mais recente, atualizar
    if (!existing || comp.createdAt.getTime() > existing.createdAt.getTime()) {
      lastCompositionByCustomer.set(customerId, {
        imageUrl,
        createdAt: comp.createdAt,
      });
      console.log("[buildActiveCustomers] ✅ Imagem encontrada para cliente:", customerId, imageUrl);
    }
  });

  console.log("[buildActiveCustomers] Mapa de imagens:", Array.from(lastCompositionByCustomer.entries()).map(([id, data]) => ({ id, imageUrl: data.imageUrl })));

  return clientes.slice(0, 5).map((cliente) => {
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

    // Buscar imagem da última composição deste cliente
    const lastComposition = lastCompositionByCustomer.get(cliente.id);

    const result = {
      id: cliente.id,
      name: cliente.nome,
      avatarInitials: initials || "C",
      totalCompositions: cliente.totalComposicoes,
      lastActivity,
      lastCompositionImageUrl: lastComposition?.imageUrl || null,
    };
    
    console.log("[buildActiveCustomers] Cliente processado:", {
      id: cliente.id,
      name: cliente.nome,
      hasImage: !!result.lastCompositionImageUrl,
      imageUrl: result.lastCompositionImageUrl,
    });

    return result;
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

function buildInitials(name: string | undefined | null) {
  if (!name) return "CL";
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function buildInsight(reason?: string | null, productName?: string | null) {
  if (!reason) {
    return productName ? `Interagindo com ${productName}` : "Cliente ativo agora";
  }

  const productLabel = productName ? ` em ${productName}` : "";
  switch (reason) {
    case "fit_issue":
      return `Sinalizou ajuste de tamanho${productLabel}`;
    case "garment_style":
      return `Buscando outro estilo${productLabel}`;
    case "ai_distortion":
      return "Solicitou nova geração (imagem estranha)";
    default:
      return `Registrou feedback${productLabel}`;
  }
}

function buildOpportunityRadar(composicoes: ComposicaoDoc[]): OpportunityLead[] {
  const cutoff = Date.now() - 72 * 60 * 60 * 1000; // 72 horas
  const map = new Map<
    string,
    { name: string; events: ComposicaoDoc[] }
  >();

  composicoes.forEach((item) => {
    if (!item.customer?.id) return;
    if (item.createdAt.getTime() < cutoff) return;

    const existing = map.get(item.customer.id) || {
      name: item.customer.nome || "Cliente",
      events: [],
    };
    existing.events.push(item);
    map.set(item.customer.id, existing);
  });

  const leads: OpportunityLead[] = [];
  map.forEach(({ name, events }, customerId) => {
    // Reduzido de 3 para 1 evento mínimo para aparecer no radar
    if (events.length < 1) return;
    events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const latest = events[0];
    const productName = latest.products?.[0]?.nome;

    leads.push({
      customerId,
      name,
      avatarInitials: buildInitials(name),
      interactions: events.length,
      lastActivity: formatRelative(latest.createdAt),
      lastProduct: productName || undefined,
      insight: buildInsight(latest.dislikeReason, productName),
      reason: latest.dislikeReason ?? null,
      lastTimestamp: latest.createdAt.getTime(),
    });
  });

  return leads.sort((a, b) => {
    if (a.lastTimestamp && b.lastTimestamp) {
      return b.lastTimestamp - a.lastTimestamp;
    }
    return b.interactions - a.interactions;
  });
}

function buildProductAlerts(composicoes: ComposicaoDoc[]): {
  fit: ProductAlert[];
  style: ProductAlert[];
} {
  const stats = new Map<
    string,
    {
      name: string;
      total: number;
      fit: number;
      style: number;
    }
  >();

  composicoes.forEach((item) => {
    if (!item.products?.length) return;
    const product = item.products[0];
    if (!product.id) return;

    const ref = stats.get(product.id) || {
      name: product.nome || "Produto",
      total: 0,
      fit: 0,
      style: 0,
    };

    ref.total += 1;
    if (item.dislikeReason === "fit_issue") {
      ref.fit += 1;
    } else if (item.dislikeReason === "garment_style") {
      ref.style += 1;
    }

    stats.set(product.id, ref);
  });

  const fit: ProductAlert[] = [];
  const style: ProductAlert[] = [];

  stats.forEach((value, productId) => {
    if (value.total < 3) return; // evitar ruído
    const fitPercent = value.fit > 0 ? (value.fit / value.total) * 100 : 0;
    const stylePercent = value.style > 0 ? (value.style / value.total) * 100 : 0;

    if (fitPercent >= 20) {
      fit.push({
        productId,
        productName: value.name,
        reason: "fit_issue",
        percentage: Math.round(fitPercent),
        totalReports: value.fit,
        totalInteractions: value.total,
      });
    }

    if (stylePercent >= 50) {
      style.push({
        productId,
        productName: value.name,
        reason: "garment_style",
        percentage: Math.round(stylePercent),
        totalReports: value.style,
        totalInteractions: value.total,
      });
    }
  });

  return {
    fit: fit.sort((a, b) => b.percentage - a.percentage),
    style: style.sort((a, b) => b.percentage - a.percentage),
  };
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
      fetchClientes(lojistaId, 10),
      fetchComposicoesRecentes(lojistaId, 1000), // Buscar mais composições para ter dados completos
      fetchLojaMetrics(lojistaId),
    ]);

    // Buscar ações (likes/dislikes) relacionadas às composições
    // IMPORTANTE: Usar a coleção 'generations' que já previne duplicidade
    const db = getAdminDb();
    let totalLikesFromGenerations = 0;
    let totalDislikesFromGenerations = 0;
    
    if (lojistaId) {
      try {
        // Buscar na coleção 'generations' que já previne duplicidade por compositionId + userId + lojistaId
        const generationsRef = db.collection("generations");
        
        // Buscar todas as generations da loja
        const generationsSnapshot = await generationsRef
          .where("lojistaId", "==", lojistaId)
          .limit(5000)
          .get();
        
        const allGenerations = generationsSnapshot.docs.map((doc: any) => doc.data());
        
        // Contar likes e dislikes únicos (já previne duplicidade por compositionId)
        // Usar Set para garantir que cada compositionId seja contado apenas uma vez
        const likedCompositionIds = new Set<string>();
        const dislikedCompositionIds = new Set<string>();
        
        allGenerations.forEach((gen: any) => {
          if (gen.status === "liked" && gen.compositionId) {
            likedCompositionIds.add(gen.compositionId);
          } else if (gen.status === "disliked" && gen.compositionId) {
            dislikedCompositionIds.add(gen.compositionId);
          }
        });
        
        totalLikesFromGenerations = likedCompositionIds.size;
        totalDislikesFromGenerations = dislikedCompositionIds.size;
        
        console.log("[getDashboardData] Generations encontradas:", {
          totalGenerations: allGenerations.length,
          likes: totalLikesFromGenerations,
          dislikes: totalDislikesFromGenerations,
          composicoes: composicoes.length
        });
      } catch (error) {
        console.warn("[getDashboardData] Erro ao buscar generations:", error);
      }
    }
    
    // Também contar likes/dislikes diretamente das composições (campo curtido)
    // IMPORTANTE: Filtrar apenas composições que têm like OU dislike (excluir neutras)
    const composicoesComFeedback = composicoes.filter((item) => 
      Boolean(item.liked) || Boolean(item.dislikeReason)
    );
    
    const likesFromComposicoes = composicoesComFeedback.filter((item) => 
      Boolean(item.liked)
    ).length;
    
    const dislikesFromComposicoes = composicoesComFeedback.filter((item) => 
      Boolean(item.dislikeReason)
    ).length;
    
    // Total: usar o maior valor entre generations e composições (para garantir precisão)
    const totalLikes = Math.max(totalLikesFromGenerations, likesFromComposicoes);
    const totalDislikes = Math.max(totalDislikesFromGenerations, dislikesFromComposicoes);

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

    const computedShares = composicoes.reduce(
      (total, item) => total + (typeof item.shares === "number" ? item.shares : 0),
      0
    );
    const computedAnonymous = composicoes.filter((item) => Boolean(item.isAnonymous)).length;
    const totalCostBRL = composicoes.reduce((sum, item) => {
      const compositionCost =
        typeof (item as any).totalCostBRL === "number"
          ? (item as any).totalCostBRL
          : typeof item.metrics?.totalCostBRL === "number"
          ? (item.metrics.totalCostBRL as number)
          : 0;
      return sum + compositionCost;
    }, 0);
    
    // Total de imagens geradas = usar o total do banco (metrics) ou contar todas as composições buscadas
    // Se metrics.totalComposicoes existir e for maior, usar ele (total real do banco)
    // Caso contrário, usar o número de composições buscadas
    const totalImagensGeradas = metrics?.totalComposicoes && metrics.totalComposicoes > composicoes.length
      ? metrics.totalComposicoes
      : composicoes.length;
    
    const averageCostBRL =
      totalImagensGeradas > 0 ? totalCostBRL / totalImagensGeradas : 0;

    const breakdown = buildProductBreakdown(composicoes, produtos);
    const activeCustomers = buildActiveCustomers(clientes, composicoes);
    const compositionsCards = buildCompositions(composicoes);

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

    const opportunityRadar = buildOpportunityRadar(composicoes);
    const productAlerts = buildProductAlerts(composicoes);

    return {
      brand: {
        name: perfil?.nome || "Sua Loja",
        logoUrl: perfil?.logoUrl || null,
        tagline: perfil?.descricao || "Coleções digitais personalizadas em segundos.",
        lastSync: lastSyncLabel,
      },
      plan: {
        tier: perfil?.planTier || null,
        billingStatus: perfil?.planBillingStatus || null,
      },
      metrics: {
        experimentToday,
        experimentWeek,
        experimentMonth:
          metrics?.totalComposicoes && metrics.totalComposicoes > experimentMonth
            ? metrics.totalComposicoes
            : experimentMonth,
        likedTotal: totalLikes, // Total de likes (ações + composições curtidas)
        dislikedTotal: totalDislikes, // Total de dislikes (ações + composições rejeitadas)
        totalProdutos: produtos.length, // Total de produtos cadastrados
        totalImagensGeradas: totalImagensGeradas, // Total de imagens/composições geradas
        sharesTotal: totalShares,
        checkoutTotal: totalCheckouts,
        anonymousTotal: totalAnonymous,
        totalCostBRL,
        averageCostBRL,
        conversionCheckoutRate:
          totalShares > 0 ? (totalCheckouts / totalShares) * 100 : 0,
        conversionLikeRate:
          totalLikes > 0 ? (totalCheckouts / totalLikes) * 100 : 0,
        lastActionLabel: lastSyncLabel,
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
      opportunityRadar,
      productAlerts,
    };
  } catch (error) {
    console.error("[dashboard] Erro ao montar dados:", error);
    return dashboardMockData;
  }
}















