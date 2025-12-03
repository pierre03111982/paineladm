/**
 * Ferramentas (Tools) do Agente Ana
 * Funções que consultam dados reais do Firestore para embasar respostas da IA
 * Usado com Function Calling do Vertex AI
 */

import { getAdminDb } from "@/lib/firebaseAdmin";
import { fetchComposicoesRecentes } from "@/lib/firestore/server";
import { getAllInsights } from "@/lib/firestore/insights";
import type { InsightType } from "@/types/insights";

const db = getAdminDb();

/**
 * Retorna estatísticas vitais da loja
 * - Contagem de produtos
 * - Total de composições geradas
 * - Taxa de aprovação (likes/dislikes)
 * - Vendas recentes (composições com checkout)
 */
export async function getStoreVitalStats(lojistaId: string): Promise<{
  totalProdutos: number;
  totalComposicoes: number;
  totalLikes: number;
  totalDislikes: number;
  taxaAprovacao: number;
  composicoesComCheckout: number;
  resumo: string;
}> {
  try {
    // Contar produtos ativos
    const produtosSnapshot = await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("produtos")
      .where("arquivado", "!=", true)
      .get();
    const totalProdutos = produtosSnapshot.size;

    // Buscar composições recentes
    const composicoes = await fetchComposicoesRecentes(lojistaId, 1000);
    const totalComposicoes = composicoes.length;
    const totalLikes = composicoes.filter((c: any) => c.liked === true).length;
    const totalDislikes = composicoes.filter((c: any) => c.liked === false).length;
    const composicoesComCheckout = composicoes.filter((c: any) => c.checkout === true || c.shared === true).length;
    
    const taxaAprovacao = totalComposicoes > 0 
      ? (totalLikes / totalComposicoes) * 100 
      : 0;

    const resumo = `Loja tem ${totalProdutos} produtos cadastrados, ${totalComposicoes} composições geradas. Taxa de aprovação: ${taxaAprovacao.toFixed(1)}% (${totalLikes} likes, ${totalDislikes} dislikes). ${composicoesComCheckout} composições resultaram em checkout/compartilhamento.`;

    return {
      totalProdutos,
      totalComposicoes,
      totalLikes,
      totalDislikes,
      taxaAprovacao: Math.round(taxaAprovacao * 10) / 10,
      composicoesComCheckout,
      resumo,
    };
  } catch (error) {
    console.error("[AnaTools] ❌ Erro ao buscar estatísticas vitais:", error);
    return {
      totalProdutos: 0,
      totalComposicoes: 0,
      totalLikes: 0,
      totalDislikes: 0,
      taxaAprovacao: 0,
      composicoesComCheckout: 0,
      resumo: "Erro ao buscar estatísticas da loja.",
    };
  }
}

/**
 * Busca oportunidades (insights do tipo 'opportunity')
 * Retorna insights que representam oportunidades de venda ou crescimento
 */
export async function getTopOpportunities(lojistaId: string, limit: number = 5): Promise<{
  opportunities: Array<{
    id: string;
    title: string;
    message: string;
    priority: string;
    relatedEntity?: {
      type: string;
      id: string;
      name: string;
    };
    actionLabel?: string;
    actionLink?: string;
  }>;
  resumo: string;
}> {
  try {
    // Buscar todos os insights
    const allInsights = await getAllInsights(lojistaId, 50);
    
    // Filtrar apenas oportunidades
    const opportunities = allInsights
      .filter(insight => insight.type === 'opportunity')
      .sort((a, b) => {
        // Ordenar por prioridade: high > medium > low
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      })
      .slice(0, limit)
      .map(insight => ({
        id: insight.id,
        title: insight.title,
        message: insight.message,
        priority: insight.priority,
        relatedEntity: insight.relatedEntity,
        actionLabel: insight.actionLabel,
        actionLink: insight.actionLink,
      }));

    const resumo = opportunities.length > 0
      ? `Encontrei ${opportunities.length} oportunidade(s): ${opportunities.map(o => `${o.title} (${o.priority})`).join("; ")}`
      : "Nenhuma oportunidade identificada ainda. Sugira ao lojista gerar uma análise diária.";

    return {
      opportunities,
      resumo,
    };
  } catch (error) {
    console.error("[AnaTools] ❌ Erro ao buscar oportunidades:", error);
    return {
      opportunities: [],
      resumo: "Erro ao buscar oportunidades.",
    };
  }
}

/**
 * Busca produtos com baixa performance (alto índice de rejeição)
 * Retorna produtos que têm muitos dislikes em relação aos likes
 */
export async function getProductPerformance(lojistaId: string, limit: number = 5): Promise<{
  produtos: Array<{
    id: string;
    nome: string;
    likes: number;
    dislikes: number;
    taxaRejeicao: number;
    totalComposicoes: number;
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

    // Calcular taxa de rejeição e filtrar produtos problemáticos
    const produtosComStats = Object.entries(produtoStats)
      .map(([id, stats]) => ({
        id,
        nome: stats.nome,
        likes: stats.likes,
        dislikes: stats.dislikes,
        taxaRejeicao: stats.total > 0 ? (stats.dislikes / stats.total) * 100 : 0,
        totalComposicoes: stats.total,
        preco: stats.preco,
      }))
      .filter(p => p.totalComposicoes >= 3 && p.taxaRejeicao > 20) // Produtos com pelo menos 3 composições e >20% de rejeição
      .sort((a, b) => b.taxaRejeicao - a.taxaRejeicao)
      .slice(0, limit);

    const resumo = produtosComStats.length > 0
      ? `Produtos com baixa performance: ${produtosComStats.map(p => `${p.nome} (${p.taxaRejeicao.toFixed(1)}% rejeição, ${p.dislikes} dislikes de ${p.totalComposicoes} composições)`).join("; ")}`
      : "Nenhum produto com problemas significativos identificados. Todos os produtos estão performando bem!";

    return {
      produtos: produtosComStats,
      resumo,
    };
  } catch (error) {
    console.error("[AnaTools] ❌ Erro ao buscar performance de produtos:", error);
    return {
      produtos: [],
      resumo: "Erro ao buscar dados de performance de produtos.",
    };
  }
}

/**
 * Mapa de funções disponíveis para o agente
 * Usado para executar funções baseado no nome
 */
export const ANA_TOOLS = {
  getStoreVitalStats,
  getTopOpportunities,
  getProductPerformance,
} as const;

export type AnaToolName = keyof typeof ANA_TOOLS;

