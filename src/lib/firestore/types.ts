/**
 * Tipos para documentos do Firestore
 */

export type ProdutoDoc = {
  id: string;
  nome: string;
  preco: number;
  imagemUrl: string;
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
};

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


