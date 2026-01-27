"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Ruler, 
  Upload, 
  Loader2, 
  Save, 
  RotateCcw, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ZoomIn,
  Info,
} from "lucide-react";
import type { SizeKey, MeasurementPoint, SmartGuideData } from "@/types/measurements";
import { getStandardMeasurements, getABNTMeasurementsForSizes } from "@/lib/standards/abnt-data";

/**
 * GEOMETRIA FIXA - Coordenadas X/Y imutáveis na imagem
 * Estas coordenadas representam a ANATOMIA da peça na foto
 * NÃO MUDAM quando o tamanho muda
 */
interface MeasurementGeometry {
  id: 'bust' | 'waist' | 'hip' | 'length';
  label: string;
  startX: number;  // 0-100 (%)
  startY: number;  // 0-100 (%)
  endX: number;    // 0-100 (%)
  endY: number;    // 0-100 (%)
}

/**
 * MEDIDAS POR TAMANHO - Valores em cm (variáveis por tamanho)
 * Estrutura: { [measurementId]: { [sizeKey]: valueInCm } }
 * Exemplo: { bust: { P: 42, M: 44, G: 46 }, waist: { P: 38, M: 40, G: 42 } }
 */
type MeasurementValues = Record<string, Record<SizeKey, number>>;

interface SmartMeasurementEditorProps {
  // Imagem original do produto
  rawImageUrl?: string;
  rawImageFile?: File | null;
  
  // ID do lojista (obrigatório para processamento)
  lojistaId: string;
  
  // ID do produto (opcional, para edição)
  produtoId?: string;
  
  // Informações do produto da análise inteligente (obrigatório para gerar imagem)
  productInfo?: {
    category?: string;
    productType?: string;
    color?: string;
    material?: string;
    style?: string;
    standardMeasurements?: {
      bust?: number;
      waist?: number;
      hip?: number;
      length?: number;
      unit?: 'cm';
      calibration_method?: 'A4_REFERENCE' | 'HANGER' | 'AI_ESTIMATE';
    }; // Medidas padrão coletadas da análise inteligente (tamanho M)
  };
  
  // Callbacks
  onImageUpload?: (file: File) => Promise<void>;
  onMeasurementsChange?: (data: SmartGuideData) => void;
  onSave?: (data: SmartGuideData) => Promise<void>;
  
  // Dados iniciais (se editando produto existente)
  initialData?: Partial<SmartGuideData>;
  
  // Estados de loading
  uploading?: boolean;
  
  // Variações do produto (para determinar tamanhos disponíveis)
  variacoes?: Array<{ id: string; variacao: string; estoque: string; sku: string }>;
  
  // Grade de tamanho e público alvo (para determinar tamanhos corretos)
  sizeCategory?: 'standard' | 'plus' | 'numeric' | 'baby' | 'kids_numeric' | 'teen';
  targetAudience?: 'female' | 'male' | 'kids';
  
  className?: string;
}

// Tamanhos padrão em ordem
const STANDARD_SIZES: SizeKey[] = ['PP', 'P', 'M', 'G', 'GG', 'XG'];

/**
 * Classifica se o produto tem múltiplos itens (ex: biquíni = 2 itens, conjunto = 2 itens)
 */
type MultiItemKind = "BIKINI" | "SET_TOP_BOTTOM" | null;

function detectMultiItemKind(input: {
  category?: string;
  productType?: string;
  tags?: string[];
  description?: string;
  name?: string;
}): MultiItemKind {
  const cat = (input.category || "").toLowerCase();
  const type = (input.productType || "").toLowerCase();
  const desc = (input.description || "").toLowerCase();
  const name = (input.name || "").toLowerCase();
  // Combinar todos os campos para análise mais robusta
  const combined = `${cat} ${type} ${desc} ${name}`.trim();

  const includesAny = (terms: string[]) => terms.some((t) => combined.includes(t));

  // 1) Biquíni / conjunto de praia: 2 itens (top + calcinha)
  // (também cobre "sunquini", "biquini" sem acento)
  if (includesAny(["biquíni", "biquini", "bikini", "sunquini", "conjunto praia", "conjunto banho", "swimwear"])) {
    // evitar marcar "maiô" (peça única)
    if (!includesAny(["maiô", "maio"])) {
      return "BIKINI";
    }
  }

  // 2) Conjuntos de roupa (ex: cropped + saia / blusa + short / camisa + calça)
  // Heurística melhorada: detecta quando há 1 item de cima + 1 item de baixo mencionados
  // Mesmo sem a palavra "conjunto" explícita
  const hasTopItem = includesAny([
    "cropped",
    "top",
    "blusa",
    "camisa",
    "camiseta",
    "regata",
    "colete",
    "jaqueta",
    "blazer",
    "casaco",
  ]);
  const hasBottomItem = includesAny([
    "saia",
    "short",
    "bermuda",
    "calça",
    "pants",
    "legging",
  ]);

  // Se tem palavra "conjunto"/"kit"/"set" E tem top + bottom → conjunto
  const isSetKeyword = includesAny(["conjunto", "kit", "set", "duas peças", "2 peças", "dois itens"]);
  if (isSetKeyword && (hasTopItem && hasBottomItem)) {
    return "SET_TOP_BOTTOM";
  }

  // NOVO: Se tem top + bottom mencionados JUNTOS (mesmo sem palavra "conjunto")
  // Isso cobre casos como "cropped short", "blusa calça", etc.
  if (hasTopItem && hasBottomItem) {
    // Verificar se ambos aparecem na mesma string (indicando que são partes do mesmo produto)
    const topPattern = /cropped|top|blusa|camisa|camiseta|regata|colete|jaqueta|blazer|casaco/i;
    const bottomPattern = /saia|short|bermuda|calça|pants|legging/i;
    
    const topMatch = combined.match(topPattern);
    const bottomMatch = combined.match(bottomPattern);
    
    // Se ambos estão presentes, é provavelmente um conjunto
    if (topMatch && bottomMatch) {
      return "SET_TOP_BOTTOM";
    }
  }

  // HEURÍSTICA ESPECIAL: Se productType é "short" mas há evidências de conjunto na descrição/nome
  // (ex: imagem mostra cropped + short, mas análise só detectou "short")
  if (type === "short" && (desc.includes("cropped") || desc.includes("top") || name.includes("cropped") || name.includes("top") || name.includes("conjunto") || desc.includes("conjunto"))) {
    console.log("[detectMultiItemKind] 🔍 Heurística: 'short' com evidências de cropped/top/conjunto na descrição → conjunto");
    return "SET_TOP_BOTTOM";
  }

  // HEURÍSTICA CRÍTICA: Se nome/descrição mencionam claramente "conjunto" + top + bottom
  // Mesmo que productType seja apenas uma das peças
  const hasConjuntoKeyword = combined.includes("conjunto") || combined.includes("set") || combined.includes("kit");
  if (hasConjuntoKeyword && hasTopItem && hasBottomItem) {
    console.log("[detectMultiItemKind] 🔍 Heurística CRÍTICA: palavra 'conjunto' + top + bottom detectados → conjunto");
    return "SET_TOP_BOTTOM";
  }

  // HEURÍSTICA ULTRA-AGRESSIVA: Se nome/descrição mencionam "cropped" E "short" juntos
  // Mesmo sem palavra "conjunto", se ambos aparecem, é provavelmente um conjunto
  const hasCropped = combined.includes("cropped");
  const hasShort = combined.includes("short") || combined.includes("shorts");
  if (hasCropped && hasShort && !hasConjuntoKeyword) {
    console.log("[detectMultiItemKind] 🔍 Heurística ULTRA: 'cropped' + 'short' mencionados juntos → conjunto");
    return "SET_TOP_BOTTOM";
  }

  return null;
}

function inferRelevantMeasurementIds(input: {
  category?: string;
  productType?: string;
  tags?: string[];
  itemType?: "bikini_top" | "bikini_bottom" | "set_top" | "set_bottom" | "single"; // Para produtos multi-item
}): MeasurementGeometry["id"][] {
  const cat = (input.category || "").toLowerCase();
  const type = (input.productType || "").toLowerCase();
  const combined = `${cat} ${type}`.trim();

  const includesAny = (terms: string[]) => 
    terms.some((t) => cat.includes(t) || type.includes(t) || combined.includes(t));

  // Para produtos multi-item, determinar medidas por item
  if (input.itemType === "bikini_top") {
    // Top do biquíni: Busto + Comprimento (SEM cintura)
    return ["bust", "length"];
  }
  if (input.itemType === "bikini_bottom") {
    // Calcinha do biquíni: Quadril + Comprimento (SEM busto, SEM cintura)
    return ["hip", "length"];
  }
  if (input.itemType === "set_top") {
    // Conjunto (parte de cima): Busto + Comprimento (SEM cintura)
    return ["bust", "length"];
  }
  if (input.itemType === "set_bottom") {
    // Conjunto (parte de baixo): Cintura + Quadril + Comprimento
    return ["waist", "hip", "length"];
  }

  // Íntimos / moda praia (sunga/cueca/calcinha): SEM busto
  if (includesAny(["sunga", "cueca", "calcinha"])) {
    return ["hip", "length"];
  }

  // Calças/shorts/bermudas/saias: SEM busto
  if (includesAny(["calça", "pants", "short", "bermuda", "legging", "saia"])) {
    return ["waist", "hip", "length"];
  }

  // Vestidos/macacões: busto + cintura + quadril + comprimento
  if (includesAny(["vestido", "dress", "macacão", "macaquinho", "jumpsuit"])) {
    return ["bust", "waist", "hip", "length"];
  }

  // Tops/blusas/camisas/moletons: SEM cintura (pedido)
  // CRÍTICO: Incluir moletom, sweatshirt, hoodie para garantir que busto seja detectado
  if (includesAny([
    "blusa", "camisa", "camiseta", "regata", "top", "cropped", "colete", "body",
    "moletom", "sweatshirt", "hoodie", "agasalho", "casaco", "jaqueta"
  ])) {
    return ["bust", "length"];
  }

  // Default seguro: busto + comprimento
  return ["bust", "length"];
}

/**
 * Extrai GEOMETRIA FIXA dos landmarks (coordenadas X/Y imutáveis)
 * Usa coordenadas hardcoded para teste conforme solicitado
 */
function extractGeometry(
  landmarks: any,
  category: string,
  relevantIds: MeasurementGeometry["id"][],
  productType?: string
): MeasurementGeometry[] {
  const categoryLower = (category || "").toLowerCase();
  const typeLower = (productType || "").toLowerCase();
  const combined = `${categoryLower} ${typeLower}`.toLowerCase();
  const geometry: MeasurementGeometry[] = [];

  // COORDENADAS HARDCODED AJUSTADAS (coordenadas precisas para vestido/macacão)
  const hardcodedCoords: Record<string, MeasurementGeometry[]> = {
    dress: [
      { id: 'bust', label: 'Busto', startX: 30, startY: 35, endX: 70, endY: 35 }, // Linha horizontal de axila a axila (ajustada)
      { id: 'waist', label: 'Cintura', startX: 28, startY: 50, endX: 72, endY: 50 }, // Linha horizontal na cintura (ajustada)
      { id: 'hip', label: 'Quadril', startX: 30, startY: 65, endX: 70, endY: 65 }, // Linha horizontal no quadril (adicionado)
      { id: 'length', label: 'Comprimento', startX: 50, startY: 18, endX: 50, endY: 90 }, // Linha vertical central (ajustada)
    ],
  };

  // Tentar usar coordenadas hardcoded primeiro (para vestido/macacão)
  const isDress =
    categoryLower.includes("vestido") ||
    categoryLower.includes("dress") ||
    categoryLower.includes("macacão") ||
    categoryLower.includes("macaquinho") ||
    categoryLower.includes("jumpsuit") ||
    typeLower.includes("vestido") ||
    typeLower.includes("dress") ||
    typeLower.includes("macacão") ||
    typeLower.includes("macaquinho") ||
    typeLower.includes("jumpsuit") ||
    combined.includes("vestido") ||
    combined.includes("dress") ||
    combined.includes("macacão") ||
    combined.includes("macaquinho") ||
    combined.includes("jumpsuit");
  if (isDress && hardcodedCoords.dress) {
    const filtered = hardcodedCoords.dress.filter((g) => relevantIds.includes(g.id));
    console.log("[SmartMeasurementEditor] 📐 Usando coordenadas hardcoded para dress/macacão:", {
      relevantIds,
      filteredIds: filtered.map(g => g.id),
    });
    return filtered;
  }

  // Fallback: calcular a partir dos landmarks
  if (
    categoryLower.includes("vestido") ||
    categoryLower.includes("dress") ||
    categoryLower.includes("macacão") ||
    categoryLower.includes("macaquinho") ||
    categoryLower.includes("jumpsuit") ||
    typeLower.includes("vestido") ||
    typeLower.includes("dress") ||
    typeLower.includes("macacão") ||
    typeLower.includes("macaquinho") ||
    typeLower.includes("jumpsuit") ||
    combined.includes("vestido") ||
    combined.includes("dress") ||
    combined.includes("macacão") ||
    combined.includes("macaquinho") ||
    combined.includes("jumpsuit") ||
    categoryLower.includes("blusa") ||
    categoryLower.includes("camisa") ||
    categoryLower.includes("camiseta") ||
    categoryLower.includes("top") ||
    categoryLower.includes("moletom") ||
    categoryLower.includes("sweatshirt") ||
    categoryLower.includes("hoodie") ||
    categoryLower.includes("agasalho") ||
    typeLower.includes("blusa") ||
    typeLower.includes("camisa") ||
    typeLower.includes("camiseta") ||
    typeLower.includes("top") ||
    typeLower.includes("moletom") ||
    typeLower.includes("sweatshirt") ||
    typeLower.includes("hoodie") ||
    typeLower.includes("agasalho") ||
    combined.includes("moletom") ||
    combined.includes("sweatshirt") ||
    combined.includes("hoodie")
  ) {
    // TOPS ou DRESS
    // CRÍTICO: Para vestidos/macacões, SEMPRE incluir busto (mesmo se landmarks não tiverem)
    if (isDress && relevantIds.includes('bust')) {
      // Se é dress/macacão e busto é relevante, SEMPRE incluir (usar coordenadas padrão se landmarks não tiverem)
      if (landmarks.bust_start && landmarks.bust_end) {
        const centerY = (landmarks.bust_start.y + landmarks.bust_end.y) / 2;
        geometry.push({
          id: 'bust',
          label: 'Busto',
          startX: landmarks.bust_start.x,
          startY: centerY,
          endX: landmarks.bust_end.x,
          endY: centerY,
        });
      } else {
        // Se landmarks não têm busto mas é dress/macacão, usar coordenadas padrão
        console.log("[SmartMeasurementEditor] ⚠️ Landmarks não têm busto, usando coordenadas padrão para dress/macacão");
        geometry.push({
          id: 'bust',
          label: 'Busto',
          startX: 30,
          startY: 35,
          endX: 70,
          endY: 35,
        });
      }
    } else if (!isDress && relevantIds.includes('bust')) {
      // Para tops/blusas/moletons, incluir busto se landmarks tiverem
      // CRÍTICO: Se landmarks não tiverem mas é produto que precisa de busto, usar coordenadas padrão
      if (landmarks.bust_start && landmarks.bust_end) {
        const centerY = (landmarks.bust_start.y + landmarks.bust_end.y) / 2;
        geometry.push({
          id: 'bust',
          label: 'Busto',
          startX: landmarks.bust_start.x,
          startY: centerY,
          endX: landmarks.bust_end.x,
          endY: centerY,
        });
      } else {
        // CRÍTICO: Se landmarks não têm busto mas é produto que precisa (moletom, sweatshirt, etc), usar coordenadas padrão
        console.log("[SmartMeasurementEditor] ⚠️ Landmarks não têm busto para top/blusa/moletom, usando coordenadas padrão");
        geometry.push({
          id: 'bust',
          label: 'Busto',
          startX: 30,
          startY: 35,
          endX: 70,
          endY: 35,
        });
      }
    }
    
    // ⚠️ Pedido: Blusa/top NÃO tem cintura → só incluir cintura se for vestido mesmo
    if (isDress && relevantIds.includes('waist')) {
      if (landmarks.waist_start && landmarks.waist_end) {
        const centerY = (landmarks.waist_start.y + landmarks.waist_end.y) / 2;
        geometry.push({
          id: 'waist',
          label: 'Cintura',
          startX: landmarks.waist_start.x,
          startY: centerY,
          endX: landmarks.waist_end.x,
          endY: centerY,
        });
      } else {
        // Usar coordenadas padrão se landmarks não tiverem
        geometry.push({
          id: 'waist',
          label: 'Cintura',
          startX: 28,
          startY: 50,
          endX: 72,
          endY: 50,
        });
      }
    }
    
    // Para dress/macacão, incluir quadril se relevante
    if (isDress && relevantIds.includes('hip')) {
      if (landmarks.hip_start && landmarks.hip_end) {
        const centerY = (landmarks.hip_start.y + landmarks.hip_end.y) / 2;
        geometry.push({
          id: 'hip',
          label: 'Quadril',
          startX: landmarks.hip_start.x,
          startY: centerY,
          endX: landmarks.hip_end.x,
          endY: centerY,
        });
      } else {
        // Usar coordenadas padrão se landmarks não tiverem
        geometry.push({
          id: 'hip',
          label: 'Quadril',
          startX: 30,
          startY: 65,
          endX: 70,
          endY: 65,
        });
      }
    }
    
    if (relevantIds.includes('length')) {
      if (landmarks.length_top && landmarks.length_bottom) {
        const centerX = (landmarks.length_top.x + landmarks.length_bottom.x) / 2;
        geometry.push({
          id: 'length',
          label: 'Comprimento',
          startX: centerX,
          startY: landmarks.length_top.y,
          endX: centerX,
          endY: landmarks.length_bottom.y,
        });
      } else if (isDress) {
        // Usar coordenadas padrão se landmarks não tiverem
        geometry.push({
          id: 'length',
          label: 'Comprimento',
          startX: 50,
          startY: 18,
          endX: 50,
          endY: 90,
        });
      }
    }
  } else {
    // BOTTOMS
    if (landmarks.waist_start && landmarks.waist_end) {
      const centerY = (landmarks.waist_start.y + landmarks.waist_end.y) / 2;
      geometry.push({
        id: 'waist',
        label: 'Cintura',
        startX: landmarks.waist_start.x,
        startY: centerY,
        endX: landmarks.waist_end.x,
        endY: centerY,
      });
    }
    if (landmarks.hip_start && landmarks.hip_end) {
      const centerY = (landmarks.hip_start.y + landmarks.hip_end.y) / 2;
      geometry.push({
        id: 'hip',
        label: 'Quadril',
        startX: landmarks.hip_start.x,
        startY: centerY,
        endX: landmarks.hip_end.x,
        endY: centerY,
      });
    }
    if (landmarks.length_top && landmarks.length_bottom) {
      const centerX = (landmarks.length_top.x + landmarks.length_bottom.x) / 2;
      geometry.push({
        id: 'length',
        label: 'Comprimento',
        startX: centerX,
        startY: landmarks.length_top.y,
        endX: centerX,
        endY: landmarks.length_bottom.y,
      });
    }
  }

  return geometry.filter((g) => relevantIds.includes(g.id));
}

/**
 * Cria valores iniciais de medidas para todos os tamanhos
 * Garante que TODOS os tamanhos tenham TODAS as medidas
 * PRIORIDADE: Tenta usar dados ABNT primeiro, depois usa valores padrão
 */
function createInitialMeasurementValues(
  geometry: MeasurementGeometry[],
  defaultValueM: Record<string, number> = { bust: 44, waist: 40, hip: 44, length: 60 },
  availableSizes: SizeKey[] = STANDARD_SIZES,
  targetAudience?: 'female' | 'male' | 'kids'
): MeasurementValues {
  const values: MeasurementValues = {};

  // NOVO: Tentar buscar dados ABNT primeiro
  let abntData: Record<string, any> | null = null;
  if (targetAudience) {
    const abntMeasurements = getABNTMeasurementsForSizes(targetAudience, availableSizes as string[]);
    if (abntMeasurements) {
      abntData = abntMeasurements;
      console.log("[createInitialMeasurementValues] ✅ Usando dados ABNT:", abntMeasurements);
    }
  }

  geometry.forEach((geo) => {
    values[geo.id] = {} as Record<SizeKey, number>;
    
    availableSizes.forEach((size) => {
      let value: number;
      
      // PRIORIDADE 1: Tentar usar dados ABNT
      if (abntData && abntData[size as string]) {
        const abntMeasurements = abntData[size as string];
        // Mapear geo.id para campo ABNT
        if (geo.id === 'bust' && abntMeasurements.bust !== undefined) {
          value = abntMeasurements.bust;
        } else if (geo.id === 'waist' && abntMeasurements.waist !== undefined) {
          value = abntMeasurements.waist;
        } else if (geo.id === 'hip' && abntMeasurements.hip !== undefined) {
          value = abntMeasurements.hip;
        } else if (geo.id === 'length' && abntMeasurements.length !== undefined) {
          value = abntMeasurements.length;
        } else {
          // Se ABNT não tem essa medida, usar valor padrão
          const baseValue = defaultValueM[geo.id] || 40;
          const middleIndex = Math.floor(availableSizes.length / 2);
          const middleSize = availableSizes[middleIndex] || availableSizes[0];
          const sizeIndex = availableSizes.indexOf(size);
          const middleSizeIndex = availableSizes.indexOf(middleSize);
          const diff = sizeIndex - middleSizeIndex;
          const variation = geo.id === 'length' ? 1.5 : 2;
          value = Math.max(0, baseValue + (diff * variation));
        }
      } else {
        // PRIORIDADE 2: Usar valores padrão com cálculo de gradação
        const baseValue = defaultValueM[geo.id] || 40;
        const middleIndex = Math.floor(availableSizes.length / 2);
        const middleSize = availableSizes[middleIndex] || availableSizes[0];
        const sizeIndex = availableSizes.indexOf(size);
        const middleSizeIndex = availableSizes.indexOf(middleSize);
        const diff = sizeIndex - middleSizeIndex;
        const variation = geo.id === 'length' ? 1.5 : 2;
        value = Math.max(0, baseValue + (diff * variation));
      }
      
      values[geo.id][size] = value;
    });
  });

  return values;
}

/**
 * Retorna landmarks padrão como fallback
 */
function getFallbackLandmarks(category: string): any {
  const categoryLower = category.toLowerCase();
  
  if (
    categoryLower.includes("vestido") ||
    categoryLower.includes("dress") ||
    categoryLower.includes("macacão") ||
    categoryLower.includes("macaquinho") ||
    categoryLower.includes("jumpsuit") ||
    categoryLower.includes("blusa") ||
    categoryLower.includes("camisa") ||
    categoryLower.includes("top")
  ) {
    return {
      bust_start: { x: 25, y: 35 },
      bust_end: { x: 75, y: 35 },
      waist_start: { x: 30, y: 50 },
      waist_end: { x: 70, y: 50 },
      length_top: { x: 50, y: 15 },
      length_bottom: { x: 50, y: 85 },
    };
  } else {
    return {
      waist_start: { x: 30, y: 10 },
      waist_end: { x: 70, y: 10 },
      hip_start: { x: 25, y: 35 },
      hip_end: { x: 75, y: 35 },
      length_top: { x: 50, y: 10 },
      length_bottom: { x: 50, y: 90 },
    };
  }
}

/**
 * Recalcula tamanhos automaticamente baseado em um tamanho de referência
 */
function recalculateSizes(
  baseSize: SizeKey,
  baseData: MeasurementPoint[],
  availableSizes: SizeKey[]
): Record<SizeKey, MeasurementPoint[]> {
  const baseIndex = STANDARD_SIZES.indexOf(baseSize);
  const result: Record<SizeKey, MeasurementPoint[]> = {} as any;
  
  availableSizes.forEach((size) => {
    const sizeIndex = STANDARD_SIZES.indexOf(size);
    const diff = sizeIndex - baseIndex;
    
    result[size] = baseData.map(measurement => {
      // Variação: ±2cm para circunferências, ±1.5cm para comprimento
      const variation = measurement.id === 'length' ? 1.5 : 2;
      const newValue = Math.max(0, measurement.value + (diff * variation));
      
      return {
        ...measurement,
        value: newValue,
      };
    });
  });
  
  return result;
}

// Função para obter tamanhos baseados na grade selecionada
function getSizesForGrade(
  sizeCategory?: 'standard' | 'plus' | 'numeric' | 'baby' | 'kids_numeric' | 'teen',
  targetAudience?: 'female' | 'male' | 'kids'
): string[] {
  if (targetAudience === 'kids') {
    if (sizeCategory === 'baby') {
      return ['RN', '3M', '6M', '9M', '12M'];
    } else if (sizeCategory === 'kids_numeric') {
      return ['2', '4', '6', '8', '10'];
    } else if (sizeCategory === 'teen') {
      return ['12', '14', '16'];
    }
    } else {
      // Adulto
      if (sizeCategory === 'numeric') {
        return ['36', '38', '40', '42', '44', '46'];
      } else if (sizeCategory === 'plus') {
        return ['G1', 'G2', 'G3', 'G4', 'G5'];
      } else {
        // standard (padrão) - PP até GG (sem XG para manter compatibilidade com a maioria dos produtos)
        return ['PP', 'P', 'M', 'G', 'GG'];
      }
    }
  // Fallback para padrão (PP até GG)
  return ['PP', 'P', 'M', 'G', 'GG'];
}

export function SmartMeasurementEditor({
  rawImageUrl,
  rawImageFile,
  lojistaId,
  produtoId,
  productInfo,
  onImageUpload,
  onMeasurementsChange,
  onSave,
  initialData,
  uploading = false,
  variacoes = [],
  sizeCategory,
  targetAudience,
  className = "",
}: SmartMeasurementEditorProps) {
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const lastImageKeyRef = useRef<string>("");
  const isProcessingRef = useRef<boolean>(false);
  
  // Determinar tamanhos disponíveis: priorizar grade selecionada, depois variações, depois padrão
  const gradeSizes = getSizesForGrade(sizeCategory, targetAudience);
  
  // DEBUG: Log da grade selecionada
  console.log("[SmartMeasurementEditor] 📏 Grade selecionada:", {
    sizeCategory,
    targetAudience,
    gradeSizes,
    variacoes: variacoes.map(v => v.variacao),
  });
  
  // CRÍTICO: Priorizar grade selecionada sobre variações
  // Se temos sizeCategory e targetAudience definidos, usar a grade correta COMPLETA
  // Variações são apenas para estoque, não devem limitar os botões de tamanho ativo
  let availableSizes: string[] = [];
  
  if (sizeCategory && targetAudience && gradeSizes.length > 0) {
    // CRÍTICO: Sempre usar a grade completa quando temos grade selecionada
    // As variações são apenas para controle de estoque, não devem limitar os tamanhos disponíveis
    availableSizes = gradeSizes;
    
    console.log("[SmartMeasurementEditor] ✅ Usando grade completa:", {
      sizeCategory,
      targetAudience,
      gradeSizes,
      variacoesCount: variacoes.length,
      availableSizes,
    });
  } else if (variacoes.length > 0) {
    // Se não temos grade definida, usar variações (compatibilidade)
    availableSizes = variacoes.map(v => v.variacao.toUpperCase());
  } else {
    // Fallback para padrão (PP até GG, sem XG)
    availableSizes = ['PP', 'P', 'M', 'G', 'GG'];
  }
  
  // DEBUG: Log dos tamanhos disponíveis
  console.log("[SmartMeasurementEditor] 📋 Tamanhos disponíveis:", availableSizes);
  
  // Converter para SizeKey quando necessário (para compatibilidade com funções existentes)
  const availableSizesAsSizeKey = availableSizes.map(s => s as SizeKey);
  
  // Estado do componente
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(
    initialData?.baseImage || null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  
  // CRÍTICO: Calcular o tamanho inicial correto baseado na grade selecionada
  // PRIORIDADE 1: Usar o activeSize salvo (se existir e estiver disponível)
  // PRIORIDADE 2: Se não houver salvo, usar o tamanho INTERMEDIÁRIO (meio da grade) como padrão
  const getInitialActiveSize = (): string => {
    // PRIORIDADE 1: Verificar se há activeSize salvo e se está disponível
    if (initialData?.activeSize && availableSizes.includes(initialData.activeSize as string)) {
      console.log("[SmartMeasurementEditor] ✅ Usando tamanho salvo anteriormente:", initialData.activeSize);
      return initialData.activeSize as string;
    }
    
    // PRIORIDADE 2: Usar o tamanho INTERMEDIÁRIO (meio da grade) como padrão apenas se não houver salvo
    if (availableSizes.length > 0) {
      const middleIndex = Math.floor(availableSizes.length / 2);
      const middleSize = availableSizes[middleIndex] || availableSizes[0];
      console.log("[SmartMeasurementEditor] 🎯 Selecionando tamanho intermediário como padrão (sem tamanho salvo):", {
        availableSizes,
        middleIndex,
        middleSize
      });
      return middleSize;
    }
    // Fallback apenas se não houver tamanhos disponíveis
    return 'M';
  };
  
  const [activeSize, setActiveSize] = useState<string>(getInitialActiveSize());
  
  // DEBUG: Log do tamanho ativo inicial
  console.log("[SmartMeasurementEditor] 🎯 Tamanho ativo inicial:", activeSize);
  const [autoGrading, setAutoGrading] = useState<boolean>(
    initialData?.autoGrading ?? true
  );
  
  // NOVA ARQUITETURA: Geometria FIXA (imutável) separada de Valores (variáveis por tamanho)
  const [geometry, setGeometry] = useState<MeasurementGeometry[]>([]);
  const [measurementValues, setMeasurementValues] = useState<MeasurementValues>({});
  
  // Função helper para verificar se uma medida específica vem da ABNT
  const isABNTMeasurement = (measurementId: string, size: string): boolean => {
    if (!targetAudience) return false;
    const abntData = getStandardMeasurements(targetAudience, size);
    if (!abntData) return false;
    
    // Verificar se a medida existe na tabela ABNT
    if (measurementId === 'bust' && abntData.bust !== undefined) return true;
    if (measurementId === 'waist' && abntData.waist !== undefined) return true;
    if (measurementId === 'hip' && abntData.hip !== undefined) return true;
    if (measurementId === 'length' && abntData.length !== undefined) return true;
    
    return false;
  };
  
  // NOVO: Suporte para múltiplos grupos (ex: biquíni = top + calcinha)
  const [measurementGroups, setMeasurementGroups] = useState<Array<{
    id: string;
    label: string;
    geometry: MeasurementGeometry[];
    values: MeasurementValues;
  }>>([]);
  
  // Estados legados (manter para compatibilidade inicial)
  const [sizes, setSizes] = useState<Record<SizeKey, MeasurementPoint[]>>(
    initialData?.sizes || ({} as Record<SizeKey, MeasurementPoint[]>)
  );
  
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<any>(null); // Landmarks detectados pela IA
  const [isDetectingLandmarks, setIsDetectingLandmarks] = useState(false);
  const [landmarksWarning, setLandmarksWarning] = useState<string | null>(null);
  
  // Estados para zoom interativo e guia visual
  const [showGuide, setShowGuide] = useState(false);
  const [zoomPosition, setZoomPosition] = useState<{ x: number; y: number } | null>(null);
  const [zoomActive, setZoomActive] = useState(false);

  const getSetLabels = () => {
    const type = (productInfo?.productType || "").toLowerCase();
    const cat = (productInfo?.category || "").toLowerCase();
    const combined = `${cat} ${type}`;

    const topLabel =
      combined.includes("cropped") ? "Cropped" :
      combined.includes("camisa") ? "Camisa" :
      combined.includes("camiseta") ? "Camiseta" :
      combined.includes("regata") ? "Regata" :
      combined.includes("blusa") ? "Blusa" :
      combined.includes("colete") ? "Colete" :
      "Parte de cima";

    const bottomLabel =
      combined.includes("saia") ? "Saia" :
      combined.includes("short") ? "Short" :
      combined.includes("bermuda") ? "Bermuda" :
      combined.includes("calça") || combined.includes("pants") ? "Calça" :
      combined.includes("legging") ? "Legging" :
      "Parte de baixo";

    return { topLabel, bottomLabel };
  };

  // CRÍTICO: Atualizar activeSize quando grade ou público alvo mudar (garantir que sempre use a grade correta)
  // IMPORTANTE: Só atualizar se o tamanho atual não estiver disponível na nova grade
  // NÃO forçar o intermediário se o usuário já selecionou um tamanho
  useEffect(() => {
    // Recalcular tamanhos disponíveis quando grade mudar
    const newGradeSizes = getSizesForGrade(sizeCategory, targetAudience);
    const newAvailableSizes: string[] = variacoes.length > 0
      ? variacoes.map(v => v.variacao.toUpperCase()).filter(s => 
          newGradeSizes.includes(s) || STANDARD_SIZES.includes(s as SizeKey)
        )
      : (newGradeSizes.length > 0 ? newGradeSizes : STANDARD_SIZES.map(s => s as string));
    
    console.log("[SmartMeasurementEditor] 🔄 Grade mudou, recalculando:", {
      sizeCategory,
      targetAudience,
      newGradeSizes,
      newAvailableSizes,
      currentActiveSize: activeSize,
    });
    
    if (newAvailableSizes.length > 0) {
      // Se o activeSize atual não está na lista de tamanhos disponíveis, atualizar para o intermediário
      // Mas se estiver disponível, manter o selecionado (não forçar mudança)
      if (!newAvailableSizes.includes(activeSize)) {
        const middleIndex = Math.floor(newAvailableSizes.length / 2);
        const middleSize = newAvailableSizes[middleIndex] || newAvailableSizes[0];
        console.log("[SmartMeasurementEditor] ✅ Tamanho atual não disponível na nova grade, atualizando para intermediário:", {
          grade: sizeCategory,
          availableSizes: newAvailableSizes,
          middleIndex,
          middleSize,
          previousActiveSize: activeSize,
        });
        setActiveSize(middleSize);
      } else {
        // Tamanho atual está disponível na nova grade, manter selecionado
        console.log("[SmartMeasurementEditor] ✅ Tamanho atual está disponível na nova grade, mantendo selecionado:", {
          grade: sizeCategory,
          availableSizes: newAvailableSizes,
          currentActiveSize: activeSize,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizeCategory, targetAudience, variacoes.length]); // Atualizar quando grade ou público alvo mudar

  // Resetar estado quando nova imagem RAW for carregada
    useEffect(() => {
      const currentImageKey = rawImageFile?.name || rawImageUrl || "";
      
      if (currentImageKey && currentImageKey !== lastImageKeyRef.current) {
        console.log("[SmartMeasurementEditor] 🔄 Nova imagem RAW detectada:", currentImageKey.substring(0, 50));
        lastImageKeyRef.current = currentImageKey;
      
      // Resetar TODOS os estados processados para permitir novo fluxo sequencial
      setProcessedImageUrl(null);
      setSizes({} as Record<SizeKey, MeasurementPoint[]>);
      setGeometry([]); // Limpar geometria fixa
      setMeasurementValues({}); // Limpar valores de medidas
      setError(null);
      setSaved(false);
      setLandmarks(null); // Limpar landmarks anteriores
      setLandmarksWarning(null);
      setIsDetectingLandmarks(false); // Limpar estado de detecção
    }
  }, [rawImageFile, rawImageUrl]);

  // FLUXO SEQUENCIAL: Detectar landmarks AUTOMATICAMENTE APENAS após processedImageUrl estar disponível
  // Este useEffect é o "pulo do gato": SÓ roda quando temos a imagem processada final
  // MAS: Se já temos medidas carregadas automaticamente (do initialData), não precisa detectar novamente
  useEffect(() => {
    const detectLandmarksAutomatically = async () => {
      // Se já temos geometria e valores de medidas (carregados automaticamente), não detectar novamente
      if (geometry.length > 0 && Object.keys(measurementValues).length > 0) {
        console.log("[SmartMeasurementEditor] ✅ Medidas já carregadas automaticamente, ignorando detecção de landmarks...");
        return;
      }
      
      // CRÍTICO: Só detectar landmarks na IMAGEM PROCESSADA, não na RAW
      if (!processedImageUrl) {
        console.log("[SmartMeasurementEditor] ⏳ Aguardando imagem processada para detectar landmarks...");
        return; // Aguardar processedImageUrl
      }

      // Se já temos landmarks, não detectar novamente (a menos que a imagem tenha mudado)
      if (landmarks && !isDetectingLandmarks) {
        console.log("[SmartMeasurementEditor] ✅ Landmarks já detectados, ignorando...");
        return;
      }

      // Só detectar se temos categoria e ainda não estamos detectando
      if (!productInfo?.category || isDetectingLandmarks) {
        return;
      }

      try {
        setIsDetectingLandmarks(true);
        console.log("[SmartMeasurementEditor] 🤖 Detectando landmarks na IMAGEM PROCESSADA:", processedImageUrl.substring(0, 100) + "...");

        // IMPORTANTE: Usar APENAS a imagem processada, não a RAW
        const response = await fetch(
          `/api/lojista/products/detect-landmarks?lojistaId=${lojistaId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              imageUrl: processedImageUrl, // CRÍTICO: Usar processedImageUrl, não rawImageUrl
              category: productInfo.category,
            }),
          }
        );

        if (!response.ok) {
          // Se for erro 429, não lançar exceção, tratar como fallback
          if (response.status === 429) {
            console.warn("[SmartMeasurementEditor] ⚠️ Erro 429 (Resource Exhausted), usando fallback");
            setLandmarksWarning("Limite de requisições atingido. Usando medidas padrão.");
            throw new Error("429_RESOURCE_EXHAUSTED"); // Lançar erro especial para ser capturado no catch
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        // Tratamento de erro 429 (Resource Exhausted) - usar fallback
        if (!result.success && (result.error?.includes?.("429") || result.error?.includes?.("Resource exhausted"))) {
          console.warn("[SmartMeasurementEditor] ⚠️ Erro 429 detectado no resultado, usando fallback para landmarks");
          setLandmarksWarning("Limite de requisições atingido. Usando medidas padrão.");
          // Usar fallback e continuar processamento
          const fallbackLandmarks = getFallbackLandmarks(productInfo.category);
          setLandmarks(fallbackLandmarks);
          // Continuar com o processamento usando fallback
          result.data = fallbackLandmarks;
          result.success = true;
          result.fallback = true;
        }

        if (result.success && result.data) {
          console.log("[SmartMeasurementEditor] ✅ Landmarks detectados:", result.data);
          setLandmarks(result.data);
          
          // Se foi usado fallback, mostrar alerta sutil
          if (result.fallback) {
            setLandmarksWarning("Ajuste fino sugerido: usando posições padrão");
          }

          // Verificar se é produto multi-item (ex: biquíni, conjunto)
          // Passar também description e name se disponíveis
          // IMPORTANTE: Tentar obter name/description de múltiplas fontes
          const productName = (productInfo as any)?.name || (productInfo as any)?.nome || (productInfo as any)?.suggestedName || "";
          const productDesc = (productInfo as any)?.description || (productInfo as any)?.descricao || (productInfo as any)?.suggestedDescription || "";
          
          const multiKind = detectMultiItemKind({
            category: productInfo.category,
            productType: productInfo.productType,
            description: productDesc,
            name: productName,
          });

          console.log("[SmartMeasurementEditor] 🔍 Verificação de multi-item:", {
            category: productInfo.category,
            productType: productInfo.productType,
            name: productName,
            description: productDesc?.substring(0, 100),
            multiKind: multiKind,
          });

          if (multiKind) {
            // PRODUTO MULTI-ITEM: Criar grupos separados
            console.log("[SmartMeasurementEditor] 🧩 Produto multi-item detectado:", multiKind);
            
            const groups: Array<{
              id: string;
              label: string;
              geometry: MeasurementGeometry[];
              values: MeasurementValues;
            }> = [];

            const setLabels = getSetLabels();

            // Grupo 1: Parte de cima
            const topRelevantIds = inferRelevantMeasurementIds({
              category: productInfo.category,
              productType: productInfo.productType,
              itemType: multiKind === "BIKINI" ? "bikini_top" : "set_top",
            });
            
            console.log("[SmartMeasurementEditor] 🔍 Grupo TOP - Medidas relevantes:", {
              category: productInfo.category,
              productType: productInfo.productType,
              relevantIds: topRelevantIds,
            });
            
            const topGeometry = extractGeometry(result.data, productInfo.category, topRelevantIds, productInfo.productType);
            
            console.log("[SmartMeasurementEditor] 📐 Grupo TOP - Geometria extraída:", {
              count: topGeometry.length,
              ids: topGeometry.map(g => g.id),
              labels: topGeometry.map(g => g.label),
            });
            
            // CRÍTICO: Se é cropped/top e busto é relevante mas não foi extraído, adicionar manualmente
            if (topRelevantIds.includes('bust') && !topGeometry.some(g => g.id === 'bust')) {
              console.log("[SmartMeasurementEditor] ⚠️ Busto não foi extraído, adicionando coordenadas padrão para cropped/top");
              topGeometry.push({
                id: 'bust',
                label: 'Busto',
                startX: 30,
                startY: 35,
                endX: 70,
                endY: 35,
              });
            }
            
            if (topGeometry.length > 0) {
              const topDefaultValuesM: Record<string, number> = {
                bust: productInfo?.standardMeasurements?.bust ?? 44,
                length: productInfo?.standardMeasurements?.length ?? 60,
              };
              const topValues = createInitialMeasurementValues(
                topGeometry,
                topDefaultValuesM,
                availableSizesAsSizeKey,
                targetAudience
              );
              groups.push({
                id: "top",
                label: multiKind === "BIKINI" ? "Top" : setLabels.topLabel,
                geometry: topGeometry,
                values: topValues,
              });
            }

            // Grupo 2: Parte de baixo
            const bottomRelevantIds = inferRelevantMeasurementIds({
              category: productInfo.category,
              productType: productInfo.productType,
              itemType: multiKind === "BIKINI" ? "bikini_bottom" : "set_bottom",
            });
            
            console.log("[SmartMeasurementEditor] 🔍 Grupo BOTTOM - Medidas relevantes:", {
              category: productInfo.category,
              productType: productInfo.productType,
              relevantIds: bottomRelevantIds,
            });
            
            const bottomGeometry = extractGeometry(result.data, productInfo.category, bottomRelevantIds, productInfo.productType);
            
            console.log("[SmartMeasurementEditor] 📐 Grupo BOTTOM - Geometria extraída:", {
              count: bottomGeometry.length,
              ids: bottomGeometry.map(g => g.id),
              labels: bottomGeometry.map(g => g.label),
            });
            
            // CRÍTICO: Se é bottom e não foi extraída geometria, criar com medidas padrão
            if (bottomGeometry.length === 0 && bottomRelevantIds.length > 0) {
              console.log("[SmartMeasurementEditor] ⚠️ Nenhuma geometria extraída para bottom, criando com coordenadas padrão");
              // Criar geometria padrão baseada nas medidas relevantes
              bottomRelevantIds.forEach((id: string) => {
                if (id === 'waist') {
                  bottomGeometry.push({
                    id: 'waist',
                    label: 'Cintura',
                    startX: 30,
                    startY: 20,
                    endX: 70,
                    endY: 20,
                  });
                } else if (id === 'hip' || id === 'hips') {
                  bottomGeometry.push({
                    id: 'hip',
                    label: 'Quadril',
                    startX: 30,
                    startY: 60,
                    endX: 70,
                    endY: 60,
                  });
                } else if (id === 'length') {
                  bottomGeometry.push({
                    id: 'length',
                    label: 'Comprimento',
                    startX: 50,
                    startY: 20,
                    endX: 50,
                    endY: 85,
                  });
                }
              });
            }
            
            if (bottomGeometry.length > 0) {
              const bottomDefaultValuesM: Record<string, number> = {
                waist: productInfo?.standardMeasurements?.waist ?? 40,
                hip: productInfo?.standardMeasurements?.hip ?? 44,
                length: productInfo?.standardMeasurements?.length ?? 25,
              };
              const bottomValues = createInitialMeasurementValues(
                bottomGeometry,
                bottomDefaultValuesM,
                availableSizesAsSizeKey,
                targetAudience
              );
              groups.push({
                id: "bottom",
                label: multiKind === "BIKINI" ? "Calcinha" : setLabels.bottomLabel,
                geometry: bottomGeometry,
                values: bottomValues,
              });
            } else {
              console.error("[SmartMeasurementEditor] ❌ ERRO: Nenhuma medida relevante encontrada para bottom!");
            }

            if (groups.length > 0) {
              setMeasurementGroups(groups);
              
              // CRÍTICO: Selecionar tamanho intermediário automaticamente após criar grupos
              if (availableSizes.length > 0) {
                const middleIndex = Math.floor(availableSizes.length / 2);
                const middleSize = availableSizes[middleIndex] || availableSizes[0];
                console.log("[SmartMeasurementEditor] 🎯 Selecionando tamanho intermediário após análise (grupos):", {
                  availableSizes,
                  middleIndex,
                  middleSize
                });
                setActiveSize(middleSize);
              }
              
              console.log("[SmartMeasurementEditor] 📐 Grupos de medidas criados:", groups);
            }
          } else {
            // PRODUTO ÚNICO: Lógica original
            const relevantIds = inferRelevantMeasurementIds({
              category: productInfo.category,
              productType: productInfo.productType,
            });
            
            console.log("[SmartMeasurementEditor] 🔍 Determinando medidas relevantes:", {
              category: productInfo.category,
              productType: productInfo.productType,
              relevantIds,
              landmarksKeys: Object.keys(result.data || {}),
            });
            
            const extractedGeometry = extractGeometry(result.data, productInfo.category, relevantIds, productInfo.productType);
            
            console.log("[SmartMeasurementEditor] 📐 Geometria extraída:", {
              count: extractedGeometry.length,
              ids: extractedGeometry.map(g => g.id),
              labels: extractedGeometry.map(g => g.label),
            });
            
            if (extractedGeometry.length > 0) {
              setGeometry(extractedGeometry);
              
              // CRÍTICO: Usar medidas padrão da análise inicial, com fallback inteligente
              const standardMeas = productInfo?.standardMeasurements || {};
              
              // Valores padrão baseados na análise ou medidas padrão
              // IMPORTANTE: Se a análise retornou apenas algumas medidas (ex: só length), usar valores padrão para as outras
              const defaultValuesM: Record<string, number> = {};
              
              if (standardMeas.bust !== undefined || relevantIds.includes('bust')) {
                defaultValuesM.bust = standardMeas.bust || 44;
              }
              if (standardMeas.waist !== undefined || relevantIds.includes('waist')) {
                defaultValuesM.waist = standardMeas.waist || 40;
              }
              if (standardMeas.hip !== undefined || relevantIds.includes('hip')) {
                defaultValuesM.hip = standardMeas.hip || 44;
              }
              if (standardMeas.length !== undefined || relevantIds.includes('length')) {
                defaultValuesM.length = standardMeas.length || 60;
              }
              
              console.log("[SmartMeasurementEditor] 📏 Usando medidas padrão:", {
                standardMeasurements: standardMeas,
                defaultValuesM,
                relevantIds,
              });
              
              // Criar valores iniciais para TODOS os tamanhos (garantindo que o tamanho médio tenha tudo)
              const initialValues = createInitialMeasurementValues(
                extractedGeometry,
                defaultValuesM,
                availableSizesAsSizeKey,
                targetAudience
              );
              setMeasurementValues(initialValues);
              
              // CRÍTICO: Selecionar tamanho intermediário automaticamente após criar valores
              if (availableSizes.length > 0) {
                const middleIndex = Math.floor(availableSizes.length / 2);
                const middleSize = availableSizes[middleIndex] || availableSizes[0];
                console.log("[SmartMeasurementEditor] 🎯 Selecionando tamanho intermediário após análise:", {
                  availableSizes,
                  middleIndex,
                  middleSize,
                  currentActiveSize: activeSize
                });
                setActiveSize(middleSize);
              }
              
              console.log("[SmartMeasurementEditor] 📐 Geometria e valores criados:", { extractedGeometry, initialValues });
            } else {
              console.warn("[SmartMeasurementEditor] ⚠️ Nenhuma geometria extraída! Verificar se landmarks contêm dados necessários.");
              
              // CRÍTICO: Mesmo sem geometria extraída, se temos medidas padrão da análise, criar geometria básica
              if (productInfo?.standardMeasurements && relevantIds.length > 0) {
                console.log("[SmartMeasurementEditor] 🔧 Criando geometria básica a partir de medidas padrão:", productInfo.standardMeasurements);
                
                const basicGeometry: MeasurementGeometry[] = [];
                relevantIds.forEach((id: string) => {
                  if (id === 'bust' && productInfo.standardMeasurements?.bust) {
                    basicGeometry.push({
                      id: 'bust',
                      label: 'Busto',
                      startX: 30,
                      startY: 35,
                      endX: 70,
                      endY: 35,
                    });
                  } else if (id === 'waist' && productInfo.standardMeasurements?.waist) {
                    basicGeometry.push({
                      id: 'waist',
                      label: 'Cintura',
                      startX: 30,
                      startY: 50,
                      endX: 70,
                      endY: 50,
                    });
                  } else if (id === 'hip' && productInfo.standardMeasurements?.hip) {
                    basicGeometry.push({
                      id: 'hip',
                      label: 'Quadril',
                      startX: 30,
                      startY: 60,
                      endX: 70,
                      endY: 60,
                    });
                  } else if (id === 'length' && productInfo.standardMeasurements?.length) {
                    basicGeometry.push({
                      id: 'length',
                      label: 'Comprimento',
                      startX: 50,
                      startY: 15,
                      endX: 50,
                      endY: 85,
                    });
                  }
                });
                
                if (basicGeometry.length > 0) {
                  setGeometry(basicGeometry);
                  
                  const defaultValuesM: Record<string, number> = {};
                  basicGeometry.forEach(geo => {
                    const value = productInfo.standardMeasurements?.[geo.id as keyof typeof productInfo.standardMeasurements] as number | undefined;
                    if (value !== undefined) {
                      defaultValuesM[geo.id] = value;
                    }
                  });
                  
                  const initialValues = createInitialMeasurementValues(
                    basicGeometry,
                    defaultValuesM,
                    availableSizesAsSizeKey,
                    targetAudience
                  );
                  setMeasurementValues(initialValues);
                  
                  // CRÍTICO: Selecionar tamanho intermediário automaticamente após criar valores
                  if (availableSizes.length > 0) {
                    const middleIndex = Math.floor(availableSizes.length / 2);
                    const middleSize = availableSizes[middleIndex] || availableSizes[0];
                    console.log("[SmartMeasurementEditor] 🎯 Selecionando tamanho intermediário após análise (geometria básica):", {
                      availableSizes,
                      middleIndex,
                      middleSize
                    });
                    setActiveSize(middleSize);
                  }
                  
                  console.log("[SmartMeasurementEditor] ✅ Geometria básica criada a partir de medidas padrão:", { basicGeometry, initialValues });
                }
              }
            }
          }
        }
      } catch (err: any) {
        const is429Error = err?.message?.includes("429") || err?.message === "429_RESOURCE_EXHAUSTED";
        console.error("[SmartMeasurementEditor] ❌ Erro ao detectar landmarks:", err);
        
        // Usar fallback silenciosamente
        const fallbackLandmarks = getFallbackLandmarks(productInfo.category);
        setLandmarks(fallbackLandmarks);
        
        if (is429Error) {
          setLandmarksWarning("Limite de requisições atingido. Usando medidas padrão.");
        } else {
          setLandmarksWarning("Ajuste fino sugerido: usando posições padrão");
        }
        
        // Verificar se é produto multi-item (ex: biquíni, conjunto)
        // Passar também description e name se disponíveis
        // IMPORTANTE: Tentar obter name/description de múltiplas fontes
        const productName = (productInfo as any)?.name || (productInfo as any)?.nome || (productInfo as any)?.suggestedName || "";
        const productDesc = (productInfo as any)?.description || (productInfo as any)?.descricao || (productInfo as any)?.suggestedDescription || "";
        
        const multiKind = detectMultiItemKind({
          category: productInfo.category,
          productType: productInfo.productType,
          description: productDesc,
          name: productName,
        });

        // HEURÍSTICA VISUAL: Se não detectou como conjunto mas a imagem tem duas peças claras
        // (detectado pela presença de landmarks de top E bottom), forçar detecção como conjunto
        // NOTA: No bloco catch, não temos acesso a result.data, então pulamos essa verificação
        let finalMultiKind = multiKind;

        // HEURÍSTICA FINAL: Se productType é "Short" mas há evidências de conjunto no nome/descrição
        // Forçar detecção como conjunto mesmo sem landmarks
        if (!finalMultiKind && productInfo.productType?.toLowerCase() === "short") {
          const combinedText = `${productName} ${productDesc}`.toLowerCase();
          const hasConjuntoEvidence = combinedText.includes("conjunto") || 
                                      combinedText.includes("cropped") || 
                                      combinedText.includes("top") ||
                                      (combinedText.includes("short") && (combinedText.includes("cropped") || combinedText.includes("top")));
          
          if (hasConjuntoEvidence) {
            console.log("[SmartMeasurementEditor] 🔍 Heurística FINAL: 'Short' com evidências de conjunto no nome/descrição → forçando conjunto");
            finalMultiKind = "SET_TOP_BOTTOM";
          }
        }

        // HEURÍSTICA ULTRA-FINAL: Se productType contém "Conjunto" (mesmo parcialmente), forçar detecção
        if (!finalMultiKind && productInfo.productType?.toLowerCase().includes("conjunto")) {
          console.log("[SmartMeasurementEditor] 🔍 Heurística ULTRA-FINAL: productType contém 'Conjunto' → forçando conjunto");
          finalMultiKind = "SET_TOP_BOTTOM";
        }

        if (finalMultiKind) {
          // PRODUTO MULTI-ITEM: Criar grupos separados
          const groups: Array<{
            id: string;
            label: string;
            geometry: MeasurementGeometry[];
            values: MeasurementValues;
          }> = [];

          // Grupo 1: Top
          const topRelevantIds = inferRelevantMeasurementIds({
            category: productInfo.category,
            productType: productInfo.productType,
            itemType: multiKind === "BIKINI" ? "bikini_top" : "set_top",
          });
          
          console.log("[SmartMeasurementEditor] 🔍 Fallback - Grupo TOP - Medidas relevantes:", {
            category: productInfo.category,
            productType: productInfo.productType,
            relevantIds: topRelevantIds,
          });
          
          const topGeometry = extractGeometry(fallbackLandmarks, productInfo.category, topRelevantIds, productInfo.productType);
          
          // CRÍTICO: Se é cropped/top e busto é relevante mas não foi extraído, adicionar manualmente
          if (topRelevantIds.includes('bust') && !topGeometry.some(g => g.id === 'bust')) {
            console.log("[SmartMeasurementEditor] ⚠️ Fallback - Busto não foi extraído, adicionando coordenadas padrão para cropped/top");
            topGeometry.push({
              id: 'bust',
              label: 'Busto',
              startX: 30,
              startY: 35,
              endX: 70,
              endY: 35,
            });
          }
          
          console.log("[SmartMeasurementEditor] 📐 Fallback - Grupo TOP - Geometria extraída:", {
            count: topGeometry.length,
            ids: topGeometry.map(g => g.id),
            labels: topGeometry.map(g => g.label),
          });
          
          if (topGeometry.length > 0) {
            const topDefaultValuesM = {
              bust: productInfo?.standardMeasurements?.bust || 44,
              length: productInfo?.standardMeasurements?.length || 60,
            };
            const topValues = createInitialMeasurementValues(
              topGeometry,
              topDefaultValuesM,
              availableSizesAsSizeKey,
              targetAudience
            );
            groups.push({
              id: "top",
              label: multiKind === "BIKINI" ? "Top" : getSetLabels().topLabel,
              geometry: topGeometry,
              values: topValues,
            });
          }

          // Grupo 2: Calcinha
          const bottomRelevantIds = inferRelevantMeasurementIds({
            category: productInfo.category,
            productType: productInfo.productType,
            itemType: multiKind === "BIKINI" ? "bikini_bottom" : "set_bottom",
          });
          
          console.log("[SmartMeasurementEditor] 🔍 Fallback - Grupo BOTTOM - Medidas relevantes:", {
            category: productInfo.category,
            productType: productInfo.productType,
            relevantIds: bottomRelevantIds,
          });
          
          const bottomGeometry = extractGeometry(fallbackLandmarks, productInfo.category, bottomRelevantIds, productInfo.productType);
          
          // CRÍTICO: Se é bottom e não foi extraída geometria, criar com medidas padrão
          if (bottomGeometry.length === 0 && bottomRelevantIds.length > 0) {
            console.log("[SmartMeasurementEditor] ⚠️ Fallback - Nenhuma geometria extraída para bottom, criando com coordenadas padrão");
            // Criar geometria padrão baseada nas medidas relevantes
            bottomRelevantIds.forEach((id: string) => {
              if (id === 'waist') {
                bottomGeometry.push({
                  id: 'waist',
                  label: 'Cintura',
                  startX: 30,
                  startY: 20,
                  endX: 70,
                  endY: 20,
                });
              } else if (id === 'hip' || id === 'hips') {
                bottomGeometry.push({
                  id: 'hip',
                  label: 'Quadril',
                  startX: 30,
                  startY: 60,
                  endX: 70,
                  endY: 60,
                });
              } else if (id === 'length') {
                bottomGeometry.push({
                  id: 'length',
                  label: 'Comprimento',
                  startX: 50,
                  startY: 20,
                  endX: 50,
                  endY: 85,
                });
              }
            });
          }
          
          console.log("[SmartMeasurementEditor] 📐 Fallback - Grupo BOTTOM - Geometria extraída:", {
            count: bottomGeometry.length,
            ids: bottomGeometry.map(g => g.id),
            labels: bottomGeometry.map(g => g.label),
          });
          
          if (bottomGeometry.length > 0) {
            const bottomDefaultValuesM = {
              waist: productInfo?.standardMeasurements?.waist || 40,
              hip: productInfo?.standardMeasurements?.hip || 44,
              length: productInfo?.standardMeasurements?.length || 25,
            };
            const bottomValues = createInitialMeasurementValues(
              bottomGeometry,
              bottomDefaultValuesM,
              availableSizesAsSizeKey,
              targetAudience
            );
            groups.push({
              id: "bottom",
              label: multiKind === "BIKINI" ? "Calcinha" : getSetLabels().bottomLabel,
              geometry: bottomGeometry,
              values: bottomValues,
            });
          } else {
            console.error("[SmartMeasurementEditor] ❌ Fallback - ERRO: Nenhuma medida relevante encontrada para bottom!");
          }

          if (groups.length > 0) {
            setMeasurementGroups(groups);
            
            // CRÍTICO: Selecionar tamanho intermediário automaticamente após criar grupos (fallback)
            if (availableSizes.length > 0) {
              const middleIndex = Math.floor(availableSizes.length / 2);
              const middleSize = availableSizes[middleIndex] || availableSizes[0];
              console.log("[SmartMeasurementEditor] 🎯 Selecionando tamanho intermediário após análise (grupos fallback):", {
                availableSizes,
                middleIndex,
                middleSize
              });
              setActiveSize(middleSize);
            }
          }
        } else {
        // PRODUTO ÚNICO: Lógica original
        const relevantIds = inferRelevantMeasurementIds({
          category: productInfo.category,
          productType: productInfo.productType,
        });
        
        console.log("[SmartMeasurementEditor] 🔍 Fallback - Determinando medidas relevantes:", {
          category: productInfo.category,
          productType: productInfo.productType,
          relevantIds,
        });
        
        const extractedGeometry = extractGeometry(fallbackLandmarks, productInfo.category, relevantIds, productInfo.productType);
        
        console.log("[SmartMeasurementEditor] 📐 Fallback - Geometria extraída:", {
          count: extractedGeometry.length,
          ids: extractedGeometry.map(g => g.id),
          labels: extractedGeometry.map(g => g.label),
        });
        
        if (extractedGeometry.length > 0) {
          setGeometry(extractedGeometry);
          const standardMeas = productInfo?.standardMeasurements || {};
          const defaultValuesM: Record<string, number> = {
            bust: standardMeas.bust ?? 44,
            waist: standardMeas.waist ?? 40,
            hip: standardMeas.hip ?? 44,
            length: standardMeas.length ?? 60,
          };
          const initialValues = createInitialMeasurementValues(
            extractedGeometry,
            defaultValuesM,
            availableSizesAsSizeKey,
            targetAudience
          );
          setMeasurementValues(initialValues);
          
          // CRÍTICO: Selecionar tamanho intermediário automaticamente após criar valores
          if (availableSizes.length > 0) {
            const middleIndex = Math.floor(availableSizes.length / 2);
            const middleSize = availableSizes[middleIndex] || availableSizes[0];
            console.log("[SmartMeasurementEditor] 🎯 Selecionando tamanho intermediário após análise (fallback):", {
              availableSizes,
              middleIndex,
              middleSize
            });
            setActiveSize(middleSize);
          }
        } else {
          console.warn("[SmartMeasurementEditor] ⚠️ Fallback - Nenhuma geometria extraída!");
        }
        }
      } finally {
        setIsDetectingLandmarks(false);
      }
    };

    detectLandmarksAutomatically();
  }, [processedImageUrl, productInfo?.category, lojistaId]); // CRÍTICO: Remover rawImageUrl e landmarks das dependências

  // Carregar dados iniciais se houver (incluindo medidas já detectadas automaticamente)
  // Este useEffect deve rodar sempre que initialData mudar
  useEffect(() => {
    console.log("[SmartMeasurementEditor] 🔄 Verificando initialData:", {
      hasInitialData: !!initialData,
      hasSizes: !!(initialData?.sizes && Object.keys(initialData.sizes).length > 0),
      sizesKeys: initialData?.sizes ? Object.keys(initialData.sizes) : [],
      currentSizesKeys: Object.keys(sizes),
      currentGeometryCount: geometry.length,
      currentValuesCount: Object.keys(measurementValues).length,
    });
    
    if (initialData) {
      // Se temos medidas já processadas (sizes), usar diretamente sem precisar de imagem processada
      if (initialData.sizes && Object.keys(initialData.sizes).length > 0) {
        // Verificar se já temos os mesmos dados carregados para evitar loops
        const firstSize = (initialData.activeSize || Object.keys(initialData.sizes)[0]) as SizeKey;
        const measurementPoints = initialData.sizes[firstSize] || [];
        
        // Só atualizar se realmente houver medidas e se ainda não foram carregadas
        if (measurementPoints.length > 0) {
          // PRIORIDADE 1: Usar o activeSize salvo (se existir e estiver disponível)
          // PRIORIDADE 2: Se não houver salvo, usar o tamanho intermediário da grade atual
          const currentGradeSizes = getSizesForGrade(sizeCategory, targetAudience);
          const availableSizesFromData = initialData.sizes 
            ? Object.keys(initialData.sizes).filter(size => 
                initialData.sizes![size as SizeKey]?.length > 0
              ) as string[]
            : [];
          
          let defaultSize: string = 'M'; // Fallback padrão
          
          // PRIORIDADE 1: Verificar se há activeSize salvo e se está disponível
          if (initialData.activeSize && availableSizesFromData.includes(initialData.activeSize)) {
            defaultSize = initialData.activeSize;
            console.log("[SmartMeasurementEditor] ✅ Usando tamanho salvo anteriormente:", defaultSize);
          } else {
            // PRIORIDADE 2: Calcular tamanho intermediário da grade atual
            if (currentGradeSizes.length > 0) {
              const middleIndex = Math.floor(currentGradeSizes.length / 2);
              const middleSizeFromGrade = currentGradeSizes[middleIndex] || currentGradeSizes[0];
              
              // Verificar se o tamanho intermediário da grade está disponível nos dados
              if (availableSizesFromData.includes(middleSizeFromGrade)) {
                defaultSize = middleSizeFromGrade;
                console.log("[SmartMeasurementEditor] 🎯 Usando tamanho intermediário da grade:", defaultSize);
              } else if (availableSizesFromData.length > 0) {
                // Se não estiver, usar o intermediário dos dados disponíveis
                const middleIndexData = Math.floor(availableSizesFromData.length / 2);
                defaultSize = availableSizesFromData[middleIndexData] || availableSizesFromData[0];
                console.log("[SmartMeasurementEditor] 📊 Usando tamanho intermediário dos dados disponíveis:", defaultSize);
              }
            } else if (availableSizesFromData.length > 0) {
              // Se não houver grade definida, usar o intermediário dos dados disponíveis
              const middleIndexData = Math.floor(availableSizesFromData.length / 2);
              defaultSize = availableSizesFromData[middleIndexData] || availableSizesFromData[0];
              console.log("[SmartMeasurementEditor] 📊 Usando tamanho intermediário dos dados disponíveis (sem grade):", defaultSize);
            }
          }
          
          console.log("[SmartMeasurementEditor] 📦 Carregando medidas já detectadas automaticamente:", {
            sizeCategory,
            targetAudience,
            savedActiveSize: initialData.activeSize,
            currentGradeSizes,
            middleSizeFromGrade: currentGradeSizes.length > 0 ? currentGradeSizes[Math.floor(currentGradeSizes.length / 2)] : 'N/A',
            availableSizesFromData,
            defaultSize,
            measurementPointsCount: measurementPoints.length,
            measurementPoints: measurementPoints.map(mp => `${mp.label}: ${mp.value}cm`),
          });
          
          // Definir tamanho ativo PRIMEIRO para garantir que os valores sejam exibidos corretamente
          setActiveSize(defaultSize);
          
          if (initialData.sizes) {
            setSizes(initialData.sizes);
          }
          
          // Processar geometria a partir dos sizes
          const geo: MeasurementGeometry[] = measurementPoints.map(mp => ({
            id: mp.id as any,
            label: mp.label,
            startX: mp.startX,
            startY: mp.startY,
            endX: mp.endX,
            endY: mp.endY,
          }));
          setGeometry(geo);
          
          // Preencher valores de medidas para todos os tamanhos disponíveis
          const values: MeasurementValues = {};
          if (initialData.sizes) {
            Object.keys(initialData.sizes).forEach((sizeKey) => {
              const sizePoints = initialData.sizes![sizeKey as SizeKey] || [];
              sizePoints.forEach(mp => {
                if (!values[mp.id]) {
                  values[mp.id] = {} as Record<SizeKey, number>;
                }
                values[mp.id][sizeKey as SizeKey] = mp.value;
              });
            });
          }
          setMeasurementValues(values);
          
          console.log("[SmartMeasurementEditor] ✅ Geometria e valores carregados das medidas automáticas:", {
            geometryCount: geo.length,
            valuesCount: Object.keys(values).length,
            activeSize: defaultSize,
            valuesForActiveSize: Object.keys(values).map(id => `${id}: ${values[id]?.[defaultSize as SizeKey] || 0}cm`),
            allValues: Object.keys(values).map(id => {
              const sizeValues = Object.keys(values[id]).map(size => `${size}: ${values[id][size as SizeKey]}cm`).join(", ");
              return `${id} = {${sizeValues}}`;
            }),
          });
        }
      }
      
      // Se temos imagem processada, carregar também
      if (initialData.baseImage && !processedImageUrl) {
        setProcessedImageUrl(initialData.baseImage);
      }
    }
  }, [initialData]); // Remover processedImageUrl das dependências para evitar loops

  // Notificar mudanças (mesmo sem imagem processada, se temos medidas carregadas)
  useEffect(() => {
    if (onMeasurementsChange && Object.keys(sizes).length > 0) {
      // Usar imagem RAW se não houver processada (medidas carregadas automaticamente)
      const baseImage = processedImageUrl || rawImageUrl || '';
      if (baseImage) {
        onMeasurementsChange({
          baseImage: baseImage,
          activeSize: activeSize as SizeKey,
          autoGrading,
          sizes,
          groups: measurementGroups.length > 0 ? measurementGroups.map(g => {
            // Converter values para sizes (formato esperado por MeasurementGroup)
            const sizesLegacy: Record<SizeKey, MeasurementPoint[]> = {} as any;
            STANDARD_SIZES.forEach((size) => {
              sizesLegacy[size] = g.geometry.map((geo) => ({
                id: geo.id as MeasurementPoint['id'],
                label: geo.label,
                value: g.values[geo.id]?.[size] || 0,
                startX: geo.startX,
                startY: geo.startY,
                endX: geo.endX,
                endY: geo.endY,
              }));
            });
            
            return {
              id: g.id,
              label: g.label,
              sizes: sizesLegacy,
            };
          }) : undefined,
        });
      }
    }
  }, [processedImageUrl, rawImageUrl, activeSize, autoGrading, sizes, measurementGroups, onMeasurementsChange]);

  // Função para gerar imagem com medidas (MANUAL - botão)
  const handleGenerateImageWithMeasurements = async () => {
    // SEM BLOQUEIOS - usuário pode tentar novamente sempre que quiser
    
    // Validações
    if (!rawImageFile && !rawImageUrl) {
      setError("É necessário fazer upload de uma imagem primeiro");
      return;
    }
    
    if (!productInfo?.category && !productInfo?.productType) {
      setError("Aguarde a análise inteligente completar antes de gerar a imagem com medidas");
      return;
    }
    
    // Proteção contra chamadas duplicadas
    if (isProcessingRef.current) {
      console.warn("[SmartMeasurementEditor] ⚠️ Processamento já em andamento, ignorando chamada duplicada");
      return;
    }
    
    try {
      isProcessingRef.current = true;
      setIsProcessing(true);
      setError(null);
      
      // Obter arquivo
      let file: File;
      if (rawImageFile) {
        file = rawImageFile;
      } else if (rawImageUrl) {
        console.log("[SmartMeasurementEditor] 📥 Baixando imagem da URL para processar...");
        const response = await fetch(rawImageUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        file = new File([blob], 'product-image.jpg', { type: blob.type || 'image/jpeg' });
      } else {
        throw new Error("Nenhuma imagem disponível");
      }
      
      console.log("[SmartMeasurementEditor] 📥 Iniciando geração MANUAL da imagem com medidas");
      console.log("[SmartMeasurementEditor] 📊 ProductInfo da análise:", {
        category: productInfo?.category || "não disponível",
        productType: productInfo?.productType || "não disponível",
        color: productInfo?.color || "não disponível",
        material: productInfo?.material || "não disponível",
      });
      
      // Preparar FormData para enviar para API
      const formData = new FormData();
      formData.append("image", file);
      if (produtoId) {
        formData.append("produtoId", produtoId);
      }
      if (productInfo?.category) {
        formData.append("category", productInfo.category);
      }
      if (productInfo?.productType) {
        formData.append("productType", productInfo.productType);
      }
      if (productInfo?.color) {
        formData.append("color", productInfo.color);
      }
      if (productInfo?.material) {
        formData.append("material", productInfo.material);
      }
      if (productInfo?.style) {
        formData.append("style", productInfo.style);
      }
      
      // IMPORTANTE: O botão apenas gera a imagem visual, não processa medidas novamente
      // Usar medidas já detectadas automaticamente ou da análise inteligente
      let measurementsToUse: Record<string, number> = {};
      
      // Prioridade 1: Usar medidas já detectadas automaticamente (do estado measurementValues)
      if (measurementValues && Object.keys(measurementValues).length > 0) {
        console.log("[SmartMeasurementEditor] 📏 Usando medidas já detectadas automaticamente:", measurementValues);
        // Extrair valores do tamanho ativo
        Object.keys(measurementValues).forEach((measurementId) => {
          const value = measurementValues[measurementId]?.[activeSize as SizeKey];
          if (value !== undefined && value > 0) {
            measurementsToUse[measurementId] = value;
          }
        });
      }
      
      // Prioridade 2: Se não houver medidas detectadas, usar medidas dos sizes carregados
      if (Object.keys(measurementsToUse).length === 0 && sizes && Object.keys(sizes).length > 0) {
        const sizeData = sizes[activeSize as SizeKey] || [];
        if (sizeData.length > 0) {
          console.log("[SmartMeasurementEditor] 📏 Usando medidas dos sizes carregados:", sizeData);
          sizeData.forEach((mp) => {
            if (mp.value > 0) {
              measurementsToUse[mp.id] = mp.value;
            }
          });
        }
      }
      
      // Prioridade 3: Se ainda não houver medidas, usar medidas da análise inteligente
      if (Object.keys(measurementsToUse).length === 0 && productInfo?.standardMeasurements) {
        console.log("[SmartMeasurementEditor] 📏 Usando medidas pré-coletadas da análise:", productInfo.standardMeasurements);
        if (productInfo.standardMeasurements.bust !== undefined && productInfo.standardMeasurements.bust > 0) {
          measurementsToUse.bust = productInfo.standardMeasurements.bust;
        }
        if (productInfo.standardMeasurements.waist !== undefined && productInfo.standardMeasurements.waist > 0) {
          measurementsToUse.waist = productInfo.standardMeasurements.waist;
        }
        if (productInfo.standardMeasurements.hip !== undefined && productInfo.standardMeasurements.hip > 0) {
          measurementsToUse.hip = productInfo.standardMeasurements.hip;
        }
        if (productInfo.standardMeasurements.length !== undefined && productInfo.standardMeasurements.length > 0) {
          measurementsToUse.length = productInfo.standardMeasurements.length;
        }
      }
      
      // Adicionar medidas ao FormData
      Object.entries(measurementsToUse).forEach(([key, value]) => {
        if (value !== undefined && value > 0) {
          formData.append(key, value.toString());
        }
      });
      
      console.log("[SmartMeasurementEditor] 📤 Enviando medidas para gerar imagem:", measurementsToUse);
      
      // Chamar API de processamento
      const url = `/api/lojista/products/process-measurements?lojistaId=${lojistaId}`;
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        // Tentar ler como texto primeiro para evitar erro de parsing
        let errorData: any = {};
        let errorMessage = "Erro ao processar imagem";
        
        try {
          const errorText = await response.text();
          // Tentar parsear como JSON
          try {
            errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorData.details || `Erro HTTP ${response.status}`;
          } catch (parseError) {
            // Se não for JSON, usar o texto como está
            console.error("[SmartMeasurementEditor] ❌ Resposta de erro não é JSON válido:", errorText.substring(0, 200));
            errorMessage = errorText.substring(0, 200) || `Erro HTTP ${response.status}: ${response.statusText}`;
          }
        } catch (textError) {
          console.error("[SmartMeasurementEditor] ❌ Erro ao ler resposta:", textError);
          errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
        }
        
        // Tratamento especial para erro 429 - apenas informar, SEM BLOQUEIO
        const is429Error = response.status === 429 || 
                          errorMessage.includes("429") || 
                          errorMessage.includes("Resource exhausted") || 
                          errorMessage.includes("RESOURCE_EXHAUSTED");
        
        if (is429Error) {
          errorMessage = "⚠️ Limite de uso da API Gemini atingido. Por favor, tente novamente em alguns instantes.";
          console.error("[SmartMeasurementEditor] ⚠️ Erro 429 detectado. Usuário pode tentar novamente quando quiser.");
        }
        
        throw new Error(errorMessage);
      }
      
      // Ler resposta de sucesso
      let responseData: any;
      try {
        const responseText = await response.text();
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError: any) {
          console.error("[SmartMeasurementEditor] ❌ Erro ao parsear JSON da resposta:", parseError);
          console.error("[SmartMeasurementEditor] 📄 Resposta recebida (primeiros 500 chars):", responseText?.substring(0, 500));
          throw new Error(`Resposta do servidor não é JSON válido: ${parseError.message}`);
        }
      } catch (textError: any) {
        // Se já foi lançado erro de parsing, propagar
        if (textError.message?.includes("JSON válido")) {
          throw textError;
        }
        // Tentar como JSON diretamente como fallback
        try {
          responseData = await response.json();
        } catch (fallbackError: any) {
          console.error("[SmartMeasurementEditor] ❌ Erro ao processar resposta:", fallbackError);
          throw new Error(`Erro ao processar resposta do servidor: ${fallbackError.message}`);
        }
      }
      const result = responseData.data;
      
      // Atualizar estado com resultado
      const newProcessedImageUrl = result.baseImage;
      setProcessedImageUrl(newProcessedImageUrl);
      setSizes(result.sizes);
      setActiveSize(result.activeSize);
      setAutoGrading(result.autoGrading);
      
      // CRÍTICO: Limpar landmarks, geometria e valores quando nova imagem processada for recebida
      // O useEffect de detecção automática vai detectar novamente na nova imagem
      setLandmarks(null);
      setLandmarksWarning(null);
      setGeometry([]); // Limpar geometria anterior
      setMeasurementValues({}); // Limpar valores anteriores
      setError(null); // Limpar qualquer erro anterior
      
      console.log("[SmartMeasurementEditor] ✅ Imagem processada gerada com sucesso! Aguardando detecção de landmarks...");
    } catch (err: any) {
      console.error("[SmartMeasurementEditor] ❌ Erro ao gerar imagem:", err);
      const errorMessage = err.message || "Erro ao gerar imagem com medidas";
      
      setError(errorMessage);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  // NOVA ARQUITETURA: Atualizar apenas valores (geometria permanece fixa)
  const handleMeasurementChange = (measurementId: string, newValue: number) => {
    setMeasurementValues((prev) => {
      const updated = { ...prev };
      if (!updated[measurementId]) {
        updated[measurementId] = {} as Record<SizeKey, number>;
      }
      updated[measurementId][activeSize as SizeKey] = newValue;
      
      // Se auto-grading está ativo, recalcular outros tamanhos
      if (autoGrading) {
        const baseValue = newValue;
        // CRÍTICO: Usar availableSizes em vez de STANDARD_SIZES para suportar grades diferentes
        const baseIndex = availableSizesAsSizeKey.indexOf(activeSize as SizeKey);
        
        availableSizesAsSizeKey.forEach((size) => {
          if (size !== (activeSize as SizeKey)) {
            const sizeIndex = availableSizesAsSizeKey.indexOf(size);
            const diff = sizeIndex - baseIndex;
            const variation = measurementId === 'length' ? 1.5 : 2;
            updated[measurementId][size] = Math.max(0, baseValue + (diff * variation));
          }
        });
      }
      
      return updated;
    });
    setSaved(false);
  };

  // Verificar se há dados de medidas (single ou multi-item)
  const hasMeasurementData = () => {
    return geometry.length > 0 || measurementGroups.length > 0;
  };

  // NOVA ARQUITETURA: Recalcular valores para todos os tamanhos
  const handleRecalculate = () => {
    if (!hasMeasurementData()) return;
    
    // Se for multi-item, recalcular cada grupo
    if (measurementGroups.length > 0) {
      setMeasurementGroups((prev) =>
        prev.map((group) => {
          const updated = { ...group.values };
          // CRÍTICO: Usar availableSizes em vez de STANDARD_SIZES
          const baseIndex = availableSizes.indexOf(activeSize);
          
          group.geometry.forEach((geo) => {
            const baseValue = group.values[geo.id]?.[activeSize as SizeKey] || 0;
            const variation = geo.id === 'length' ? 1.5 : 2;
            
            availableSizesAsSizeKey.forEach((size) => {
              if (size !== (activeSize as SizeKey)) {
                const sizeIndex = availableSizesAsSizeKey.indexOf(size);
                const diff = sizeIndex - baseIndex;
                if (!updated[geo.id]) {
                  updated[geo.id] = {} as Record<SizeKey, number>;
                }
                updated[geo.id][size] = Math.max(0, baseValue + (diff * variation));
              }
            });
          });
          
          return { ...group, values: updated };
        })
      );
      setSaved(false);
      return;
    }
    
    // Lógica original para single-item
    if (geometry.length === 0) return;
    
    setMeasurementValues((prev) => {
      const updated = { ...prev };
      // CRÍTICO: Usar availableSizes em vez de STANDARD_SIZES
      const baseIndex = availableSizes.indexOf(activeSize);
      
      geometry.forEach((geo) => {
        const baseValue = prev[geo.id]?.[activeSize as SizeKey] || 0;
        const variation = geo.id === 'length' ? 1.5 : 2;
        
        availableSizesAsSizeKey.forEach((size) => {
          if (size !== (activeSize as SizeKey)) {
            const sizeIndex = availableSizesAsSizeKey.indexOf(size);
            const diff = sizeIndex - baseIndex;
            if (!updated[geo.id]) {
              updated[geo.id] = {} as Record<SizeKey, number>;
            }
            updated[geo.id][size] = Math.max(0, baseValue + (diff * variation));
          }
        });
      });
      
      return updated;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    const hasSingleItem = geometry.length > 0;
    const hasMultiItem = measurementGroups.length > 0;
    
    if (!processedImageUrl || (!hasSingleItem && !hasMultiItem)) {
      setError("Não há dados para salvar");
      return;
    }
    
    try {
      setError(null);
      
      if (hasMultiItem) {
        // PRODUTO MULTI-ITEM: Converter grupos para formato SmartGuideData
        const groups = measurementGroups.map((group) => {
          const sizesLegacy: Record<SizeKey, MeasurementPoint[]> = {} as any;
          availableSizesAsSizeKey.forEach((size) => {
            sizesLegacy[size] = group.geometry.map((geo) => ({
              id: geo.id as MeasurementPoint['id'],
              label: geo.label,
              value: group.values[geo.id]?.[size] || 0,
              startX: geo.startX,
              startY: geo.startY,
              endX: geo.endX,
              endY: geo.endY,
            }));
          });
          
          return {
            id: group.id,
            label: group.label,
            sizes: sizesLegacy,
          };
        });
        
        const data: SmartGuideData = {
          baseImage: processedImageUrl,
          activeSize: activeSize as SizeKey,
          autoGrading,
          sizes: {}, // Vazio para multi-item
          groups,
        };
        
        if (onSave) {
          await onSave(data);
        }
      } else {
        // PRODUTO ÚNICO: Converter nova estrutura para formato legado
        const sizesLegacy: Record<SizeKey, MeasurementPoint[]> = {} as any;
        availableSizesAsSizeKey.forEach((size) => {
          sizesLegacy[size] = geometry.map((geo) => ({
            id: geo.id as MeasurementPoint['id'],
            label: geo.label,
            value: measurementValues[geo.id]?.[size] || 0,
            startX: geo.startX,
            startY: geo.startY,
            endX: geo.endX,
            endY: geo.endY,
          }));
        });
        
        const data: SmartGuideData = {
          baseImage: processedImageUrl,
          activeSize: activeSize as SizeKey,
          autoGrading,
          sizes: sizesLegacy,
        };
        
        if (onSave) {
          await onSave(data);
        }
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error("[SmartMeasurementEditor] Erro ao salvar:", err);
      setError(err.message || "Erro ao salvar medidas");
    }
  };

  // Função para regenerar imagem quando as medidas mudarem
  const handleRegenerateImage = async () => {
    if (!rawImageFile && !rawImageUrl) {
      setError("É necessário fazer upload de uma imagem primeiro");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Preparar FormData com as medidas atualizadas do tamanho ativo
      const formData = new FormData();
      if (rawImageFile) {
        formData.append("image", rawImageFile);
      } else if (rawImageUrl) {
        const response = await fetch(rawImageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'product-image.jpg', { type: blob.type || 'image/jpeg' });
        formData.append("image", file);
      }
      
      if (produtoId) {
        formData.append("produtoId", produtoId);
      }
      if (productInfo?.category) {
        formData.append("category", productInfo.category);
      }
      if (productInfo?.productType) {
        formData.append("productType", productInfo.productType);
      }
      if (productInfo?.color) {
        formData.append("color", productInfo.color);
      }
      if (productInfo?.material) {
        formData.append("material", productInfo.material);
      }
      if (productInfo?.style) {
        formData.append("style", productInfo.style);
      }
      
      // Adicionar medidas do tamanho ativo - NOVA ARQUITETURA
      geometry.forEach((geo) => {
        const value = measurementValues[geo.id]?.[activeSize as SizeKey] || 0;
        if (geo.id === 'bust') {
          formData.append("bust", value.toString());
        } else if (geo.id === 'waist') {
          formData.append("waist", value.toString());
        } else if (geo.id === 'hip') {
          formData.append("hip", value.toString());
        } else if (geo.id === 'length') {
          formData.append("length", value.toString());
        }
      });

      const url = `/api/lojista/products/process-measurements?lojistaId=${lojistaId}`;
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        // Tentar ler como texto primeiro para evitar erro de parsing
        let errorData: any = {};
        let errorMessage = "Erro ao regenerar imagem";
        
        try {
          const errorText = await response.text();
          try {
            errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorData.details || `Erro HTTP ${response.status}`;
          } catch (parseError) {
            console.error("[SmartMeasurementEditor] ❌ Resposta de erro não é JSON válido:", errorText.substring(0, 200));
            errorMessage = errorText.substring(0, 200) || `Erro HTTP ${response.status}: ${response.statusText}`;
          }
        } catch (textError) {
          errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      // Ler resposta de sucesso
      let responseData: any;
      try {
        const responseText = await response.text();
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError: any) {
          console.error("[SmartMeasurementEditor] ❌ Erro ao parsear JSON da resposta:", parseError);
          throw new Error(`Resposta do servidor não é JSON válido: ${parseError.message}`);
        }
      } catch (textError: any) {
        if (textError.message?.includes("JSON válido")) {
          throw textError;
        }
        try {
          responseData = await response.json();
        } catch (fallbackError: any) {
          throw new Error(`Erro ao processar resposta do servidor: ${fallbackError.message}`);
        }
      }
      const result = responseData.data;

      // Atualizar imagem processada
      const newProcessedImageUrl = result.baseImage;
      setProcessedImageUrl(newProcessedImageUrl);
      setSizes(result.sizes);
      setSaved(false);
      
      // CRÍTICO: Limpar landmarks, geometria e valores quando nova imagem processada for recebida
      setLandmarks(null);
      setLandmarksWarning(null);
      setGeometry([]); // Limpar geometria anterior
      setMeasurementValues({}); // Limpar valores anteriores
      
      console.log("[SmartMeasurementEditor] ✅ Imagem regenerada! Aguardando detecção de landmarks...");
    } catch (err: any) {
      console.error("[SmartMeasurementEditor] Erro ao regenerar imagem:", err);
      setError(err.message || "Erro ao regenerar imagem com novas medidas");
    } finally {
      setIsProcessing(false);
    }
  };

  // Verificar se análise inteligente está completa
  const hasCompleteAnalysis = !!(productInfo?.category || productInfo?.productType);
  const canGenerateImage = hasCompleteAnalysis && (rawImageFile || rawImageUrl) && !processedImageUrl;

  return (
    <div className={`${className}`}>
      {/* Conteúdo Principal - Apenas Formulário de Medidas */}
      <div className="space-y-2">
        {/* Título da Seção - Mesmo padrão dos outros formulários */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Medidas do Produto
          </h3>
          {saved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1 text-emerald-600 text-xs"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Salvo!</span>
            </motion.div>
          )}
        </div>
        {/* Coluna Única - Editor de Medidas - Layout Otimizado */}
        <div className="space-y-2.5 flex flex-col">
          {/* Botão Principal: Gerar Imagem com Medidas (MANUAL) - Ajustado */}
          {!processedImageUrl && (rawImageFile || rawImageUrl) && (
            <div className="space-y-2">
              <button
                onClick={handleGenerateImageWithMeasurements}
                disabled={isProcessing || !canGenerateImage}
                className="w-full px-3 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                title={!hasCompleteAnalysis 
                  ? "Aguarde a análise inteligente completar primeiro" 
                  : "Gerar imagem ghost mannequin com linhas de medidas integradas. A imagem aparecerá na área de visualização de fotos geradas por IA."}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-white">Gerando Imagem...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white" />
                    <span className="text-white">Gerar Imagem com Medidas</span>
                  </>
                )}
              </button>
              {!hasCompleteAnalysis && (
                <p className="text-xs text-slate-500 text-center px-2">
                  ⏳ Aguardando análise inteligente completar...
                </p>
              )}
              {isProcessing && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <p className="text-xs text-indigo-700 text-center">
                    A imagem será exibida na área de visualização de fotos geradas por IA após a geração.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Abas de Tamanho - Melhorado */}
          {processedImageUrl && (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tamanho Ativo
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {availableSizes.map((size) => (
                    <motion.button
                      key={size}
                      onClick={() => setActiveSize(size)}
                      className={`px-3.5 py-2 rounded-lg font-bold text-sm transition-all shadow-sm ${
                        activeSize === size
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md ring-2 ring-indigo-300'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-md border border-slate-200'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {size}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Toggle Auto-Grading - Ajustado */}
              <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 shadow-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <label className="text-xs font-semibold text-slate-700 truncate">
                    Calcular grade automaticamente
                  </label>
                </div>
                <button
                  onClick={() => {
                    const newAutoGrading = !autoGrading;
                    setAutoGrading(newAutoGrading);
                    // Se ativou auto-grading, recalcular agora - NOVA ARQUITETURA
                    if (newAutoGrading && geometry.length > 0) {
                      // CRÍTICO: Usar availableSizes em vez de STANDARD_SIZES
                      const baseIndex = availableSizes.indexOf(activeSize);
                      setMeasurementValues((prev) => {
                        const updated = { ...prev };
                        geometry.forEach((geo) => {
                          const baseValue = prev[geo.id]?.[activeSize as SizeKey] || 0;
                          const variation = geo.id === 'length' ? 1.5 : 2;
                          availableSizesAsSizeKey.forEach((size) => {
                            if (size !== (activeSize as SizeKey)) {
                              const sizeIndex = availableSizesAsSizeKey.indexOf(size);
                              const diff = sizeIndex - baseIndex;
                              if (!updated[geo.id]) {
                                updated[geo.id] = {} as Record<SizeKey, number>;
                              }
                              updated[geo.id][size] = Math.max(0, baseValue + (diff * variation));
                            }
                          });
                        });
                        return updated;
                      });
                    }
                  }}
                  className={`relative w-12 h-6 rounded-full transition-all shadow-inner ${
                    autoGrading ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                      autoGrading ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Inputs de Medidas - Suporta múltiplos grupos - Layout Otimizado */}
              {measurementGroups.length > 0 ? (
                /* PRODUTO MULTI-ITEM: Inputs separados por grupo */
                <div className="space-y-2.5 flex-1 overflow-y-auto min-h-0">
                  {measurementGroups.map((group, groupIndex) => (
                    <div key={group.id} className={groupIndex > 0 ? "border-t border-gray-200 pt-4" : ""}>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-xs font-semibold text-slate-700">
                          Medidas {group.label} ({activeSize})
                        </label>
                        <span className="text-xs text-slate-500">
                          {groupIndex === 0 ? "As linhas são geradas pela IA na imagem" : ""}
                        </span>
                      </div>
                      <AnimatePresence mode="sync">
                        {group.geometry.map((geo) => {
                          const currentValue = group.values[geo.id]?.[activeSize as SizeKey] || 0;
                          return (
                            <motion.div
                              key={`${group.id}-${activeSize}-${geo.id}`}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              transition={{ duration: 0.2 }}
                              className="space-y-1 mb-3"
                            >
                              <label className="text-sm font-medium text-slate-700">
                                {geo.label} (cm)
                              </label>
                              <input
                                type="number"
                                value={currentValue}
                                onChange={(e) => {
                                  const newValue = parseFloat(e.target.value) || 0;
                                  // Atualizar valores do grupo específico
                                  setMeasurementGroups((prev) =>
                                    prev.map((g) =>
                                      g.id === group.id
                                        ? {
                                            ...g,
                                            values: {
                                              ...g.values,
                                              [geo.id]: {
                                                ...g.values[geo.id],
                                                [activeSize as SizeKey]: newValue,
                                              },
                                            },
                                          }
                                        : g
                                    )
                                  );
                                  setSaved(false);
                                }}
                                min="0"
                                step="0.5"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                              />
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              ) : (
                /* PRODUTO ÚNICO: Inputs únicos (lógica original) - Layout Otimizado */
                <div className="space-y-2.5 flex-1 overflow-y-auto min-h-0">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-600">
                      Medidas ({activeSize})
                    </label>
                    <span className="text-xs text-slate-500">
                      As linhas são geradas pela IA na imagem
                    </span>
                  </div>
                  
                  {/* Status de Calibração */}
                  {productInfo?.standardMeasurements?.calibration_method && (
                    <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-xs">
                        <Info className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-700 font-medium">
                          Calibração: {
                            productInfo.standardMeasurements.calibration_method === 'A4_REFERENCE' 
                              ? 'Calibrado via Referência (A4)'
                              : productInfo.standardMeasurements.calibration_method === 'HANGER'
                              ? 'Calibrado via Cabide'
                              : 'Estimativa IA'
                          }
                        </span>
                      </div>
                    </div>
                  )}
                  <AnimatePresence mode="sync">
                    {geometry.map((geo) => {
                      const currentValue = measurementValues[geo.id]?.[activeSize as SizeKey] || 0;
                      return (
                        <motion.div
                          key={`${activeSize}-${geo.id}`}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                              {geo.label} (cm)
                              {/* Badge ABNT - Mostrar se o valor vem da tabela ABNT */}
                              {isABNTMeasurement(geo.id, activeSize) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Padrão ABNT
                                </span>
                              )}
                              {/* Badge IA - Mostrar se o valor inicial veio da análise IA (apenas se não for ABNT) */}
                              {!isABNTMeasurement(geo.id, activeSize) &&
                               productInfo?.standardMeasurements?.[geo.id as keyof typeof productInfo.standardMeasurements] !== undefined && 
                               currentValue === (productInfo.standardMeasurements[geo.id as 'bust' | 'waist' | 'hip' | 'length'] || 0) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                  <Sparkles className="w-3 h-3" />
                                  IA
                                </span>
                              )}
                            </label>
                          </div>
                          <input
                            type="number"
                            value={currentValue}
                            onChange={(e) => {
                              const newValue = parseFloat(e.target.value) || 0;
                              handleMeasurementChange(geo.id, newValue);
                            }}
                            min="0"
                            step="0.5"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

              {/* Botões de Ação - Ajustados e Organizados */}
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200 mt-auto">
                <button
                  onClick={handleRecalculate}
                  disabled={!processedImageUrl || !hasMeasurementData()}
                  className="flex-1 min-w-[80px] px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs shadow-sm hover:shadow border border-slate-300"
                  title="Recalcular medidas dos outros tamanhos automaticamente"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap text-xs">Recalcular</span>
                </button>
                <button
                  onClick={handleRegenerateImage}
                  disabled={!rawImageFile || isProcessing || !hasMeasurementData()}
                  className="flex-1 min-w-[80px] px-2.5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  title="Regenerar imagem com as medidas atualizadas"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span className="whitespace-nowrap text-xs text-white">Regenerando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 shrink-0 text-white" />
                      <span className="whitespace-nowrap text-xs text-white">Regenerar</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!processedImageUrl || !hasMeasurementData() || saved}
                  className="flex-1 min-w-[80px] px-2.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  <Save className="w-3.5 h-3.5 shrink-0 text-white" />
                  <span className="whitespace-nowrap text-xs text-white">Salvar</span>
                </button>
              </div>
            </>
          )}

          {/* Mensagem de Erro */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg flex items-start gap-3 ${
                error.includes("429") || error.includes("Limite de uso") || error.includes("Resource exhausted")
                  ? "bg-orange-50 border-2 border-orange-300"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
                error.includes("429") || error.includes("Limite de uso") || error.includes("Resource exhausted")
                  ? "text-orange-600"
                  : "text-red-600"
              }`} />
              <div className="flex-1">
                <p className={`text-sm font-medium mb-1 ${
                  error.includes("429") || error.includes("Limite de uso") || error.includes("Resource exhausted")
                    ? "text-orange-800"
                    : "text-red-700"
                }`}>
                  {error.includes("429") || error.includes("Limite de uso") || error.includes("Resource exhausted")
                    ? "⚠️ Limite da API Atingido"
                    : "Erro ao Processar"}
                </p>
                <p className={`text-sm whitespace-pre-line ${
                  error.includes("429") || error.includes("Limite de uso") || error.includes("Resource exhausted")
                    ? "text-orange-700"
                    : "text-red-700"
                }`}>
                  {error}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}