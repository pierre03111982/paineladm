// ARQUIVO: src/lib/standards/abnt-data.ts
// Dicionário Inteligente de Medidas ABNT
// Resolve o problema de "adivinhação" - valores sempre corretos da tabela oficial

// Tipo para intervalos de medida [min, max] em cm
export type MeasurementRange = [number, number];

export interface StandardMeasurements {
  bust?: number;       // Valor único de referência (média do intervalo)
  bustRange?: MeasurementRange;
  waist: number;
  waistRange: MeasurementRange;
  hip?: number;
  hipRange?: MeasurementRange;
  height?: number;     // Estatura (muito importante para infantil)
  length: number;      // Comprimento sugerido da peça (T-Shirt Base)
}

// ====================================================================
// TABELA MESTRE ABNT (NBR 15800, 16933, 16060)
// ====================================================================
export const ABNT_STANDARDS: Record<string, Record<string, StandardMeasurements>> = {

  // --- INFANTIL (NBR 15800) ---
  // Cobre Unissex/Feminino conforme PDF enviado
  KIDS: {
    'PP': { height: 52, bust: 40, waist: 39, hip: 43, length: 26 }, // RN
    'P':  { height: 62, bust: 44, waist: 41, hip: 44, length: 34 },
    'M':  { height: 67, bust: 46, waist: 43, hip: 46, length: 36 },
    'G':  { height: 72, bust: 48, waist: 44, hip: 48, length: 38 },
    'GG': { height: 77, bust: 49, waist: 48, hip: 50, length: 40 },
    '1':  { height: 82, bust: 50, waist: 50, hip: 52, length: 42 },
    '2':  { height: 88, bust: 52, waist: 52, hip: 54, length: 44 },
    '3':  { height: 98, bust: 54, waist: 54, hip: 56, length: 46 },
    '4':  { height: 105, bust: 56, waist: 56, hip: 61, length: 48 },
    '6':  { height: 117, bust: 61, waist: 58, hip: 65, length: 50 },
    '8':  { height: 128, bust: 66, waist: 60, hip: 70, length: 53 },
    '10': { height: 137, bust: 70, waist: 62, hip: 76, length: 56 },
    '12': { height: 150, bust: 75, waist: 64, hip: 82, length: 60 },
    '14': { height: 156, bust: 78, waist: 66, hip: 86, length: 64 },
    '16': { height: 162, bust: 84, waist: 69, hip: 90, length: 68 },
  },

  // --- FEMININO ADULTO (NBR 16933) ---
  // Biótipo Retângulo (Padrão mais comum)
  FEMALE: {
    '36': { bust: 82, bustRange: [80, 84], waist: 64, waistRange: [62, 66], hip: 90, hipRange: [88, 92], length: 58 },
    '38': { bust: 86, bustRange: [84, 88], waist: 68, waistRange: [66, 70], hip: 94, hipRange: [92, 96], length: 60 },
    '40': { bust: 90, bustRange: [88, 92], waist: 72, waistRange: [70, 74], hip: 98, hipRange: [96, 100], length: 62 },
    '42': { bust: 94, bustRange: [92, 96], waist: 76, waistRange: [74, 78], hip: 102, hipRange: [100, 104], length: 63 },
    '44': { bust: 98, bustRange: [96, 100], waist: 80, waistRange: [78, 82], hip: 106, hipRange: [104, 108], length: 64 },
    '46': { bust: 102, bustRange: [100, 104], waist: 84, waistRange: [82, 86], hip: 110, hipRange: [108, 112], length: 66 },
    // Plus Size
    '48': { bust: 107, bustRange: [104, 110], waist: 89, waistRange: [86, 92], hip: 115, hipRange: [112, 118], length: 68 },
    '50': { bust: 113, bustRange: [110, 116], waist: 95, waistRange: [92, 98], hip: 121, hipRange: [118, 124], length: 70 },
    '52': { bust: 119, bustRange: [116, 122], waist: 101, waistRange: [98, 104], hip: 127, hipRange: [124, 130], length: 72 },
    '54': { bust: 125, bustRange: [122, 128], waist: 107, waistRange: [104, 110], hip: 133, hipRange: [130, 136], length: 74 },
  },

  // --- MASCULINO ADULTO (NBR 16060) ---
  MALE: {
    '38': { bust: 90, bustRange: [88, 92], waist: 78, waistRange: [76, 80], length: 68 },
    '40': { bust: 94, bustRange: [92, 96], waist: 82, waistRange: [80, 84], length: 70 },
    '42': { bust: 98, bustRange: [96, 100], waist: 86, waistRange: [84, 88], length: 72 },
    '44': { bust: 102, bustRange: [100, 104], waist: 90, waistRange: [88, 92], length: 74 },
    '46': { bust: 106, bustRange: [104, 108], waist: 94, waistRange: [92, 96], length: 76 },
    '48': { bust: 110, bustRange: [108, 112], waist: 98, waistRange: [96, 100], length: 78 },
    '50': { bust: 114, bustRange: [112, 116], waist: 102, waistRange: [100, 104], length: 80 },
    '52': { bust: 118, bustRange: [116, 120], waist: 106, waistRange: [104, 108], length: 82 },
    '54': { bust: 122, bustRange: [120, 124], waist: 110, waistRange: [108, 112], length: 84 },
  }
};

// Conversor de Letras (P/M/G) para Chave da Tabela
export const SIZE_CONVERTER = {
  FEMALE: { 'PP': '36', 'P': '38', 'M': '40', 'G': '42', 'GG': '44', 'XG': '46', 'G1': '48', 'G2': '50', 'G3': '52', 'G4': '54' },
  MALE:   { 'PP': '38', 'P': '40', 'M': '42', 'G': '44', 'GG': '46', 'XG': '48', 'G1': '50', 'G2': '52', 'G3': '54' },
  KIDS:   { 'RN': 'PP', 'P': 'P', 'M': 'M', 'G': 'G', 'GG': 'GG' } // Infantil números mapeiam direto (4->4, 6->6)
};

/**
 * Função Helper para buscar dados sem erro
 * @param audience - 'KIDS' | 'FEMALE' | 'MALE'
 * @param size - Tamanho como string (ex: '6', 'M', '42', 'PP')
 * @returns Medidas padrão ABNT ou null se não encontrado
 */
export function getStandardMeasurements(
  audience: 'KIDS' | 'FEMALE' | 'MALE' | 'kids' | 'female' | 'male',
  size: string
): StandardMeasurements | null {
  // Normalizar audience para maiúsculas
  const normalizedAudience = audience.toUpperCase() as 'KIDS' | 'FEMALE' | 'MALE';
  const table = ABNT_STANDARDS[normalizedAudience];
  if (!table) return null;

  // 1. Tenta buscar pelo tamanho exato (ex: "42" ou "6")
  if (table[size]) return table[size];

  // 2. Se não achar, tenta converter letra para número (ex: "M" -> "40")
  const converter = SIZE_CONVERTER[normalizedAudience];
  if (converter && converter[size as keyof typeof converter]) {
    const numericSize = converter[size as keyof typeof converter];
    return table[numericSize] || null;
  }

  return null;
}

/**
 * Obtém todas as medidas ABNT para uma grade de tamanhos
 * @param audience - Público alvo
 * @param sizes - Array de tamanhos (ex: ['PP', 'P', 'M', 'G', 'GG'])
 * @returns Record com medidas por tamanho, ou null se não houver dados ABNT
 */
export function getABNTMeasurementsForSizes(
  audience: 'KIDS' | 'FEMALE' | 'MALE' | 'kids' | 'female' | 'male',
  sizes: string[]
): Record<string, StandardMeasurements> | null {
  const result: Record<string, StandardMeasurements> = {};
  let hasAnyData = false;

  sizes.forEach(size => {
    const measurements = getStandardMeasurements(audience, size);
    if (measurements) {
      result[size] = measurements;
      hasAnyData = true;
    }
  });

  return hasAnyData ? result : null;
}
