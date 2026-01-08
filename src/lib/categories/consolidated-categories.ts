/**
 * Sistema de Categorias Consolidadas
 * 
 * Agrupa produtos similares em categorias principais para evitar fragmentação.
 * Produtos parecidos devem ficar na mesma categoria.
 */

// Categorias principais consolidadas (não muitas, sem subcategorias)
export const CONSOLIDATED_CATEGORIES = [
  "Roupas",
  "Calçados", 
  "Acessórios",
  "Joias",
  "Praia",
  "Fitness",
  "Cosméticos",
  "Outros",
] as const;

export type ConsolidatedCategory = typeof CONSOLIDATED_CATEGORIES[number];

/**
 * Mapeamento inteligente de categorias antigas/variadas para categorias consolidadas
 * Agrupa produtos similares na mesma categoria principal
 */
export const CATEGORY_MAPPING: Record<string, ConsolidatedCategory> = {
  // Roupas - agrupa todas as peças de vestuário
  "Vestidos": "Roupas",
  "Vestido": "Roupas",
  "Blusas": "Roupas",
  "Blusa": "Roupas",
  "Camisas": "Roupas",
  "Camisa": "Roupas",
  "Camisetas": "Roupas",
  "Camiseta": "Roupas",
  "Tops": "Roupas",
  "Top": "Roupas",
  "Calças": "Roupas",
  "Calça": "Roupas",
  "Saias": "Roupas",
  "Saia": "Roupas",
  "Shorts": "Roupas",
  "Short": "Roupas",
  "Bermudas": "Roupas",
  "Bermuda": "Roupas",
  "Jaquetas": "Roupas",
  "Jaqueta": "Roupas",
  "Casacos": "Roupas",
  "Casaco": "Roupas",
  "Blazers": "Roupas",
  "Blazer": "Roupas",
  "Macacões": "Roupas",
  "Macacão": "Roupas",
  "Conjuntos": "Roupas",
  "Conjunto": "Roupas",
  "Leggings": "Roupas",
  "Legging": "Roupas",
  "Roupas": "Roupas",
  
  // Calçados - todos os tipos de calçados
  "Calçados": "Calçados",
  "Calçado": "Calçados",
  "Tênis": "Calçados",
  "Tenis": "Calçados",
  "Sapatos": "Calçados",
  "Sapato": "Calçados",
  "Sandálias": "Calçados",
  "Sandália": "Calçados",
  "Chinelos": "Calçados",
  "Chinelo": "Calçados",
  "Botas": "Calçados",
  "Bota": "Calçados",
  "Sapatilhas": "Calçados",
  "Sapatilha": "Calçados",
  "Mocassins": "Calçados",
  "Mocassim": "Calçados",
  "Scarpins": "Calçados",
  "Scarpin": "Calçados",
  
  // Acessórios - bolsas, cintos, óculos, etc.
  "Acessórios": "Acessórios",
  "Acessório": "Acessórios",
  "Bolsas": "Acessórios",
  "Bolsa": "Acessórios",
  "Carteiras": "Acessórios",
  "Carteira": "Acessórios",
  "Cintos": "Acessórios",
  "Cinto": "Acessórios",
  "Óculos": "Acessórios",
  "Oculos": "Acessórios",
  "Chapéus": "Acessórios",
  "Chapéu": "Acessórios",
  "Gorros": "Acessórios",
  "Gorro": "Acessórios",
  "Luvas": "Acessórios",
  "Luva": "Acessórios",
  "Cachecóis": "Acessórios",
  "Cachecol": "Acessórios",
  "Mochilas": "Acessórios",
  "Mochila": "Acessórios",
  "Necessaires": "Acessórios",
  "Necessaire": "Acessórios",
  
  // Joias - todos os tipos de joias
  "Joias": "Joias",
  "Joia": "Joias",
  "Relógios": "Joias",
  "Relógio": "Joias",
  "Brincos": "Joias",
  "Brinco": "Joias",
  "Colares": "Joias",
  "Colar": "Joias",
  "Pulseiras": "Joias",
  "Pulseira": "Joias",
  "Anéis": "Joias",
  "Anel": "Joias",
  "Broches": "Joias",
  "Broche": "Joias",
  
  // Praia - itens específicos de praia/piscina
  "Praia": "Praia",
  "Biquínis": "Praia",
  "Biquíni": "Praia",
  "Maiôs": "Praia",
  "Maiô": "Praia",
  "Swimwear": "Praia",
  "Roupas de Banho": "Praia",
  "Roupa de Banho": "Praia",
  
  // Fitness - roupas e acessórios esportivos
  "Fitness": "Fitness",
  "Esportivo": "Fitness",
  "Esportivos": "Fitness",
  "Roupas Esportivas": "Fitness",
  "Roupa Esportiva": "Fitness",
  
  // Cosméticos - produtos de beleza
  "Cosméticos": "Cosméticos",
  "Cosmético": "Cosméticos",
  "Tintura (Cabelo)": "Cosméticos",
  "Tintura Cabelo": "Cosméticos",
  "Maquiagem": "Cosméticos",
  "Skincare": "Cosméticos",
  "Perfumes": "Cosméticos",
  "Perfume": "Cosméticos",
  
  // Outros - categoria catch-all
  "Outros": "Outros",
  "Outro": "Outros",
};

/**
 * Normaliza uma categoria para a categoria consolidada correspondente
 * @param category - Categoria original (pode ser qualquer string)
 * @returns Categoria consolidada
 */
export function normalizeCategory(category: string | null | undefined): ConsolidatedCategory {
  if (!category) return "Outros";
  
  const categoryTrimmed = category.trim();
  
  // Verificação direta (case-insensitive)
  const categoryLower = categoryTrimmed.toLowerCase();
  for (const [key, value] of Object.entries(CATEGORY_MAPPING)) {
    if (key.toLowerCase() === categoryLower) {
      return value;
    }
  }
  
  // Verificação por substring (para casos como "Vestido Midi" -> "Vestidos" -> "Roupas")
  for (const [key, value] of Object.entries(CATEGORY_MAPPING)) {
    if (categoryLower.includes(key.toLowerCase()) || key.toLowerCase().includes(categoryLower)) {
      return value;
    }
  }
  
  // Se não encontrar mapeamento, retorna "Outros"
  return "Outros";
}

/**
 * Retorna a lista de categorias consolidadas como array de strings
 */
export function getConsolidatedCategories(): string[] {
  return [...CONSOLIDATED_CATEGORIES];
}

/**
 * Verifica se uma categoria é válida (está na lista consolidada)
 */
export function isValidCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  return CONSOLIDATED_CATEGORIES.includes(category as ConsolidatedCategory);
}
