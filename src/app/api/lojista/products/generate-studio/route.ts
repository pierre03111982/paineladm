import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { generateCatalogImage } from "@/lib/ai/imagen-generate";
import { getFormattedMannequinPrompt, resolveGenderFromCategory } from "@/lib/ai-services/mannequin-prompts";
import { buildCatalogPrompt } from "@/lib/ai/catalog-prompt";
import { deductCredits } from "@/lib/financials/deduct-credits";
import { FieldValue } from "firebase-admin/firestore";
import { selectScenarioForProduct, extractProductCharacteristics } from "@/lib/ai/scenario-selector";

export const dynamic = 'force-dynamic';

/**
 * API de Geração Inteligente para Estúdio de Criação IA
 * FASE 32: Estúdio de Criação Digital
 * 
 * Tipos de geração:
 * - "catalog": Imagem de catálogo simples (1 crédito/pack)
 * - "combined": Look combinado com peça complementar (2 créditos/pack)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const searchParams = request.nextUrl.searchParams;
    
    // Ler lojistaId do body ou da query string (compatibilidade com typos)
    const lojistaIdFromQuery = searchParams.get("lojistaId") || searchParams.get("lojistald");
    
    const {
      produtoId,
      imagemUrl,
      mannequinId,
      tipo, // "catalog" | "combined"
      lojistaId: lojistaIdFromBody,
      nome,
      categoria,
      preco,
      precoPromocional, // Preço promocional (pode vir do wizard)
      tags, // Tags do produto (pode vir do wizard)
      productIds, // IDs de produtos para combinação manual
    } = body;
    
    // Priorizar body, depois query string
    const lojistaId = lojistaIdFromBody || lojistaIdFromQuery;

    // Validações
    if (!imagemUrl) {
      return NextResponse.json(
        { error: "imagemUrl é obrigatória" },
        { status: 400 }
      );
    }

    if (!mannequinId) {
      return NextResponse.json(
        { error: "mannequinId é obrigatório" },
        { status: 400 }
      );
    }

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    if (!tipo || !["catalog", "combined"].includes(tipo)) {
      return NextResponse.json(
        { error: "tipo deve ser 'catalog' ou 'combined'" },
        { status: 400 }
      );
    }

    console.log("[api/lojista/products/generate-studio] Iniciando geração:", {
      produtoId: produtoId || "novo produto",
      mannequinId,
      tipo,
      lojistaId,
      categoria,
    });

    // Buscar dados do produto (se existir)
    let produtoData: any = null;
    if (produtoId) {
      const db = getAdminDb();
      const produtoDoc = await db
        .collection("lojas")
        .doc(lojistaId)
        .collection("produtos")
        .doc(produtoId)
        .get();

      if (produtoDoc.exists) {
        produtoData = produtoDoc.data();
      }
    }

    // Preparar dados do produto
    // Prioridade: 1) Body (wizard), 2) produtoData (banco), 3) Default
    const produtoNome = nome || produtoData?.nome || "Produto";
    
    // Garantir que o preço seja um número válido (evitar 0 ou NaN)
    let precoFinal = 0;
    if (preco !== undefined && preco !== null) {
      precoFinal = parseFloat(String(preco));
    } else if (produtoData?.preco !== undefined && produtoData?.preco !== null) {
      precoFinal = parseFloat(String(produtoData.preco));
    }
    // Se ainda for 0 ou NaN, usar valor padrão razoável
    if (!precoFinal || isNaN(precoFinal) || precoFinal <= 0) {
      precoFinal = 199.90; // Valor padrão para novos produtos
    }
    const produtoPreco = precoFinal;
    
    // Preço promocional
    let produtoPrecoPromocional: number | null = null;
    if (precoPromocional !== undefined && precoPromocional !== null && precoPromocional > 0) {
      produtoPrecoPromocional = parseFloat(String(precoPromocional));
    } else if (produtoData?.precoPromocional !== undefined && produtoData?.precoPromocional !== null && produtoData.precoPromocional > 0) {
      produtoPrecoPromocional = parseFloat(String(produtoData.precoPromocional));
    }
    // Validar que o promocional é menor que o original
    if (produtoPrecoPromocional && produtoPrecoPromocional >= produtoPreco) {
      produtoPrecoPromocional = null;
    }
    
    const produtoCategoria = categoria || produtoData?.categoria || "Roupas";
    
    // Normalizar tamanhos - pode vir como array, string ou undefined
    let produtoTamanhos: string[] = [];
    if (Array.isArray(produtoData?.tamanhos) && produtoData.tamanhos.length > 0) {
      produtoTamanhos = produtoData.tamanhos;
    } else if (typeof produtoData?.tamanhos === "string" && produtoData.tamanhos.trim()) {
      produtoTamanhos = produtoData.tamanhos.split(",").map(t => t.trim()).filter(Boolean);
    }
    // Se não houver tamanhos, deixar vazio (vai mostrar "Consulte disponibilidade")
    
    console.log("[api/lojista/products/generate-studio] Dados do produto para etiqueta:", {
      produtoNome,
      produtoPreco,
      produtoPrecoPromocional,
      produtoTamanhos,
      precoFromBody: preco,
      precoFromData: produtoData?.preco,
      tamanhosFromData: produtoData?.tamanhos,
    });
    
    // Extrair características do produto para análise de cenário
    // Incluir tags passadas no body (do wizard) e dados do produto no banco
    const produtoCaracteristicas = extractProductCharacteristics({
      ...produtoData,
      categoria: produtoCategoria,
      nome: produtoNome,
      // Tags podem vir do body (wizard) ou do produto salvo
      tags: tags || produtoData?.tags || [],
    });
    
    // Selecionar cenário apropriado baseado nas características
    const cenarioSelecionado = selectScenarioForProduct(produtoCaracteristicas);
    
    console.log("[api/lojista/products/generate-studio] Análise de cenário:", {
      categoria: produtoCategoria,
      tags: produtoCaracteristicas.tags,
      cenarioSelecionado: cenarioSelecionado.substring(0, 100) + "...",
    });

    // Obter prompt do manequim formatado
    const mannequinPrompt = getFormattedMannequinPrompt(mannequinId, produtoCategoria);
    if (!mannequinPrompt) {
      return NextResponse.json(
        { error: "Estilo de manequim não encontrado" },
        { status: 400 }
      );
    }

    // Calcular custo (priorizar pacote de catálogo)
    const db = getAdminDb();
    const lojaDoc = await db.collection("lojas").doc(lojistaId).get();
    const lojaData = lojaDoc.data() || {};
    const catalogPack = lojaData.catalogPack || 0;
    const credits = lojaData.credits || 0;
    const lojaNome = lojaData.nome || lojaData.name || lojaData.nomeLoja || "";

    // Verificar se é a loja Pierre Moda (teste ilimitado com contabilização)
    // Verificar múltiplas variações do nome
    const lojaNomeLower = lojaNome.toLowerCase().trim();
    const isPierreModa = 
      (lojaNomeLower.includes("pierre") && (lojaNomeLower.includes("moda") || lojaNomeLower.includes("fashion"))) ||
      lojaNomeLower === "pierre moda" ||
      lojaNomeLower === "pierre fashion" ||
      lojistaId === "hOQL4BaVY92787EjKVMt"; // ID específico da loja Pierre Moda para garantir
    
    const subscription = lojaData.subscription || {};
    const isTestUnlimited = subscription.clientType === "test_unlimited" || isPierreModa;
    
    console.log("[api/lojista/products/generate-studio] Verificação de créditos:", {
      lojistaId,
      lojaNome,
      lojaNomeLower,
      isPierreModa,
      clientType: subscription.clientType,
      isTestUnlimited,
      catalogPack,
      credits,
    });

    const cost = tipo === "combined" ? 2 : 1;
    const usePack = catalogPack > 0 && !isTestUnlimited; // Não usar pack se for teste ilimitado

    // Verificar créditos disponíveis (pular verificação se for teste ilimitado)
    if (!isTestUnlimited) {
      if (usePack && catalogPack < cost) {
        if (credits < cost) {
          return NextResponse.json(
            { error: `Saldo insuficiente. Necessário: ${cost} ${usePack ? "Pack" : "Créditos"}` },
            { status: 402 }
          );
        }
      } else if (!usePack && credits < cost) {
        return NextResponse.json(
          { error: `Saldo insuficiente. Necessário: ${cost} Créditos` },
          { status: 402 }
        );
      }
    }

    // Debitar créditos (priorizar pacote, mas contabilizar uso mesmo em teste ilimitado)
    if (isTestUnlimited) {
      // Modo teste ilimitado: não debitar saldo, mas contabilizar uso
      const usageMetrics = lojaData.usageMetrics || {
        totalGenerated: 0,
        creditsUsed: 0,
        creditsRemaining: 0,
      };

      await db.collection("lojas").doc(lojistaId).update({
        "usageMetrics.totalGenerated": FieldValue.increment(cost),
        "usageMetrics.creditsUsed": FieldValue.increment(cost),
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log(`[api/lojista/products/generate-studio] ✅ Modo Teste Ilimitado (Pierre Moda) - ${cost} crédito(s) contabilizado(s) sem debitar saldo`);
    } else if (usePack && catalogPack >= cost) {
      await db.collection("lojas").doc(lojistaId).update({
        catalogPack: catalogPack - cost,
        updatedAt: new Date(),
      });
      console.log(`[api/lojista/products/generate-studio] ✅ ${cost} Pack debitado. Restante: ${catalogPack - cost}`);
    } else {
      const deductResult = await deductCredits({
        lojistaId,
        amount: cost,
      });

      if (!deductResult.success) {
        return NextResponse.json(
          { error: deductResult.message || "Erro ao debitar créditos" },
          { status: 402 }
        );
      }

      console.log(`[api/lojista/products/generate-studio] ✅ ${cost} Créditos debitados.`);
    }

    // Construir prompt baseado no tipo
    let finalPrompt: string;

    if (tipo === "combined") {
      // Look Combinado: Usar produtos selecionados pela IA ou buscar automaticamente
      let complementaryProducts: Array<{ id: string; nome: string; categoria: string; imagemUrl: string }> = [];
      
      if (productIds && Array.isArray(productIds) && productIds.length > 0) {
        // Usar produtos selecionados pela IA
        console.log("[api/lojista/products/generate-studio] Usando produtos selecionados pela IA:", productIds);
        
        // Buscar dados completos dos produtos no Firestore
        for (const productId of productIds) {
          const productDoc = await db
            .collection("lojas")
            .doc(lojistaId)
            .collection("produtos")
            .doc(productId)
            .get();
          
          if (productDoc.exists) {
            const productData = productDoc.data();
            const analiseIA = productData?.analiseIA || {};
            
            complementaryProducts.push({
              id: productDoc.id,
              nome: productData?.nome || "Produto Complementar",
              categoria: productData?.categoria || "Roupas",
              imagemUrl: productData?.imagemPrincipal || productData?.imagemUrl || productData?.imagemUrlOriginal || "",
              // Incluir dados da análise IA para melhor descrição
              tipo: analiseIA.product_type || productData?.tipo || "",
              cores: analiseIA.dominant_colors || [],
              tecido: analiseIA.detected_fabric || productData?.tecido || "",
            } as any);
          }
        }
      } else {
        // Fallback: Buscar produto complementar automaticamente (lógica antiga)
        const complementaryProduct = await findComplementaryProduct(
          lojistaId,
          produtoCategoria,
          produtoId
        );
        
        if (complementaryProduct) {
          complementaryProducts.push(complementaryProduct);
        }
      }

      if (complementaryProducts.length > 0) {
        // Construir descrições detalhadas dos produtos complementares
        const complementaryDescriptions = complementaryProducts.map((p: any, idx: number) => {
          const cores = Array.isArray(p.cores) 
            ? p.cores.map((c: any) => c.name || c).join(", ") 
            : "cores naturais";
          
          return `
   ${idx + 2}. ${p.nome} (${p.categoria})
      - Tipo: ${p.tipo || "não especificado"}
      - Cores: ${cores}
      - Tecido: ${p.tecido || "não especificado"}
      - Estilo: Complementar harmonicamente com o produto principal`;
        }).join("\n");
        
        finalPrompt = `**INSTRUÇÃO MESTRE - LOOK COMBINADO (Múltiplas Peças):**

Você é um fotógrafo de e-commerce especializado em criar looks completos e harmoniosos. Sua missão é criar uma foto de estúdio profissional onde um MANEQUIM veste MÚLTIPLAS PEÇAS simultaneamente, criando um look combinado e estiloso.

**🎨 COMPOSIÇÃO DO LOOK:**

O manequim deve vestir as seguintes peças JUNTAS, todas visíveis e bem ajustadas:

   1. **PRODUTO PRINCIPAL (extrair da imagem anexada):**
      - Nome: ${produtoNome}
      - Categoria: ${produtoCategoria}
      - IMPORTANTE: Extraia esta peça da imagem anexada com FIDELIDADE TOTAL (cores, texturas, detalhes)
${complementaryDescriptions}

**📸 INSTRUÇÕES DE COMPOSIÇÃO VISUAL:**

1. **EXTRAÇÃO DO PRODUTO PRINCIPAL:**
   - Analise a imagem anexada e extraia o produto principal com precisão cirúrgica
   - Mantenha 100% de fidelidade às características visuais originais
   - Cores, texturas, padrões e detalhes devem ser idênticos

2. **COLOCAÇÃO DAS PEÇAS NO MANEQUIM:**
   ${mannequinPrompt}
   
   **TODAS as peças devem estar:**
   - Vestidas simultaneamente no manequim
   - Bem ajustadas e posicionadas naturalmente
   - Visíveis e destacadas na composição
   - Em harmonia visual umas com as outras

3. **HARMONIA VISUAL:**
   - As cores devem combinar harmoniosamente
   - Os tecidos devem ter texturas compatíveis
   - O estilo geral deve ser coerente
   - O look final deve parecer profissional e atrativo

4. **CENÁRIO E ILUMINAÇÃO:**
   ${cenarioSelecionado}
   - Iluminação que valorize todas as peças do look
   - Fundo que não compita visualmente com as roupas

**✅ VALIDAÇÕES FINAIS:**
- [ ] Produto principal extraído fielmente da imagem anexada
- [ ] Todos os produtos complementares visíveis no manequim
- [ ] Peças bem ajustadas e posicionadas
- [ ] Harmonia visual entre todas as peças
- [ ] Look completo e estiloso, digno de catálogo profissional
- [ ] Cenário apropriado e iluminação de qualidade`;
      } else {
        // Se não encontrar complementares, usar apenas o manequim
        finalPrompt = mannequinPrompt;
      }
    } else {
      // Catálogo simples: Usar prompt do catálogo com manequim customizado e cenário selecionado
      const produtoParaCatalogo = {
        nome: produtoNome,
        preco: produtoPreco,
        precoPromocional: produtoData?.precoPromocional || null,
        tamanhos: produtoTamanhos,
      };

      // Construir prompt do catálogo com o cenário selecionado baseado nas características do produto
      const catalogPromptBase = buildCatalogPrompt(produtoParaCatalogo, "custom", cenarioSelecionado);
      
      // Construir prompt final combinando:
      // 1. Instrução de extração do produto da imagem original
      // 2. Manequim selecionado (já formatado)
      // 3. Colocação do produto no manequim
      // 4. Cenário selecionado
      // 5. Etiqueta com informações corretas do produto
      
      finalPrompt = `**INSTRUÇÃO MESTRE (Prioridade Máxima: Extração, Fidelidade e Hierarquia Visual de Preço):**
Atue como um fotógrafo profissional de e-commerce de luxo e uma IA de análise visual forense.

Sua missão crítica é tripla:
1. **EXTRAÇÃO CIRÚRGICA:** Analise a imagem anexada e extraia o produto (peça de roupa) com precisão absoluta, isolando-o de qualquer contexto original.
2. **COLOCAÇÃO NO MANEQUIM:** Coloque o produto extraído no manequim selecionado abaixo, mantendo 100% de fidelidade ao produto original.
3. **INTEGRAÇÃO DINÂMICA DE PREÇO:** Adicione uma etiqueta minimalista com informações do produto e uma linha conectora ligando o produto à etiqueta.

**ETAPA 1: ANÁLISE FORENSE DO PRODUTO**
Analise a foto anexada milímetro por milímetro. Identifique e memorize o produto (peça de roupa):
- Forma e silhueta completa
- Material e textura (Algodão, Poliéster, Seda, Jeans, etc.)
- Cor ou cores predominantes
- Padrões e estampas (se houver)
- Detalhes (Botões, Zíperes, Costuras, Bordados, Aplicações)
- Estilo e corte
- Caimento e forma quando usado

IMPORTANTE: Você deve extrair SOMENTE a peça de roupa da imagem, ignorando qualquer acessório (bolsas, sapatos, joias, óculos, etc.).

**ETAPA 2: GERAÇÃO DA IMAGEM (Regras Rígidas)**
* **REGRA Nº1: FIDELIDADE TOTAL:** O produto na imagem final deve ser uma cópia carbono exata do produto extraído da imagem anexada. Mantenha cor, textura, detalhes, padrões e formato originais.

* **MANEQUIM SELECIONADO:**
Use o seguinte manequim para exibir o produto:
${mannequinPrompt}

* **COLOCAÇÃO DO PRODUTO:** 
CRÍTICO: Analise a imagem anexada e extraia o produto (peça de roupa) dela. Em seguida, coloque esse produto EXATO extraído da imagem sobre o manequim descrito acima. O produto deve estar perfeitamente ajustado ao corpo do manequim, mantendo 100% de fidelidade às suas características originais (cor, textura, padrão, detalhes). O produto deve parecer natural e realista sobre o manequim, como se estivesse sendo usado por ele, preservando o caimento e a forma original da peça.

* **CENÁRIO DE FUNDO:**
${cenarioSelecionado}

* **ETIQUETA DE INFORMAÇÃO COM LÓGICA DE PROMOÇÃO:**
    * Adicione uma etiqueta (tag) flutuante ao lado direito do produto/manequim, estilo minimalista e elegante.
    * **POSICIONAMENTO:** A etiqueta deve estar visível e bem posicionada, não obscurecendo o produto.
    * **CONTEÚDO DA ETIQUETA:**
        * **Linha 1 (Nome):** "${produtoNome}" em negrito e fonte destacada.
        * **BLOCO DE PREÇO (USE O VALOR EXATO ESPECIFICADO):**${produtoPreco > 0 && produtoPrecoPromocional && produtoPrecoPromocional > 0 && produtoPrecoPromocional < produtoPreco ? `
            * EXATAMENTE como mostrado abaixo - NÃO altere os valores:
            * Preço Original: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(produtoPreco)} (riscado, pequeno, cinza)
            * Preço Promocional: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(produtoPrecoPromocional)} (GRANDE, negrito, cor de destaque - vermelho escuro ou preto)
            * Badge: ${Math.round((1 - produtoPrecoPromocional / produtoPreco) * 100)}% OFF` : produtoPreco > 0 ? `
            * EXATAMENTE como mostrado abaixo - NÃO altere o valor, NUNCA use R$ 0,00:
            * Preço: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(produtoPreco)} (em tamanho de destaque padrão, negrito, cor preta ou escura)` : `
            * Preço: R$ 199,90 (valor padrão - apenas se nenhum preço foi fornecido)`
        }
        * **Linha Final (Tamanhos):** "${produtoTamanhos && produtoTamanhos.length > 0 ? produtoTamanhos.join(", ") : "Consulte disponibilidade"}" em texto menor.
    * **LINHA CONECTORA (LINHA DE INDICAÇÃO) - OBRIGATÓRIA:**
        * **FUNÇÃO CRÍTICA:** A linha conectora é OBRIGATÓRIA e DEVE aparecer na imagem final. Ela conecta FISICAMENTE a etiqueta ao produto vestido no manequim.
        * **APARÊNCIA:** Uma linha reta e contínua, fina (espessura de 2-3 pixels), em cor preta sólida (#000000) ou cinza escuro (#333333), claramente visível.
        * **GEOMETRIA:**
            * **ORIGEM (Ponto de Partida):** A linha DEVE partir da borda ESQUERDA da etiqueta, no meio ou na parte superior da etiqueta.
            * **DESTINO (Ponto de Chegada):** A linha DEVE apontar e TERMINAR EXATAMENTE no produto vestido no manequim, conectando-se a uma parte específica e visível do produto (ex: peito de uma blusa, cintura de uma calça, aba de um boné, gola de uma camisa).
            * **TRAJETÓRIA:** A linha deve ser reta ou ligeiramente curva, criando uma conexão visual direta e clara.
        * **VISIBILIDADE:** A linha deve ser suficientemente visível (preto ou cinza escuro) para ser facilmente identificada. NÃO use cores claras ou transparentes.
        * **REQUISITO ABSOLUTO:** SEM esta linha conectora ligando a etiqueta ao produto, a imagem está INCOMPLETA e INCORRETA. A linha DEVE aparecer na imagem final, conectando claramente a etiqueta ao produto.
    * **ESTILO DA ETIQUETA:** Fundo branco ou transparente com borda sutil, fonte legível, hierarquia visual clara.

* **ILUMINAÇÃO:** Luz de estúdio profissional para realçar texturas do produto e detalhes do manequim.

**CRITICAL FRAMING INSTRUCTIONS:**
Generate a vertical image with a strictly 2:3 aspect ratio (aspect ratio 2:3 vertical).
The mannequin with the product must be a FULL BODY shot, fully visible from the top of the head to the feet within the frame.
Perfectly framed, subject fills the frame entirely, no borders, no padding, edge to edge composition.
The subject must be centered.
No letterboxing, no black bars, no white borders, no pillarboxing, no blurred borders, no extra background filler.
The image must fill the entire canvas from edge to edge.
High-resolution fashion photography style.`;
      
      console.log("[api/lojista/products/generate-studio] Prompt final construído com manequim, produto e etiqueta:", {
        mannequinId,
        produtoNome,
        produtoPreco,
        cenarioLength: cenarioSelecionado.length,
        promptLength: finalPrompt.length,
      });
    }

    // Gerar imagem
    const produtoIdParaGeracao = produtoId || `temp-${Date.now()}`;
    const imageUrl = await generateCatalogImage(
      finalPrompt,
      imagemUrl,
      lojistaId,
      produtoIdParaGeracao
    );

    console.log("[api/lojista/products/generate-studio] ✅ Imagem gerada:", imageUrl);

    return NextResponse.json({
      success: true,
      imageUrl,
      tipo,
      mannequinId,
      cost,
      usedPack: usePack && catalogPack >= cost,
    });
  } catch (error: any) {
    console.error("[api/lojista/products/generate-studio] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao gerar imagem",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Busca um produto complementar no estoque
 * Algoritmo: Se produto é "Blusa" -> buscar "Calça" ou "Saia"
 */
async function findComplementaryProduct(
  lojistaId: string,
  categoriaOriginal: string,
  produtoIdExcluir?: string
): Promise<{ id: string; nome: string; categoria: string; imagemUrl: string } | null> {
  try {
    const db = getAdminDb();
    const categoriaLower = categoriaOriginal.toLowerCase();

    // Mapear categorias complementares
    const complementaryCategories: Record<string, string[]> = {
      blusa: ["calça", "saia", "short"],
      calça: ["blusa", "camisa", "top"],
      saia: ["blusa", "camisa", "top"],
      short: ["blusa", "camisa", "top"],
      vestido: [], // Vestido não precisa de complemento
      camisa: ["calça", "saia"],
      top: ["calça", "saia", "short"],
    };

    const categoriasBuscadas = complementaryCategories[categoriaLower] || [];

    if (categoriasBuscadas.length === 0) {
      return null;
    }

    // Buscar produtos nas categorias complementares
    const produtosRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("produtos");

    // Buscar em cada categoria complementar
    for (const categoriaComplementar of categoriasBuscadas) {
      const snapshot = await produtosRef
        .where("categoria", "==", categoriaComplementar)
        .where("arquivado", "!=", true)
        .limit(5)
        .get();

      if (!snapshot.empty) {
        // Filtrar produto atual se existir
        const produtos = snapshot.docs
          .filter((doc) => doc.id !== produtoIdExcluir)
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

        if (produtos.length > 0) {
          // Retornar o primeiro produto encontrado
          const produto = produtos[0];
          return {
            id: produto.id,
            nome: produto.nome || "Produto Complementar",
            categoria: produto.categoria || categoriaComplementar,
            imagemUrl: produto.imagemUrl || produto.imagemUrlCatalogo || produto.imagemUrlOriginal || "",
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error("[findComplementaryProduct] Erro:", error);
    return null;
  }
}

