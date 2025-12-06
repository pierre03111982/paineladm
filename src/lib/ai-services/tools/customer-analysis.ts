/**
 * Ferramenta de Análise Profunda de Perfil de Cliente
 * 
 * Analisa dados do cliente para gerar insights sobre:
 * - Cores favoritas
 * - Estilo predominante
 * - Comportamento de compra
 * - Produtos preferidos
 */

import { getAdminDb } from "@/lib/firebaseAdmin";
import { fetchUserGenerations, getFeedbackSummary } from "@/lib/firestore/generations";

export interface CustomerAnalysisResult {
  customerId: string;
  nome: string;
  whatsapp?: string;
  resumo: string;
  coresFavoritas: string[];
  estiloPredominante: string;
  categoriasPreferidas: string[];
  ticketMedio?: number;
  ultimaCompra?: Date;
  totalComposicoes: number;
  totalLikes: number;
  totalDislikes: number;
  taxaAprovacao: number;
  produtosCurtidos: Array<{
    produtoId: string;
    produtoNome: string;
    categoria: string;
    cor?: string;
  }>;
}

/**
 * Analisa o perfil completo de um cliente
 */
export async function analyzeCustomerProfile(
  lojistaId: string,
  customerId: string
): Promise<CustomerAnalysisResult | null> {
  try {
    const db = getAdminDb();
    const lojaRef = db.collection("lojas").doc(lojistaId);
    
    // 1. Buscar dados do cliente
    const clienteRef = lojaRef.collection("clientes").doc(customerId);
    const clienteDoc = await clienteRef.get();
    
    if (!clienteDoc.exists) {
      console.warn(`[CustomerAnalysis] Cliente ${customerId} não encontrado`);
      return null;
    }
    
    const clienteData = clienteDoc.data();
    const nome = clienteData?.nome || "Cliente";
    const whatsapp = clienteData?.whatsapp || "";
    
    // 2. NOVO: Buscar últimos 15 generations do cliente (fonte principal de dados)
    const recentGenerations = await fetchUserGenerations(lojistaId, customerId, 15);
    const feedbackSummary = await getFeedbackSummary(lojistaId, customerId);
    
    console.log(`[CustomerAnalysis] Generations encontradas: ${recentGenerations.length}`);
    console.log(`[CustomerAnalysis] Resumo de feedback:`, feedbackSummary);
    
    // Extrair nomes de produtos das generations recentes
    const recentProductNames = feedbackSummary.recentProductNames;
    const likedProductNames = feedbackSummary.likedProductNames;
    
    const totalComposicoes = recentGenerations.length;
    const totalLikes = feedbackSummary.totalLikes;
    const totalDislikes = feedbackSummary.totalDislikes;
    
    // Mapear produtos curtidos
    const produtosCurtidosMap = new Map<string, {
      produtoId: string;
      produtoNome: string;
      categoria: string;
      cor?: string;
      vezes: number;
    }>();
    
    // Processar generations para extrair produtos curtidos
    for (const gen of recentGenerations) {
      if (gen.status === "liked" && gen.productName) {
        // Buscar detalhes do produto se tiver productIds
        const productId = gen.productIds && gen.productIds.length > 0 ? gen.productIds[0] : null;
        if (productId) {
          try {
            const produtoRef = lojaRef.collection("produtos").doc(productId);
            const produtoDoc = await produtoRef.get();
            
            if (produtoDoc.exists) {
              const produtoData = produtoDoc.data();
              const existing = produtosCurtidosMap.get(productId) || {
                produtoId: productId,
                produtoNome: gen.productName || produtoData?.nome || "Produto",
                categoria: produtoData?.categoria || "",
                cor: produtoData?.cores?.[0] || produtoData?.cor || "",
                vezes: 0,
              };
              existing.vezes++;
              produtosCurtidosMap.set(productId, existing);
            } else {
              // Se não encontrar produto, usar apenas o nome
              const existing = produtosCurtidosMap.get(gen.productName) || {
                produtoId: gen.productName,
                produtoNome: gen.productName,
                categoria: "",
                vezes: 0,
              };
              existing.vezes++;
              produtosCurtidosMap.set(gen.productName, existing);
            }
          } catch (error) {
            console.warn(`[CustomerAnalysis] Erro ao buscar produto ${productId}:`, error);
          }
        }
      }
    }
    
    // 3. Buscar favoritos do cliente (fonte mais confiável)
    try {
      const favoritosRef = lojaRef
        .collection("clientes")
        .doc(customerId)
        .collection("favoritos");
      
      const favoritosSnapshot = await favoritosRef
        .where("like", "==", true)
        .limit(20)
        .get();
      
      for (const favDoc of favoritosSnapshot.docs) {
        const favData = favDoc.data();
        const produtoId = favData.produtoId || favData.productId;
        
        if (produtoId) {
          // Buscar detalhes do produto
          try {
            const produtoRef = lojaRef.collection("produtos").doc(produtoId);
            const produtoDoc = await produtoRef.get();
            
            if (produtoDoc.exists) {
              const produtoData = produtoDoc.data();
              const existing = produtosCurtidosMap.get(produtoId) || {
                produtoId,
                produtoNome: produtoData?.nome || "Produto",
                categoria: produtoData?.categoria || "",
                cor: produtoData?.cores?.[0] || produtoData?.cor || "",
                vezes: 0,
              };
              existing.vezes++;
              existing.categoria = produtoData?.categoria || existing.categoria;
              existing.cor = produtoData?.cores?.[0] || produtoData?.cor || existing.cor;
              produtosCurtidosMap.set(produtoId, existing);
            }
          } catch (error) {
            console.warn(`[CustomerAnalysis] Erro ao buscar produto ${produtoId}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn("[CustomerAnalysis] Erro ao buscar favoritos:", error);
    }
    
    // 4. Buscar histórico de tentativas (se disponível)
    const historicoTentativas = clienteData?.historicoTentativas?.produtosExperimentados || [];
    
    // Processar histórico para adicionar produtos
    for (const tentativa of historicoTentativas) {
      if (tentativa.liked && tentativa.produtoId) {
        const existing = produtosCurtidosMap.get(tentativa.produtoId) || {
          produtoId: tentativa.produtoId,
          produtoNome: tentativa.produtoNome || "Produto",
          categoria: tentativa.categoria || "",
          vezes: 0,
        };
        existing.vezes++;
        produtosCurtidosMap.set(tentativa.produtoId, existing);
      }
    }
    
    // 5. Calcular estatísticas
    const produtosCurtidos = Array.from(produtosCurtidosMap.values())
      .sort((a, b) => b.vezes - a.vezes)
      .slice(0, 10)
      .map(({ vezes, ...rest }) => rest);
    
    // Calcular cores favoritas
    const coresMap = new Map<string, number>();
    produtosCurtidos.forEach((produto) => {
      if (produto.cor) {
        coresMap.set(produto.cor, (coresMap.get(produto.cor) || 0) + 1);
      }
    });
    const coresFavoritas = Array.from(coresMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cor]) => cor);
    
    // Calcular categorias preferidas
    const categoriasMap = new Map<string, number>();
    produtosCurtidos.forEach((produto) => {
      if (produto.categoria) {
        categoriasMap.set(produto.categoria, (categoriasMap.get(produto.categoria) || 0) + 1);
      }
    });
    const categoriasPreferidas = Array.from(categoriasMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([categoria]) => categoria);
    
    // Determinar estilo predominante
    let estiloPredominante = "Versátil";
    if (categoriasPreferidas.length > 0) {
      const topCategoria = categoriasPreferidas[0];
      const estiloMap: Record<string, string> = {
        "vestido": "Feminino e Elegante",
        "calça": "Casual e Confortável",
        "blusa": "Versátil e Moderno",
        "saia": "Feminino e Descontraído",
        "short": "Esportivo e Casual",
        "bikini": "Praia e Verão",
        "maiô": "Praia e Verão",
      };
      estiloPredominante = estiloMap[topCategoria.toLowerCase()] || "Versátil";
    }
    
    const taxaAprovacao = totalComposicoes > 0
      ? Math.round((totalLikes / totalComposicoes) * 100)
      : 0;
    
    // 6. Gerar resumo textual rico com dados das generations
    const resumo = `
PERFIL DE MODA DO CLIENTE: ${nome}

📊 ESTATÍSTICAS:
- Total de Composições (últimas 15): ${totalComposicoes}
- Likes: ${totalLikes} | Dislikes: ${totalDislikes}
- Taxa de Aprovação: ${taxaAprovacao}%

📋 ÚLTIMAS PEÇAS TESTADAS:
${recentProductNames.length > 0
  ? recentProductNames.slice(0, 10).map((prod, idx) => `${idx + 1}. ${prod}`).join('\n')
  : 'Nenhuma peça testada recentemente'}

❤️ PREFERÊNCIAS (BASEADO EM LIKES/DISLIKES):
${likedProductNames.length > 0
  ? `Peças que ela curtiu: ${likedProductNames.slice(0, 5).join(', ')}`
  : 'Nenhuma preferência identificada ainda'}

${feedbackSummary.dislikesByCategory.style > 0
  ? `⚠️ Rejeitou ${feedbackSummary.dislikesByCategory.style} peça(s) por ESTILO - evite sugerir peças parecidas`
  : ''}
${feedbackSummary.dislikesByCategory.technical > 0
  ? `⚠️ Rejeitou ${feedbackSummary.dislikesByCategory.technical} peça(s) por PROBLEMAS TÉCNICOS - peça desculpas pela IA e sugira tecidos mais simples`
  : ''}

🎨 PREFERÊNCIAS DE COR:
${coresFavoritas.length > 0 
  ? coresFavoritas.map((cor, idx) => `${idx + 1}. ${cor}`).join('\n')
  : 'Nenhuma cor identificada ainda'}

👗 ESTILO PREDOMINANTE:
${estiloPredominante}

📦 CATEGORIAS PREFERIDAS:
${categoriasPreferidas.length > 0
  ? categoriasPreferidas.map((cat, idx) => `${idx + 1}. ${cat}`).join('\n')
  : 'Nenhuma categoria identificada ainda'}

⭐ PRODUTOS MAIS CURTIDOS:
${produtosCurtidos.length > 0
  ? produtosCurtidos.slice(0, 5).map((prod, idx) => 
      `${idx + 1}. ${prod.produtoNome} (${prod.categoria}${prod.cor ? `, ${prod.cor}` : ''})`
    ).join('\n')
  : 'Nenhum produto identificado ainda'}

${whatsapp ? `📱 Contato: ${whatsapp}` : ''}
`.trim();
    
    return {
      customerId,
      nome,
      whatsapp,
      resumo,
      coresFavoritas,
      estiloPredominante,
      categoriasPreferidas,
      totalComposicoes,
      totalLikes,
      totalDislikes,
      taxaAprovacao,
      produtosCurtidos,
    };
    
  } catch (error) {
    console.error("[CustomerAnalysis] Erro ao analisar cliente:", error);
    return null;
  }
}



