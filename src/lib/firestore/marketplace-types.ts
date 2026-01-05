/**
 * FASE 3: Tipos para Marketplace & Ads
 * 
 * Schema para anúncios de lojas no marketplace
 */

export type AdStatus = "active" | "paused" | "expired" | "rejected";

export interface MarketplaceAd {
  id: string;
  lojistaId: string;
  lojistaNome: string;
  lojistaLogoUrl?: string;
  
  // Conteúdo do anúncio
  title: string;
  description?: string;
  imageUrl?: string; // Imagem de destaque do anúncio
  ctaText?: string; // Texto do botão (ex: "Ver Loja", "Comprar Agora")
  ctaLink?: string; // Link de destino
  
  // Status e controle
  status: AdStatus;
  priority: number; // 1-10, maior = mais destaque
  startDate?: Date;
  endDate?: Date;
  
  // Métricas
  impressions: number; // Visualizações
  clicks: number; // Cliques no anúncio
  conversions?: number; // Conversões (opcional)
  
  // Metadados
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // ID do admin que criou
}

export interface MarketplaceConfig {
  enabled: boolean;
  maxAdsPerSlot: number; // Máximo de anúncios por slot
  rotationInterval: number; // Intervalo de rotação em segundos
  defaultPriority: number; // Prioridade padrão para novos anúncios
}


