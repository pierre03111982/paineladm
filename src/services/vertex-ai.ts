/**
 * Serviço de Processamento de Imagens com Vertex AI (Google)
 * 
 * Este serviço processa imagens brutas do produto e retorna:
 * - Imagem tratada (Ghost Mannequin/Fundo removido) usando Gemini 2.5 Flash Image
 * - Landmarks (coordenadas) das medidas detectadas
 * 
 * Utiliza a mesma API do app modelo 2 para consistência.
 */

import type { SmartGuideData, MeasurementPoint, SizeKey } from "@/types/measurements";
import { generateCatalogImage } from "@/lib/ai/imagen-generate";
import { buildGhostMannequinPrompt } from "@/lib/ai/ghost-mannequin-prompt";

const STANDARD_SIZES: SizeKey[] = ['PP', 'P', 'M', 'G', 'GG', 'XG'];

/**
 * Converte File para base64 para processamento
 * Usado no servidor (Node.js) - Next.js File API
 */
async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';
    
    return { base64, mimeType };
  } catch (error: any) {
    console.error("[VertexAI] Erro ao converter File para base64:", error);
    throw new Error(`Falha ao processar arquivo: ${error.message}`);
  }
}

/**
 * Converte base64 para URL data URL (para uso com generateCatalogImage)
 */
function base64ToDataUrl(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Detecta landmarks (coordenadas de medidas) na imagem processada
 * Detecta automaticamente quais medidas são necessárias baseado no tipo de produto
 * TODO: Implementar detecção real com Vision API quando disponível
 */
function detectMeasurementLandmarks(
  category?: string,
  productType?: string
): MeasurementPoint[] {
  const catLower = (category || '').toLowerCase();
  const typeLower = (productType || '').toLowerCase();
  const combined = `${catLower} ${typeLower}`;
  
  console.log("[VertexAI] 🔍 Detectando landmarks para:", {
    category: catLower,
    productType: typeLower,
    combined,
  });

  // Detectar tipo de produto
  const isTop = catLower.includes('blusa') || 
                catLower.includes('camisa') ||
                catLower.includes('camiseta') ||
                catLower.includes('regata') ||
                catLower.includes('manga') ||
                typeLower.includes('top') ||
                typeLower.includes('blusa');
  
  const isBottom = catLower.includes('calça') ||
                   catLower.includes('short') ||
                   catLower.includes('bermuda') ||
                   catLower.includes('saia') ||
                   typeLower.includes('bottom') ||
                   typeLower.includes('pant');
  
  const isDress = catLower.includes('vestido') ||
                  catLower.includes('macacão') ||
                  catLower.includes('macaquinho') ||
                  typeLower.includes('dress');
  
  const isUnderwear = catLower.includes('cueca') ||
                      catLower.includes('calcinha') ||
                      catLower.includes('sutiã') ||
                      catLower.includes('lingerie');
  
  const isSungaLike = combined.includes('sunga') || combined.includes('cueca') || combined.includes('calcinha');

  const landmarks: MeasurementPoint[] = [];

  // Roupa íntima / sunga: Quadril, Comprimento (SEM Busto / SEM Cintura)
  // IMPORTANTE: vem ANTES de BOTTOMS para não cair como calça/short.
  if (isUnderwear || isSungaLike) {
    console.log("[VertexAI] ✅ Tipo detectado: UNDERWEAR/SUNGA - Medidas: Quadril, Comprimento (SEM Busto/SEM Cintura)");
    landmarks.push(
      {
        id: 'hip',
        label: 'Quadril',
        value: 42,
        startX: 30,
        startY: 50,
        endX: 70,
        endY: 50,
      },
      {
        id: 'length',
        label: 'Comprimento',
        value: 25,
        startX: 50,
        startY: 30,
        endX: 50,
        endY: 75,
      }
    );
  }
  // Tops/Blusas: Busto, Comprimento (SEM Cintura)
  if (isTop && !isDress) {
    console.log("[VertexAI] ✅ Tipo detectado: TOP - Medidas: Busto, Comprimento (SEM Cintura)");
    landmarks.push(
      {
        id: 'bust',
        label: 'Busto',
        value: 38,
        startX: 28,
        startY: 38,
        endX: 72,
        endY: 38,
      },
      {
        id: 'length',
        label: 'Comprimento',
        value: 40,
        startX: 35,
        startY: 15,
        endX: 35,
        endY: 82,
      }
    );
  }
  // Bottoms (shorts, calças, sungas): Cintura, Quadril, Comprimento
  else if (isBottom) {
    console.log("[VertexAI] ✅ Tipo detectado: BOTTOM - Medidas: Cintura, Quadril, Comprimento");
    landmarks.push(
      {
        id: 'waist',
        label: 'Cintura',
        value: 38,
        startX: 28,
        startY: 20,
        endX: 72,
        endY: 20,
      },
      {
        id: 'hip',
        label: 'Quadril',
        value: 42,
        startX: 28,
        startY: 45,
        endX: 72,
        endY: 45,
      },
      {
        id: 'length',
        label: 'Comprimento',
        value: 50,
        startX: 50,
        startY: 20,
        endX: 50,
        endY: 85,
      }
    );
  }
  // Vestidos: Busto, Cintura, Quadril, Comprimento
  else if (isDress) {
    console.log("[VertexAI] ✅ Tipo detectado: DRESS - Medidas: Busto, Cintura, Quadril, Comprimento");
    landmarks.push(
      {
        id: 'bust',
        label: 'Busto',
        value: 45,
        startX: 30,
        startY: 30,
        endX: 70,
        endY: 30,
      },
      {
        id: 'waist',
        label: 'Cintura',
        value: 40,
        startX: 30,
        startY: 50,
        endX: 70,
        endY: 50,
      },
      {
        id: 'hip',
        label: 'Quadril',
        value: 48,
        startX: 30,
        startY: 65,
        endX: 70,
        endY: 65,
      },
      {
        id: 'length',
        label: 'Comprimento',
        value: 60,
        startX: 50,
        startY: 15,
        endX: 50,
        endY: 85,
      }
    );
  }
  // Default (outros produtos): Busto, Cintura, Comprimento
  else {
    console.log("[VertexAI] ✅ Tipo detectado: DEFAULT - Medidas: Busto, Cintura, Comprimento");
    landmarks.push(
      {
        id: 'bust',
        label: 'Busto',
        value: 45,
        startX: 30,
        startY: 30,
        endX: 70,
        endY: 30,
      },
      {
        id: 'waist',
        label: 'Cintura',
        value: 40,
        startX: 30,
        startY: 50,
        endX: 70,
        endY: 50,
      },
      {
        id: 'length',
        label: 'Comprimento',
        value: 60,
        startX: 50,
        startY: 15,
        endX: 50,
        endY: 85,
      }
    );
  }

  console.log("[VertexAI] 📊 Landmarks finais:", {
    count: landmarks.length,
    types: landmarks.map(l => `${l.id} (${l.label})`),
  });
  
  return landmarks;
}

/**
 * Processa uma imagem com Vertex AI Gemini 2.5 Flash Image
 * 
 * @param file Arquivo de imagem a ser processado
 * @param lojistaId ID do lojista
 * @param produtoId ID do produto (opcional, para edição)
 * @param productInfo Informações do produto para melhorar o prompt (opcional)
 * @returns Promise com dados processados (imagem tratada + landmarks)
 */
export async function processImageWithVertex(
  file: File,
  lojistaId: string,
  produtoId?: string,
  productInfo?: {
    category?: string;
    productType?: string;
    color?: string;
    material?: string;
    style?: string;
  },
  customMeasurements?: Record<string, number>
): Promise<SmartGuideData> {
  console.log("[VertexAI] Iniciando processamento de imagem", {
    fileName: file.name,
    fileSize: file.size,
    lojistaId,
    produtoId,
  });

  try {
    // 1. Converter File para base64
    const { base64, mimeType } = await fileToBase64(file);
    console.log("[VertexAI] Arquivo convertido para base64:", {
      mimeType,
      base64Length: base64.length,
    });

    // 2. Detectar landmarks (coordenadas de medidas) para incluir no prompt
    const landmarks = detectMeasurementLandmarks(
      productInfo?.category,
      productInfo?.productType
    );
    
    // Usar medidas customizadas se fornecidas, senão usar landmarks padrão
    const baseSize: SizeKey = 'M';
    const baseMeasurements: Record<string, number> = customMeasurements || {};
    
    // Se não houver medidas customizadas, usar landmarks padrão
    if (Object.keys(baseMeasurements).length === 0) {
      landmarks.forEach(landmark => {
        if (landmark.id === 'bust') baseMeasurements.bust = landmark.value;
        if (landmark.id === 'waist') baseMeasurements.waist = landmark.value;
        if (landmark.id === 'hip' || landmark.id === 'hips') {
          // IMPORTANTE: Usar 'hips' (plural) para consistência com o código existente
          baseMeasurements.hips = landmark.value;
        }
        if (landmark.id === 'length') baseMeasurements.length = landmark.value;
      });
    } else {
      // Atualizar landmarks com valores customizados
      landmarks.forEach(landmark => {
        if (landmark.id === 'bust' && baseMeasurements.bust) landmark.value = baseMeasurements.bust;
        if (landmark.id === 'waist' && baseMeasurements.waist) landmark.value = baseMeasurements.waist;
        if ((landmark.id === 'hip' || landmark.id === 'hips') && baseMeasurements.hips) {
          landmark.value = baseMeasurements.hips;
        }
        if (landmark.id === 'length' && baseMeasurements.length) landmark.value = baseMeasurements.length;
      });
    }

    // 3. Construir prompt profissional para ghost mannequin COM MEDIDAS
    const prompt = buildGhostMannequinPrompt(
      productInfo?.category,
      productInfo?.productType,
      {
        color: productInfo?.color,
        material: productInfo?.material,
        style: productInfo?.style,
      },
      baseMeasurements
    );

    console.log("[VertexAI] Prompt construído:", {
      promptLength: prompt.length,
      category: productInfo?.category,
    });

    // 3. Gerar imagem processada usando Gemini 2.5 Flash Image
    // Usar data URL temporária (generateCatalogImage precisa de URL ou converter base64 diretamente)
    const tempDataUrl = base64ToDataUrl(base64, mimeType);
    console.log("[VertexAI] Chamando generateCatalogImage...");
    const processedImageUrl = await generateCatalogImage(
      prompt,
      tempDataUrl,
      lojistaId,
      produtoId || `temp-${Date.now()}`
    );

    console.log("[VertexAI] ✅ Imagem de catálogo (ghost mannequin) gerada:", processedImageUrl);

    console.log("[VertexAI] Landmarks para gradação:", {
      count: landmarks.length,
      types: landmarks.map(l => l.id),
    });

    // 5. Gerar medidas para todos os tamanhos baseado no tamanho M (base)
    // baseSize já foi declarado acima, reutilizando aqui
    const baseIndex = STANDARD_SIZES.indexOf(baseSize);
    
    const sizes: Record<SizeKey, MeasurementPoint[]> = {} as any;

    STANDARD_SIZES.forEach((size, index) => {
      const diff = index - baseIndex;
      
      sizes[size] = landmarks.map(landmark => {
        // Variação: ±2cm para circunferências (busto, cintura), ±1.5cm para comprimento
        const variation = landmark.id === 'length' ? 1.5 : 2;
        const newValue = Math.max(0, landmark.value + (diff * variation));
        
        return {
          ...landmark,
          value: newValue,
        };
      });
    });

    console.log("[VertexAI] ✅ Medidas geradas para todos os tamanhos");

    // 6. Retornar estrutura completa
    const result: SmartGuideData = {
      baseImage: processedImageUrl, // Sempre a imagem processada (nunca a crua)
      activeSize: baseSize,
      autoGrading: true,
      sizes,
    };

    console.log("[VertexAI] ✅ Processamento concluído com sucesso");

    return result;
  } catch (error: any) {
    console.error("[VertexAI] ❌ Erro ao processar imagem:", error);
    throw new Error(`Falha ao processar imagem com Vertex AI: ${error.message}`);
  }
}
