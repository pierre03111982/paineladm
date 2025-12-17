/**
 * API Route: Análise de Estilo do Cliente (IA Consultiva)
 * GET /api/ai/client-style-analysis
 * 
 * Analisa o perfil comportamental do cliente usando IA e gera insights de estilo
 * Baseado na lógica do documento: logica para analise cliente.md
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getGeminiTextService } from "@/lib/ai-services/gemini-text";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clienteId = searchParams.get("clienteId");
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    
    const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
    const lojistaId = lojistaIdFromQuery || lojistaIdFromAuth;

    if (!lojistaId || !clienteId) {
      return NextResponse.json(
        { error: "lojistaId e clienteId são obrigatórios" },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    console.log("[ClientStyleAnalysis] 🔍 Iniciando análise para:", { clienteId, lojistaId });

    // ==========================================
    // 1. BUSCAR DADOS DO CLIENTE
    // ==========================================
    const clienteRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes")
      .doc(clienteId);
    
    const clienteDoc = await clienteRef.get();
    
    if (!clienteDoc.exists) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    const clienteData = clienteDoc.data();

    // ==========================================
    // 2. BUSCAR COMPOSIÇÕES (mesma lógica da página)
    // ==========================================
    const composicoesRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("composicoes");
    
    let composicoesSnapshot;
    try {
      // Tentar buscar todas e filtrar em memória (mesma estratégia da página)
      composicoesSnapshot = await composicoesRef.limit(500).get();
    } catch (error) {
      console.warn("[ClientStyleAnalysis] Erro ao buscar composições:", error);
      composicoesSnapshot = { docs: [] } as any;
    }

    // Filtrar composições do cliente em memória (mesma lógica da página)
    let debugCount = 0;
    const composicoesData = composicoesSnapshot.docs
      .map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter((comp: any) => {
        // Verificar múltiplos campos possíveis
        const customerId = comp.customer?.id || comp.customerId || comp.cliente_id || comp.user_id;
        const matches = customerId === clienteId;
        
        // Log para debug (apenas primeiras 3)
        if (debugCount < 3) {
          console.log("[ClientStyleAnalysis] 🔍 Verificando composição:", {
            compId: comp.id,
            customerId: customerId,
            clienteId: clienteId,
            matches: matches,
            campos: {
              customer_id: comp.customer?.id,
              customerId: comp.customerId,
              cliente_id: comp.cliente_id,
              user_id: comp.user_id
            }
          });
          debugCount++;
        }
        
        return matches;
      })
      .sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 200);

    console.log("[ClientStyleAnalysis] 📊 Composições encontradas:", {
      totalNoBanco: composicoesSnapshot.docs.length,
      doCliente: composicoesData.length,
      clienteIdBuscado: clienteId,
      primeiraComposicao: composicoesData[0] ? {
        id: composicoesData[0].id,
        customerId: composicoesData[0].customer?.id || composicoesData[0].customerId || composicoesData[0].cliente_id,
        hasCurtido: !!composicoesData[0].curtido,
        hasLooks: !!composicoesData[0].looks,
        createdAt: composicoesData[0].createdAt
      } : null
    });

    // ==========================================
    // 3. BUSCAR AÇÕES (likes/dislikes/shares)
    // ==========================================
    const actionsRef = db.collection("actions");
    let actionsSnapshot;
    try {
      actionsSnapshot = await actionsRef
      .where("user_id", "==", clienteId)
      .where("lojista_id", "==", lojistaId)
        .limit(200)
      .get();
    } catch (error: any) {
      // Se não tiver índice, buscar todas e filtrar
      try {
        const allActions = await actionsRef.limit(500).get();
        actionsSnapshot = {
          docs: allActions.docs.filter((doc: any) => {
      const data = doc.data();
            return (data.user_id === clienteId || data.customer_id === clienteId) && 
                   (data.lojista_id === lojistaId);
          })
        } as any;
      } catch {
        actionsSnapshot = { docs: [] } as any;
      }
    }

    const actions = actionsSnapshot.docs
      .map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp,
      }))
      .sort((a: any, b: any) => {
        const timestampA = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
        const timestampB = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
        return timestampB.getTime() - timestampA.getTime();
      });

    // ==========================================
    // 4. CALCULAR ESTATÍSTICAS
    // ==========================================
    const totalComposicoes = composicoesData.length;
    
    // Likes: ações + composições com campo "curtido"
    const likesFromActions = actions.filter((a: any) => 
      a.type === "like" || a.type === "curtir"
    ).length;
    
    const likesFromComposicoes = composicoesData.filter((c: any) => 
      c.curtido === true || c.curtido === "true" || c.liked === true
    ).length;
    
    const totalLikes = likesFromActions + likesFromComposicoes;
    const totalDislikes = actions.filter((a: any) => 
      a.type === "dislike" || a.type === "rejeitar"
    ).length;
    const totalShares = composicoesData.reduce((sum: number, c: any) => 
      sum + (c.shares || 0), 0
    );

    console.log("[ClientStyleAnalysis] 📊 Estatísticas calculadas:", {
      totalComposicoes,
      likesFromActions,
      likesFromComposicoes,
      totalLikes,
      totalDislikes,
      totalShares
    });

    // ==========================================
    // 5. BUSCAR PRODUTOS DAS COMPOSIÇÕES E CURTIDOS
    // ==========================================
    const produtosDasComposicoes: Set<string> = new Set();
    const produtosCurtidos: Set<string> = new Set();
    
    // Produtos usados em composições
    composicoesData.forEach((comp: any) => {
      if (comp.looks && Array.isArray(comp.looks)) {
        comp.looks.forEach((look: any) => {
          if (look.produto_id) produtosDasComposicoes.add(look.produto_id);
        });
      }
      // Verificar outros campos possíveis
      if (comp.produtos && Array.isArray(comp.produtos)) {
        comp.produtos.forEach((prod: any) => {
          if (prod.id) produtosDasComposicoes.add(prod.id);
        });
      }
    });

    // Produtos curtidos (de ações)
    actions.forEach((action: any) => {
      if ((action.type === "like" || action.type === "curtir") && action.product_id) {
        produtosCurtidos.add(action.product_id);
      }
    });

    // Produtos de composições curtidas
    composicoesData.forEach((comp: any) => {
      if (comp.curtido === true || comp.curtido === "true" || comp.liked === true) {
        if (comp.looks && Array.isArray(comp.looks)) {
          comp.looks.forEach((look: any) => {
            if (look.produto_id) produtosCurtidos.add(look.produto_id);
          });
        }
      }
    });

    // Buscar dados dos produtos
    const allProductIds = Array.from(new Set([...produtosDasComposicoes, ...produtosCurtidos])).slice(0, 50);
    const productsData: any[] = [];
    
    for (const productId of allProductIds) {
      try {
        const productRef = db
          .collection("lojas")
          .doc(lojistaId)
          .collection("produtos")
          .doc(productId);
        
        const productDoc = await productRef.get();
        if (productDoc.exists) {
          const productData = productDoc.data();
          productsData.push({
            id: productDoc.id,
            ...productData,
            isLiked: produtosCurtidos.has(productId),
            timesUsed: Array.from(produtosDasComposicoes).filter(id => id === productId).length,
          });
        }
      } catch (error) {
        console.warn(`[ClientStyleAnalysis] Erro ao buscar produto ${productId}:`, error);
      }
    }

    // ==========================================
    // 6. ANÁLISE DE PADRÕES
    // ==========================================
    const categoriaCounts: Record<string, number> = {};
    const categoriaLikes: Record<string, number> = {};
    const colorCounts: Record<string, number> = {};
    
    productsData.forEach((p) => {
      const categoria = p.categoria || "Outros";
      categoriaCounts[categoria] = (categoriaCounts[categoria] || 0) + 1;
      if (p.isLiked) {
        categoriaLikes[categoria] = (categoriaLikes[categoria] || 0) + 1;
      }
      // Cores
      if (p.cor) colorCounts[p.cor.toLowerCase()] = (colorCounts[p.cor.toLowerCase()] || 0) + 1;
      if (p.cores && Array.isArray(p.cores)) {
        p.cores.forEach((cor: string) => {
          colorCounts[cor.toLowerCase()] = (colorCounts[cor.toLowerCase()] || 0) + 1;
        });
      }
    });

    const categoriaPredominante = Object.entries(categoriaCounts)
      .sort((a, b) => {
        const scoreA = categoriaCounts[a[0]] + (categoriaLikes[a[0]] || 0) * 2;
        const scoreB = categoriaCounts[b[0]] + (categoriaLikes[b[0]] || 0) * 2;
        return scoreB - scoreA;
      })[0]?.[0] || null;

    const coresPredominantes = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cor]) => cor);

    // ==========================================
    // 7. CALCULAR DIAS SEM ACESSO
    // ==========================================
    const lastAction = actions[0];
    let lastActionDate = new Date(0);
    if (lastAction?.timestamp) {
      if (typeof lastAction.timestamp.toDate === "function") {
        lastActionDate = lastAction.timestamp.toDate();
      } else if (lastAction.timestamp instanceof Date) {
        lastActionDate = lastAction.timestamp;
      } else if (typeof lastAction.timestamp === "number") {
        lastActionDate = new Date(lastAction.timestamp);
      } else if (typeof lastAction.timestamp === "string") {
        lastActionDate = new Date(lastAction.timestamp);
      }
    }

    // Última composição
    let ultimaComposicao: Date | null = null;
    if (composicoesData.length > 0) {
      const comp = composicoesData[0];
      if (comp.createdAt) {
        ultimaComposicao = comp.createdAt?.toDate?.() || new Date(comp.createdAt || 0);
      }
    }

    const now = new Date();
    let dataMaisRecente = lastActionDate;
    if (ultimaComposicao && ultimaComposicao.getTime() > lastActionDate.getTime()) {
      dataMaisRecente = ultimaComposicao;
    }
    
    const diffMs = now.getTime() - dataMaisRecente.getTime();
    const daysSinceLastAccess = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    // Frequência e taxa de aprovação
    const frequenciaUso = totalComposicoes > 0 && daysSinceLastAccess > 0
      ? Math.round((totalComposicoes / daysSinceLastAccess) * 10) / 10
      : totalComposicoes > 0 ? totalComposicoes : 0;
    
    const taxaAprovacao = totalComposicoes > 0
      ? Math.round((totalLikes / totalComposicoes) * 100)
      : 0;

    // ==========================================
    // 8. BUSCAR PEDIDOS/COMPRAS
    // ==========================================
    let totalPedidos = 0;
    let pedidosPagos = 0;
    let totalGasto = 0;
    
    try {
      const ordersRef = db
        .collection("lojas")
        .doc(lojistaId)
        .collection("orders");
      
      let ordersSnapshot;
      try {
        ordersSnapshot = await ordersRef
          .where("customer_id", "==", clienteId)
          .limit(100)
          .get();
      } catch {
        // Filtrar em memória se não tiver índice
        const allOrders = await ordersRef.limit(200).get();
        ordersSnapshot = {
          docs: allOrders.docs.filter((doc: any) => {
            const data = doc.data();
            return data.customer_id === clienteId || data.cliente_id === clienteId;
          })
        } as any;
      }

      const orders = ordersSnapshot.docs.map((doc: any) => doc.data());
      totalPedidos = orders.length;
      const paidOrders = orders.filter((o: any) => o.status === "paid" || o.status === "pago");
      pedidosPagos = paidOrders.length;
      totalGasto = paidOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
    } catch (error) {
      console.warn("[ClientStyleAnalysis] Erro ao buscar pedidos:", error);
    }

    // ==========================================
    // 9. CÁLCULO DO TERMÔMETRO DE INTERESSE
    // ==========================================
    const composicoesPoints = totalComposicoes * 1;
    const likesPoints = totalLikes * 3;
    const sharesPoints = totalShares * 5;
    const dislikesPoints = totalDislikes * -1;
    const comprasPoints = pedidosPagos * 10;
    const valorGastoPoints = Math.floor(totalGasto / 100) * 5;

    let baseScore = composicoesPoints + likesPoints + sharesPoints + dislikesPoints + comprasPoints + valorGastoPoints;

    // Bônus de recência
    if (daysSinceLastAccess <= 1) {
      baseScore = Math.round(baseScore * 1.2);
    } else if (daysSinceLastAccess <= 3) {
      baseScore = Math.round(baseScore * 1.1);
    }

    // Bônus de engajamento
    if (taxaAprovacao > 50 && totalComposicoes >= 10) {
      baseScore = Math.round(baseScore * 1.1);
    }

    // Bônus de frequência
    if (frequenciaUso > 2 && totalComposicoes >= 20) {
      baseScore = Math.round(baseScore * 1.15);
    }

    // Bônus por volume
    if (totalComposicoes >= 50) {
      baseScore = Math.round(baseScore * 1.2);
    } else if (totalComposicoes >= 30) {
      baseScore = Math.round(baseScore * 1.1);
    }

    let interestScore = Math.min(100, Math.max(0, baseScore));
    
    // Score mínimo garantido
    if (totalComposicoes >= 50 && interestScore < 50) {
      interestScore = 50;
    } else if (totalComposicoes >= 30 && interestScore < 40) {
      interestScore = 40;
    } else if (totalComposicoes >= 20 && interestScore < 30) {
      interestScore = 30;
    } else if (totalComposicoes >= 10 && interestScore < 20) {
      interestScore = 20;
    }

    console.log("[ClientStyleAnalysis] 📊 Score calculado:", {
      baseScore,
      interestScore,
      totalComposicoes,
      totalLikes,
      composicoesPoints,
      likesPoints
    });

    // ==========================================
    // 10. GERAR ANÁLISE (MOCK INTELIGENTE)
    // ==========================================
    const clienteNome = clienteData?.nome || "Cliente";
    
    // Mapeamento de estilos por categoria
    const estiloMap: Record<string, { style: string; colorPattern: string; description: string }> = {
      "Vestido": { style: "Feminino Elegante", colorPattern: "Tons vibrantes e neutros", description: "Valoriza peças versáteis que combinam elegância e praticidade" },
      "Blusa": { style: "Casual Sofisticado", colorPattern: "Cores clássicas e atemporais", description: "Prefere peças básicas com toque refinado" },
      "Calça": { style: "Urbano Casual", colorPattern: "Tons terrosos e neutros", description: "Estilo prático e confortável para o dia a dia" },
      "Saia": { style: "Feminino Moderno", colorPattern: "Cores suaves e pastéis", description: "Busca peças que valorizam a silhueta com modernidade" },
      "Jaqueta": { style: "Urbano Contemporâneo", colorPattern: "Tons escuros e neutros", description: "Combina estilo e funcionalidade urbana" },
      "Short": { style: "Casual Despojado", colorPattern: "Cores claras e vibrantes", description: "Estilo descontraído e jovem" },
      "Tênis": { style: "Esportivo Casual", colorPattern: "Cores neutras e vibrantes", description: "Prioriza conforto sem abrir mão do estilo" },
    };

    // Determinar estilo
    let estiloIdentificado = "Explorador Ativo";
    let colorPattern = "Aguardando mais interações para identificar padrão";
    let descricaoComportamental = "";

    // Análise de cores
    if (coresPredominantes.length > 0) {
      const cores = coresPredominantes.join(", ");
      if (coresPredominantes.some(c => ["preto", "branco", "cinza", "bege"].includes(c))) {
        colorPattern = `Tons neutros e clássicos (${cores})`;
      } else if (coresPredominantes.some(c => ["vermelho", "rosa", "laranja", "amarelo"].includes(c))) {
        colorPattern = `Cores vibrantes e alegres (${cores})`;
      } else if (coresPredominantes.some(c => ["azul", "verde", "marrom", "terracota"].includes(c))) {
        colorPattern = `Tons terrosos e naturais (${cores})`;
      } else {
        colorPattern = `Prefere cores como ${cores}`;
      }
    }

    // Determinar estilo baseado em dados
    if (categoriaPredominante && estiloMap[categoriaPredominante]) {
      const estiloCategoria = estiloMap[categoriaPredominante];
      estiloIdentificado = estiloCategoria.style;
      if (!coresPredominantes.length) {
        colorPattern = estiloCategoria.colorPattern;
      }
      descricaoComportamental = estiloCategoria.description;
    } else if (totalComposicoes >= 50) {
      estiloIdentificado = pedidosPagos > 0 ? "Cliente Fiel" : taxaAprovacao > 60 ? "Explorador Premium" : "Cliente Muito Ativo";
      colorPattern = coresPredominantes.length > 0 ? colorPattern : "Explorando diferentes paletas de cores";
      descricaoComportamental = `Cliente extremamente engajado com ${totalComposicoes} composições geradas. ${pedidosPagos > 0 ? `Já realizou ${pedidosPagos} compra(s), demonstrando fidelidade à marca.` : taxaAprovacao > 60 ? "Alta taxa de aprovação indica que encontra produtos alinhados ao seu estilo." : "Está explorando ativamente diferentes estilos e tendências."}`;
    } else if (totalComposicoes >= 30) {
      estiloIdentificado = pedidosPagos > 0 ? "Cliente Fiel" : taxaAprovacao > 60 ? "Explorador Premium" : "Cliente Ativo";
      colorPattern = coresPredominantes.length > 0 ? colorPattern : "Explorando diferentes paletas";
      descricaoComportamental = `Cliente muito engajado com ${totalComposicoes} composições. ${pedidosPagos > 0 ? `Já realizou ${pedidosPagos} compra(s).` : taxaAprovacao > 60 ? "Alta taxa de aprovação indica que encontra produtos alinhados ao seu estilo." : "Está explorando ativamente diferentes estilos."}`;
    } else if (totalComposicoes >= 20) {
      estiloIdentificado = pedidosPagos > 0 ? "Cliente Interessado" : "Explorador Ativo";
      colorPattern = coresPredominantes.length > 0 ? colorPattern : "Em processo de descoberta";
      descricaoComportamental = `Cliente demonstrando alto interesse com ${totalComposicoes} composições. ${pedidosPagos > 0 ? `Já realizou ${pedidosPagos} compra(s).` : totalLikes > 5 ? `Já identificou ${totalLikes} produto(s) de seu interesse.` : "Continue apresentando variedade."}`;
    } else if (totalComposicoes >= 10) {
      estiloIdentificado = "Interessado Ativo";
      colorPattern = coresPredominantes.length > 0 ? colorPattern : "Em processo de descoberta";
      descricaoComportamental = `Cliente demonstrando interesse crescente com ${totalComposicoes} composições. ${pedidosPagos > 0 ? `Já realizou ${pedidosPagos} compra(s).` : totalLikes > 5 ? `Já identificou ${totalLikes} produto(s) de seu interesse.` : "Continue apresentando variedade."}`;
    } else if (totalComposicoes >= 5) {
      estiloIdentificado = "Explorador Inicial";
      colorPattern = coresPredominantes.length > 0 ? colorPattern : "Em processo de descoberta";
      descricaoComportamental = `Cliente começando a explorar a marca com ${totalComposicoes} composições. ${pedidosPagos > 0 ? `Já realizou ${pedidosPagos} compra(s).` : totalLikes > 0 ? `Já demonstrou interesse em ${totalLikes} produto(s).` : "Ainda descobrindo preferências."}`;
    } else if (totalComposicoes > 0) {
      estiloIdentificado = "Explorador Inicial";
      colorPattern = coresPredominantes.length > 0 ? colorPattern : "Em processo de descoberta";
      descricaoComportamental = `Cliente começando a explorar a marca com ${totalComposicoes} composição(ões). ${pedidosPagos > 0 ? `Já realizou ${pedidosPagos} compra(s).` : totalLikes > 0 ? `Já demonstrou interesse em ${totalLikes} produto(s).` : "Ainda descobrindo preferências."}`;
    } else if (pedidosPagos > 0) {
      estiloIdentificado = "Cliente Fiel";
      colorPattern = "Aguardando mais interações para identificar padrão";
      descricaoComportamental = `Cliente que já realizou ${pedidosPagos} compra(s) na marca. ${totalLikes > 0 ? `Demonstrou interesse em ${totalLikes} produto(s).` : "Continue apresentando novidades."}`;
    } else if (totalLikes > 0) {
      estiloIdentificado = "Interessado";
      colorPattern = "Aguardando mais interações para identificar padrão";
      descricaoComportamental = `Cliente que demonstrou interesse em ${totalLikes} produto(s). Continue apresentando produtos similares.`;
    } else {
      estiloIdentificado = "Em Análise";
      colorPattern = "Aguardando mais interações";
      descricaoComportamental = "Ainda coletando dados do comportamento do cliente para gerar insights personalizados.";
    }

    // Criar descrição humanizada
    let mockDescription = "";
    if (totalComposicoes >= 50) {
      mockDescription = `${clienteNome} é um cliente extremamente engajado, com ${totalComposicoes} composições geradas. `;
      if (pedidosPagos > 0) {
        mockDescription += `Já realizou ${pedidosPagos} compra(s)${totalGasto > 0 ? `, totalizando R$ ${totalGasto.toFixed(2)} em compras` : ""}, demonstrando fidelidade à marca. `;
      }
      if (taxaAprovacao > 60) {
        mockDescription += `Alta taxa de aprovação (${taxaAprovacao}%) com ${totalLikes} curtidas indica que está encontrando produtos que combinam perfeitamente com seu estilo. `;
      } else if (totalLikes > 0) {
        mockDescription += `Com ${totalLikes} curtidas, demonstra interesse ativo em diferentes peças. `;
      }
      if (frequenciaUso > 2) {
        mockDescription += `Frequência de uso alta (${frequenciaUso.toFixed(1)} composições/dia) mostra que está sempre explorando novidades. `;
      }
      mockDescription += descricaoComportamental || "";
    } else if (totalComposicoes >= 30) {
      mockDescription = `${clienteNome} é um cliente muito engajado, com ${totalComposicoes} composições geradas. `;
      if (pedidosPagos > 0) {
        mockDescription += `Já realizou ${pedidosPagos} compra(s)${totalGasto > 0 ? `, totalizando R$ ${totalGasto.toFixed(2)}` : ""}. `;
      }
      if (taxaAprovacao > 60) {
        mockDescription += `Alta taxa de aprovação (${taxaAprovacao}%) indica que encontra produtos alinhados ao seu estilo. `;
      } else if (totalLikes > 0) {
        mockDescription += `Com ${totalLikes} curtidas, demonstra interesse ativo. `;
      }
      mockDescription += descricaoComportamental || "";
    } else if (totalComposicoes >= 15) {
      mockDescription = `${clienteNome} está explorando ativamente a marca com ${totalComposicoes} composições geradas. `;
      if (pedidosPagos > 0) {
        mockDescription += `Já realizou ${pedidosPagos} compra(s). `;
      }
      if (totalLikes > 5) {
        mockDescription += `Já identificou ${totalLikes} produto(s) de seu interesse, mostrando preferências definidas. `;
      } else if (totalLikes > 0) {
        mockDescription += `Já demonstrou interesse em ${totalLikes} produto(s). `;
      }
      mockDescription += descricaoComportamental || "";
    } else if (totalComposicoes > 0) {
      mockDescription = `${clienteNome} está ${totalComposicoes >= 5 ? "começando a explorar" : "explorando"} a marca com ${totalComposicoes} composição(ões) gerada(s). `;
      if (pedidosPagos > 0) {
        mockDescription += `Já realizou ${pedidosPagos} compra(s). `;
      }
      if (totalLikes > 0) {
        mockDescription += `Já demonstrou interesse em ${totalLikes} produto(s), o que indica potencial de conversão. `;
      }
      mockDescription += descricaoComportamental || "";
    } else if (pedidosPagos > 0) {
      mockDescription = `${clienteNome} já realizou ${pedidosPagos} compra(s)${totalGasto > 0 ? `, totalizando R$ ${totalGasto.toFixed(2)}` : ""}. ${totalLikes > 0 ? `Demonstrou interesse em ${totalLikes} produto(s).` : "Continue apresentando novidades."}`;
    } else if (totalLikes > 0) {
      mockDescription = `${clienteNome} demonstrou interesse em ${totalLikes} produto(s). Continue apresentando produtos similares para identificar preferências.`;
    } else {
      mockDescription = `${clienteNome} está começando a explorar a marca. Ainda não há interações suficientes para análise detalhada.`;
    }

    // Criar dica de venda
    let mockSalesTip = "";
    if (pedidosPagos > 0 && totalComposicoes >= 20) {
      mockSalesTip = `Cliente fiel que já realizou ${pedidosPagos} compra(s). `;
      if (categoriaPredominante) {
        mockSalesTip += `Ofereça novidades da categoria ${categoriaPredominante}, que é sua preferência. `;
      }
      mockSalesTip += "Aproveite para apresentar ofertas especiais e produtos exclusivos. Considere fazer um contato personalizado via WhatsApp para fortalecer o relacionamento.";
    } else if (categoriaPredominante) {
      mockSalesTip = `Ofereça novos produtos da categoria ${categoriaPredominante}, que representa a preferência predominante do cliente. `;
      if (coresPredominantes.length > 0) {
        mockSalesTip += `Priorize peças nas cores ${coresPredominantes.slice(0, 2).join(" e ")}. `;
      }
      if (totalComposicoes >= 50) {
        mockSalesTip += "Este cliente está extremamente engajado, aproveite para apresentar novidades e ofertas especiais. Considere fazer um contato personalizado via WhatsApp.";
      } else if (totalComposicoes >= 20) {
        mockSalesTip += "Este cliente está muito engajado, aproveite para apresentar novidades e ofertas especiais.";
      } else if (taxaAprovacao > 50) {
        mockSalesTip += "Alta taxa de aprovação indica que produtos desta categoria têm grande potencial de conversão.";
      }
    } else if (totalComposicoes >= 50) {
      mockSalesTip = `Este cliente está extremamente ativo (${totalComposicoes} composições). Aproveite para apresentar novidades e ofertas especiais. ${taxaAprovacao > 50 ? `Com ${taxaAprovacao}% de aprovação, há grande potencial de conversão.` : ""} Considere fazer um contato personalizado via WhatsApp.`;
    } else if (totalComposicoes >= 20) {
      mockSalesTip = `Este cliente está muito ativo (${totalComposicoes} composições). Aproveite para apresentar novidades e ofertas especiais. ${taxaAprovacao > 50 ? `Com ${taxaAprovacao}% de aprovação, há grande potencial de conversão.` : ""} Considere fazer um contato personalizado via WhatsApp.`;
    } else if (totalComposicoes >= 10) {
      mockSalesTip = `Continue apresentando variedade de produtos. Este cliente está explorando ativamente (${totalComposicoes} composições), então há potencial de conversão. ${totalLikes > 3 ? `Já demonstrou interesse em ${totalLikes} produto(s), foque em categorias similares.` : ""}`;
    } else if (totalComposicoes > 0) {
      mockSalesTip = `Continue apresentando produtos para identificar preferências do cliente. Este cliente está explorando (${totalComposicoes} composição(ões)), então há potencial. ${totalLikes > 0 ? `Já demonstrou interesse em ${totalLikes} produto(s).` : ""}`;
    } else if (pedidosPagos > 0) {
      mockSalesTip = `Cliente que já realizou ${pedidosPagos} compra(s). Continue apresentando novidades e produtos similares aos que já comprou.`;
    } else {
      mockSalesTip = "Continue apresentando produtos para identificar preferências do cliente. Varie categorias e estilos para descobrir o que mais atrai.";
    }

    // ==========================================
    // 11. CONSTRUIR RESPOSTA FINAL
    // ==========================================
    const analysis = {
      style: estiloIdentificado,
      colorPattern: colorPattern,
      description: mockDescription,
      salesTip: mockSalesTip,
      interestScore: Math.round(interestScore),
      churnRisk: daysSinceLastAccess > 30 ? "high" : daysSinceLastAccess > 7 ? "medium" : "low",
      daysSinceLastAccess,
      recommendedProduct: null,
    };

    console.log("[ClientStyleAnalysis] ✅ Análise final gerada:", {
      style: analysis.style,
      interestScore: analysis.interestScore,
      totalComposicoes,
      totalLikes,
      categoriaPredominante,
      coresPredominantes: coresPredominantes.slice(0, 3),
      daysSinceLastAccess
    });

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    console.error("[API/AI/ClientStyleAnalysis] ❌ Erro crítico:", error);
    
    const fallbackAnalysis = {
      style: "Em Análise",
      colorPattern: "Aguardando mais interações",
      description: "Ainda coletando dados do comportamento do cliente para gerar insights personalizados.",
      salesTip: "Continue apresentando produtos para identificar preferências do cliente.",
      interestScore: 0,
      churnRisk: "medium" as const,
      daysSinceLastAccess: 0,
      recommendedProduct: null,
    };
    
    return NextResponse.json({
      success: true,
      analysis: fallbackAnalysis,
    });
  }
}
