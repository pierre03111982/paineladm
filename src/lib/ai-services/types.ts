/**
 * Tipos e interfaces compartilhadas pelos serviços de IA
 */

/**
 * Configuração de Watermark
 */
export interface WatermarkConfig {
  logoUrl?: string; // URL do logo da loja
  storeName?: string; // Nome da loja
  productName?: string; // Nome do produto
  productPrice?: string | number; // Preço do produto
  legalNotice?: string; // Aviso legal
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "bottom-center";
  opacity?: number; // Opacidade do watermark (0-1)
}

/**
 * Status de processamento
 */
export interface ProcessingStatus {
  status: "pending" | "processing" | "completed" | "error";
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Status completo de processamento de composição
 */
export interface CompositionProcessingStatus {
  tryon: ProcessingStatus;
  scenes: ProcessingStatus;
  watermark: ProcessingStatus;
}

/**
 * Parâmetros para Try-On
 */
export interface TryOnParams {
  personImageUrl: string;
  productImageUrl: string;
  productId?: string;
}

/**
 * Parâmetros para Anonimização
 */
export interface AnonymizationParams {
  imageUrl: string;
  method?: "blur" | "pixelate" | "replace";
  intensity?: number;
  lojistaId?: string;
}

/**
 * Resultado da Anonimização
 */
export interface AnonymizationResult {
  anonymizedImageUrl: string;
  originalImageUrl: string;
  method: string;
  processedAt: Date;
}

/**
 * Input para solicitar avatar anônimo
 */
export interface RequestAnonymousAvatarInput {
  imageUrl: string;
  style?: "silhouette" | "abstract" | "minimal";
  forcePlaceholder?: boolean;
}

/**
 * Output da solicitação de avatar anônimo
 */
export interface RequestAnonymousAvatarOutput {
  avatarUrl: string;
  method: string;
  createdAt: Date;
  usedFallback: boolean;
}

/**
 * Estilo de avatar anônimo
 */
export type AnonymousAvatarStyle = "silhouette" | "abstract" | "minimal";

/**
 * Provedor de IA
 */
export type AIProvider = "vertex-tryon" | "imagen" | "nano-banana" | "stability-ai" | "gemini-flash-image";

/**
 * Log de custo de API
 */
export interface APICostLog {
  id: string;
  lojistaId: string;
  compositionId?: string | null;
  provider: AIProvider;
  operation: string;
  cost: number;
  currency: "USD" | "BRL";
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Resposta genérica de API
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime?: number;
  cost?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Resultado do Try-On
 */
export interface TryOnResult {
  imageUrl: string;
  processingTime?: number;
}

/**
 * Parâmetros para geração de cenário
 */
export interface SceneGenerationParams {
  prompt: string;
  baseImageUrl?: string;
  lojistaId?: string;
  compositionId?: string;
  width?: number;
  height?: number;
}

/**
 * Resultado da geração de cenário
 */
export interface SceneGenerationResult {
  imageUrl: string;
  prompt: string;
  processingTime?: number;
}



