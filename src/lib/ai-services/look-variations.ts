/**
 * Sistema de Geração de Variações de Look para Marketing
 * Gera múltiplas variações do mesmo look em diferentes cenários/fundos/poses
 */

import { getCompositionOrchestrator } from "./composition-orchestrator";

export interface LookVariationOptions {
  baseImageUrl: string;
  productUrls: string[];
  lojistaId: string;
  customerId?: string;
  variationCount?: number; // Padrão: 5
  styles?: Array<"casual" | "elegante" | "esportivo" | "festivo" | "trabalho">;
  backgrounds?: Array<"studio" | "rua" | "casa" | "natureza" | "urbano">;
}

export interface LookVariation {
  id: string;
  imageUrl: string;
  style: string;
  background: string;
  createdAt: Date;
}

/**
 * Gera variações de um look para marketing
 */
export async function generateLookVariations(
  options: LookVariationOptions
): Promise<{
  success: boolean;
  variations?: LookVariation[];
  error?: string;
}> {
  try {
    const variationCount = options.variationCount || 5;
    const styles = options.styles || ["casual", "elegante", "esportivo", "festivo", "trabalho"];
    const backgrounds = options.backgrounds || ["studio", "rua", "casa", "natureza", "urbano"];

    const compositionOrchestrator = getCompositionOrchestrator();
    const variations: LookVariation[] = [];

    // Gerar variações
    for (let i = 0; i < variationCount; i++) {
      const style = styles[i % styles.length];
      const background = backgrounds[i % backgrounds.length];

      // Criar prompt específico para variação
      const variationPrompt = `Crie uma variação deste look com estilo ${style} em um ambiente ${background}. Mantenha a mesma pessoa e produtos, mas altere a pose, iluminação e composição para criar uma imagem única e atraente para redes sociais.`;

      try {
        // Usar createComposition com lookType creative e prompt customizado
        const result = await compositionOrchestrator.createComposition({
          personImageUrl: options.baseImageUrl,
          productId: `variation-${i}`,
          productImageUrl: options.productUrls[0] || "",
          lojistaId: options.lojistaId,
          customerId: options.customerId,
          storeName: "Loja",
          options: {
            lookType: "creative",
            allProductImageUrls: options.productUrls,
            skipWatermark: true, // Não aplicar watermark nas variações
          },
          scenePrompts: [variationPrompt],
        });

        if (result && result.tryonImageUrl) {
          variations.push({
            id: result.compositionId || `variation-${Date.now()}-${i}`,
            imageUrl: result.tryonImageUrl,
            style,
            background,
            createdAt: new Date(),
          });
        }
      } catch (error) {
        console.error(`[LookVariations] Erro ao gerar variação ${i + 1}:`, error);
        // Continuar com as próximas variações mesmo se uma falhar
      }
    }

    if (variations.length === 0) {
      return {
        success: false,
        error: "Não foi possível gerar nenhuma variação",
      };
    }

    return {
      success: true,
      variations,
    };
  } catch (error) {
    console.error("[LookVariations] Erro ao gerar variações:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

