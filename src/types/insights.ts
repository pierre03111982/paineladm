/**
 * Tipos para o sistema de Insights (IA Consultiva)
 */

export type InsightType = 'opportunity' | 'risk' | 'trend' | 'action';
export type InsightPriority = 'high' | 'medium' | 'low';

/**
 * Entidade relacionada ao insight
 */
export interface RelatedEntity {
  type: 'client' | 'product';
  id: string;
  name: string;
}

/**
 * Documento de Insight no Firestore
 */
export interface InsightDoc {
  id: string;
  lojistaId: string;
  type: InsightType;
  title: string;
  message: string;
  priority: InsightPriority;
  relatedEntity?: RelatedEntity;
  actionLabel?: string; // Ex: "Enviar WhatsApp", "Ver Produto"
  actionLink?: string;  // Deep link
  isRead: boolean;
  createdAt: Date; // Firestore Timestamp
  expiresAt: Date;
}

/**
 * Resultado da geração de insight pela IA
 */
export interface InsightResult {
  type: InsightType;
  title: string;
  message: string;
  priority: InsightPriority;
  relatedEntity?: RelatedEntity;
  actionLabel?: string;
  actionLink?: string;
  expiresInDays?: number; // Dias até expirar (padrão: 7)
}

