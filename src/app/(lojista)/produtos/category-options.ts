import { getConsolidatedCategories } from "@/lib/categories/consolidated-categories";

/**
 * Opções de categorias para produtos
 * Usa as categorias consolidadas para agrupar produtos similares
 */
export const PRODUCT_CATEGORY_OPTIONS = getConsolidatedCategories();
