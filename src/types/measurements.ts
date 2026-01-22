/**
 * Tipos e Interfaces para o Sistema de Medidas Inteligente
 * SmartMeasurementEditor - Sistema de edição interativa de medidas
 */

export type SizeKey = 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XG';

export type MeasurementType = 'bust' | 'waist' | 'length' | 'sleeve' | 'hip' | 'hips' | 'shoulder' | 'chest';

export interface MeasurementPoint {
  id: MeasurementType;
  label: string;      // Ex: "Busto", "Cintura", "Comprimento"
  value: number;      // Valor em cm (ex: 45)
  // Coordenadas para o SVG (em % relativo à imagem para ser responsivo)
  startX: number;    // 0-100 (%)
  startY: number;    // 0-100 (%)
  endX: number;      // 0-100 (%)
  endY: number;      // 0-100 (%)
}

/**
 * Grupo de medidas para produtos com múltiplos itens (ex: biquíni = top + calcinha)
 */
export interface MeasurementGroup {
  id: string; // Identificador único do grupo (ex: "top", "bottom", "item1", "item2")
  label: string; // Nome exibido (ex: "Top", "Calcinha", "Parte Superior", "Parte Inferior")
  sizes: Record<SizeKey, MeasurementPoint[]>; // Medidas por tamanho
}

export interface SmartGuideData {
  baseImage: string; // URL da imagem tratada pela IA
  activeSize: SizeKey;
  autoGrading: boolean; // Se true, calcula tamanhos automaticamente
  // Dados de cada tamanho (legado - mantido para compatibilidade)
  sizes: Record<SizeKey, MeasurementPoint[]>;
  // NOVO: Grupos de medidas para produtos com múltiplos itens (ex: biquíni)
  // Se groups estiver presente e não vazio, usar groups ao invés de sizes
  groups?: MeasurementGroup[];
}

/**
 * Resultado da análise de IA (mock)
 */
export interface AIAnalysisResult {
  processedImageUrl: string; // URL da imagem tratada (fundo removido)
  landmarks: MeasurementPoint[]; // Pontos de referência iniciais
  suggestedMeasurements: {
    [key in SizeKey]?: MeasurementPoint[];
  };
}

/**
 * Configuração de gradação automática
 */
export interface GradingConfig {
  // Variação por tamanho (em cm)
  circumference: number;  // Para busto, cintura, quadril (circunferência = 2x na peça plana)
  length: number;         // Para comprimento, manga
  // Tamanhos base (referência)
  baseSize: SizeKey;      // Tamanho usado como referência (geralmente M)
}
