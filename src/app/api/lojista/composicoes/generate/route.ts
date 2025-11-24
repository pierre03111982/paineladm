/**
 * API Route: Geração de Composições
 * POST /api/lojista/composicoes/generate
 * 
 * Gera uma composição completa (Try-On + Cenários + Watermark)
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCompositionOrchestrator } from "@/lib/ai-services/composition-orchestrator";
import { getAdminDb, getAdminStorage } from "@/lib/firebaseAdmin";

const db = getAdminDb();
const storage = (() => {
  try {
    return getAdminStorage();
  } catch (error) {
    console.warn("[API] Storage indisponível:", error);
    return null;
  }
})();
const bucket =
  storage && process.env.FIREBASE_STORAGE_BUCKET
    ? storage.bucket(process.env.FIREBASE_STORAGE_BUCKET)
    : null;

async function fetchUsdToBrlRate(): Promise<number> {
  try {
    const response = await fetch(
      "https://economia.awesomeapi.com.br/json/last/USD-BRL",
      { cache: "no-store" }
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    const bid = parseFloat(payload?.USDBRL?.bid ?? payload?.USDBRL?.ask);
    if (Number.isFinite(bid) && bid > 0) {
      return bid;
    }
  } catch (error) {
    console.warn("[API] Falha ao buscar câmbio USD/BRL:", error);
  }
  return 5;
}

function applyCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin") ?? "*";
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set(
    "Access-Control-Allow-Headers",
    request.headers.get("access-control-request-headers") ?? "Content-Type, Authorization"
  );
  response.headers.set(
    "Access-Control-Allow-Methods",
    request.headers.get("access-control-request-method") ?? "POST, GET, OPTIONS"
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  return applyCors(request, response);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now(); // Iniciar contagem de tempo
  try {
    // Verificar se é FormData ou JSON pelo content-type
    const contentType = request.headers.get("content-type") || "";
    const isFormData = contentType.includes("multipart/form-data");
    
    let personImageUrl: string | null = null;
    let productIds: string[] = [];
    let productUrl: string | null = null; // URL do produto (link)
    let lojistaId: string | null = null;
    let customerId: string | null = null;
    let scenePrompts: string[] | null = null;
    let options: any = null;

    if (isFormData) {
      // FormData (do frontend)
      const formData = await request.formData();
      const photo = formData.get("photo") as File;
      lojistaId = formData.get("lojistaId") as string;
      const produtosJson = formData.get("produtos") as string;
      
      if (!photo || !lojistaId) {
        return applyCors(
          request,
          NextResponse.json(
            { error: "Foto e lojistaId são obrigatórios" },
            { status: 400 }
          )
        );
      }

      // Fazer upload da foto para Firebase Storage
      if (!bucket) {
        return applyCors(
          request,
          NextResponse.json(
            { error: "Storage não configurado" },
            { status: 500 }
          )
        );
      }

      try {
        const buffer = Buffer.from(await photo.arrayBuffer());
        const fileName = `composicoes/${lojistaId}/uploads/${Date.now()}-${photo.name || "photo.jpg"}`;
        const file = bucket.file(fileName);

        await file.save(buffer, {
          metadata: {
            contentType: photo.type || "image/jpeg",
          },
        });

        await file.makePublic();
        personImageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      } catch (uploadError) {
        console.error("[API] Erro ao fazer upload da foto:", uploadError);
        return applyCors(
          request,
          NextResponse.json(
            { error: "Erro ao fazer upload da foto" },
            { status: 500 }
          )
        );
      }

      // Parse produtos
      if (produtosJson) {
        try {
          productIds = JSON.parse(produtosJson);
        } catch {
          productIds = [produtosJson];
        }
      }

      // Obter URL do produto se fornecida
      productUrl = (formData.get("productUrl") as string) || null;

      customerId = (formData.get("customerId") as string) || null;
    } else {
      // JSON (compatibilidade com chamadas antigas)
      const body = await request.json();
      personImageUrl = body.personImageUrl;
      productIds = body.productId ? [body.productId] : body.productIds || [];
      lojistaId = body.lojistaId;
      customerId = body.customerId || null;
      scenePrompts = body.scenePrompts || null;
      options = body.options || null;
    }

    console.log("[API] Parâmetros recebidos:", {
      lojistaId,
      productIdsCount: productIds.length,
      hasPersonImage: !!personImageUrl,
      personImageUrl: personImageUrl ? personImageUrl.substring(0, 100) + "..." : null,
      hasProductUrl: !!productUrl,
      isFormData,
    });

    // Validação básica: precisa ter foto, lojistaId e (produtos OU productUrl)
    if (!personImageUrl || !lojistaId || (productIds.length === 0 && !productUrl)) {
      return applyCors(
        request,
        NextResponse.json(
          {
            error: "Parâmetros obrigatórios: foto, lojistaId e (produtos OU productUrl)",
          },
          { status: 400 }
        )
      );
    }

    // Busca informações dos produtos
    const productsData: any[] = [];
    
    // Se productUrl foi fornecido, criar um produto virtual
    if (productUrl && productIds.length === 0) {
      productsData.push({
        id: `url-${Date.now()}`,
        nome: "Produto do Link",
        preco: 0,
        imagemUrl: productUrl,
        categoria: "acessórios",
        productUrl: productUrl, // Guardar a URL original
      });
    } else {
      // Buscar produtos do catálogo
      console.log("[API] 🔍 Buscando produtos do Firestore:", {
        totalProductIds: productIds.length,
        productIds: productIds,
        lojistaId,
      });
      
      for (const productId of productIds) {
        try {
          console.log(`[API] 📦 Buscando produto ${productId}...`);
          const productDoc = await db
            .collection("lojas")
            .doc(lojistaId)
            .collection("produtos")
            .doc(productId)
            .get();

          if (productDoc.exists) {
            const productData = productDoc.data();
            console.log(`[API] ✅ Produto ${productId} encontrado:`, {
              id: productId,
              nome: productData?.nome,
              categoria: productData?.categoria,
              temImagemUrl: !!productData?.imagemUrl,
              temProductUrl: !!productData?.productUrl,
              imagemUrl: productData?.imagemUrl ? productData.imagemUrl.substring(0, 80) + "..." : "N/A",
            });
            
            productsData.push({
              id: productId,
              ...productData,
            });
          } else {
            console.warn(`[API] ⚠️ Produto ${productId} NÃO encontrado no Firestore!`);
            // Produto não encontrado, usar dados mock
            productsData.push({
              id: productId,
              nome: "Produto de Teste",
              preco: 99.90,
              imagemUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=512",
            });
          }
        } catch (error) {
          console.error(`[API] ❌ Erro ao buscar produto ${productId}:`, error);
          productsData.push({
            id: productId,
            nome: "Produto de Teste",
            preco: 99.90,
            imagemUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=512",
          });
        }
      }
      
      console.log("[API] 📊 Resumo da busca de produtos:", {
        totalBuscados: productIds.length,
        totalEncontrados: productsData.length,
        produtos: productsData.map(p => ({
          id: p.id,
          nome: p.nome,
          temImagem: !!(p?.imagemUrl || p?.productUrl),
        })),
      });
    }

    // Busca informações da loja
    let lojaData: any = null;
    
    try {
      const lojaDoc = await db.collection("lojas").doc(lojistaId).get();
      if (lojaDoc.exists) {
        lojaData = lojaDoc.data();
      }
    } catch (error) {
      console.log("[API] Loja não encontrada no Firestore, usando dados mock");
    }

    // Se não encontrou loja, usa dados mock para teste
    if (!lojaData) {
      lojaData = {
        nome: "Loja de Teste",
        logoUrl: null,
      };
    }

    // Usar apenas o primeiro produto selecionado para gerar os 2 looks
    const primaryProduct = productsData[0];
    
    if (!primaryProduct) {
      return applyCors(
        request,
        NextResponse.json(
          { error: "Nenhum produto válido encontrado" },
          { status: 400 }
        )
      );
    }

    // Prompts de cenário otimizados para moda/roupas
    // O prompt deve ser descritivo e adequado para o contexto de moda
    const getScenePrompt = (productName: string, productCategory?: string) => {
      // Se foi fornecido um prompt customizado, usar ele
      if (scenePrompts && scenePrompts.length > 0) {
        return scenePrompts[0];
      }

      // Prompts inteligentes baseados na categoria do produto
      const category = (productCategory || "").toLowerCase();
      
      if (category.includes("praia") || category.includes("bikini") || category.includes("maiô")) {
        return "Uma praia paradisíaca com areia branca, mar azul turquesa e palmeiras ao fundo, iluminação natural do sol, ambiente tropical e relaxante";
      }
      
      if (category.includes("esporte") || category.includes("academia") || category.includes("fitness")) {
        return "Um estúdio moderno com iluminação profissional, fundo neutro elegante, ambiente clean e minimalista, foco no produto";
      }
      
      if (category.includes("casual") || category.includes("dia a dia")) {
        return "Um ambiente urbano moderno, rua com arquitetura contemporânea, iluminação natural suave, estilo lifestyle";
      }
      
      if (category.includes("social") || category.includes("festa") || category.includes("evento")) {
        return "Um ambiente sofisticado e elegante, decoração moderna, iluminação ambiente suave, atmosfera premium";
      }
      
      // Prompt padrão otimizado: ambiente fotorrealista minimalista (em inglês para StabilityAI)
      return "A beautiful and harmonious outdoor environment that complements the person and the clothing. Think of a photorealistic minimalist setting, such as a well-maintained botanical garden, a charming street with luxury boutiques in the background, or a terrace with a view of a modern urban landscape. Maintain natural and soft lighting, focusing attention on the person and clothing details, without distractions. Professional photographic quality, fashion editorial style.";
    };

    const scenePrompt = getScenePrompt(primaryProduct.nome, primaryProduct.categoria);

    // Função auxiliar para detectar se um produto é roupa
    const isProductClothing = (productCategory: string): boolean => {
      const category = (productCategory || "").toLowerCase();
      return !category.includes("acessório") && 
             !category.includes("acessorio") &&
             !category.includes("óculos") &&
             !category.includes("oculos") &&
             !category.includes("joia") &&
             !category.includes("relógio") &&
             !category.includes("relogio") &&
             (category.includes("camisa") ||
              category.includes("camiseta") ||
              category.includes("vestido") ||
              category.includes("calça") ||
              category.includes("calca") ||
              category.includes("short") ||
              category.includes("saia") ||
              category.includes("blusa") ||
              category.includes("casaco") ||
              category.includes("jaqueta") ||
              category.includes("roupa") ||
              category.includes("moda") ||
              category.includes("praia") ||
              category.includes("esporte") ||
              category.includes("fitness") ||
              category.includes("social") ||
              category.includes("casual"));
    };

    // Determinar a URL da imagem do produto ANTES de usar
    const finalProductImageUrl = primaryProduct?.productUrl || primaryProduct?.imagemUrl || "";

    console.log("[API] 🔍 Configuração simplificada - apenas Look Criativo com Gemini:", {
      produtoId: primaryProduct.id,
      produtoNome: primaryProduct.nome,
      categoria: primaryProduct.categoria,
      productImageUrl: primaryProduct?.imagemUrl ? primaryProduct.imagemUrl.substring(0, 80) + "..." : "NÃO FORNECIDA",
      scenePrompt: scenePrompt.substring(0, 100) + "...",
    });

    // Gera apenas 1 look criativo usando Gemini 2.5 Flash
    const orchestrator = getCompositionOrchestrator();
    const allResults: any[] = [];
    const allLooks: any[] = [];
    let allProductImageUrls: string[] = []; // Declarar fora do try para usar no retorno

    try {
      // ========================================
      // FLUXO SIMPLIFICADO: Apenas Look Criativo usando Gemini 2.5 Flash Image
      // ========================================
      
      // GERAR LOOK CRIATIVO usando Gemini 2.5 Flash Image com TODAS as imagens de produtos
      console.log("[API] 🎨 Gerando Look Criativo com Gemini 2.5 Flash Image...");
      console.log("[API] 📦 Produtos recebidos para Look Criativo:", {
        totalProdutos: productsData.length,
        produtos: productsData.map(p => ({
          id: p.id,
          nome: p.nome,
          categoria: p.categoria,
          temImagem: !!(p?.productUrl || p?.imagemUrl),
        })),
      });
      
      // Coletar todas as imagens de produtos (incluindo roupas)
      allProductImageUrls = [];
      const produtosComImagem: any[] = [];
      const produtosSemImagem: any[] = [];
      
      console.log("[API] 🔍 Iniciando coleta de imagens de produtos:", {
        totalProdutos: productsData.length,
        produtos: productsData.map(p => ({
          id: p.id,
          nome: p.nome,
          categoria: p.categoria,
          temProductUrl: !!p?.productUrl,
          temImagemUrl: !!p?.imagemUrl,
        })),
      });
      
      for (const product of productsData) {
        const productImageUrl = product?.productUrl || product?.imagemUrl || "";
        
        if (productImageUrl && productImageUrl.startsWith("http")) {
          allProductImageUrls.push(productImageUrl);
          produtosComImagem.push(product);
          console.log("[API] ✅ Adicionando imagem de produto ao Look Criativo:", {
            produtoId: product.id,
            produtoNome: product.nome,
            categoria: product.categoria || "N/A",
            imagemUrl: productImageUrl.substring(0, 80) + "...",
            indice: allProductImageUrls.length, // Índice na lista (1 = primeiro produto)
            tipo: `IMAGEM_PRODUTO_${allProductImageUrls.length}`,
          });
        } else {
          produtosSemImagem.push(product);
          console.warn("[API] ⚠️ Produto SEM imagem válida (será ignorado no Look Criativo):", {
            produtoId: product.id,
            produtoNome: product.nome,
            categoria: product.categoria || "N/A",
            productUrl: product?.productUrl || "N/A",
            imagemUrl: product?.imagemUrl || "N/A",
            motivo: !productImageUrl ? "URL vazia" : !productImageUrl.startsWith("http") ? "URL inválida (não começa com http)" : "Desconhecido",
          });
        }
      }
      
      if (allProductImageUrls.length === 0) {
        console.error("[API] ❌ ERRO: Nenhuma imagem de produto válida encontrada para Look Criativo!");
        console.error("[API] Produtos analisados:", productsData.map(p => ({
          id: p.id,
          nome: p.nome,
          productUrl: p?.productUrl || null,
          imagemUrl: p?.imagemUrl || null,
        })));
      }
      
      console.log("[API] 📊 Resumo final - Imagens coletadas para Look Criativo:", {
        totalProdutosRecebidos: productsData.length,
        imagensValidasColetadas: allProductImageUrls.length,
        produtosComImagem: produtosComImagem.map(p => ({
          id: p.id,
          nome: p.nome,
          categoria: p.categoria,
        })),
        produtosSemImagem: produtosSemImagem.map(p => ({
          id: p.id,
          nome: p.nome,
          categoria: p.categoria,
          motivo: !p?.productUrl && !p?.imagemUrl ? "Sem URL" : "URL inválida",
        })),
        imagens: allProductImageUrls.map((url, index) => ({
          indice: index + 1,
          tipo: `IMAGEM_PRODUTO_${index + 1}`,
          url: url.substring(0, 60) + "...",
        })),
      });
      
      // Validação crítica: garantir que temos pelo menos uma imagem de produto
      if (allProductImageUrls.length === 0) {
        console.error("[API] ❌ ERRO CRÍTICO: Nenhuma imagem de produto válida encontrada!");
        console.error("[API] Detalhes dos produtos:", {
          total: productsData.length,
          produtos: productsData.map(p => ({
            id: p.id,
            nome: p.nome,
            categoria: p.categoria,
            productUrl: p?.productUrl || null,
            imagemUrl: p?.imagemUrl || null,
            temAlgumaUrl: !!(p?.productUrl || p?.imagemUrl),
          })),
        });
        throw new Error("Nenhuma imagem de produto válida encontrada para gerar o Look Criativo. Verifique se todos os produtos têm imagem cadastrada.");
      }
      
      // Aviso se algum produto não tem imagem
      if (produtosSemImagem.length > 0) {
        console.warn("[API] ⚠️ ATENÇÃO: Alguns produtos não têm imagem válida e serão ignorados:", {
          produtosIgnorados: produtosSemImagem.map(p => p.nome),
          totalIgnorados: produtosSemImagem.length,
          totalIncluidos: allProductImageUrls.length,
        });
      }
      
      const creativeResult = await orchestrator.createComposition({
        personImageUrl,
        productId: primaryProduct.id,
        productImageUrl: finalProductImageUrl,
        lojistaId,
        customerId: customerId || undefined,
        productName: primaryProduct?.nome,
        productPrice: primaryProduct?.preco
          ? `R$ ${primaryProduct.preco.toFixed(2)}`
          : undefined,
        storeName: lojaData?.nome || "Minha Loja",
        logoUrl: lojaData?.logoUrl,
        scenePrompts: [], // Não usado no Gemini Flash Image
        options: {
          quality: options?.quality || "high",
          skipWatermark: true, // Desabilitar watermark para Look Criativo (caixa branca no frontend já exibe as informações)
          productUrl: primaryProduct.productUrl || undefined,
          lookType: "creative",
          allProductImageUrls: allProductImageUrls, // Todas as imagens de produtos
        },
      });

      // Adicionar resultado do Look Criativo
      allResults.push({ creative: creativeResult });

      // Upload das imagens e criar looks
      const uploadTimestamp = Date.now();
      
      async function uploadImageIfNeeded(
        dataUrl: string,
        type: string,
        index = 0
      ): Promise<string> {
        if (!bucket || !dataUrl?.startsWith("data:")) {
          return dataUrl;
        }

        try {
          const match = /^data:(.+?);base64,(.+)$/.exec(dataUrl);
          if (!match) {
            throw new Error("Formato base64 inválido");
          }
          const contentType = match[1];
          const base64Data = match[2];
          const buffer = Buffer.from(base64Data, "base64");
          const extension =
            contentType?.split("/")[1]?.split(";")[0] || "png";

          const filePath = `lojas/${lojistaId}/composicoes/${uploadTimestamp}/${type}-${index}-${randomUUID()}.${extension}`;
          const token = randomUUID();

          const file = bucket.file(filePath);
          await file.save(buffer, {
            metadata: {
              contentType,
              metadata: {
                firebaseStorageDownloadTokens: token,
              },
            },
            resumable: false,
          });

          await file.makePublic();
          const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
            filePath
          )}?alt=media&token=${token}`;
          return publicUrl;
        } catch (error) {
          console.error("[API] Falha ao subir imagem para Storage:", error);
          return dataUrl;
        }
      }

      // Look Criativo - usar a imagem gerada pelo Gemini 2.5 Flash
      const creativeImageUrl = creativeResult.tryonImageUrl 
        ? await uploadImageIfNeeded(creativeResult.tryonImageUrl, "creative-gemini", 0)
        : "";

      allLooks.push({
        id: `look-criativo-${Date.now()}`,
        titulo: "Look Criativo IA",
        descricao: `Versão criativa gerada por IA usando ${primaryProduct.nome} e ${allProductImageUrls.length > 1 ? `${allProductImageUrls.length - 1} outro(s) produto(s)` : 'produtos selecionados'}. O produto foi combinado com um cenário personalizado para destacar seu estilo.`,
        imagemUrl: creativeImageUrl,
        produtoNome: primaryProduct.nome,
        produtoPreco: primaryProduct.preco,
        watermarkText: "Valor sujeito a alteração. Imagem com marca d'água.",
        desativado: !creativeImageUrl, // Desativado apenas se não houver imagem
      });

      console.log("[API] Look Criativo gerado com sucesso:", {
        creative: creativeImageUrl ? creativeImageUrl.substring(0, 50) + "..." : "❌ ERRO",
        totalLooks: allLooks.length,
      });

    } catch (error) {
      console.error(`[API] Erro ao gerar composição:`, error);
      
      // Tratamento específico para erro 429 (Rate Limit)
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      let userFriendlyMessage = "Erro ao gerar composição";
      let statusCode = 500;
      
      if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
        userFriendlyMessage = "Limite de requisições atingido. Por favor, aguarde alguns instantes e tente novamente.";
        statusCode = 429;
      } else if (errorMessage.includes("Resource exhausted")) {
        userFriendlyMessage = "Recursos temporariamente esgotados. Por favor, tente novamente em alguns minutos.";
        statusCode = 429;
      }
      
      return applyCors(
        request,
        NextResponse.json(
          {
            error: userFriendlyMessage,
            details: errorMessage,
          },
          { status: statusCode }
        )
      );
    }

    // Se não gerou nenhum look, retornar erro
    if (allLooks.length === 0) {
      return applyCors(
        request,
        NextResponse.json(
          { error: "Não foi possível gerar os looks" },
          { status: 500 }
        )
      );
    }

    // Calcular custo total (apenas Look Criativo com Gemini)
    const totalCost = allResults.reduce((sum, r) => {
      return sum + (r.creative?.totalCost || 0);
    }, 0);
    
    // Custo do Look Criativo (Gemini Flash Image)
    const creativeCost = totalCost;

    const usdToBrlRate = await fetchUsdToBrlRate();
    const totalCostBRL = Number((totalCost * usdToBrlRate).toFixed(2));
    const creativeCostBRL = Number((creativeCost * usdToBrlRate).toFixed(2));
    
    // Calcular tempo de processamento total
    const processingTime = Date.now() - startTime; // em milissegundos

    console.log("[API] Composição finalizada:", {
      looksCount: allLooks.length,
      totalCost,
      totalCostBRL,
      primaryProduct: primaryProduct.nome,
    });

    // Salvar composição no Firestore
    let composicaoId: string | null = null;
    try {
      composicaoId = randomUUID();
      const composicaoData = {
        id: composicaoId,
        lojistaId,
        customerId: customerId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        looks: allLooks.map((look) => ({
          id: look.id,
          titulo: look.titulo,
          descricao: look.descricao,
          imagemUrl: look.imagemUrl,
          produtoNome: look.produtoNome,
          produtoPreco: look.produtoPreco,
          watermarkText: look.watermarkText,
        })),
        produtos: productIds.length > 0 
          ? productIds.map((id) => ({ id, nome: primaryProduct.nome }))
          : productUrl 
          ? [{ url: productUrl, nome: primaryProduct.nome }]
          : [],
        productUrl: productUrl || null,
        primaryProductId: primaryProduct.id,
        primaryProductName: primaryProduct.nome,
        totalCost,
        totalCostBRL,
        exchangeRate: usdToBrlRate,
        processingTime, // Tempo de processamento em milissegundos
        creativeCost, // Custo do Look Criativo em USD
        creativeCostBRL, // Custo do Look Criativo em BRL
        curtido: false,
        compartilhado: false,
      };

      await db
        .collection("lojas")
        .doc(lojistaId)
        .collection("composicoes")
        .doc(composicaoId)
        .set(composicaoData);

      console.log("[API] Composição salva no Firestore:", composicaoId);

      // Atualizar estatísticas do cliente se houver customerId
      // Agora conta TODAS as composições geradas, não apenas as com like
      if (customerId) {
        try {
          const { updateClienteComposicoesStats } = await import("@/lib/firestore/server");
          // Atualizar estatísticas imediatamente após gerar composição
          await updateClienteComposicoesStats(lojistaId, customerId);
        } catch (updateError) {
          console.error("[API] Erro ao atualizar estatísticas:", updateError);
          // Não falhar a requisição se a atualização falhar
        }
      }
    } catch (firestoreError) {
      console.error("[API] Erro ao salvar composição no Firestore:", firestoreError);
      // Não falhar a requisição se o Firestore falhar, apenas logar o erro
    }

    // Retornar no formato esperado pelo frontend (apenas 1 look criativo)
    return applyCors(
      request,
      NextResponse.json({
        success: true,
        composicaoId,
        looks: allLooks, // Apenas 1 look: Criativo
        totalCost,
        totalCostBRL,
        exchangeRate: usdToBrlRate,
        productsProcessed: allProductImageUrls.length, // Total de produtos processados
        primaryProductId: primaryProduct.id,
        primaryProductName: primaryProduct.nome,
      })
    );
  } catch (error) {
    console.error("[API] Erro ao gerar composição:", error);
    
    // Tratamento específico para erro 429 (Rate Limit)
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    let userFriendlyMessage = "Erro ao gerar composição";
    let statusCode = 500;
    
    if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
      userFriendlyMessage = "Limite de requisições atingido. Por favor, aguarde alguns instantes e tente novamente.";
      statusCode = 429;
    } else if (errorMessage.includes("Resource exhausted")) {
      userFriendlyMessage = "Recursos temporariamente esgotados. Por favor, tente novamente em alguns minutos.";
      statusCode = 429;
    }

    return applyCors(
      request,
      NextResponse.json(
        {
          error: userFriendlyMessage,
          details: errorMessage,
        },
        { status: statusCode }
      )
    );
  }
}

/**
 * GET - Estima o custo de uma composição
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sceneCount = parseInt(searchParams.get("sceneCount") || "2");
    const quality = (searchParams.get("quality") || "high") as
      | "low"
      | "medium"
      | "high";

    const orchestrator = getCompositionOrchestrator();
    const estimatedCost = orchestrator.estimateCost({
      includeTryOn: true,
      sceneCount,
      quality,
    });

    return applyCors(
      request,
      NextResponse.json({
        estimatedCost,
        currency: "USD",
        breakdown: {
          tryon: orchestrator.estimateCost({
            includeTryOn: true,
            sceneCount: 0,
            quality,
          }),
          scenes:
            orchestrator.estimateCost({ includeTryOn: false, sceneCount, quality }) -
            orchestrator.estimateCost({ includeTryOn: false, sceneCount: 0, quality }),
        },
      })
    );
  } catch (error) {
    console.error("[API] Erro ao estimar custo:", error);

    return applyCors(
      request,
      NextResponse.json(
        {
          error: "Erro ao estimar custo",
          details: error instanceof Error ? error.message : "Erro desconhecido",
        },
        { status: 500 }
      )
    );
  }
}
