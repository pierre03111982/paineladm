/**
 * Tipos para documentos do Firestore
 */

export type ProdutoDoc = {
  id: string;
  nome: string;
  preco: number;
  imagemUrl: string; // DEPRECATED: usar imagemUrlCatalogo ou imagemUrlOriginal
  imagemUrlOriginal?: string; // Foto original do produto (upload inicial)
  imagemUrlCatalogo?: string; // Foto gerada com IA (imagem principal exibida)
  descontoProduto?: number; // % de desconto específico deste produto (sobrescreve desconto universal)
  categoria: string;
  tamanhos: string[];
  cores?: string[];
  medidas?: string;
  obs?: string;
  estoque?: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  arquivado?: boolean;
  catalogGeneratedAt?: Date; // Data de geração da imagem de catálogo
  // Sincronização de E-commerce
  ecommerceSync?: {
    platform: "shopify" | "nuvemshop" | "woocommerce" | "other";
    productId?: string;
    variantId?: string;
    lastSyncedAt?: Date;
    autoSync?: boolean;
    syncPrice?: boolean;
    syncStock?: boolean;
    syncVariations?: boolean;
  };
  // Métrica de Qualidade de Imagem/Performance
  qualityMetrics?: {
    compatibilityScore?: number; // Nota de 1 a 5
    conversionRate?: number; // Taxa de conversão (likes/composições)
    complaintRate?: number; // Taxa de reclamações
    lastCalculatedAt?: Date;
  };
  dimensions?: {
    weight_kg: number;
    height_cm: number;
    width_cm: number;
    depth_cm: number;
  };
  sku?: string;
  stock_quantity?: number;
};

export type DislikeReason = "garment_style" | "fit_issue" | "ai_distortion" | "other";

export type ClienteDoc = {
  id: string;
  nome: string;
  whatsapp: string;
  email?: string;
  totalComposicoes: number;
  totalLikes?: number;
  totalDislikes?: number;
  createdAt: Date;
  updatedAt: Date;
  arquivado?: boolean;
  acessoBloqueado?: boolean;
  // Segmentação Automática
  tags?: string[]; // Tags automáticas baseadas em comportamento
  segmentacao?: {
    tipo?: "abandonou-carrinho" | "fa-vestidos" | "high-spender" | "somente-tryon" | "comprador-frequente" | "novo-cliente";
    ultimaAtualizacao?: Date;
  };
  // Histórico de Tentativas
  historicoTentativas?: {
    produtosExperimentados: Array<{
      produtoId: string;
      produtoNome: string;
      categoria: string;
      dataTentativa: Date;
      liked?: boolean;
      compartilhado?: boolean;
      checkout?: boolean;
    }>;
    ultimaAtualizacao?: Date;
  };
  // PHASE 29: DNA de Estilo Agregado
  dnaEstilo?: {
    coresPreferidas: Record<string, number>;    // ex: { "preto": 15, "azul": 4 }
    tecidosPreferidos: Record<string, number>;  // ex: { "linho": 8, "couro": 2 }
    tagsInteresse: Record<string, number>;      // ex: { "festa": 10, "inverno": 5, "decote-v": 3 }
    faixaPrecoMedia: number;                    // Média de preço dos produtos interagidos
    tamanhosProvados: Record<string, number>;   // ex: { "M": 10, "G": 2 }
    ultimaAtualizacao: string; // ISO Date
  };
};

export type ComposicaoDoc = {
  id: string;
  customer: {
    id: string;
    nome: string;
  } | null;
  products: Array<{
    id: string;
    nome: string;
  }>;
  createdAt: Date;
  liked: boolean;
  shares: number;
  isAnonymous: boolean;
  imagemUrl?: string | null; // URL da imagem da composição
  dislikeReason?: DislikeReason | null;
  metrics?: {
    totalCostBRL?: number;
  } | null;
  totalCostBRL?: number; // Custo em BRL (pode estar no nível raiz também)
  processingTime?: number; // Tempo de processamento em milissegundos
};

export type LojaMetrics = {
  totalComposicoes: number;
  likedTotal: number;
  sharesTotal: number;
  checkoutTotal: number;
  anonymousTotal: number;
  lastAction: {
    action: string;
    createdAt: Date;
    customerName?: string;
  } | null;
  atualizadoEm: Date;
};

/**
 * FASE 1: Tipos para Subscription e Client Type
 */
export type PlanId = "start" | "pro" | "elite";
export type PlanStatus = "active" | "blocked" | "trial";
export type ClientType = "standard" | "test_unlimited";

export interface SubscriptionData {
  planId: PlanId;
  status: PlanStatus;
  adSlotsLimit: number;
  clientType: ClientType;
  startedAt?: Date;
  expiresAt?: Date;
  scheduledDowngrade?: {
    planId: PlanId;
    effectiveAt: Date;
  };
}

export interface UsageMetrics {
  totalGenerated: number; // Total de imagens geradas (para controle de custo interno)
  creditsUsed: number; // Créditos consumidos no período
  creditsRemaining: number; // Créditos restantes
  lastResetAt?: Date; // Data da última renovação de créditos
}

/**
 * FASE 1: Tipo para Usuário Final (App Cliente)
 * Coleção: users (global, não por loja)
 */
export interface UserDoc {
  id: string;
  whatsapp: string;
  email?: string;
  nome?: string;
  globalCredits: number; // Saldo bônus para usar em qualquer loja
  vipStatus: boolean; // True se comprou nos últimos 30 dias
  vipExpiration?: Date;
  accumulatedBalance: number; // Teto de 300 créditos acumulados
  createdAt: Date;
  updatedAt: Date;
}



































