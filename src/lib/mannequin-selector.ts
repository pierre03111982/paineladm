/**
 * Seletor de Manequim - Lógica para escolher a pasta correta baseada nas características do usuário
 * 
 * As pastas A-E representam diferentes combinações de características físicas:
 * - Altura
 * - Peso  
 * - Idade
 * 
 * Esta função mapeia essas características para a pasta correta (A, B, C, D ou E)
 */

export interface UserPhysicalCharacteristics {
  altura: number; // em cm (ex: 160, 170, 180)
  peso: number; // em kg (ex: 50, 60, 70)
  idade: number; // em anos (ex: 20, 30, 40)
}

export type MannequinFolder = 'A' | 'B' | 'C' | 'D' | 'E';

/**
 * Calcula qual pasta de manequim usar baseado nas características físicas do usuário
 * 
 * @param characteristics - Características físicas do usuário
 * @returns A pasta (A-E) que deve ser usada
 */
export function selectMannequinFolder(
  characteristics: UserPhysicalCharacteristics
): MannequinFolder {
  const { altura, peso, idade } = characteristics;

  // Calcular IMC para ajudar na classificação
  const alturaMetros = altura / 100;
  const imc = peso / (alturaMetros * alturaMetros);

  // Lógica baseada em faixas de altura, peso e idade
  // A pasta é determinada por uma combinação desses fatores

  // Classificação por altura (faixas)
  let alturaScore = 0;
  if (altura < 155) alturaScore = 0; // Muito baixa
  else if (altura < 165) alturaScore = 1; // Baixa
  else if (altura < 175) alturaScore = 2; // Média
  else if (altura < 185) alturaScore = 3; // Alta
  else alturaScore = 4; // Muito alta

  // Classificação por IMC (faixas)
  let imcScore = 0;
  if (imc < 18.5) imcScore = 0; // Abaixo do peso
  else if (imc < 25) imcScore = 1; // Normal
  else if (imc < 30) imcScore = 2; // Sobrepeso
  else if (imc < 35) imcScore = 3; // Obesidade I
  else imcScore = 4; // Obesidade II+

  // Classificação por idade (faixas)
  let idadeScore = 0;
  if (idade < 20) idadeScore = 0; // Adolescente
  else if (idade < 30) idadeScore = 1; // Jovem adulto
  else if (idade < 40) idadeScore = 2; // Adulto
  else if (idade < 50) idadeScore = 3; // Meia-idade
  else idadeScore = 4; // Idoso

  // Combinar os scores para determinar a pasta
  // Usar uma média ponderada (altura tem mais peso, depois IMC, depois idade)
  const combinedScore = (alturaScore * 0.4) + (imcScore * 0.4) + (idadeScore * 0.2);

  // Mapear score para pasta
  if (combinedScore < 1) return 'A';
  if (combinedScore < 2) return 'B';
  if (combinedScore < 3) return 'C';
  if (combinedScore < 4) return 'D';
  return 'E';
}

/**
 * Gera o nome do arquivo do manequim baseado em todas as características
 * 
 * @param skinTone - Tom de pele (0-6)
 * @param folder - Pasta (A-E) determinada pelas características físicas
 * @param busto - Medida de busto (1-5)
 * @param cintura - Medida de cintura (1-5)
 * @param quadril - Medida de quadril (1-5)
 * @returns Nome do arquivo do manequim
 */
export function getMannequinFileName(
  skinTone: number,
  folder: MannequinFolder,
  busto: number,
  cintura: number,
  quadril: number
): string {
  return `mannequin_s${skinTone}_f${folder}_b${busto}_c${cintura}_q${quadril}.jpg`;
}

/**
 * Gera o caminho completo da imagem do manequim
 * 
 * @param skinTone - Tom de pele (0-6)
 * @param characteristics - Características físicas do usuário
 * @param busto - Medida de busto (1-5)
 * @param cintura - Medida de cintura (1-5)
 * @param quadril - Medida de quadril (1-5)
 * @returns Caminho completo da imagem
 */
export function getMannequinImagePath(
  skinTone: number,
  characteristics: UserPhysicalCharacteristics,
  busto: number,
  cintura: number,
  quadril: number
): string {
  const folder = selectMannequinFolder(characteristics);
  const fileName = getMannequinFileName(skinTone, folder, busto, cintura, quadril);
  return `/assets/mannequins/${fileName}`;
}
