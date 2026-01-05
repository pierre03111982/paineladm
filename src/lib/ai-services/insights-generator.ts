/**
 * Motor de Inteligência para Geração de Insights
 * 
 * FASE 1: Agregação de Dados Reais (A Matemática)
 * - Busca composições dos últimos 30 dias
 * - Agrupa por produtoId
 * - Calcula métricas precisas: totalTryOns, conversion, rejection
 * - FILTRO CRÍTICO: >= 10 provadores (elimina ruído)
 * 
 * FASE 2: O Consultor de Moda (Integração Gemini)
 * - Envia dados processados para Gemini 2.5 Flash
 * - Usa prompt de "Gerente Comercial de Moda Sênior"
 * - Gera insights estratégicos e acionáveis
 */

import { getAdminDb } from "@/lib/firebaseAdmin";
import { getGeminiTextService } from "./gemini-text";
import type { InsightResult } from "@/types/insights";

/**
 * Helper para obter access token
 */
async function getAccessToken(): Promise<string> {
  const { getAdminApp } = await import("@/lib/firebaseAdmin");
  const adminApp = getAdminApp();
  
  if (!adminApp) {
    throw new Error("Firebase Admin não inicializado");
  }

  const client = await adminApp.options.credential?.getAccessToken();
  
  if (!client || !client.access_token) {
    throw new Error("Não foi possível obter token de acesso");
  }

  return client.access_token;
}

interface ProductMetrics {
  produtoId: string;
  nome: string;
  categoria?: string;
  totalTryOns: number; // Quantas vezes foi provado (composições geradas)
  likes: number;
  dislikes: number;
  shares: number;
  checkouts: number;
  conversion: number; // (Likes + Shares + Checkouts) / totalTryOns * 100
  rejection: number; // (totalTryOns sem nenhuma interação positiva) / totalTryOns * 100
  totalPositiveActions: number; // Likes + Shares + Checkouts
}

interface ProcessedStoreData {
  topPerformers: Array<{
    nome: string;
    conversao: string;
    try_ons: number;
    categoria?: string;
  }>;
  lowPerformers: Array<{
    nome: string;
    rejeicao: string;
    try_ons: number;
    categoria?: string;
  }>;
  trendingNow?: string;
  totalProducts: number;
  totalCompositions: number;
  averageConversion: number;
}

/**
 * FASE 1: Agregação de Dados Reais
 * Busca e processa dados do Firestore
 */
export async function aggregateStoreData(lojistaId: string): Promise<ProcessedStoreData> {
  const db = getAdminDb();
  const lojaRef = db.collection("lojas").doc(lojistaId);
  
  // 1. Buscar composições dos últimos 30 dias
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const composicoesRef = lojaRef.collection("composicoes");
  
  let composicoesSnapshot;
  try {
    composicoesSnapshot = await composicoesRef
      .where("createdAt", ">=", last30Days)
      .orderBy("createdAt", "desc")
      .limit(5000)
      .get();
  } catch (error: any) {
    // Se não tiver índice, buscar todas e filtrar em memória
    if (error?.code === "failed-precondition") {
      console.log("[InsightsGenerator] Buscando todas composições e filtrando em memória");
      const allComposicoes = await composicoesRef
        .orderBy("createdAt", "desc")
        .limit(5000)
        .get();
      
      composicoesSnapshot = {
        docs: allComposicoes.docs.filter(doc => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate?.() || data.createdAt || new Date(0);
          return createdAt >= last30Days;
        }),
        size: 0,
        empty: false,
      };
      composicoesSnapshot.size = composicoesSnapshot.docs.length;
      composicoesSnapshot.empty = composicoesSnapshot.docs.length === 0;
    } else {
      throw error;
    }
  }

  const composicoes = composicoesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as any[];

  // 2. Buscar ações relacionadas às composições
  const actionsRef = db.collection("actions");
  let allActions: any[] = [];
  
  try {
    const actionsSnapshot = await actionsRef
      .where("lojista_id", "==", lojistaId)
      .where("timestamp", ">=", last30Days)
      .limit(10000)
      .get();
    
    allActions = actionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        timestamp: data.timestamp?.toDate?.() || data.timestamp || new Date(0),
      };
    });
  } catch (error: any) {
    if (error?.code === "failed-precondition") {
      // Fallback: buscar todas e filtrar
      try {
        const allActionsSnapshot = await actionsRef
          .where("lojista_id", "==", lojistaId)
          .limit(5000)
          .get();
        
        allActions = allActionsSnapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              ...data,
              timestamp: data.timestamp?.toDate?.() || data.timestamp || new Date(0),
            };
          })
          .filter(a => {
            const actionDate = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
            return actionDate >= last30Days;
          });
      } catch (fallbackError) {
        console.error("[InsightsGenerator] Erro ao buscar ações:", fallbackError);
      }
    }
  }

  // 3. Buscar produtos para mapear IDs para nomes
  const produtosSnapshot = await lojaRef.collection("produtos")
    .where("arquivado", "!=", true)
    .get();
  
  const produtosMap = new Map<string, { nome: string; categoria?: string }>();
  produtosSnapshot.docs.forEach(doc => {
    const data = doc.data();
    produtosMap.set(doc.id, {
      nome: data.nome,
      categoria: data.categoria,
    });
  });

  // 4. Agrupar composições por produto e calcular métricas
  const productMetricsMap = new Map<string, ProductMetrics>();

  composicoes.forEach((comp: any) => {
    const produtos = comp.produtos || comp.products || [];
    
    produtos.forEach((produto: any) => {
      const produtoId = produto.id || produto;
      if (!produtoId) return;

      const produtoInfo = produtosMap.get(produtoId);
      if (!produtoInfo) return; // Ignorar produtos não encontrados

      if (!productMetricsMap.has(produtoId)) {
        productMetricsMap.set(produtoId, {
          produtoId,
          nome: produtoInfo.nome,
          categoria: produtoInfo.categoria,
          totalTryOns: 0,
          likes: 0,
          dislikes: 0,
          shares: 0,
          checkouts: 0,
          conversion: 0,
          rejection: 0,
          totalPositiveActions: 0,
        });
      }

      const metrics = productMetricsMap.get(produtoId)!;
      metrics.totalTryOns += 1; // Cada composição = 1 try-on
    });
  });

  // 5. Contar ações por produto (via composições)
  allActions.forEach((action: any) => {
    const composicaoId = action.composicao_id || action.composition_id;
    if (!composicaoId) return;

    // Encontrar composição e produtos relacionados
    const comp = composicoes.find((c: any) => c.id === composicaoId) as any;
    if (!comp) return;

    // Produtos podem estar em comp.produtos, comp.products, ou como array de objetos
    const produtosArray = (comp as any).produtos || (comp as any).products || [];
    let produtos: any[] = [];
    if (Array.isArray(produtosArray) && produtosArray.length > 0) {
      produtos = produtosArray;
    } else if ((comp as any).primaryProductId) {
      produtos = [{ id: (comp as any).primaryProductId }];
    }
    
    const actionType = action.action_type || action.actionType;

    produtos.forEach((produto: any) => {
      const produtoId = produto.id || produto || comp.primaryProductId;
      if (!produtoId || typeof produtoId !== 'string' || !productMetricsMap.has(produtoId)) return;

      const metrics = productMetricsMap.get(produtoId)!;

      switch (actionType) {
        case 'like':
        case 'Liked':
          metrics.likes += 1;
          metrics.totalPositiveActions += 1;
          break;
        case 'dislike':
        case 'Disliked':
          metrics.dislikes += 1;
          break;
        case 'share':
        case 'shared':
        case 'Shared':
          metrics.shares += 1;
          metrics.totalPositiveActions += 1;
          break;
        case 'checkout':
        case 'Checkout':
          metrics.checkouts += 1;
          metrics.totalPositiveActions += 1;
          break;
      }
    });
  });

  // 6. Calcular métricas finais e aplicar FILTRO CRÍTICO (>= 10 provadores)
  const validProductMetrics: ProductMetrics[] = [];

  productMetricsMap.forEach((metrics) => {
    // FILTRO CRÍTICO: Ignorar produtos com menos de 10 provadores
    if (metrics.totalTryOns < 10) {
      return; // Ignorar - dados insuficientes geram ruído
    }

    // Calcular conversion: (Likes + Shares + Checkouts) / totalTryOns * 100
    metrics.conversion = metrics.totalTryOns > 0
      ? (metrics.totalPositiveActions / metrics.totalTryOns) * 100
      : 0;

    // Calcular rejection: (totalTryOns sem nenhuma interação positiva) / totalTryOns * 100
    const noInteraction = metrics.totalTryOns - metrics.totalPositiveActions - metrics.dislikes;
    metrics.rejection = metrics.totalTryOns > 0
      ? ((metrics.dislikes + noInteraction) / metrics.totalTryOns) * 100
      : 0;

    validProductMetrics.push(metrics);
  });

  // 7. Ordenar e classificar
  const sortedByConversion = [...validProductMetrics]
    .sort((a, b) => b.conversion - a.conversion);
  
  const sortedByRejection = [...validProductMetrics]
    .sort((a, b) => b.rejection - a.conversion);

  const topPerformers = sortedByConversion
    .slice(0, 5)
    .map(p => ({
      nome: p.nome,
      conversao: `${p.conversion.toFixed(1)}%`,
      try_ons: p.totalTryOns,
      categoria: p.categoria,
    }));

  const lowPerformers = sortedByRejection
    .filter(p => p.rejection > 50 && p.totalTryOns >= 10) // Rejeição > 50% e >= 10 provadores
    .slice(0, 5)
    .map(p => ({
      nome: p.nome,
      rejeicao: `${p.rejection.toFixed(1)}%`,
      try_ons: p.totalTryOns,
      categoria: p.categoria,
    }));

  // Calcular média de conversão
  const averageConversion = validProductMetrics.length > 0
    ? validProductMetrics.reduce((sum, p) => sum + p.conversion, 0) / validProductMetrics.length
    : 0;

  return {
    topPerformers,
    lowPerformers,
    totalProducts: validProductMetrics.length,
    totalCompositions: composicoes.length,
    averageConversion: parseFloat(averageConversion.toFixed(1)),
  };
}

/**
 * FASE 2: O Consultor de Moda (Integração Gemini)
 * Gera insights estratégicos usando Gemini 2.5 Flash
 */
export async function generateStoreInsights(lojistaId: string): Promise<InsightResult[]> {
  try {
    console.log("[InsightsGenerator] 🧠 Iniciando geração de insights para lojista:", lojistaId);

    // 1. Agregar dados reais
    const storeData = await aggregateStoreData(lojistaId);
    
    console.log("[InsightsGenerator] 📊 Dados agregados:", {
      totalProducts: storeData.totalProducts,
      totalCompositions: storeData.totalCompositions,
      topPerformers: storeData.topPerformers.length,
      lowPerformers: storeData.lowPerformers.length,
    });

    // 2. Se não houver dados suficientes, retornar insight genérico
    if (storeData.totalProducts === 0) {
      return [{
        type: "action",
        title: "Continue gerando composições para receber insights",
        message: "Para gerar insights precisos, precisamos de pelo menos 10 provas por produto. Continue criando composições e incentivando seus clientes a experimentar os looks.",
        priority: "low",
        expiresInDays: 7,
      }];
    }

    // 3. Construir contexto para Gemini
    const contextData = {
      lojistaId,
      top_performers: storeData.topPerformers,
      low_performers: storeData.lowPerformers,
      total_products: storeData.totalProducts,
      total_compositions: storeData.totalCompositions,
      average_conversion: `${storeData.averageConversion}%`,
    };

    // 4. Construir prompt para Gerente Comercial de Moda Sênior
    const systemPrompt = `Você é um Gerente Comercial de Moda Sênior com 15 anos de experiência em varejo de moda online.

Analise os dados brutos da loja e gere EXATAMENTE 3 insights curtos, estratégicos e acionáveis.

REGRAS DE ESCRITA:
- Não use tom robótico ou genérico
- Use termos do mercado: "giro de estoque", "apelo visual", "curadoria", "DNA da marca", "ticket médio"
- Seja direto: aponte o problema E a solução
- Máximo 2-3 frases por insight
- Foque em ações práticas que o lojista pode executar AGORA

TIPOS DE INSIGHT:
1. TOP PERFORMER (type: "trend"): Produtos que estão vendendo bem - destaque o sucesso e sugira replicar
2. LOW PERFORMER (type: "risk"): Produtos com alta rejeição - identifique o problema e a solução
3. OPORTUNIDADE (type: "opportunity"): Ações estratégicas baseadas nos dados

IMPORTANTE:
- Não invente dados que não foram fornecidos
- Se não houver low_performers, gere apenas insights de oportunidade e tendência
- Seja específico: mencione nomes de produtos e números quando relevante
`;

    const userPrompt = `Analise estes dados reais da loja:

TOP PERFORMERS (Produtos com melhor conversão):
${storeData.topPerformers.map(p => `- ${p.nome}: ${p.conversao} de conversão em ${p.try_ons} provas${p.categoria ? ` (${p.categoria})` : ''}`).join('\n')}

${storeData.lowPerformers.length > 0 ? `LOW PERFORMERS (Produtos com alta rejeição):
${storeData.lowPerformers.map(p => `- ${p.nome}: ${p.rejeicao} de rejeição em ${p.try_ons} provas${p.categoria ? ` (${p.categoria})` : ''}`).join('\n')}` : 'Não há produtos com alta rejeição detectada (todos acima do limite mínimo de provas estão performando bem).'}

MÉTRICAS GERAIS:
- Total de produtos analisados: ${storeData.totalProducts}
- Total de composições: ${storeData.totalCompositions}
- Conversão média: ${storeData.averageConversion}%

Gere EXATAMENTE 3 insights em formato JSON (array), um para cada tipo quando possível.`;

    // 5. Chamar Gemini usando o serviço existente (3 chamadas separadas)
    const geminiService = getGeminiTextService();
    const insights: InsightResult[] = [];
    
    // Insight 1: Top Performer (se houver)
    if (storeData.topPerformers.length > 0) {
      const top = storeData.topPerformers[0];
      try {
        const result = await geminiService.generateInsight(
          `O produto "${top.nome}" é o campeão de conversão com ${top.conversao} em ${top.try_ons} provas${top.categoria ? ` (categoria: ${top.categoria})` : ''}. Gere um insight do tipo "trend" destacando este sucesso e sugerindo como replicar.`,
          contextData
        );
        if (result.success && result.data) {
          insights.push({
            ...result.data,
            expiresInDays: 7,
          });
        }
      } catch (error) {
        console.error("[InsightsGenerator] Erro ao gerar insight de top performer:", error);
      }
    }

    // Insight 2: Low Performer (se houver)
    if (storeData.lowPerformers.length > 0) {
      const low = storeData.lowPerformers[0];
      try {
        const result = await geminiService.generateInsight(
          `O produto "${low.nome}" tem alta rejeição: ${low.rejeicao} em ${low.try_ons} provas${low.categoria ? ` (categoria: ${low.categoria})` : ''}. Gere um insight do tipo "risk" identificando o problema e sugerindo soluções práticas.`,
          contextData
        );
        if (result.success && result.data) {
          insights.push({
            ...result.data,
            expiresInDays: 7,
          });
        }
      } catch (error) {
        console.error("[InsightsGenerator] Erro ao gerar insight de low performer:", error);
      }
    }

    // Insight 3: Oportunidade (baseado em dados gerais)
    if (insights.length < 3) {
      try {
        const result = await geminiService.generateInsight(
          `A loja tem ${storeData.totalProducts} produtos com dados suficientes e ${storeData.totalCompositions} composições geradas nos últimos 30 dias. A conversão média é ${storeData.averageConversion}%. Gere um insight do tipo "opportunity" com uma ação estratégica baseada nesses dados.`,
          contextData
        );
        if (result.success && result.data) {
          insights.push({
            ...result.data,
            expiresInDays: 7,
          });
        }
      } catch (error) {
        console.error("[InsightsGenerator] Erro ao gerar insight de oportunidade:", error);
      }
    }

    console.log("[InsightsGenerator] ✅ Insights gerados:", insights.length);

    return insights.length > 0 ? insights : generateFallbackInsights(storeData);

  } catch (error) {
    console.error("[InsightsGenerator] ❌ Erro:", error);
    // Em caso de erro, retornar insights básicos
    return [{
      type: "action",
      title: "Sistema de insights em análise",
      message: "Estamos processando seus dados para gerar insights personalizados. Isso pode levar alguns minutos.",
      priority: "low",
      expiresInDays: 7,
    }];
  }
}

/**
 * Fallback: Gerar insights básicos quando Gemini falhar
 */
function generateFallbackInsights(storeData: ProcessedStoreData): InsightResult[] {
  const insights: InsightResult[] = [];

  if (storeData.topPerformers.length > 0) {
    const top = storeData.topPerformers[0];
    insights.push({
      type: "trend",
      title: `${top.nome} é destaque em conversão`,
      message: `O produto "${top.nome}" tem ${top.conversao} de taxa de conversão em ${top.try_ons} provas. Considere destacá-lo na vitrine principal ou criar composições similares.`,
      priority: "medium",
      expiresInDays: 7,
    });
  }

  if (storeData.lowPerformers.length > 0) {
    const low = storeData.lowPerformers[0];
    insights.push({
      type: "risk",
      title: `${low.nome} precisa de atenção`,
      message: `O produto "${low.nome}" apresenta ${low.rejeicao} de rejeição em ${low.try_ons} provas. Verifique se as fotos refletem o produto real e considere ajustar preço ou criar promoção.`,
      priority: "high",
      expiresInDays: 7,
    });
  }

  if (insights.length < 3) {
    insights.push({
      type: "opportunity",
      title: "Continue expandindo o catálogo",
      message: `Sua loja tem ${storeData.totalProducts} produtos com dados suficientes. Para maximizar vendas, continue criando composições e incentivando clientes a experimentar looks.`,
      priority: "low",
      expiresInDays: 7,
    });
  }

  return insights.slice(0, 3);
}

