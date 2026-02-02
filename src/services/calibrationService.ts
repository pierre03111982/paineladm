/**
 * Serviço de calibração por objeto de referência (ex.: cartão de crédito).
 * Chamado APENAS na foto frontal (Container 1). Se found: true, a escala
 * é armazenada no estado global e usada para todas as imagens do produto.
 */

export interface CalibrationResult {
  found: boolean;
  pixelsPerCm?: number;
}

/**
 * Analisa a imagem (esperada: foto de frente) em busca de um objeto de referência
 * (ex.: cartão de crédito) e retorna o fator de calibração (pixels por cm).
 * Só deve retornar found: true quando o cartão for realmente detectado na foto frontal.
 * Caso contrário as medidas seguem o padrão ABNT.
 *
 * MOCK: por padrão retorna found: false (sem cartão). Para testar com cartão,
 * altere para { found: true, pixelsPerCm: 45.5 }.
 */
export async function analyzeImageForReference(imageFile: File): Promise<CalibrationResult> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Sem cartão na imagem → usar ABNT. Só calibrado quando houver objeto de referência na frente.
  // Para testar cenário COM cartão: return { found: true, pixelsPerCm: 45.5 };
  return {
    found: false,
  };
}
