/**
 * Sistema de Métricas de Qualidade de Imagem/Performance
 * Calcula notas de compatibilidade baseadas em performance de conversão
 */

import { getAdminDb } from "../firebaseAdmin";
import { fetchComposicoesRecentes } from "./server";
import type { ProdutoDoc } from "./types";

const db = getAdminDb();

/**
 * Calcula métricas de qualidade para um produto
 */
export async function calculateProductQualityMetrics(
  lojistaId: string,
  produtoId: string
): Promise<{
  compatibilityScore: number; // 1 a 5
  conversionRate: number; // 0 a 100
  complaintRate: number; // 0 a 100
}> {
  try {
    // Buscar todas as composições que usam este produto
    const composicoes = await fetchComposicoesRecentes(lojistaId, 10000);
    const composicoesComProduto = composicoes.filter(
      (comp) => comp.products.some((p) => p.id === produtoId)
    );

    if (composicoesComProduto.length === 0) {
      return {
        compatibilityScore: 3, // Nota neutra se não houver dados
        conversionRate: 0,
        complaintRate: 0,
      };
    }

    // Calcular taxa de conversão (likes / total de composições)
    const totalComposicoes = composicoesComProduto.length;
    const totalLikes = composicoesComProduto.filter((comp) => comp.liked).length;
    const conversionRate = (totalLikes / totalComposicoes) * 100;

    // Calcular taxa de reclamações (dislikes / total de composições)
    // Assumindo que dislikes são uma forma de "reclamação"
    const totalDislikes = composicoesComProduto.filter(
      (comp) => comp.liked === false
    ).length;
    const complaintRate = (totalDislikes / totalComposicoes) * 100;

    // Calcular nota de compatibilidade (1 a 5)
    // Baseado em: taxa de conversão (peso 70%) e taxa de reclamações (peso 30%)
    let compatibilityScore = 3; // Base neutra

    // Ajustar baseado na taxa de conversão
    if (conversionRate >= 50) {
      compatibilityScore += 1.5; // Excelente conversão
    } else if (conversionRate >= 30) {
      compatibilityScore += 0.5; // Boa conversão
    } else if (conversionRate < 10) {
      compatibilityScore -= 1; // Baixa conversão
    }

    // Ajustar baseado na taxa de reclamações
    if (complaintRate > 30) {
      compatibilityScore -= 1; // Muitas reclamações
    } else if (complaintRate < 10) {
      compatibilityScore += 0.5; // Poucas reclamações
    }

    // Garantir que está entre 1 e 5
    compatibilityScore = Math.max(1, Math.min(5, Math.round(compatibilityScore * 10) / 10));

    return {
      compatibilityScore,
      conversionRate: Math.round(conversionRate * 10) / 10,
      complaintRate: Math.round(complaintRate * 10) / 10,
    };
  } catch (error) {
    console.error("[ProductQuality] Erro ao calcular métricas:", error);
    return {
      compatibilityScore: 3,
      conversionRate: 0,
      complaintRate: 0,
    };
  }
}

/**
 * Atualiza métricas de qualidade de um produto
 */
export async function updateProductQualityMetrics(
  lojistaId: string,
  produtoId: string
): Promise<void> {
  try {
    const metrics = await calculateProductQualityMetrics(lojistaId, produtoId);

    const produtoRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("produtos")
      .doc(produtoId);

    await produtoRef.update({
      qualityMetrics: {
        ...metrics,
        lastCalculatedAt: new Date(),
      },
      updatedAt: new Date(),
    });

    console.log("[ProductQuality] Métricas atualizadas para produto:", produtoId);
  } catch (error) {
    console.error("[ProductQuality] Erro ao atualizar métricas:", error);
    throw error;
  }
}

/**
 * Atualiza métricas de qualidade para todos os produtos de um lojista
 */
export async function updateAllProductsQualityMetrics(
  lojistaId: string
): Promise<{ updated: number; errors: number }> {
  try {
    const produtosSnapshot = await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("produtos")
      .where("arquivado", "!=", true)
      .get();

    let updated = 0;
    let errors = 0;

    for (const doc of produtosSnapshot.docs) {
      try {
        await updateProductQualityMetrics(lojistaId, doc.id);
        updated++;
      } catch (error) {
        console.error(`[ProductQuality] Erro ao atualizar produto ${doc.id}:`, error);
        errors++;
      }
    }

    return { updated, errors };
  } catch (error) {
    console.error("[ProductQuality] Erro ao atualizar todas as métricas:", error);
    throw error;
  }
}

