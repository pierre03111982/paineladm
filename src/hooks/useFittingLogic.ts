/**
 * Hook para calcular o status de ajuste (fit) baseado na diferença entre medidas da roupa e do corpo
 * 
 * Lógica:
 * Diferença = Medida da Roupa - Medida do Corpo
 * 
 * - Se Diferença > 4cm: "folgado" (Amarelo) - Roupa muito maior que o corpo
 * - Se Diferença entre -2cm e 4cm: "ideal" (Verde) - Roupa ligeiramente maior ou igual
 * - Se Diferença < -2cm: "justo" (Vermelho) - Roupa menor que o corpo (apertado)
 */

export type FitStatus = "ideal" | "justo" | "folgado";

interface UserMeasurements {
  bust: number;
  waist: number;
  hip: number;
}

interface GarmentMeasurements {
  bust: number;
  waist: number;
  hip: number;
}

interface FittingLogicResult {
  bustStatus: FitStatus | null;
  waistStatus: FitStatus | null;
  hipStatus: FitStatus | null;
  garmentMeasurements: GarmentMeasurements | null;
}

/**
 * Calcula o status de ajuste para uma zona específica
 * 
 * @param bodyPart - Medida do corpo do usuário (cm)
 * @param garmentPart - Medida da peça de roupa (cm)
 * @returns Status de ajuste: "ideal", "justo", ou "folgado"
 */
function calculateZoneStatus(bodyPart: number, garmentPart: number): FitStatus {
  const diff = garmentPart - bodyPart; // Diferença = Roupa - Corpo
  
  // Se Diferença < -2cm: Roupa menor que corpo = Apertado (Justo)
  if (diff < -2) return "justo";
  
  // Se Diferença > 4cm: Roupa muito maior que corpo = Folgado
  if (diff > 4) return "folgado";
  
  // Se Diferença entre -2cm e 4cm: Ideal (folga adequada)
  return "ideal";
}

/**
 * Hook para calcular o status de ajuste para todas as zonas
 * 
 * @param currentSize - Tamanho da peça selecionado (ex: "36", "38", "40")
 * @param productMeasurements - Tabela de medidas do produto por tamanho
 * @param userMeasurements - Medidas do corpo do usuário
 * @returns Status de ajuste para busto, cintura e quadril, e medidas da peça
 */
export function useFittingLogic(
  currentSize: string | null,
  productMeasurements: Record<string, Record<string, number>> | undefined,
  userMeasurements: UserMeasurements
): FittingLogicResult {
  // Se não há tamanho selecionado ou tabela de medidas, retorna valores vazios
  if (!currentSize || !productMeasurements || !productMeasurements[currentSize]) {
    return {
      bustStatus: null,
      waistStatus: null,
      hipStatus: null,
      garmentMeasurements: null,
    };
  }

  const garment = productMeasurements[currentSize];

  // Normalizar nomes das medidas (pode vir como "Busto", "bust", etc.)
  const garmentBust = garment["Busto"] || garment["bust"] || 0;
  const garmentWaist = garment["Cintura"] || garment["waist"] || 0;
  const garmentHip = garment["Quadril"] || garment["hip"] || 0;

  // Calcular status para cada zona
  const bustStatus = garmentBust > 0 ? calculateZoneStatus(userMeasurements.bust, garmentBust) : null;
  const waistStatus = garmentWaist > 0 ? calculateZoneStatus(userMeasurements.waist, garmentWaist) : null;
  const hipStatus = garmentHip > 0 ? calculateZoneStatus(userMeasurements.hip, garmentHip) : null;

  return {
    bustStatus,
    waistStatus,
    hipStatus,
    garmentMeasurements: {
      bust: garmentBust,
      waist: garmentWaist,
      hip: garmentHip,
    },
  };
}
