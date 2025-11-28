import { NextRequest, NextResponse } from "next/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { fetchLojaPerfil } from "@/lib/firestore/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import type { Firestore } from "firebase-admin/firestore";

/**
 * API Route: /api/ai/insights
 * 
 * Retorna insights inteligentes baseados nos dados reais da loja (PHASE 11).
 * Busca dados do Firestore: pedidos, dislikes, estoque.
 */
export async function GET(request: NextRequest) {
  try {
    // Buscar ID do lojista logado
    const lojistaId = await getCurrentLojistaId();
    
    if (!lojistaId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Buscar dados da loja
    const perfil = await fetchLojaPerfil(lojistaId).catch(() => null);
    
    // PHASE 11: Buscar dados reais do Firestore
    const db = getAdminDb();
    const insights = await generateRealInsights(db, lojistaId, perfil?.nome || "Sua loja");

    return NextResponse.json({
      insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API /api/ai/insights] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao gerar insights" },
      { status: 500 }
    );
  }
}

/**
 * PHASE 11: Gera insights reais baseados em dados do Firestore
 */
async function generateRealInsights(
  db: Firestore,
  lojistaId: string,
  lojaNome: string
): Promise<Array<{
  id: string;
  text: string;
  priority: "high" | "medium" | "low";
}>> {
  const insights: Array<{
    id: string;
    text: string;
    priority: "high" | "medium" | "low";
  }> = [];

  try {
    // 1. Buscar pedidos pagos nas últimas 24 horas
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);
    
    const ordersRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("orders");
    
    const recentOrdersSnapshot = await ordersRef
      .where("status", "==", "paid")
      .where("createdAt", ">=", last24Hours)
      .get();
    
    const recentOrdersCount = recentOrdersSnapshot.size;
    console.log("[AI Insights] Pedidos pagos últimas 24h:", recentOrdersCount);

    // 2. Buscar dislikes com motivo "fit_issue" (problemas de caimento)
    const actionsRef = db.collection("actions");
    const fitIssuesSnapshot = await actionsRef
      .where("lojista_id", "==", lojistaId)
      .where("type", "==", "dislike")
      .where("reason", "==", "fit_issue")
      .get();
    
    const fitDislikesCount = fitIssuesSnapshot.size;
    console.log("[AI Insights] Dislikes por caimento:", fitDislikesCount);

    // 3. Buscar produtos com estoque baixo (< 5)
    const produtosRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("produtos");
    
    const produtosSnapshot = await produtosRef.get();
    const lowStockProducts: Array<{ nome: string; estoque: number; tamanho?: string | null }> = [];
    
    produtosSnapshot.forEach((doc) => {
      const data = doc.data();
      const estoque = data.estoque || data.stock || 0;
      if (estoque < 5 && estoque > 0) {
        lowStockProducts.push({
          nome: data.nome || "Produto sem nome",
          estoque: estoque,
          tamanho: data.tamanho || data.size || null,
        });
      }
    });
    
    console.log("[AI Insights] Produtos com estoque baixo:", lowStockProducts.length);

    // 4. Buscar carrinho abandonado (composições geradas sem pedido)
    // Nota: Esta é uma aproximação - buscar composições recentes sem pedido associado
    const composicoesRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("composicoes");
    
    const recentComposicoesSnapshot = await composicoesRef
      .where("createdAt", ">=", last24Hours)
      .limit(50)
      .get();
    
    // Contar composições sem pedido (aproximação de carrinho abandonado)
    let abandonedCartsCount = 0;
    recentComposicoesSnapshot.forEach((doc) => {
      const data = doc.data();
      // Se tem customerId mas não tem pedido associado, pode ser carrinho abandonado
      if (data.customerId && !data.orderId) {
        abandonedCartsCount++;
      }
    });
    
    console.log("[AI Insights] Possíveis carrinhos abandonados:", abandonedCartsCount);

    // 5. Gerar insights baseados nos dados coletados
    
    // Insight 1: Alerta de Estoque (formato do MD: "⚠️ Alerta: Tênis Nike (38) com estoque baixo (2 un).")
    if (lowStockProducts.length > 0) {
      // Pegar o primeiro produto com estoque baixo e incluir tamanho se disponível
      const firstProduct = lowStockProducts[0];
      const tamanho = firstProduct.tamanho || "";
      const tamanhoText = tamanho ? ` (${tamanho})` : "";
      const estoqueText = firstProduct.estoque === 1 ? "1 un" : `${firstProduct.estoque} un`;
      
      if (lowStockProducts.length === 1) {
        insights.push({
          id: "stock-alert",
          text: `⚠️ Alerta: ${firstProduct.nome}${tamanhoText} com estoque baixo (${estoqueText}).`,
          priority: "high",
        });
      } else {
        const productNames = lowStockProducts.slice(0, 2).map(p => {
          const t = p.tamanho || "";
          return `${p.nome}${t ? ` (${t})` : ""}`;
        }).join(", ");
        insights.push({
          id: "stock-alert",
          text: `⚠️ Alerta: ${productNames} e mais ${lowStockProducts.length - 2} produto(s) com estoque baixo.`,
          priority: "high",
        });
      }
    }

    // Insight 2: Alerta de Qualidade (formato do MD: "🚨 Atenção: O Vestido Florido teve 40% de rejeição por 'Caimento'.")
    if (fitDislikesCount > 5) {
      // Buscar produto com mais rejeições por caimento
      const productDislikes: { [key: string]: number } = {};
      fitIssuesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const productId = data.product_id || data.productId;
        if (productId) {
          productDislikes[productId] = (productDislikes[productId] || 0) + 1;
        }
      });

      // Buscar nome do produto mais rejeitado
      let topRejectedProduct: { nome: string; count: number; percentage?: number } | null = null;
      if (Object.keys(productDislikes).length > 0) {
        const topProductId = Object.keys(productDislikes).reduce((a, b) => 
          productDislikes[a] > productDislikes[b] ? a : b
        );
        const topCount = productDislikes[topProductId];
        
        // Buscar nome do produto
        try {
          const produtoDoc = await db
            .collection("lojas")
            .doc(lojistaId)
            .collection("produtos")
            .doc(topProductId)
            .get();
          
          if (produtoDoc.exists) {
            const produtoData = produtoDoc.data();
            // Calcular porcentagem aproximada (baseado no total de ações do produto)
            const totalActionsSnapshot = await actionsRef
              .where("lojista_id", "==", lojistaId)
              .where("product_id", "==", topProductId)
              .get();
            
            const totalActions = totalActionsSnapshot.size;
            const percentage = totalActions > 0 ? Math.round((topCount / totalActions) * 100) : 0;
            
            topRejectedProduct = {
              nome: produtoData?.nome || "Produto",
              count: topCount,
              percentage: percentage,
            };
          }
        } catch (error) {
          console.error("[AI Insights] Erro ao buscar produto:", error);
        }
      }

      if (topRejectedProduct) {
        insights.push({
          id: "fit-issue",
          text: `🚨 Atenção: ${topRejectedProduct.nome} teve ${topRejectedProduct.percentage}% de rejeição por 'Caimento'.`,
          priority: "high",
        });
      } else {
        insights.push({
          id: "fit-issue",
          text: `🚨 Alerta de Qualidade: Clientes estão reclamando do caimento de produtos (${fitDislikesCount} reclamações). Verifique a modelagem.`,
          priority: "high",
        });
      }
    }

    // Insight 3: Oportunidade de Vendas (Carrinho Abandonado)
    if (abandonedCartsCount > 0) {
      insights.push({
        id: "sales-opportunity",
        text: `💰 Dinheiro na mesa: ${abandonedCartsCount} cliente(s) simularam mas não compraram nas últimas 24h. Envie um cupom!`,
        priority: "high",
      });
    }

    // Insight 4: Pedidos Recentes (formato do MD: "🚀 Sucesso: Você vendeu R$ 500,00 hoje!")
    if (recentOrdersCount > 0) {
      // Calcular receita total dos pedidos pagos
      let totalRevenue = 0;
      recentOrdersSnapshot.forEach((doc) => {
        const data = doc.data();
        totalRevenue += data.total || 0;
      });

      if (totalRevenue > 0) {
        insights.push({
          id: "recent-sales",
          text: `🚀 Sucesso: Você vendeu R$ ${totalRevenue.toFixed(2).replace(".", ",")} hoje!`,
          priority: "medium",
        });
      } else {
        insights.push({
          id: "recent-sales",
          text: `✅ ${recentOrdersCount} pedido(s) pago(s) nas últimas 24 horas! Continue assim!`,
          priority: "medium",
        });
      }
    }

    // Se não houver insights específicos, usar insights genéricos
    if (insights.length === 0) {
      insights.push({
        id: "generic-1",
        text: `Envie promoções personalizadas para clientes ativos nas últimas horas. Eles já demonstraram interesse!`,
        priority: "high",
      });
      insights.push({
        id: "generic-2",
        text: `Verifique o estoque dos produtos mais visualizados nos últimos dias. Clientes interessados podem estar esperando restock!`,
        priority: "medium",
      });
      insights.push({
        id: "generic-3",
        text: `Analise os motivos de rejeição dos produtos. Ajustes de tamanho ou estilo podem aumentar as conversões.`,
        priority: "medium",
      });
    }

    // Limitar a 3 insights mais importantes
    return insights.slice(0, 3);

  } catch (error) {
    console.error("[AI Insights] Erro ao buscar dados:", error);
    // Em caso de erro, retornar insights genéricos
    return [
      {
        id: "fallback-1",
        text: `Envie promoções personalizadas para clientes ativos nas últimas horas. Eles já demonstraram interesse!`,
        priority: "high" as const,
      },
      {
        id: "fallback-2",
        text: `Verifique o estoque dos produtos mais visualizados nos últimos dias. Clientes interessados podem estar esperando restock!`,
        priority: "medium" as const,
      },
      {
        id: "fallback-3",
        text: `Analise os motivos de rejeição dos produtos. Ajustes de tamanho ou estilo podem aumentar as conversões.`,
        priority: "medium" as const,
      },
    ];
  }
}

