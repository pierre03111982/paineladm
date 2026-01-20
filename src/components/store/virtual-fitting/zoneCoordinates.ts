/**
 * Configuração de coordenadas para as faixas de ajuste (Fit Overlay)
 * 
 * Coordenadas relativas no viewBox (0-100):
 * - X: 0 = esquerda, 50 = centro, 100 = direita
 * - Y: 0 = topo, 50 = meio, 100 = base
 * 
 * Ajuste estas coordenadas se as faixas não estiverem alinhadas corretamente
 * com as imagens dos manequins baixados.
 */

export interface ZoneCoordinates {
  bust: {
    startX: number;
    startY: number;
    controlX: number;
    controlY: number;
    endX: number;
    endY: number;
  };
  waist: {
    startX: number;
    startY: number;
    controlX: number;
    controlY: number;
    endX: number;
    endY: number;
  };
  hip: {
    startX: number;
    startY: number;
    controlX: number;
    controlY: number;
    endX: number;
    endY: number;
  };
}

/**
 * Coordenadas padrão baseadas no alinhamento dos manequins da Sizebay
 * O umbigo está sempre no mesmo pixel relativo em todas as imagens
 * 
 * Curvaturas anatômicas (perspectiva 3/4):
 * - Busto: Convexo (controlY < startY/endY) - arco para cima
 * - Cintura: Quase reto ou levemente côncavo (controlY ≈ startY/endY)
 * - Quadril: Côncavo (controlY > startY/endY) - arco para baixo
 */
export const DEFAULT_ZONE_COORDINATES: ZoneCoordinates = {
  bust: {
    startX: 32,
    startY: 26,
    controlX: 50,
    controlY: 24, // Convexo: controlY menor = arco para cima (envolve o peito)
    endX: 68,
    endY: 26,
  },
  waist: {
    startX: 36,
    startY: 46,
    controlX: 50,
    controlY: 47, // Quase reto: controlY ligeiramente maior = curva suave para baixo
    endX: 64,
    endY: 46,
  },
  hip: {
    startX: 30,
    startY: 59,
    controlX: 50,
    controlY: 66, // Côncavo: controlY bem maior = arco pronunciado para baixo (envolve os quadris)
    endX: 70,
    endY: 59,
  },
};
