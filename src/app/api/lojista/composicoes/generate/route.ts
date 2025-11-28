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
import { logError } from "@/lib/logger";

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
  
  // PHASE 12 FIX: Declarar variáveis fora do try para acesso no catch
  let personImageUrl: string | null = null;
  let productIds: string[] = [];
  let productUrl: string | null = null; // URL do produto (link)
  let lojistaId: string | null = null;
  let customerId: string | null = null;
  let scenePrompts: string[] | null = null;
  let options: any = null;
  
  try {
    // Verificar se é FormData ou JSON pelo content-type
    const contentType = request.headers.get("content-type") || "";
    const isFormData = contentType.includes("multipart/form-data");

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
      
      // PHASE 13: Source of Truth - Sempre priorizar original_photo_url
      // Se original_photo_url for fornecido, usar ele. Caso contrário, usar personImageUrl.
      // IMPORTANTE: Ignorar qualquer "previous_image" ou imagem gerada anteriormente
      const originalPhotoUrl = body.original_photo_url || body.personImageUrl;
      
      // PHASE 13: Validar que não estamos usando uma imagem gerada anteriormente
      // Se a URL contiver indicadores de imagem gerada (ex: "composicoes/", "generated-"), logar aviso
      if (originalPhotoUrl && (
        originalPhotoUrl.includes("/composicoes/") || 
        originalPhotoUrl.includes("generated-") ||
        originalPhotoUrl.includes("look-")
      )) {
        console.warn("[API] ⚠️ PHASE 13: ATENÇÃO - URL pode ser de imagem gerada, mas será usada como original:", {
          url: originalPhotoUrl.substring(0, 100) + "...",
          motivo: "URL contém indicadores de imagem gerada",
        });
      }
      
      personImageUrl = originalPhotoUrl; // PHASE 13: Sempre usar original_photo_url se fornecido
      productIds = body.productId ? [body.productId] : body.productIds || [];
      lojistaId = body.lojistaId;
      customerId = body.customerId || null;
      scenePrompts = body.scenePrompts || null;
      options = body.options || null;
    }

    console.log("[API] PHASE 13: Parâmetros recebidos (Source of Truth - Foto Original):", {
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
        
        return applyCors(
          request,
          NextResponse.json(
            {
              error: "Nenhuma imagem de produto válida encontrada",
              details: "Verifique se todos os produtos selecionados têm imagem cadastrada (imagemUrl ou productUrl).",
              produtosAnalisados: productsData.map(p => ({
                id: p.id,
                nome: p.nome,
                temImagem: !!(p?.productUrl || p?.imagemUrl),
              })),
            },
            { status: 400 }
          )
        );
      }
      
      // Aviso se algum produto não tem imagem
      if (produtosSemImagem.length > 0) {
        console.warn("[API] ⚠️ ATENÇÃO: Alguns produtos não têm imagem válida e serão ignorados:", {
          produtosIgnorados: produtosSemImagem.map(p => p.nome),
          totalIgnorados: produtosSemImagem.length,
          totalIncluidos: allProductImageUrls.length,
        });
      }
      
      // PHASE 11-B FIX: Smart Framing - Detectar categoria de TODOS os produtos
      // Se QUALQUER produto for calçado, forçar full body (previne "cut legs" bug)
      // Se APENAS acessórios (sem calçados), forçar portrait
      const allCategories = productsData.map(p => (p?.categoria || "").toLowerCase());
      const hasShoes = allCategories.some(cat => 
        cat.includes("calçado") || cat.includes("calcado") || 
        cat.includes("sapato") || cat.includes("tênis") || 
        cat.includes("tenis") || cat.includes("shoe") || 
        cat.includes("footwear")
      );
      const hasOnlyAccessories = allCategories.length > 0 && 
        allCategories.every(cat => 
          cat.includes("acessório") || cat.includes("acessorio") ||
          cat.includes("óculos") || cat.includes("oculos") ||
          cat.includes("joia") || cat.includes("relógio") ||
          cat.includes("relogio") || cat.includes("glasses") ||
          cat.includes("jewelry")
        ) && !hasShoes;
      
      // PHASE 11-B: Determinar categoria para o prompt (priorizar calçados > roupas > acessórios)
      // CRÍTICO: Se tem calçado, SEMPRE forçar "Calçados" para garantir full body
      let productCategoryForPrompt = primaryProduct?.categoria || "";
      if (hasShoes) {
        productCategoryForPrompt = "Calçados";
        console.log("[API] 🦶 PHASE 11-B Smart Framing: Detectado calçado(s) - FORÇANDO full body shot para prevenir 'cut legs'");
      } else if (hasOnlyAccessories) {
        productCategoryForPrompt = "Acessórios/Óculos/Joias";
        console.log("[API] 👓 PHASE 11-B Smart Framing: Apenas acessórios detectados - Forçando portrait shot");
      } else {
        productCategoryForPrompt = "Roupas";
        console.log("[API] 👕 PHASE 11-B Smart Framing: Roupas detectadas - Usando shot médio");
      }
      
      // PHASE 11-B: Log detalhado dos produtos para debug
      console.log("[API] 📊 PHASE 11-B: Resumo de produtos para geração:", {
        totalProdutos: productsData.length,
        produtos: productsData.map(p => ({
          id: p.id,
          nome: p.nome,
          categoria: p.categoria || "N/A",
          temImagem: !!(p?.productUrl || p?.imagemUrl),
        })),
        smartFraming: {
          hasShoes,
          hasOnlyAccessories,
          productCategoryForPrompt,
        },
        totalImagensProdutos: allProductImageUrls.length,
      });
      
      // PHASE 14: Detectar se é um remix (tem scenePrompts customizado)
      const isRemix = scenePrompts && scenePrompts.length > 0 && 
                     scenePrompts[0].includes("harmonious outfit combination");
      
      // PHASE 14 FIX: Usar TODAS as imagens de produtos (não apenas a primeira)
      // O orquestrador já está preparado para receber allProductImageUrls
      const creativeResult = await orchestrator.createComposition({
        personImageUrl, // PHASE 14: Sempre a foto ORIGINAL (Source of Truth)
        productId: primaryProduct.id, // ID do produto principal (para compatibilidade)
        productImageUrl: finalProductImageUrl, // URL do produto principal (para compatibilidade)
        lojistaId,
        customerId: customerId || undefined,
        productName: productsData.map(p => p.nome).join(" + "), // PHASE 14: Nome combinado de todos os produtos
        productPrice: productsData.reduce((sum, p) => sum + (p.preco || 0), 0)
          ? `R$ ${productsData.reduce((sum, p) => sum + (p.preco || 0), 0).toFixed(2)}`
          : undefined,
        storeName: lojaData?.nome || "Minha Loja",
        logoUrl: lojaData?.logoUrl,
        scenePrompts: scenePrompts || [], // PHASE 14: Usar scenePrompts se fornecido (para Remix)
        options: {
          quality: options?.quality || "high",
          skipWatermark: options?.skipWatermark !== false, // Respeitar opção do frontend
          productUrl: primaryProduct.productUrl || undefined,
          lookType: options?.lookType || "creative", // PHASE 14: Respeitar lookType (creative para multi-produto)
          allProductImageUrls: allProductImageUrls, // PHASE 14: TODAS as imagens de produtos (crítico para multi-produto)
          productCategory: productCategoryForPrompt, // PHASE 14: Categoria determinada por Smart Framing (previne "cut legs")
          gerarNovoLook: options?.gerarNovoLook || isRemix, // PHASE 14: Ativar flag se for remix ou se explicitamente solicitado
        },
      });
      
      if (isRemix || options?.gerarNovoLook) {
        console.log("[API] 🎨 PHASE 14: Flag 'GERAR NOVO LOOK' ativada - Permitindo mudança de pose");
      }

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
      let creativeImageUrl = "";
      
      if (creativeResult.tryonImageUrl) {
        console.log("[API] 📸 Processando imagem gerada pelo Gemini:", {
          tipo: creativeResult.tryonImageUrl.startsWith("data:") ? "data URL (base64)" : "URL HTTP",
          tamanho: creativeResult.tryonImageUrl.length,
          preview: creativeResult.tryonImageUrl.substring(0, 100) + "...",
        });
        
        try {
          creativeImageUrl = await uploadImageIfNeeded(creativeResult.tryonImageUrl, "creative-gemini", 0);
          
          // PHASE 13: Validar que a URL final é válida
          if (!creativeImageUrl || creativeImageUrl.trim() === "") {
            console.error("[API] ❌ ERRO: creativeImageUrl está vazia após uploadImageIfNeeded");
            throw new Error("URL da imagem gerada está vazia");
          }
          
          if (!creativeImageUrl.startsWith("http://") && !creativeImageUrl.startsWith("https://") && !creativeImageUrl.startsWith("data:")) {
            console.error("[API] ❌ ERRO: creativeImageUrl não é uma URL válida:", creativeImageUrl);
            throw new Error(`URL da imagem inválida: ${creativeImageUrl.substring(0, 100)}`);
          }
          
          console.log("[API] ✅ Imagem processada com sucesso:", {
            url: creativeImageUrl.substring(0, 100) + "...",
            tipo: creativeImageUrl.startsWith("data:") ? "data URL" : "URL HTTP",
            valida: true,
          });
        } catch (uploadError) {
          console.error("[API] ❌ ERRO ao processar imagem gerada:", uploadError);
          // Se falhar, tentar usar a URL original (pode ser uma URL HTTP válida)
          if (creativeResult.tryonImageUrl.startsWith("http://") || creativeResult.tryonImageUrl.startsWith("https://")) {
            creativeImageUrl = creativeResult.tryonImageUrl;
            console.log("[API] ⚠️ Usando URL original (HTTP) como fallback:", creativeImageUrl.substring(0, 100) + "...");
          } else {
            throw new Error(`Falha ao processar imagem: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
          }
        }
      } else {
        console.error("[API] ❌ ERRO: creativeResult.tryonImageUrl está vazio ou undefined");
      }

      // PHASE 13: Validar novamente antes de adicionar ao array
      if (!creativeImageUrl || creativeImageUrl.trim() === "") {
        throw new Error("Não foi possível obter URL válida da imagem gerada");
      }

      allLooks.push({
        id: `look-criativo-${Date.now()}`,
        titulo: "Look Criativo IA",
        descricao: `Versão criativa gerada por IA usando ${primaryProduct.nome} e ${allProductImageUrls.length > 1 ? `${allProductImageUrls.length - 1} outro(s) produto(s)` : 'produtos selecionados'}. O produto foi combinado com um cenário personalizado para destacar seu estilo.`,
        imagemUrl: creativeImageUrl, // PHASE 13: URL validada
        produtoNome: primaryProduct.nome,
        produtoPreco: primaryProduct.preco,
        watermarkText: "Valor sujeito a alteração. Imagem com marca d'água.",
        desativado: false, // PHASE 13: Sempre ativado se chegou até aqui (URL validada)
        compositionId: creativeResult.compositionId || `comp_${Date.now()}`,
      });

      console.log("[API] ✅ Look Criativo gerado e validado com sucesso:", {
        imagemUrl: creativeImageUrl.substring(0, 100) + "...",
        totalLooks: allLooks.length,
        compositionId: allLooks[allLooks.length - 1].compositionId,
      });

    } catch (error) {
      console.error(`[API] Erro ao gerar composição:`, error);
      
      // PHASE 12: Logar erro crítico no Firestore
      await logError(
        "AI Generation API",
        error instanceof Error ? error : new Error(String(error)),
        {
          storeId: lojistaId,
          errorType: "AIGenerationError",
          customerId: customerId || null,
          productIds: productIds,
        }
      ).catch(err => console.error("[API] Erro ao salvar log:", err));
      
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

    // PHASE 13: Validar que todos os looks têm URLs válidas
    const validLooks = allLooks.filter((look) => {
      const hasValidUrl = look.imagemUrl && 
                         look.imagemUrl.trim() !== "" && 
                         (look.imagemUrl.startsWith("http://") || 
                          look.imagemUrl.startsWith("https://") || 
                          look.imagemUrl.startsWith("data:"));
      
      if (!hasValidUrl) {
        console.error("[API] ⚠️ Look sem URL válida será filtrado:", {
          id: look.id,
          titulo: look.titulo,
          imagemUrl: look.imagemUrl || "VAZIA",
        });
      }
      
      return hasValidUrl;
    });
    
    // Se não gerou nenhum look válido, retornar erro
    if (validLooks.length === 0) {
      console.error("[API] ❌ ERRO: Nenhum look válido gerado. Looks originais:", allLooks.map(l => ({
        id: l.id,
        titulo: l.titulo,
        imagemUrl: l.imagemUrl ? l.imagemUrl.substring(0, 50) + "..." : "VAZIA",
      })));
      
      return applyCors(
        request,
        NextResponse.json(
          { 
            error: "Não foi possível gerar os looks",
            details: "Nenhuma imagem válida foi gerada. Verifique os logs do servidor.",
          },
          { status: 500 }
        )
      );
    }
    
    // Se alguns looks foram filtrados, logar aviso
    if (validLooks.length < allLooks.length) {
      console.warn("[API] ⚠️ Alguns looks foram filtrados por URL inválida:", {
        totalGerados: allLooks.length,
        validos: validLooks.length,
        filtrados: allLooks.length - validLooks.length,
      });
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

    console.log("[API] PHASE 13: Composição finalizada e validada:", {
      looksCount: validLooks.length,
      looksGerados: allLooks.length,
      looksFiltrados: allLooks.length - validLooks.length,
      totalCost,
      totalCostBRL,
      primaryProduct: primaryProduct.nome,
      looksUrls: validLooks.map(l => ({
        id: l.id,
        url: l.imagemUrl?.substring(0, 80) + "...",
        valida: !!(l.imagemUrl && l.imagemUrl.trim() !== ""),
      })),
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
        looks: validLooks.map((look) => ({
          id: look.id,
          titulo: look.titulo,
          descricao: look.descricao,
          imagemUrl: look.imagemUrl, // PHASE 13: URL já validada
          produtoNome: look.produtoNome,
          produtoPreco: look.produtoPreco,
          watermarkText: look.watermarkText,
          compositionId: look.compositionId,
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
        looks: validLooks, // PHASE 13: Apenas looks com URLs válidas
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
    console.error("[API] Stack trace:", error instanceof Error ? error.stack : "N/A");
    console.error("[API] Tipo do erro:", typeof error);
    console.error("[API] Nome do erro:", error instanceof Error ? error.name : "N/A");
    
    // PHASE 12: Logar erro crítico no Firestore
    await logError(
      "AI Generation API (Outer Catch)",
      error instanceof Error ? error : new Error(String(error)),
      {
        storeId: lojistaId || "unknown",
        errorType: "AIGenerationError",
        customerId: customerId || null,
        productIds: productIds || [],
      }
    ).catch(err => console.error("[API] Erro ao salvar log:", err));
    
    // Tratamento específico para diferentes tipos de erro
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    let userFriendlyMessage = "Erro ao gerar composição";
    let statusCode = 500;
    let details = errorMessage;
    
    // Erro 429 - Rate Limit
    if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("Resource exhausted")) {
      userFriendlyMessage = "Limite de requisições atingido. Por favor, aguarde alguns instantes e tente novamente.";
      statusCode = 429;
      details = "O serviço de IA está temporariamente sobrecarregado. Aguarde alguns minutos antes de tentar novamente.";
    }
    // Erro de validação de imagens
    else if (errorMessage.includes("imagem de produto") || errorMessage.includes("Nenhuma imagem")) {
      userFriendlyMessage = "Nenhuma imagem de produto válida encontrada";
      statusCode = 400;
      details = "Verifique se todos os produtos selecionados têm imagem cadastrada.";
    }
    // Erro de personImageUrl
    else if (errorMessage.includes("personImageUrl") || errorMessage.includes("foto")) {
      userFriendlyMessage = "Foto da pessoa inválida ou não fornecida";
      statusCode = 400;
      details = "É necessário fornecer uma foto válida da pessoa para gerar o look.";
    }
    // Erro de timeout
    else if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
      userFriendlyMessage = "Timeout ao gerar composição";
      statusCode = 504;
      details = "O processo está demorando mais que o esperado. Tente novamente.";
    }
    // Erro de conexão
    else if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("fetch failed") || errorMessage.includes("network")) {
      userFriendlyMessage = "Erro de conexão com o serviço de IA";
      statusCode = 503;
      details = "Não foi possível conectar ao serviço de geração de imagens. Tente novamente em alguns instantes.";
    }
    // Erro genérico - mostrar mais detalhes em desenvolvimento
    else {
      details = process.env.NODE_ENV === 'development' 
        ? `${errorName}: ${errorMessage}` 
        : "Erro interno ao processar a requisição. Tente novamente.";
    }

    return applyCors(
      request,
      NextResponse.json(
        {
          error: userFriendlyMessage,
          details: details,
          ...(process.env.NODE_ENV === 'development' && {
            originalError: errorMessage,
            errorName: errorName,
            stack: error instanceof Error ? error.stack : undefined,
          }),
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
