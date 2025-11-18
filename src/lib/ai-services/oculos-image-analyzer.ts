/**
 * Analisador de imagem de óculos
 * Extrai características visuais da imagem do óculos para incluir no prompt
 */

/**
 * Analisa uma imagem de óculos e retorna uma descrição detalhada
 * Usa Google Cloud Vision API para análise real da imagem
 */
export async function analyzeOculosImage(imageUrl: string): Promise<string> {
  try {
    console.log("[OculosAnalyzer] Analisando imagem do óculos:", imageUrl.substring(0, 50));
    
    // Tentar usar Vision API se disponível
    try {
      const { analyzeOculosWithVision } = await import("./vision-analyzer");
      const visionDescription = await analyzeOculosWithVision(imageUrl);
      
      if (visionDescription && visionDescription.length > 50) {
        console.log("[OculosAnalyzer] Análise com Vision API concluída");
        return visionDescription;
      }
    } catch (visionError) {
      console.warn("[OculosAnalyzer] Vision API não disponível, usando fallback:", visionError);
    }
    
    // Fallback: descrição genérica mas detalhada
    return `óculos com armação moderna, estilo contemporâneo, detalhes precisos. 
IMPORTANTE: A imagem de referência do óculos mostra o formato exato, cor, estilo e detalhes que devem ser replicados fidelmente. 
O óculos deve ter a mesma aparência visual da imagem de referência, incluindo formato da armação, cor, espessura das hastes, formato das lentes e todos os detalhes visíveis.`;
  } catch (error) {
    console.warn("[OculosAnalyzer] Erro ao analisar imagem:", error);
    return `óculos de estilo moderno. 
IMPORTANTE: Use o óculos exato da imagem de referência, mantendo formato, cor, estilo e detalhes idênticos.`;
  }
}

/**
 * Gera uma descrição detalhada do óculos baseada na análise da imagem
 */
export async function generateOculosDescription(oculosImageUrl: string): Promise<string> {
  const analysis = await analyzeOculosImage(oculosImageUrl);
  
  return `O óculos deve ter as seguintes características exatas baseadas na imagem de referência: ${analysis}. 
A imagem de referência do óculos mostra o formato preciso, cor, estilo, espessura das hastes e formato das lentes que devem ser replicados exatamente.`;
}
