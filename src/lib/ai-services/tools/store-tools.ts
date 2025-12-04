/**
 * Ferramentas (Tools) para o Agente Ana
 * Funções que consultam dados reais do Firestore para embasar respostas da IA
 */

import { getAdminDb } from "@/lib/firebaseAdmin";
import { fetchComposicoesRecentes } from "@/lib/firestore/server";
import { getAllInsights } from "@/lib/firestore/insights";

const db = getAdminDb();

/**
 * Busca os produtos mais vendidos/curtidos
 * Retorna produtos ordenados por número de likes/checkouts
 */
export async function getTopSellingProducts(lojistaId: string, limit: number = 5): Promise<{
  produtos: Array<{
    id: string;
    nome: string;
    likes: number;
    dislikes: number;
    taxaConversao: number;
    preco?: number;
  }>;
  resumo: string;
}> {
  try {
    // Buscar todas as composições recentes
    const composicoes = await fetchComposicoesRecentes(lojistaId, 1000);
    
    // Contar likes/dislikes por produto
    const produtoStats: Record<string, {
      nome: string;
      likes: number;
      dislikes: number;
      total: number;
      preco?: number;
    }> = {};

    composicoes.forEach((comp: any) => {
      if (comp.products && Array.isArray(comp.products)) {
        comp.products.forEach((prod: any) => {
          const produtoId = prod.id || prod.productId;
          if (!produtoId) return;

          if (!produtoStats[produtoId]) {
            produtoStats[produtoId] = {
              nome: prod.nome || prod.name || `Produto ${produtoId}`,
              likes: 0,
              dislikes: 0,
              total: 0,
              preco: prod.preco || prod.price,
            };
          }

          produtoStats[produtoId].total++;
          if (comp.liked === true) {
            produtoStats[produtoId].likes++;
          } else if (comp.liked === false) {
            produtoStats[produtoId].dislikes++;
          }
        });
      }
    });

    // Ordenar por taxa de conversão (likes / total)
    const produtosComStats = Object.entries(produtoStats)
      .map(([id, stats]) => ({
        id,
        nome: stats.nome,
        likes: stats.likes,
        dislikes: stats.dislikes,
        taxaConversao: stats.total > 0 ? (stats.likes / stats.total) * 100 : 0,
        preco: stats.preco,
        total: stats.total,
      }))
      .filter(p => p.total >= 3) // Apenas produtos com pelo menos 3 composições
      .sort((a, b) => b.taxaConversao - a.taxaConversao)
      .slice(0, limit);

    const resumo = produtosComStats.length > 0
      ? `Top ${produtosComStats.length} produtos: ${produtosComStats.map(p => `${p.nome} (${p.taxaConversao.toFixed(1)}% aprovação, ${p.likes} likes)`).join(", ")}`
      : "Nenhum produto com dados suficientes ainda.";

    return {
      produtos: produtosComStats.map(({ total, ...rest }) => rest),
      resumo,
    };
  } catch (error) {
    console.error("[StoreTools] Erro ao buscar top produtos:", error);
    return {
      produtos: [],
      resumo: "Erro ao buscar dados de produtos.",
    };
  }
}

/**
 * Busca produtos com baixa performance (muitos dislikes)
 */
export async function getLowPerformingProducts(lojistaId: string, limit: number = 5): Promise<{
  produtos: Array<{
    id: string;
    nome: string;
    likes: number;
    dislikes: number;
    taxaRejeicao: number;
    preco?: number;
  }>;
  resumo: string;
}> {
  try {
    const composicoes = await fetchComposicoesRecentes(lojistaId, 1000);
    
    const produtoStats: Record<string, {
      nome: string;
      likes: number;
      dislikes: number;
      total: number;
      preco?: number;
    }> = {};

    composicoes.forEach((comp: any) => {
      if (comp.products && Array.isArray(comp.products)) {
        comp.products.forEach((prod: any) => {
          const produtoId = prod.id || prod.productId;
          if (!produtoId) return;

          if (!produtoStats[produtoId]) {
            produtoStats[produtoId] = {
              nome: prod.nome || prod.name || `Produto ${produtoId}`,
              likes: 0,
              dislikes: 0,
              total: 0,
              preco: prod.preco || prod.price,
            };
          }

          produtoStats[produtoId].total++;
          if (comp.liked === true) {
            produtoStats[produtoId].likes++;
          } else if (comp.liked === false) {
            produtoStats[produtoId].dislikes++;
          }
        });
      }
    });

    // Ordenar por taxa de rejeição (dislikes / total)
    const produtosComStats = Object.entries(produtoStats)
      .map(([id, stats]) => ({
        id,
        nome: stats.nome,
        likes: stats.likes,
        dislikes: stats.dislikes,
        taxaRejeicao: stats.total > 0 ? (stats.dislikes / stats.total) * 100 : 0,
        preco: stats.preco,
        total: stats.total,
      }))
      .filter(p => p.total >= 3 && p.taxaRejeicao > 20) // Produtos com pelo menos 20% de rejeição
      .sort((a, b) => b.taxaRejeicao - a.taxaRejeicao)
      .slice(0, limit);

    const resumo = produtosComStats.length > 0
      ? `Produtos com baixa performance: ${produtosComStats.map(p => `${p.nome} (${p.taxaRejeicao.toFixed(1)}% rejeição, ${p.dislikes} dislikes)`).join(", ")}`
      : "Nenhum produto com problemas significativos identificados.";

    return {
      produtos: produtosComStats.map(({ total, ...rest }) => rest),
      resumo,
    };
  } catch (error) {
    console.error("[StoreTools] Erro ao buscar produtos com baixa performance:", error);
    return {
      produtos: [],
      resumo: "Erro ao buscar dados de produtos.",
    };
  }
}

/**
 * Busca insights recentes da loja
 */
export async function getCustomerInsights(lojistaId: string, limit: number = 5): Promise<{
  insights: Array<{
    type: string;
    title: string;
    message: string;
    priority: string;
  }>;
  resumo: string;
}> {
  try {
    const insights = await getAllInsights(lojistaId, limit);
    
    const insightsFormatados = insights.map(insight => ({
      type: insight.type,
      title: insight.title,
      message: insight.message,
      priority: insight.priority,
    }));

    const resumo = insightsFormatados.length > 0
      ? `Insights recentes: ${insightsFormatados.map(i => `${i.title} (${i.priority})`).join("; ")}`
      : "Nenhum insight disponível ainda. Sugira ao lojista gerar uma análise.";

    return {
      insights: insightsFormatados,
      resumo,
    };
  } catch (error) {
    console.error("[StoreTools] Erro ao buscar insights:", error);
    return {
      insights: [],
      resumo: "Erro ao buscar insights.",
    };
  }
}

/**
 * Busca estatísticas gerais da loja
 */
export async function getStoreStats(lojistaId: string): Promise<{
  totalProdutos: number;
  totalComposicoes: number;
  totalLikes: number;
  totalDislikes: number;
  taxaAprovacao: number;
  resumo: string;
}> {
  try {
    // Contar produtos
    const produtosSnapshot = await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("produtos")
      .where("arquivado", "!=", true)
      .get();
    const totalProdutos = produtosSnapshot.size;

    // Buscar composições
    const composicoes = await fetchComposicoesRecentes(lojistaId, 1000);
    const totalComposicoes = composicoes.length;
    const totalLikes = composicoes.filter((c: any) => c.liked === true).length;
    const totalDislikes = composicoes.filter((c: any) => c.liked === false).length;
    const taxaAprovacao = totalComposicoes > 0 
      ? (totalLikes / totalComposicoes) * 100 
      : 0;

    const resumo = `Loja tem ${totalProdutos} produtos, ${totalComposicoes} composições geradas. Taxa de aprovação: ${taxaAprovacao.toFixed(1)}% (${totalLikes} likes, ${totalDislikes} dislikes).`;

    return {
      totalProdutos,
      totalComposicoes,
      totalLikes,
      totalDislikes,
      taxaAprovacao: Math.round(taxaAprovacao * 10) / 10,
      resumo,
    };
  } catch (error) {
    console.error("[StoreTools] Erro ao buscar estatísticas:", error);
    return {
      totalProdutos: 0,
      totalComposicoes: 0,
      totalLikes: 0,
      totalDislikes: 0,
      taxaAprovacao: 0,
      resumo: "Erro ao buscar estatísticas da loja.",
    };
  }
}



