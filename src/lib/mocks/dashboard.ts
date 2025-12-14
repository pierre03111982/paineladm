export type ExperimentPoint = {
  day: string;
  total: number;
};

export type ProductBreakdown = {
  name: string;
  value: number;
  color: string;
};

export type ActiveCustomer = {
  id: string;
  name: string;
  avatarInitials: string;
  totalCompositions: number;
  lastActivity: string;
  lastCompositionImageUrl?: string | null; // URL da imagem da última composição gerada
};

export type DislikeReason = "garment_style" | "fit_issue" | "ai_distortion" | "other";

export type CompositionItem = {
  id: string;
  productName: string;
  customerName: string;
  productKey?: string | null;
  customerKey?: string | null;
  createdAt: string;
  liked: boolean;
  isAnonymous?: boolean;
  shareCount?: number;
  palette: {
    from: string;
    via?: string;
    to: string;
  };
  totalCostBRL?: number | null; // Custo em BRL
  processingTime?: number | null; // Tempo de processamento em milissegundos
};

export type OpportunityLead = {
  customerId: string;
  name: string;
  avatarInitials: string;
  interactions: number;
  lastActivity: string;
  lastProduct?: string;
  insight?: string;
  reason?: DislikeReason | null;
  masked?: boolean;
  lastTimestamp?: number;
};

export type ProductAlert = {
  productId: string;
  productName: string;
  reason: Exclude<DislikeReason, "ai_distortion" | "other">;
  percentage: number;
  totalReports: number;
  totalInteractions: number;
};

export type DashboardMock = {
  brand: {
    name: string;
    logoUrl: string | null;
    tagline: string;
    lastSync: string;
  };
  plan?: {
    tier?: "micro" | "growth" | "enterprise" | string | null;
    billingStatus?: string | null;
  };
  metrics: {
    experimentToday: number;
    experimentWeek: number;
    experimentMonth: number;
    likedTotal: number;
    sharesTotal: number;
    checkoutTotal: number;
    anonymousTotal: number;
    totalCostBRL: number;
    averageCostBRL: number;
    conversionCheckoutRate: number;
    conversionLikeRate: number;
    lastActionLabel: string;
  };
  experimentsTrend: ExperimentPoint[];
  costTrend: Array<ExperimentPoint & { average: number }>;
  costSummary: {
    providers: Array<{
      provider: string;
      label: string;
      costUSD: number;
      costBRL: number;
      requests: number;
    }>;
    operations: Array<{
      operation: string;
      costUSD: number;
      costBRL: number;
      requests: number;
    }>;
    period: {
      currentUSD: number;
      currentBRL: number;
      previousUSD: number;
      previousBRL: number;
      deltaUSD: number;
      deltaBRL: number;
      deltaPercent: number;
      days: number;
      usdToBrlRate: number;
    };
  };
  productBreakdown: ProductBreakdown[];
  activeCustomers: ActiveCustomer[];
  compositions: CompositionItem[];
  opportunityRadar: OpportunityLead[];
  productAlerts: {
    fit: ProductAlert[];
    style: ProductAlert[];
  };
};

export const dashboardMockData: DashboardMock = {
  brand: {
    name: "Lojinha da Moda",
    logoUrl: null,
    tagline: "Coleções digitais personalizadas em segundos.",
    lastSync: "Sincronizado há 12 minutos",
  },
  plan: {
    tier: "growth",
    billingStatus: "active",
  },
  metrics: {
    experimentToday: 38,
    experimentWeek: 212,
    experimentMonth: 864,
    likedTotal: 524,
    sharesTotal: 312,
    checkoutTotal: 148,
    anonymousTotal: 42,
    totalCostBRL: 12850.4,
    averageCostBRL: 14.86,
    conversionCheckoutRate: 47.4,
    conversionLikeRate: 28.2,
    lastActionLabel: "Última ação há 8 minutos",
  },
  experimentsTrend: [
    { day: "Seg", total: 28 },
    { day: "Ter", total: 34 },
    { day: "Qua", total: 39 },
    { day: "Qui", total: 41 },
    { day: "Sex", total: 45 },
    { day: "Sáb", total: 36 },
    { day: "Dom", total: 30 },
  ],
  costTrend: [
    { day: "Seg", total: 1450.35, average: 18.12 },
    { day: "Ter", total: 1580.6, average: 19.76 },
    { day: "Qua", total: 1675.9, average: 20.32 },
    { day: "Qui", total: 1810.2, average: 22.15 },
    { day: "Sex", total: 1942.8, average: 24.35 },
    { day: "Sáb", total: 1724.4, average: 21.55 },
    { day: "Dom", total: 1526.1, average: 19.08 },
  ],
  costSummary: {
    providers: [
      { provider: "vertex-tryon", label: "Try-On (Vertex)", costUSD: 1496, costBRL: 7480, requests: 96 },
      { provider: "imagen", label: "Imagen 3.0", costUSD: 1024, costBRL: 5120, requests: 128 },
    ],
    operations: [
      { operation: "tryon", costUSD: 1496, costBRL: 7480, requests: 96 },
      { operation: "scene-generation", costUSD: 1024, costBRL: 5120, requests: 128 },
    ],
    period: {
      currentUSD: 2520,
      currentBRL: 12850.4,
      previousUSD: 2248,
      previousBRL: 11240.0,
      deltaUSD: 272,
      deltaBRL: 1610.4,
      deltaPercent: 14.3,
      days: 7,
      usdToBrlRate: 5.1,
    },
  },
  productBreakdown: [
    { name: "Vestido Aurora", value: 28, color: "#6366f1" },
    { name: "Jaqueta Neo", value: 22, color: "#22d3ee" },
    { name: "Calça Prisma", value: 18, color: "#f97316" },
    { name: "Saia Flow", value: 14, color: "#a855f7" },
    { name: "Outros", value: 18, color: "#6ee7b7" },
  ],
  activeCustomers: [
    {
      id: "cust-01",
      name: "Aline Rodrigues",
      avatarInitials: "AR",
      totalCompositions: 42,
      lastActivity: "há 1 hora",
    },
    {
      id: "cust-02",
      name: "Bruno Mello",
      avatarInitials: "BM",
      totalCompositions: 35,
      lastActivity: "há 3 horas",
    },
    {
      id: "cust-03",
      name: "Carla Fernandes",
      avatarInitials: "CF",
      totalCompositions: 29,
      lastActivity: "há 4 horas",
    },
    {
      id: "cust-04",
      name: "Diego Santos",
      avatarInitials: "DS",
      totalCompositions: 26,
      lastActivity: "há 6 horas",
    },
  ],
  compositions: [
    {
      id: "cmp-01",
      productName: "Vestido Aurora",
      customerName: "Aline Rodrigues",
      productKey: "produto:1",
      customerKey: "cliente:1",
      createdAt: "há 12 minutos",
      liked: true,
      isAnonymous: false,
      shareCount: 3,
      palette: {
        from: "#312e81",
        via: "#6366f1",
        to: "#c4b5fd",
      },
    },
    {
      id: "cmp-02",
      productName: "Jaqueta Neo",
      customerName: "Bruno Mello",
      productKey: "produto:2",
      customerKey: "cliente:2",
      createdAt: "há 36 minutos",
      liked: false,
      shareCount: 1,
      palette: {
        from: "#0f172a",
        via: "#38bdf8",
        to: "#bae6fd",
      },
    },
    {
      id: "cmp-03",
      productName: "Calça Prisma",
      customerName: "Carla Fernandes",
      productKey: "produto:3",
      customerKey: "cliente:3",
      createdAt: "há 1 hora",
      liked: true,
      shareCount: 0,
      palette: {
        from: "#1f2937",
        via: "#f97316",
        to: "#fed7aa",
      },
    },
    {
      id: "cmp-04",
      productName: "Saia Flow",
      customerName: "Diego Santos",
      productKey: "produto:4",
      customerKey: "cliente:4",
      createdAt: "há 2 horas",
      liked: false,
      shareCount: 2,
      palette: {
        from: "#1e1b4b",
        via: "#a855f7",
        to: "#f0abfc",
      },
    },
    {
      id: "cmp-05",
      productName: "Vestido Aurora",
      customerName: "Fernanda Lima",
      createdAt: "há 3 horas",
      liked: true,
      isAnonymous: true,
      shareCount: 4,
      palette: {
        from: "#0f172a",
        via: "#22d3ee",
        to: "#cffafe",
      },
    },
    {
      id: "cmp-06",
      productName: "Jaqueta Neo",
      customerName: "Gabriel Araujo",
      createdAt: "há 4 horas",
      liked: true,
      shareCount: 1,
      palette: {
        from: "#172554",
        via: "#f472b6",
        to: "#fbcfe8",
      },
    },
  ],
  opportunityRadar: [
    {
      customerId: "cust-01",
      name: "Aline Rodrigues",
      avatarInitials: "AR",
      interactions: 5,
      lastActivity: "há 8 min",
      lastProduct: "Vestido Aurora",
      insight: "Comentou: ajuste de tamanho.",
      reason: "fit_issue",
      lastTimestamp: Date.now(),
    },
    {
      customerId: "cust-05",
      name: "Cliente inspirado",
      avatarInitials: "CI",
      interactions: 4,
      lastActivity: "há 15 min",
      lastProduct: "Conjunto Prisma",
      insight: "Buscando novas cores.",
      reason: "garment_style",
      lastTimestamp: Date.now(),
    },
  ],
  productAlerts: {
    fit: [
      {
        productId: "prod-01",
        productName: "Calça Prisma",
        reason: "fit_issue",
        percentage: 32,
        totalReports: 8,
        totalInteractions: 25,
      },
    ],
    style: [
      {
        productId: "prod-02",
        productName: "Vestido Aurora",
        reason: "garment_style",
        percentage: 54,
        totalReports: 13,
        totalInteractions: 24,
      },
    ],
  },
};
















