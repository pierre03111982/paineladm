/**
 * Utilitário de Sugestão de Tamanho para Provador Virtual
 * Compara medidas do corpo do usuário com medidas cadastradas no produto
 */

export interface UserBodyMetrics {
  bust?: number; // Busto em cm
  waist?: number; // Cintura em cm
  hip?: number; // Quadril em cm
  length?: number; // Comprimento preferido em cm (opcional)
}

export interface ProductSizeVariant {
  name: string; // ex: "38", "M", "G"
  equivalence?: string; // ex: "M" (referência em outra grade)
  measurements?: {
    bust?: number;
    waist?: number;
    hip?: number;
    length?: number;
  };
  stock: number;
}

export interface ProductDoc {
  variacoes?: ProductSizeVariant[];
  tamanhos?: string[];
  analiseIA?: {
    standard_measurements?: {
      bust?: number;
      waist?: number;
      hip?: number;
      length?: number;
    };
  };
}

export interface SuggestionResult {
  suggestedSize: string;
  confidence: 'perfect' | 'good' | 'tight' | 'loose';
  message: string;
  alternativeSizes?: Array<{
    size: string;
    confidence: 'good' | 'tight' | 'loose';
    message: string;
  }>;
}

/**
 * Tolerância de conforto para tecido plano
 * +2cm a +4cm de folga é o ideal
 */
const COMFORT_TOLERANCE = {
  min: 2, // Mínimo de folga (cm)
  ideal: 3, // Folga ideal (cm)
  max: 4, // Máximo de folga confortável (cm)
};

/**
 * Calcula a diferença entre medida do usuário e medida do produto
 * Retorna positivo se o produto é maior, negativo se menor
 */
function calculateDifference(userMeasure: number, productMeasure: number): number {
  return productMeasure - userMeasure;
}

/**
 * Avalia o "fit" (caimento) baseado na diferença de medidas
 */
function evaluateFit(difference: number): { confidence: 'perfect' | 'good' | 'tight' | 'loose'; message: string } {
  if (difference >= COMFORT_TOLERANCE.min && difference <= COMFORT_TOLERANCE.max) {
    if (difference >= COMFORT_TOLERANCE.ideal - 0.5 && difference <= COMFORT_TOLERANCE.ideal + 0.5) {
      return { confidence: 'perfect', message: 'Caimento Perfeito' };
    }
    return { confidence: 'good', message: 'Caimento Bom' };
  }
  
  if (difference < COMFORT_TOLERANCE.min) {
    if (difference < 0) {
      return { confidence: 'tight', message: 'Fica Justo' };
    }
    return { confidence: 'tight', message: 'Pode Ficar Apertado' };
  }
  
  return { confidence: 'loose', message: 'Fica Folgado' };
}

/**
 * Calcula score de compatibilidade para um tamanho
 * Score mais alto = melhor match
 */
function calculateScore(
  userMetrics: UserBodyMetrics,
  variant: ProductSizeVariant
): { score: number; fit: { confidence: 'perfect' | 'good' | 'tight' | 'loose'; message: string } } {
  if (!variant.measurements) {
    return { score: 0, fit: { confidence: 'good', message: 'Sem medidas disponíveis' } };
  }

  const measurements = variant.measurements;
  let totalScore = 0;
  let measureCount = 0;
  const fits: Array<{ confidence: 'perfect' | 'good' | 'tight' | 'loose'; message: string }> = [];

  // Busto
  if (userMetrics.bust && measurements.bust) {
    const diff = calculateDifference(userMetrics.bust, measurements.bust);
    const fit = evaluateFit(diff);
    fits.push(fit);
    
    if (fit.confidence === 'perfect') totalScore += 10;
    else if (fit.confidence === 'good') totalScore += 7;
    else if (fit.confidence === 'tight') totalScore += 3;
    else totalScore += 1;
    
    measureCount++;
  }

  // Cintura
  if (userMetrics.waist && measurements.waist) {
    const diff = calculateDifference(userMetrics.waist, measurements.waist);
    const fit = evaluateFit(diff);
    fits.push(fit);
    
    if (fit.confidence === 'perfect') totalScore += 10;
    else if (fit.confidence === 'good') totalScore += 7;
    else if (fit.confidence === 'tight') totalScore += 3;
    else totalScore += 1;
    
    measureCount++;
  }

  // Quadril
  if (userMetrics.hip && measurements.hip) {
    const diff = calculateDifference(userMetrics.hip, measurements.hip);
    const fit = evaluateFit(diff);
    fits.push(fit);
    
    if (fit.confidence === 'perfect') totalScore += 10;
    else if (fit.confidence === 'good') totalScore += 7;
    else if (fit.confidence === 'tight') totalScore += 3;
    else totalScore += 1;
    
    measureCount++;
  }

  // Comprimento (menos crítico, mas considerado)
  if (userMetrics.length && measurements.length) {
    const diff = calculateDifference(userMetrics.length, measurements.length);
    const fit = evaluateFit(diff);
    fits.push(fit);
    
    if (fit.confidence === 'perfect') totalScore += 5;
    else if (fit.confidence === 'good') totalScore += 3;
    else totalScore += 1;
    
    measureCount++;
  }

  // Se não há medidas para comparar, retornar score neutro
  if (measureCount === 0) {
    return { score: 5, fit: { confidence: 'good', message: 'Sem medidas para comparar' } };
  }

  // Normalizar score (0-10)
  const normalizedScore = totalScore / (measureCount * 10) * 10;

  // Determinar fit geral (usar o pior caso para segurança)
  const worstFit = fits.reduce((worst, current) => {
    const priority = { perfect: 4, good: 3, tight: 2, loose: 1 };
    return priority[current.confidence] < priority[worst.confidence] ? current : worst;
  }, fits[0] || { confidence: 'good' as const, message: 'Avaliação geral' });

  return { score: normalizedScore, fit: worstFit };
}

/**
 * Sugere o melhor tamanho para o usuário baseado em suas medidas
 */
export function suggestSize(
  userMeasurements: UserBodyMetrics,
  product: ProductDoc
): SuggestionResult {
  // Validar se há medidas do usuário
  if (!userMeasurements.bust && !userMeasurements.waist && !userMeasurements.hip) {
    return {
      suggestedSize: 'N/A',
      confidence: 'good',
      message: 'Medidas do usuário não disponíveis',
    };
  }

  // Obter variações do produto
  const variants: ProductSizeVariant[] = product.variacoes || [];

  // Se não há variações, tentar usar medidas padrão da análise IA
  if (variants.length === 0 && product.analiseIA?.standard_measurements) {
    const standard = product.analiseIA.standard_measurements;
    return {
      suggestedSize: product.tamanhos?.[0] || 'M',
      confidence: 'good',
      message: 'Sugestão baseada em medidas padrão do produto',
    };
  }

  // Se não há variações com medidas, retornar primeiro tamanho disponível
  if (variants.length === 0) {
    return {
      suggestedSize: product.tamanhos?.[0] || 'N/A',
      confidence: 'good',
      message: 'Nenhuma variação com medidas disponível',
    };
  }

  // Filtrar apenas variações com estoque disponível
  const availableVariants = variants.filter(v => v.stock > 0);

  if (availableVariants.length === 0) {
    return {
      suggestedSize: variants[0]?.name || 'N/A',
      confidence: 'good',
      message: 'Nenhum tamanho disponível em estoque',
    };
  }

  // Calcular score para cada variação disponível
  const scoredVariants = availableVariants.map(variant => ({
    variant,
    ...calculateScore(userMeasurements, variant),
  }));

  // Ordenar por score (maior primeiro)
  scoredVariants.sort((a, b) => b.score - a.score);

  // Melhor match
  const bestMatch = scoredVariants[0];

  // Alternativas (top 3, excluindo o melhor)
  const alternatives = scoredVariants
    .slice(1, 4)
    .map(item => ({
      size: item.variant.name,
      confidence: item.fit.confidence,
      message: item.fit.message,
    }));

  // Construir mensagem final
  const sizeLabel = bestMatch.variant.equivalence
    ? `${bestMatch.variant.name} (Ref: ${bestMatch.variant.equivalence})`
    : bestMatch.variant.name;

  return {
    suggestedSize: sizeLabel,
    confidence: bestMatch.fit.confidence,
    message: `${sizeLabel} - ${bestMatch.fit.message}`,
    alternativeSizes: alternatives.length > 0 ? alternatives : undefined,
  };
}
