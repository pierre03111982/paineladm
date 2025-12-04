/**
 * Ferramentas (Tools) do Agente Ana
 * Funções que consultam dados reais do Firestore para embasar respostas da IA
 * Usado com Function Calling do Vertex AI
 */

import { getAdminDb } from "@/lib/firebaseAdmin";
import { fetchComposicoesRecentes } from "@/lib/firestore/server";
import { getAllInsights } from "@/lib/firestore/insights";
import { fetchActiveClients } from "@/lib/firestore/crm-queries";
import { analyzeCustomerProfile } from "@/lib/ai-services/tools/customer-analysis";
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
 * Busca produtos por categoria (ex: calçados, roupas, acessórios)
 * Retorna contagem e lista de produtos de uma categoria específica
 */
export async function getProductsByCategory(lojistaId: string, categoria: string): Promise<{
  categoria: string;
  total: number;
  produtos: Array<{
    id: string;
    nome: string;
    preco?: number;
    imagemUrl?: string;
  }>;
  resumo: string;
  instrucoes?: string;
}> {
  try {
    const produtosSnapshot = await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("produtos")
      .where("arquivado", "!=", true)
      .get();

    // Filtrar por categoria (case-insensitive)
    const categoriaLower = categoria.toLowerCase();
    const produtosFiltrados = produtosSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((prod: any) => {
        const prodCategoria = (prod.categoria || prod.category || "").toLowerCase();
        return prodCategoria.includes(categoriaLower) || categoriaLower.includes(prodCategoria);
      });

    const produtosFormatados = produtosFiltrados.slice(0, 10).map((prod: any) => ({
      id: prod.id,
      nome: prod.nome || prod.name || `Produto ${prod.id}`,
      preco: prod.preco || prod.price,
      imagemUrl: prod.imagemUrl || prod.imageUrl || prod.imagem || prod.image,
      categoria: prod.categoria || prod.category || categoria,
      link: `/produtos/${prod.id}`,
    }));

    // Criar resumo detalhado com informações úteis
    let resumo: string;
    let instrucoes: string;
    
    if (produtosFiltrados.length > 0) {
      const principaisNomes = produtosFormatados.length > 0
        ? produtosFormatados.slice(0, 3).map((p: any) => {
            const precoFormatado = p.preco ? ` (R$ ${p.preco.toFixed(2).replace('.', ',')})` : '';
            return `${p.nome}${precoFormatado}`;
          }).join(", ")
        : "";
      const maisProdutos = produtosFormatados.length > 3 ? ` e mais ${produtosFormatados.length - 3}...` : "";
      
      resumo = `Encontrei ${produtosFiltrados.length} produto(s) na categoria "${categoria}". ${principaisNomes}${maisProdutos}. Use os Smart Cards para mostrar os produtos visualmente.`;
      
      // Instruções para Smart Cards
      const primeiroProduto = produtosFormatados[0];
      if (primeiroProduto) {
        const nomeCard = primeiroProduto.nome || 'Produto';
        const precoCard = primeiroProduto.preco ? `R$ ${primeiroProduto.preco.toFixed(2).replace('.', ',')}` : 'R$ XX,XX';
        const imagemCard = primeiroProduto.imagemUrl || 'URL';
        const linkCard = primeiroProduto.link || '/produtos/ID';
        const categoriaEncoded = encodeURIComponent(categoria);
        
        instrucoes = `Use Smart Cards para mostrar os produtos principais. Formato: {{CARD:PRODUCT|${nomeCard}|${precoCard}|${imagemCard}|${linkCard}}}. Crie um link para ver todos: [[Ver ${categoria}]](/produtos?categoria=${categoriaEncoded}).`;
      } else {
        instrucoes = `Use Smart Cards para mostrar os produtos principais. Crie um link para ver todos: [[Ver ${categoria}]](/produtos?categoria=${encodeURIComponent(categoria)}).`;
      }
    } else {
      resumo = `Nenhum produto encontrado na categoria "${categoria}". Verifique se a categoria está correta ou se há produtos cadastrados. Sugira ao usuário cadastrar produtos: [[Cadastrar Produto]](/produtos/novo)`;
      instrucoes = `Nenhum produto encontrado. Sugira cadastrar: [[Cadastrar Produto]](/produtos/novo)`;
    }

    return {
      categoria,
      total: produtosFiltrados.length,
      produtos: produtosFormatados,
      resumo,
      instrucoes,
    };
  } catch (error) {
    console.error("[AnaTools] ❌ Erro ao buscar produtos por categoria:", error);
    return {
      categoria,
      total: 0,
      produtos: [],
      resumo: `Erro ao buscar produtos da categoria "${categoria}".`,
      instrucoes: `Erro ao buscar produtos. Tente novamente ou verifique a categoria.`,
    };
  }
}

/**
 * Busca produtos por nome (busca parcial/total no nome do produto)
 * Retorna produtos que correspondem ao termo de busca
 * Útil para comparações de preço e informações específicas de produtos
 */
export async function getProductsByName(lojistaId: string, nomeProduto: string): Promise<{
  termoBusca: string;
  total: number;
  produtos: Array<{
    id: string;
    nome: string;
    preco?: number;
    categoria?: string;
    imagemUrl?: string;
  }>;
  resumo: string;
}> {
  try {
    const produtosSnapshot = await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("produtos")
      .where("arquivado", "!=", true)
      .get();

    // Buscar produtos por nome (case-insensitive, busca parcial)
    // PRIORIZAR busca pelo NOME do produto, depois pela categoria
    const nomeLower = nomeProduto.toLowerCase();
    const todosProdutos = produtosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Primeiro: produtos que têm o termo no NOME (prioridade alta)
    const produtosPorNome = todosProdutos.filter((prod: any) => {
      const nomeProd = (prod.nome || prod.name || "").toLowerCase();
      return nomeProd.includes(nomeLower) || nomeLower.includes(nomeProd);
    });
    
    // Segundo: produtos que têm o termo na CATEGORIA (prioridade baixa)
    const produtosPorCategoria = todosProdutos.filter((prod: any) => {
      const categoriaProd = (prod.categoria || prod.category || "").toLowerCase();
      return categoriaProd.includes(nomeLower) || nomeLower.includes(categoriaProd);
    });
    
    // Combinar: primeiro os que têm no nome, depois os que têm na categoria
    // Remover duplicatas mantendo a ordem de prioridade
    const produtosUnicos = new Map();
    [...produtosPorNome, ...produtosPorCategoria].forEach((prod: any) => {
      if (!produtosUnicos.has(prod.id)) {
        produtosUnicos.set(prod.id, prod);
      }
    });
    
    const produtosEncontrados = Array.from(produtosUnicos.values())
      .slice(0, 10) // Limitar a 10 resultados
      .map((prod: any) => ({
        id: prod.id,
        nome: prod.nome || prod.name || `Produto ${prod.id}`,
        preco: prod.preco || prod.price,
        categoria: prod.categoria || prod.category || "",
        imagemUrl: prod.imagemUrl || prod.imageUrl || prod.imagem || prod.image,
      }));

    let resumo: string;
    if (produtosEncontrados.length > 0) {
      const produtosComPreco = produtosEncontrados.filter(p => p.preco);
      const produtosSemPreco = produtosEncontrados.filter(p => !p.preco);
      
      if (produtosComPreco.length > 0) {
        const produtosInfo = produtosComPreco.map(p => 
          `${p.nome} (R$ ${p.preco!.toFixed(2).replace('.', ',')})`
        ).join(", ");
        resumo = `Encontrei ${produtosEncontrados.length} produto(s) para "${nomeProduto}": ${produtosInfo}`;
        
        if (produtosSemPreco.length > 0) {
          resumo += `. ${produtosSemPreco.length} produto(s) sem preço cadastrado.`;
        }
      } else {
        resumo = `Encontrei ${produtosEncontrados.length} produto(s) para "${nomeProduto}": ${produtosEncontrados.map(p => p.nome).join(", ")}. Atenção: nenhum produto tem preço cadastrado.`;
      }
    } else {
      resumo = `Nenhum produto encontrado para "${nomeProduto}". Verifique se o produto está cadastrado ou se o nome está correto.`;
    }

    return {
      termoBusca: nomeProduto,
      total: produtosEncontrados.length,
      produtos: produtosEncontrados,
      resumo,
    };
  } catch (error) {
    console.error("[AnaTools] ❌ Erro ao buscar produtos por nome:", error);
    return {
      termoBusca: nomeProduto,
      total: 0,
      produtos: [],
      resumo: `Erro ao buscar produtos para "${nomeProduto}".`,
    };
  }
}

/**
 * Busca cliente por nome ou identificador
 * Retorna informações do cliente incluindo estatísticas e histórico
 */
export async function getClientByName(lojistaId: string, nomeCliente: string): Promise<{
  termoBusca: string;
  total: number;
  clientes: Array<{
    id: string;
    nome: string;
    whatsapp?: string;
    totalComposicoes?: number;
    totalLikes?: number;
    totalDislikes?: number;
    ultimaComposicao?: string;
  }>;
  resumo: string;
}> {
  try {
    const clientesSnapshot = await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes")
      .get();

    const nomeLower = nomeCliente.toLowerCase();
    const clientesEncontrados = clientesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((cliente: any) => {
        const nomeCliente = (cliente.nome || "").toLowerCase();
        const whatsappCliente = (cliente.whatsapp || "").toLowerCase();
        return nomeCliente.includes(nomeLower) || 
               nomeLower.includes(nomeCliente) ||
               whatsappCliente.includes(nomeLower);
      })
      .slice(0, 10)
      .map((cliente: any) => ({
        id: cliente.id,
        nome: cliente.nome || "Cliente sem nome",
        whatsapp: cliente.whatsapp,
        totalComposicoes: cliente.totalComposicoes || 0,
        totalLikes: cliente.totalLikes || 0,
        totalDislikes: cliente.totalDislikes || 0,
        ultimaComposicao: cliente.ultimaComposicao ? new Date(cliente.ultimaComposicao.toDate()).toLocaleDateString("pt-BR") : undefined,
      }));

    let resumo: string;
    if (clientesEncontrados.length > 0) {
      const primeiroCliente = clientesEncontrados[0];
      resumo = `Encontrei ${clientesEncontrados.length} cliente(s) para "${nomeCliente}": ${clientesEncontrados.map(c => c.nome).join(", ")}. `;
      resumo += `Cliente principal: ${primeiroCliente.nome} - ${primeiroCliente.totalComposicoes || 0} composições, ${primeiroCliente.totalLikes || 0} likes, ${primeiroCliente.totalDislikes || 0} dislikes.`;
    } else {
      resumo = `Nenhum cliente encontrado para "${nomeCliente}". Verifique se o nome está correto ou se o cliente está cadastrado.`;
    }

    return {
      termoBusca: nomeCliente,
      total: clientesEncontrados.length,
      clientes: clientesEncontrados,
      resumo,
    };
  } catch (error) {
    console.error("[AnaTools] ❌ Erro ao buscar cliente:", error);
    return {
      termoBusca: nomeCliente,
      total: 0,
      clientes: [],
      resumo: `Erro ao buscar cliente para "${nomeCliente}".`,
    };
  }
}

/**
 * Busca composições recentes da loja
 * Retorna informações sobre composições geradas, incluindo estatísticas
 */
export async function getCompositions(lojistaId: string, limit: number = 10): Promise<{
  total: number;
  composicoes: Array<{
    id: string;
    produtoNome?: string;
    clienteNome?: string;
    createdAt: string;
    liked?: boolean;
    shared?: boolean;
    imagemUrl?: string;
  }>;
  resumo: string;
}> {
  try {
    // Buscar composições da loja (pode estar em duas coleções)
    const composicoesRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("composicoes");

    let composicoesSnapshot;
    try {
      composicoesSnapshot = await composicoesRef
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();
    } catch (error: any) {
      // Se falhar por falta de índice, buscar sem orderBy
      composicoesSnapshot = await composicoesRef.limit(limit * 2).get();
    }

    const composicoes = composicoesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, limit)
      .map((comp: any) => ({
        id: comp.id,
        produtoNome: comp.productName || comp.produtoNome || "Produto desconhecido",
        clienteNome: comp.customerName || comp.clienteNome,
        createdAt: comp.createdAt ? (comp.createdAt.toDate ? comp.createdAt.toDate().toLocaleDateString("pt-BR") : comp.createdAt) : "Data desconhecida",
        liked: comp.liked || comp.curtido || false,
        shared: comp.shared || comp.compartilhado || false,
        imagemUrl: comp.imagemUrl || comp.imageUrl || comp.imagemVtonUrl || comp.imagemPessoaUrl,
      }));

    const totalLikes = composicoes.filter(c => c.liked).length;
    const totalShared = composicoes.filter(c => c.shared).length;

    const resumo = `Encontrei ${composicoes.length} composição(ões) recente(s). ${totalLikes} curtidas, ${totalShared} compartilhadas. ${composicoes.length > 0 ? `Última composição: ${composicoes[0].produtoNome}${composicoes[0].clienteNome ? ` para ${composicoes[0].clienteNome}` : ''} em ${composicoes[0].createdAt}.` : ''}`;

    return {
      total: composicoes.length,
      composicoes,
      resumo,
    };
  } catch (error) {
    console.error("[AnaTools] ❌ Erro ao buscar composições:", error);
    return {
      total: 0,
      composicoes: [],
      resumo: "Erro ao buscar composições.",
    };
  }
}

/**
 * Análise financeira completa da loja
 * Retorna informações sobre créditos, saldo, gastos e métricas financeiras
 */
export async function getFinancialAnalysis(lojistaId: string): Promise<{
  saldoCreditos: number;
  limiteOverdraft: number;
  saldoDisponivel: number;
  creditosGastos: number;
  creditosPagos: number;
  planoTier: string;
  resumo: string;
}> {
  try {
    const lojistaDoc = await db.collection("lojistas").doc(lojistaId).get();
    
    if (!lojistaDoc.exists) {
      return {
        saldoCreditos: 0,
        limiteOverdraft: 0,
        saldoDisponivel: 0,
        creditosGastos: 0,
        creditosPagos: 0,
        planoTier: "N/A",
        resumo: "Lojista não encontrado.",
      };
    }

    const lojistaData = lojistaDoc.data();
    const financials = lojistaData?.financials || {};
    const metrics = lojistaData?.metrics || {};
    const isSandbox = Boolean(lojistaData?.is_sandbox_mode);

    const saldoCreditos = financials.credits_balance || 0;
    const limiteOverdraft = financials.overdraft_limit || 0;
    const saldoDisponivel = saldoCreditos + limiteOverdraft;
    const creditosGastos = metrics.paid_credits_count || 0;
    const creditosPagos = metrics.total_credits_purchased || 0;

    // Determinar tier do plano
    let planoTier = "micro";
    if (limiteOverdraft >= 100) {
      planoTier = "enterprise";
    } else if (limiteOverdraft >= 50) {
      planoTier = "growth";
    }

    const resumo = isSandbox
      ? `💰 SITUAÇÃO FINANCEIRA (SANDBOX): Saldo disponível: Ilimitado (modo sandbox). Créditos gastos: ${creditosGastos}. Plano: ${planoTier}.`
      : `💰 SITUAÇÃO FINANCEIRA: Saldo de créditos: R$ ${saldoCreditos.toFixed(2)}. Limite de overdraft: R$ ${limiteOverdraft.toFixed(2)}. Saldo disponível total: R$ ${saldoDisponivel.toFixed(2)}. Créditos gastos: ${creditosGastos}. Créditos pagos: ${creditosPagos}. Plano: ${planoTier}.`;

    return {
      saldoCreditos,
      limiteOverdraft,
      saldoDisponivel,
      creditosGastos,
      creditosPagos,
      planoTier,
      resumo,
    };
  } catch (error) {
    console.error("[AnaTools] ❌ Erro ao buscar análise financeira:", error);
    return {
      saldoCreditos: 0,
      limiteOverdraft: 0,
      saldoDisponivel: 0,
      creditosGastos: 0,
      creditosPagos: 0,
      planoTier: "N/A",
      resumo: "Erro ao buscar dados financeiros.",
    };
  }
}

/**
 * Análise completa de vendas e conversões
 * Retorna informações sobre checkouts, compartilhamentos, taxa de conversão
 */
export async function getSalesAnalysis(lojistaId: string): Promise<{
  totalComposicoes: number;
  totalCheckouts: number;
  totalShares: number;
  totalLikes: number;
  taxaConversao: number;
  taxaCompartilhamento: number;
  ticketMedio: number;
  receitaEstimada: number;
  resumo: string;
}> {
  try {
    const composicoes = await fetchComposicoesRecentes(lojistaId, 1000);
    
    const totalComposicoes = composicoes.length;
    const totalCheckouts = composicoes.filter((c: any) => c.checkout === true).length;
    const totalShares = composicoes.filter((c: any) => c.shared === true || c.compartilhado === true).length;
    const totalLikes = composicoes.filter((c: any) => c.liked === true || c.curtido === true).length;
    
    const taxaConversao = totalComposicoes > 0 
      ? (totalCheckouts / totalComposicoes) * 100 
      : 0;
    
    const taxaCompartilhamento = totalComposicoes > 0
      ? (totalShares / totalComposicoes) * 100
      : 0;

    // Calcular ticket médio e receita estimada (baseado em produtos curtidos)
    let receitaTotal = 0;
    let produtosComPreco = 0;
    
    composicoes.forEach((comp: any) => {
      if (comp.liked === true || comp.curtido === true) {
        if (comp.products && Array.isArray(comp.products)) {
          comp.products.forEach((prod: any) => {
            const preco = prod.preco || prod.price;
            if (preco && preco > 0) {
              receitaTotal += preco;
              produtosComPreco++;
            }
          });
        }
      }
    });

    const ticketMedio = produtosComPreco > 0 ? receitaTotal / produtosComPreco : 0;
    const receitaEstimada = receitaTotal;

    const resumo = `📊 ANÁLISE DE VENDAS: Total de composições: ${totalComposicoes}. Checkouts: ${totalCheckouts} (${taxaConversao.toFixed(1)}% conversão). Compartilhamentos: ${totalShares} (${taxaCompartilhamento.toFixed(1)}%). Likes: ${totalLikes}. Ticket médio estimado: R$ ${ticketMedio.toFixed(2)}. Receita estimada (produtos curtidos): R$ ${receitaEstimada.toFixed(2)}.`;

    return {
      totalComposicoes,
      totalCheckouts,
      totalShares,
      totalLikes,
      taxaConversao: Math.round(taxaConversao * 10) / 10,
      taxaCompartilhamento: Math.round(taxaCompartilhamento * 10) / 10,
      ticketMedio: Math.round(ticketMedio * 100) / 100,
      receitaEstimada: Math.round(receitaEstimada * 100) / 100,
      resumo,
    };
  } catch (error) {
    console.error("[AnaTools] ❌ Erro ao buscar análise de vendas:", error);
    return {
      totalComposicoes: 0,
      totalCheckouts: 0,
      totalShares: 0,
      totalLikes: 0,
      taxaConversao: 0,
      taxaCompartilhamento: 0,
      ticketMedio: 0,
      receitaEstimada: 0,
      resumo: "Erro ao buscar dados de vendas.",
    };
  }
}

/**
 * Análise completa de CRM
 * Retorna informações sobre clientes ativos, oportunidades e segmentação
 */
export async function getCRMAnalysis(lojistaId: string, days: number = 7): Promise<{
  clientesAtivos: number;
  clientesNovos: number;
  totalClientes: number;
  composicoesUltimosDias: number;
  oportunidades: Array<{
    tipo: string;
    descricao: string;
    prioridade: string;
  }>;
  resumo: string;
}> {
  try {
    // Buscar clientes ativos (últimas 72h = 3 dias)
    const clientesAtivos = await fetchActiveClients(lojistaId, 72);
    
    // Buscar todos os clientes
    const clientesSnapshot = await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes")
      .get();
    
    const totalClientes = clientesSnapshot.size;
    
    // Calcular clientes novos (últimos N dias)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    let clientesNovos = 0;
    clientesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || data.createdAt;
      if (createdAt && new Date(createdAt) >= cutoffDate) {
        clientesNovos++;
      }
    });

    // Buscar composições dos últimos N dias
    const composicoes = await fetchComposicoesRecentes(lojistaId, 1000);
    const composicoesUltimosDias = composicoes.filter((c: any) => {
      const createdAt = c.createdAt?.toDate?.() || c.createdAt;
      return createdAt && new Date(createdAt) >= cutoffDate;
    }).length;

    // Buscar oportunidades (insights)
    const insights = await getAllInsights(lojistaId, 10);
    const oportunidades = insights
      .filter(insight => insight.type === 'opportunity')
      .slice(0, 5)
      .map(insight => ({
        tipo: insight.type,
        descricao: insight.message || insight.title,
        prioridade: insight.priority,
      }));

    const resumo = `👥 ANÁLISE DE CRM: Total de clientes: ${totalClientes}. Clientes ativos (últimas 72h): ${clientesAtivos.length}. Clientes novos (últimos ${days} dias): ${clientesNovos}. Composições geradas (últimos ${days} dias): ${composicoesUltimosDias}. Oportunidades identificadas: ${oportunidades.length}.`;

    return {
      clientesAtivos: clientesAtivos.length,
      clientesNovos,
      totalClientes,
      composicoesUltimosDias,
      oportunidades,
      resumo,
    };
  } catch (error) {
    console.error("[AnaTools] ❌ Erro ao buscar análise de CRM:", error);
    return {
      clientesAtivos: 0,
      clientesNovos: 0,
      totalClientes: 0,
      composicoesUltimosDias: 0,
      oportunidades: [],
      resumo: "Erro ao buscar dados de CRM.",
    };
  }
}

/**
 * Perfil completo do cliente com análise profunda
 * Retorna informações detalhadas sobre preferências, comportamento e histórico
 */
export async function getCustomerFullProfile(lojistaId: string, customerId: string): Promise<{
  perfil: any;
  resumo: string;
}> {
  try {
    const perfil = await analyzeCustomerProfile(lojistaId, customerId);
    
    if (!perfil) {
      return {
        perfil: null,
        resumo: `Cliente ${customerId} não encontrado.`,
      };
    }

    const resumo = perfil.resumo || `Perfil completo do cliente ${perfil.nome}: ${perfil.totalComposicoes} composições, ${perfil.totalLikes} likes, taxa de aprovação ${perfil.taxaAprovacao}%. Estilo: ${perfil.estiloPredominante}. Cores favoritas: ${perfil.coresFavoritas.join(", ")}.`;

    return {
      perfil,
      resumo,
    };
  } catch (error) {
    console.error("[AnaTools] ❌ Erro ao buscar perfil completo do cliente:", error);
    return {
      perfil: null,
      resumo: `Erro ao buscar perfil do cliente ${customerId}.`,
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
  getProductsByCategory,
  getProductsByName,
  getClientByName,
  getCompositions,
  getFinancialAnalysis,
  getSalesAnalysis,
  getCRMAnalysis,
  getCustomerFullProfile,
} as const;

export type AnaToolName = keyof typeof ANA_TOOLS;

