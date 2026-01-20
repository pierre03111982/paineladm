"use client";

import { useMemo } from "react";

export interface FittingInputs {
  height: number; // cm
  weight: number; // kg
  age: number;
  gender: "female" | "male";
  shapeAdjustments?: {
    bust: number; // -2 a +2
    waist: number; // -2 a +2
    hip: number; // -2 a +2
  };
}

export interface EstimatedMeasurements {
  bust: number; // cm
  waist: number; // cm
  hip: number; // cm
}

/**
 * Hook para calcular medidas estimadas baseado em IMC e ajustes visuais
 * Lógica baseada em heurística simplificada para MVP
 */
export function useFittingAlgorithm(inputs: FittingInputs): EstimatedMeasurements {
  return useMemo(() => {
    const { height, weight, age, gender, shapeAdjustments = { bust: 0, waist: 0, hip: 0 } } = inputs;

    // Calcular IMC
    const heightInMeters = height / 100;
    const IMC = weight / (heightInMeters * heightInMeters);

    let cintura: number;
    let quadril: number;
    let busto: number;

    // Fórmulas baseadas em gênero (ajustes empíricos para MVP)
    if (gender === "female") {
      cintura = IMC * 2.8 + age * 0.1;
      quadril = IMC * 3.5 + height * 0.1;
      busto = IMC * 3.2 + height * 0.15;
    } else {
      // Masculino: tórax mais desenvolvido, cintura mais reta
      cintura = IMC * 2.5 + age * 0.08;
      quadril = IMC * 3.0 + height * 0.08;
      busto = IMC * 3.5 + height * 0.2; // Tórax mais desenvolvido
    }

    // Aplicar ajustes visuais (-2 a +2, onde cada ponto = ~4cm)
    cintura += shapeAdjustments.waist * 4;
    quadril += shapeAdjustments.hip * 4;
    busto += shapeAdjustments.bust * 4;

    // Validações mínimas e máximas (medidas razoáveis)
    return {
      bust: Math.max(70, Math.min(150, Math.round(busto))),
      waist: Math.max(55, Math.min(120, Math.round(cintura))),
      hip: Math.max(70, Math.min(150, Math.round(quadril))),
    };
  }, [inputs.height, inputs.weight, inputs.age, inputs.gender, inputs.shapeAdjustments]);
}

/**
 * Compara medidas do usuário com tabela do produto para recomendar tamanho
 */
export function recommendSize(
  userMeasurements: EstimatedMeasurements,
  productMeasurements: Record<string, Record<string, number>>, // { "P": { "Busto": 88, "Cintura": 72 }, "M": { ... } }
  sizeOrder: string[] = ["PP", "P", "M", "G", "GG", "XG", "XXG"]
): {
  recommendedSize: string | null;
  fitFeedback: Record<string, "justo" | "folgado" | "levemente justo" | "ideal">;
} {
  if (!productMeasurements || Object.keys(productMeasurements).length === 0) {
    return { recommendedSize: null, fitFeedback: {} };
  }

  const scores: Record<string, number> = {};
  const fitFeedback: Record<string, Record<string, string>> = {};

  // Para cada tamanho disponível, calcular um score de compatibilidade
  Object.keys(productMeasurements).forEach((size) => {
    const sizeMeasurements = productMeasurements[size];
    let score = 0;
    const sizeFit: Record<string, string> = {};

    // Comparar cada medida
    ["Busto", "bust", "Cintura", "waist", "Quadril", "hip"].forEach((measureKey) => {
      const normalizedKey = measureKey.toLowerCase();
      let userValue: number | undefined;
      let productKey: string | undefined;

      // Mapear para chaves do usuário
      if (normalizedKey === "bust" || normalizedKey === "busto") {
        userValue = userMeasurements.bust;
        productKey = sizeMeasurements["Busto"] !== undefined ? "Busto" : sizeMeasurements["bust"] !== undefined ? "bust" : undefined;
      } else if (normalizedKey === "waist" || normalizedKey === "cintura") {
        userValue = userMeasurements.waist;
        productKey = sizeMeasurements["Cintura"] !== undefined ? "Cintura" : sizeMeasurements["waist"] !== undefined ? "waist" : undefined;
      } else if (normalizedKey === "hip" || normalizedKey === "quadril") {
        userValue = userMeasurements.hip;
        productKey = sizeMeasurements["Quadril"] !== undefined ? "Quadril" : sizeMeasurements["hip"] !== undefined ? "hip" : undefined;
      }

      if (userValue && productKey && sizeMeasurements[productKey] !== undefined) {
        const diff = Math.abs(userValue - sizeMeasurements[productKey]);
        
        // Score inversamente proporcional à diferença
        if (diff <= 2) {
          score += 10; // Ideal
          sizeFit[productKey] = "ideal";
        } else if (diff <= 4) {
          score += 7; // Levemente justo ou folgado
          sizeFit[productKey] = diff > 0 ? "levemente justo" : "levemente justo";
        } else if (diff <= 6) {
          score += 4;
          sizeFit[productKey] = userValue > sizeMeasurements[productKey] ? "justo" : "folgado";
        } else {
          score -= 2; // Penalizar diferenças grandes
          sizeFit[productKey] = userValue > sizeMeasurements[productKey] ? "justo" : "folgado";
        }
      }
    });

    scores[size] = score;
    fitFeedback[size] = sizeFit;
  });

  // Encontrar o tamanho com maior score
  const recommendedSize = Object.keys(scores).reduce((a, b) => 
    scores[a] > scores[b] ? a : b
  ) || null;

  // Converter feedback para formato simplificado
  const simplifiedFeedback: Record<string, "justo" | "folgado" | "levemente justo" | "ideal"> = {};
  if (recommendedSize && fitFeedback[recommendedSize]) {
    const feedback = fitFeedback[recommendedSize];
    // Se houver múltiplas medidas, usar a pior classificação para ser conservador
    if (Object.values(feedback).includes("justo")) {
      simplifiedFeedback[recommendedSize] = "justo";
    } else if (Object.values(feedback).includes("levemente justo")) {
      simplifiedFeedback[recommendedSize] = "levemente justo";
    } else if (Object.values(feedback).includes("ideal")) {
      simplifiedFeedback[recommendedSize] = "ideal";
    } else {
      simplifiedFeedback[recommendedSize] = "folgado";
    }
  }

  return { recommendedSize, fitFeedback: simplifiedFeedback };
}
