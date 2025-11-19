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
};

export type ClienteDoc = {
  id: string;
  nome: string;
  whatsapp: string;
  totalComposicoes: number;
  createdAt: Date;
  updatedAt: Date;
  arquivado?: boolean;
  referidoPor?: string | null; // ID do cliente que compartilhou o link
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


