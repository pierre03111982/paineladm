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
// REMOVIDO: findScenarioByProductTags - sempre usar getSmartScenario
import { reserveCredit, rollbackCredit } from "@/lib/financials";
import { FieldValue } from "firebase-admin/firestore";
import { saveGeneration } from "@/lib/firestore/generations";

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
  let customerName: string | null = null;
  let scenePrompts: string[] | null = null;
  let options: any = null;
  // PHASE 26: Declarar variáveis de cenário fora do bloco if/else
  // MASTER PROMPT PIVOT: scenarioImageUrl sempre undefined (não usar como imagem)
  let scenarioImageUrl: string | null | undefined = undefined;
  let scenarioLightingPrompt: string | null | undefined = undefined;
  let scenarioCategory: string | null | undefined = undefined;
  let scenarioInstructions: string | null | undefined = undefined;
  // Variáveis de reserva de crédito (para rollback em caso de erro)
  let reservationResult: Awaited<ReturnType<typeof reserveCredit>> | undefined;
  let reservationId: string | undefined;
  
  try {
    // ============================================
    // 1. LEITURA INTELIGENTE (FormData vs JSON)
    // ============================================
    let body: any = {};
    let rawProducts: any[] = [];
    let formData: FormData | null = null;
    let isFormData = false;
    let formDataEntries: any = null; // Declarar no escopo correto
    
    // Tenta ler como FormData primeiro (Provável, pois tem upload de imagem)
    try {
      formData = await request.formData();
      isFormData = true;
      body = Object.fromEntries(formData.entries());
      
      // Extrai produtos de string JSON dentro do FormData
      const productsString = formData.get("products") || 
                            formData.get("produtos") || 
                            formData.get("selectedProducts") || 
                            formData.get("itens") ||
                            formData.get("items") ||
                            "[]";
      
      if (typeof productsString === 'string') {
        try {
          rawProducts = JSON.parse(productsString);
          console.log("📦 [DEBUG] Produtos extraídos via FormData:", rawProducts.length);
          console.log("📦 [DEBUG] Produtos brutos:", JSON.stringify(rawProducts, null, 2));
        } catch (e) {
          console.error("❌ [ERRO] Erro ao fazer parse dos produtos do FormData:", e);
          console.error("❌ [ERRO] String recebida:", productsString.substring(0, 200));
          rawProducts = [];
        }
      } else if (Array.isArray(productsString)) {
        rawProducts = productsString;
        console.log("📦 [DEBUG] Produtos já são array no FormData:", rawProducts.length);
      }
      
      console.log("✅ [LEITURA INTELIGENTE] FormData detectado e processado");
    } catch (formDataError) {
      // Se falhar, tenta ler como JSON clássico
      console.log("⚠️ [LEITURA INTELIGENTE] FormData falhou, tentando JSON...");
      try {
        body = await request.json();
        rawProducts = body.products || body.produtos || body.selectedProducts || body.itens || body.items || [];
        console.log("📦 [DEBUG] Produtos extraídos via JSON:", rawProducts.length);
        console.log("✅ [LEITURA INTELIGENTE] JSON detectado e processado");
      } catch (jsonError) {
        console.error("❌ [CRÍTICO] Falha total ao ler Body da requisição.");
        console.error("❌ [CRÍTICO] Erro:", jsonError);
        return applyCors(
          request,
          NextResponse.json(
            { error: "Erro ao processar requisição. Verifique o formato dos dados." },
            { status: 400 }
          )
        );
      }
    }
    
    // ============================================
    // 2. NORMALIZA OS PRODUTOS (Proteção contra nulos)
    // ============================================
    const produtosParaSalvar = Array.isArray(rawProducts) ? rawProducts.map((p: any) => ({
      id: p.id || p.productId || `prod-${Date.now()}-${Math.random()}`,
      nome: p.nome || p.name || "Produto Sem Nome",
      preco: Number(p.preco || p.price || 0),
      imagemUrl: p.imagemUrl || p.image || null,
      categoria: p.categoria || p.category || null,
      tamanhos: Array.isArray(p.tamanhos) ? p.tamanhos : (p.tamanho ? [p.tamanho] : ["Único"]),
      cores: Array.isArray(p.cores) ? p.cores : (p.cor ? [p.cor] : []),
      medidas: p.medidas || p.medida || null,
      desconto: p.desconto || 0,
      descricao: p.descricao || p.description || null,
      // Garante que campos extras não quebrem o banco
      ...p
    })) : [];
    
    const productIdsParaSalvar = produtosParaSalvar.map((p: any) => p.id);
    
    console.log("✅ [NORMALIZAÇÃO] Produtos normalizados:", {
      total: produtosParaSalvar.length,
      produtos: produtosParaSalvar.map((p: any) => ({
        id: p.id,
        nome: p.nome,
        preco: p.preco,
        temImagemUrl: !!p.imagemUrl,
      })),
      productIds: productIdsParaSalvar,
    });
    
    // ============================================
    // CONTINUAÇÃO: Processar FormData ou JSON
    // ============================================
    let payloadRecebido: any = null;
    let rawBodyData: any = body;
    
    if (isFormData && formData) {
      // FormData já foi lido acima - usar produtos normalizados
      formDataEntries = {};
      for (const [key, value] of formData.entries()) {
        if (key === 'products' || key === 'productIds') {
          try {
            formDataEntries[key] = JSON.parse(value as string);
          } catch {
            formDataEntries[key] = value;
          }
        } else {
          formDataEntries[key] = value;
        }
      }
      
      console.log("[API] 📦 FormData processado:", {
        produtosNormalizados: produtosParaSalvar.length,
        productIdsNormalizados: productIdsParaSalvar.length,
        lojistaId: formDataEntries.lojistaId,
        customerId: formDataEntries.customerId,
        customerName: formDataEntries.customerName,
      });
      
      payloadRecebido = {
        type: "FormData",
        products: produtosParaSalvar,
        productIds: productIdsParaSalvar,
        temProducts: produtosParaSalvar.length > 0,
        temProductIds: productIdsParaSalvar.length > 0,
      };
      
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

      // ============================================
      // DEBUG: Log do FormData recebido
      // ============================================
      console.log("[API] 📦 FormData completo recebido:", {
        temProdutos: !!produtosJson,
        produtosJson: produtosJson ? (produtosJson.length > 200 ? produtosJson.substring(0, 200) + "..." : produtosJson) : null,
        lojistaId: formData.get("lojistaId"),
        customerId: formData.get("customerId"),
        customerName: formData.get("customerName"),
        temPhoto: !!photo,
        photoName: photo?.name,
        photoSize: photo?.size,
        temProductUrl: !!formData.get("productUrl"),
        productUrl: formData.get("productUrl"),
      });

      // Parse produtos
      if (produtosJson) {
        try {
          const produtosParsed = JSON.parse(produtosJson);
          productIds = Array.isArray(produtosParsed) ? produtosParsed : [produtosParsed];
          console.log("[API] 📦 Produtos parseados do FormData:", {
            total: productIds.length,
            productIds: productIds,
          });
        } catch {
          productIds = [produtosJson];
          console.warn("[API] ⚠️ Erro ao parsear produtos, usando como string única");
        }
      } else {
        console.warn("[API] ⚠️ FormData não contém campo 'produtos'");
      }

      // Obter URL do produto se fornecida
      productUrl = (formData.get("productUrl") as string) || null;

      customerId = (formData.get("customerId") as string) || null;
      customerName = (formData.get("customerName") as string) || null;
    } else {
      // JSON (compatibilidade com chamadas antigas)
      const body = await request.json();
      rawBodyData = body;
      
      // ============================================
      // PASSO 2: COLETOR UNIVERSAL DE PRODUTOS (BLOCO BLINDADO)
      // ============================================
      // 1. Tenta pegar produtos de QUALQUER lugar possível
      rawProducts = body.products || body.produtos || body.selectedProducts || body.itens || body.items || [];
      
      console.log("🔍 [DEBUG SUPREMO] Produtos Recebidos Brutos:", JSON.stringify(rawProducts, null, 2));
      console.log("🔍 [DEBUG SUPREMO] Chaves disponíveis no body:", Object.keys(body));
      
      // 2. Normaliza os dados (Garante que sempre teremos um array válido)
      const produtosParaSalvar = Array.isArray(rawProducts) ? rawProducts.map((p: any) => ({
        id: p.id || p.productId || `prod-${Date.now()}-${Math.random()}`,
        nome: p.nome || p.name || p.title || "Produto Identificado",
        preco: Number(p.preco || p.price || p.valor || 0),
        imagemUrl: p.imagemUrl || p.image || p.img || p.url || null,
        categoria: p.categoria || p.category || null,
        tamanhos: Array.isArray(p.tamanhos) ? p.tamanhos : (p.tamanho ? [p.tamanho] : ["Único"]),
        cores: Array.isArray(p.cores) ? p.cores : (p.cor ? [p.cor] : []),
        medidas: p.medidas || p.medida || null,
        desconto: p.desconto || 0,
        descricao: p.descricao || p.description || null,
        // Mantém outros campos se existirem
        ...p
      })) : [];
      
      // 3. Gera os IDs
      const productIdsParaSalvar = produtosParaSalvar.map((p: any) => p.id);
      
      if (produtosParaSalvar.length === 0) {
        console.warn("⚠️ [ALERTA] Nenhum produto identificado no payload! O Frontend enviou:", Object.keys(body));
      } else {
        console.log("✅ [COLETOR UNIVERSAL] Produtos coletados e normalizados:", {
          total: produtosParaSalvar.length,
          produtos: produtosParaSalvar.map((p: any) => ({
            id: p.id,
            nome: p.nome,
            preco: p.preco,
            temImagemUrl: !!p.imagemUrl,
          })),
          productIds: productIdsParaSalvar,
        });
      }
      
      // ============================================
      // PASSO 1: DEBUG DA CHEGADA DE DADOS (LOG OBRIGATÓRIO)
      // ============================================
      console.log("🔥 [DEBUG CRÍTICO] Payload do Frontend:", JSON.stringify({
        products: body.products || null,
        selectedProducts: body.selectedProducts || null,
        productIds: body.productIds || null,
        produtos: body.produtos || null,
        produtosColetados: produtosParaSalvar.length,
      }, null, 2));
      
      // ============================================
      // DEBUG: Log completo do body recebido
      // ============================================
      payloadRecebido = {
        type: "JSON",
        body: body,
        temProducts: !!body.products,
        products: body.products,
        temSelectedProducts: !!body.selectedProducts,
        selectedProducts: body.selectedProducts,
        temProductIds: !!body.productIds,
        productIds: body.productIds,
      };
      
      console.log("[API] 📦 PAYLOAD RECEBIDO:", payloadRecebido);
      console.log("[API] 📦 Body completo recebido:", {
        temProducts: !!body.products,
        productsLength: Array.isArray(body.products) ? body.products.length : "NÃO É ARRAY",
        products: Array.isArray(body.products) ? body.products.map((p: any) => ({
          id: p?.id,
          nome: p?.nome || p?.name,
          preco: p?.preco || p?.price,
          temImagem: !!(p?.imagemUrl || p?.imageUrl),
        })) : body.products,
        temProductIds: !!body.productIds,
        productIdsLength: Array.isArray(body.productIds) ? body.productIds.length : "NÃO É ARRAY",
        productIds: body.productIds,
        lojistaId: body.lojistaId,
        customerId: body.customerId,
        customerName: body.customerName,
        temPersonImage: !!body.personImage,
        temProductUrl: !!body.productUrl,
      });
      
      // PHASE 13: Source of Truth - Sempre priorizar original_photo_url
      // Se original_photo_url for fornecido, usar ele. Caso contrário, usar personImageUrl.
      // IMPORTANTE: Ignorar qualquer "previous_image" ou imagem gerada anteriormente
      let originalPhotoUrl = body.original_photo_url || body.personImageUrl;
      
      // FIX: Rejeitar blob: URLs - devem ser convertidas no frontend antes de enviar
      if (originalPhotoUrl && originalPhotoUrl.startsWith("blob:")) {
        console.error("[API] ❌ blob: URL recebida - o frontend deve converter antes de enviar:", originalPhotoUrl.substring(0, 100));
        return applyCors(
          request,
          NextResponse.json(
            {
              error: "Foto inválida",
              details: "blob: URLs não podem ser processadas. Por favor, faça upload novamente da foto.",
            },
            { status: 400 }
          )
        );
      }
      
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
      customerName = body.customerName || null;
      scenePrompts = body.scenePrompts || null;
      options = body.options || null;
      
      // PHASE 26: Receber dados do cenário (APENAS prompt/categoria, NÃO imagem)
      // MASTER PROMPT PIVOT: scenarioImageUrl sempre undefined - não usar como imagem
      scenarioImageUrl = undefined; // SEMPRE undefined - forçar geração via prompt
      scenarioLightingPrompt = body.scenarioLightingPrompt || null;
      scenarioCategory = body.scenarioCategory || null;
      scenarioInstructions = undefined; // Não usar instruções de imagem fixa
      
      console.log("[API] PHASE 26: Dados do cenário recebidos (TEXTO APENAS):", {
        hasScenarioImage: false, // Sempre false - não usar imagem
        hasLightingPrompt: !!scenarioLightingPrompt,
        category: scenarioCategory || "N/A",
        nota: "Cenário será GERADO via prompt, não usado como input visual",
      });
    }

    // FIX MOBILE: Se personImageUrl for data URL (base64), fazer upload para obter URL HTTP
    // URLs data: não podem ser acessadas diretamente pelo orchestrator, precisam ser convertidas
    if (personImageUrl && personImageUrl.startsWith('data:') && bucket) {
      try {
        console.log("[API] 🔄 Convertendo data URL para URL HTTP...");
        const match = /^data:(.+?);base64,(.+)$/.exec(personImageUrl);
        if (match) {
          const contentType = match[1];
          const base64Data = match[2];
          const buffer = Buffer.from(base64Data, "base64");
          const extension = contentType?.split("/")[1]?.split(";")[0] || "jpg";
          const fileName = `composicoes/${lojistaId}/uploads/${Date.now()}-original.${extension}`;
          const file = bucket.file(fileName);
          
          await file.save(buffer, {
            metadata: {
              contentType,
            },
          });
          
          await file.makePublic();
          personImageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
          console.log("[API] ✅ Data URL convertida para URL HTTP:", personImageUrl.substring(0, 100) + "...");
        }
      } catch (dataUrlError) {
        console.error("[API] ❌ Erro ao converter data URL:", dataUrlError);
        // Continuar com data URL original e deixar o orchestrator lidar
        console.warn("[API] ⚠️ Continuando com data URL original (pode falhar no orchestrator)");
      }
    }

    console.log("[API] PHASE 13: Parâmetros recebidos (Source of Truth - Foto Original):", {
      lojistaId,
      productIdsCount: productIds.length,
      hasPersonImage: !!personImageUrl,
      personImageUrl: personImageUrl ? personImageUrl.substring(0, 100) + "..." : null,
      hasProductUrl: !!productUrl,
      isFormData,
      isDataUrl: personImageUrl?.startsWith('data:') || false,
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


    // ============================================
    // DEBUG: Log do que foi recebido ANTES de processar
    // ============================================
    console.log("[API] 🔍 ========== RECEBIDO NO BACKEND ==========");
    console.log("[API] 📦 productsData (antes de processar):", {
      temBodyProducts: !!body?.products,
      bodyProductsType: Array.isArray(body?.products) ? "ARRAY" : typeof body?.products,
      bodyProductsLength: Array.isArray(body?.products) ? body.products.length : "NÃO É ARRAY",
      bodyProducts: body?.products,
      temFormDataProdutos: isFormData ? !!formData?.get("produtos") : false,
      formDataProdutos: isFormData ? formData?.get("produtos") : null,
      productIds: productIds,
      productIdsLength: productIds.length,
    });
    
    // ============================================
    // TAREFA 3: DEBUG - Log do que foi recebido do frontend
    // ============================================
    console.log("[API] 🔍 DEBUG SAVE - PRODUTOS RECEBIDOS:", {
      temBodyProducts: !!body?.products,
      bodyProductsType: Array.isArray(body?.products) ? "ARRAY" : typeof body?.products,
      bodyProductsLength: Array.isArray(body?.products) ? body.products.length : "NÃO É ARRAY",
      bodyProducts: body?.products,
      temFormDataProdutos: isFormData ? !!formData?.get("produtos") : false,
      formDataProdutos: isFormData ? formData?.get("produtos") : null,
      productIds: productIds,
      productIdsLength: productIds.length,
    });
    
    // ============================================
    // PASSO 2: NORMALIZAÇÃO FORÇADA DOS PRODUTOS
    // ============================================
    // Antes de qualquer lógica de IA, criar variável segura
    // Não confiar na estrutura que vem do frontend
    
    // Adaptar conforme a variável descoberta no log acima
    // Usar a variável rawProducts já declarada no início (linha 99)
    rawProducts = 
      (rawBodyData?.products) || 
      (rawBodyData?.selectedProducts) || 
      (payloadRecebido?.products) || 
      (payloadRecebido?.selectedProducts) || 
      (isFormData && formDataEntries && formDataEntries?.products) ||
      [];
    
    console.log("🔥 [NORMALIZAÇÃO] Raw Products encontrados:", {
      temRawBodyProducts: !!rawBodyData?.products,
      temRawBodySelectedProducts: !!rawBodyData?.selectedProducts,
      temPayloadProducts: !!payloadRecebido?.products,
      temFormDataProducts: !!(isFormData && formDataEntries?.products),
      rawProductsLength: Array.isArray(rawProducts) ? rawProducts.length : "NÃO É ARRAY",
      rawProducts: Array.isArray(rawProducts) ? rawProducts : rawProducts,
    });
    
    // GARANTIA DE DADOS: Mapear para garantir que nada se perca
    const produtosParaSalvarNormalizados = Array.isArray(rawProducts) ? rawProducts.map((p: any) => ({
      id: p.id || `prod-${Date.now()}-${Math.random()}`,
      nome: p.nome || p.name || "Produto Sem Nome",
      preco: Number(p.preco || p.price || 0),
      imagemUrl: p.imagemUrl || p.image || p.imageUrl || p.cover || p.productUrl || null,
      categoria: p.categoria || p.category || null,
      tamanhos: Array.isArray(p.tamanhos) ? p.tamanhos : (p.tamanho ? [p.tamanho] : ["Único"]),
      cores: Array.isArray(p.cores) ? p.cores : (p.cor ? [p.cor] : []),
      medidas: p.medidas || p.medida || null,
      desconto: p.desconto || 0,
      descricao: p.descricao || p.description || null,
    })) : [];
    
    const productIdsParaSalvarNormalizados = produtosParaSalvarNormalizados.map((p: any) => p.id);
    
    console.log("🔥 [NORMALIZAÇÃO] Produtos normalizados:", {
      total: produtosParaSalvarNormalizados.length,
      produtos: produtosParaSalvarNormalizados.map((p: any) => ({
        id: p.id,
        nome: p.nome,
        preco: p.preco,
        temImagemUrl: !!p.imagemUrl,
      })),
      productIds: productIdsParaSalvarNormalizados,
    });
    
    // ============================================
    // ✅ CORREÇÃO CRÍTICA: Usar produtos do payload se disponíveis
    // ============================================
    let productsData: any[] = [];
    
    // PRIORIDADE 1: Se produtos normalizados existem, usar diretamente
    if (produtosParaSalvarNormalizados.length > 0) {
      console.log("[API] ✅ PRODUTOS NORMALIZADOS ENCONTRADOS - USANDO DIRETAMENTE");
      productsData = produtosParaSalvarNormalizados;
      productIds = productIdsParaSalvarNormalizados;
      console.log("[API] 📦 Produtos extraídos do payload normalizado:", {
        total: productsData.length,
        produtos: productsData.map(p => ({
          id: p.id,
          nome: p.nome,
          preco: p.preco,
          temImagemUrl: !!p.imagemUrl,
        })),
      });
    } else if (payloadRecebido?.products && Array.isArray(payloadRecebido.products) && payloadRecebido.products.length > 0) {
      console.log("[API] ✅ PRODUTOS COMPLETOS ENCONTRADOS NO PAYLOAD - USANDO DIRETAMENTE");
      productsData = payloadRecebido.products.map((p: any) => ({
        id: p.id || `prod-${Date.now()}-${Math.random()}`,
        nome: p.nome || p.name || "Produto",
        preco: p.preco !== undefined ? p.preco : (p.price || 0),
        categoria: p.categoria || p.category || null,
        imagemUrl: p.imagemUrl || p.imageUrl || p.productUrl || null,
        tamanhos: Array.isArray(p.tamanhos) ? p.tamanhos : (p.tamanho ? [p.tamanho] : []),
        cores: Array.isArray(p.cores) ? p.cores : (p.cor ? [p.cor] : []),
        medidas: p.medidas || p.medida || null,
        desconto: p.desconto || 0,
        descricao: p.descricao || p.description || null,
      }));
      
      // Atualizar productIds se necessário
      if (productIds.length === 0 && productsData.length > 0) {
        productIds = productsData.map(p => p.id);
        console.log("[API] ✅ ProductIds atualizados a partir dos produtos do payload:", productIds);
      }
      
      console.log("[API] 📦 Produtos extraídos do payload:", {
        total: productsData.length,
        produtos: productsData.map(p => ({
          id: p.id,
          nome: p.nome,
          preco: p.preco,
          temImagemUrl: !!p.imagemUrl,
        })),
      });
    } else if (productUrl && productIds.length === 0) {
      // PRIORIDADE 2: Se productUrl foi fornecido, criar um produto virtual
      console.log("[API] ⚠️ Usando productUrl para criar produto virtual");
      productsData.push({
        id: `url-${Date.now()}`,
        nome: "Produto do Link",
        preco: 0,
        imagemUrl: productUrl,
        categoria: "acessórios",
        productUrl: productUrl, // Guardar a URL original
      });
    } else {
      // PRIORIDADE 3: Buscar produtos do catálogo do Firestore
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
          preco: p.preco,
          temImagem: !!(p?.imagemUrl || p?.productUrl),
        })),
      });
      
      // ============================================
      // DEBUG: Log APÓS processar productsData
      // ============================================
      console.log("[API] 📦 productsData APÓS processar:", {
        total: productsData.length,
        produtos: productsData.map((p: any) => ({
          id: p.id,
          nome: p.nome,
          preco: p.preco,
          temImagemUrl: !!(p.imagemUrl || p.imageUrl || p.productUrl),
          imagemUrl: (p.imagemUrl || p.imageUrl || p.productUrl)?.substring(0, 100),
          categoria: p.categoria,
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

    const scenePrompt = getScenePrompt(primaryProduct?.nome || "Produto", primaryProduct?.categoria || "");

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
      produtoId: primaryProduct?.id || "N/A",
      produtoNome: primaryProduct?.nome || "N/A",
      categoria: primaryProduct?.categoria || "N/A",
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
      
      /**
       * PHASE 20: Master Logic & Behavioral Refinement
       * Detecta o cenário apropriado baseado na categoria do produto
       * Implementa resolução de conflitos e integra os 60 cenários de alta qualidade
       * 
       * REFINAMENTO VISUAL: Usa APENAS o primeiro produto para determinar o cenário
       */
      const getSmartScenario = (products: any[], isRemix: boolean = false): { context: string; forbidden: string[] } => {
        // PHASE 24: Simplified fallback
        let context = "Background: Clean studio";
        let forbidden: string[] = [];

        // REFINAMENTO VISUAL: Usar APENAS o primeiro produto (índice 0) para determinar o cenário
        // Ignorar categorias dos produtos secundários
        if (products.length === 0) {
          console.warn("[API] ⚠️ Nenhum produto fornecido para determinar cenário, usando fallback");
          return { context, forbidden };
        }

        const firstProduct = products[0];
        const firstProductCategory = (firstProduct?.categoria || "").toLowerCase();
        const firstProductName = (firstProduct?.nome || "").toLowerCase();
        const allText = `${firstProductCategory} ${firstProductName}`;

        console.log("[API] 🎯 REFINAMENTO VISUAL: Usando APENAS o primeiro produto para cenário:", {
          primeiroProduto: {
            nome: firstProduct?.nome || "N/A",
            categoria: firstProduct?.categoria || "N/A",
          },
          totalProdutos: products.length,
          nota: "Produtos secundários são ignorados para escolha do cenário"
        });

        // PHASE 20: 60 High-Quality Scenarios
        // PHASE 24: Simplified descriptions (50% reduction) to save token attention for Face
        const beachScenarios = [
          "Background: Sunny tropical beach",
          "Background: Luxury pool deck",
          "Background: Golden hour sand dunes",
          "Background: Tropical garden",
          "Background: Infinity pool at sunset",
          "Background: Wooden pier",
          "Background: Beach bar",
          "Background: Rocky coastline",
          "Background: Yacht deck",
          "Background: Secluded beach",
          "Background: Natural waterfall",
          "Background: Resort pool",
          "Background: Beach at sunset",
          "Background: Modern infinity pool",
          "Background: Natural pool in forest"
        ];

        const urbanScenarios = [
          "Background: Urban street",
          "Background: Minimalist studio",
          "Background: Coffee shop",
          "Background: City park",
          "Background: Industrial loft",
          "Background: Graffiti alleyway",
          "Background: Rooftop terrace",
          "Background: Subway station",
          "Background: Skate park",
          "Background: Neon-lit street"
        ];

        const formalScenarios = [
          "Background: Corporate office",
          "Background: Luxury hotel lobby",
          "Background: Minimalist apartment",
          "Background: Abstract architecture",
          "Background: Classic library",
          "Background: Conference room",
          "Background: Museum gallery",
          "Background: Upscale restaurant",
          "Background: Co-working space",
          "Background: Private jet interior"
        ];

        const partyScenarios = [
          "Background: Red carpet event",
          "Background: Elegant ballroom",
          "Background: Rooftop bar",
          "Background: Luxury mansion",
          "Background: Opera house",
          "Background: Garden party",
          "Background: Champagne bar",
          "Background: VIP club",
          "Background: Wedding reception",
          "Background: Casino"
        ];

        const fitnessScenarios = [
          "Background: Modern gym",
          "Background: Running track",
          "Background: Yoga studio",
          "Background: Urban stairs",
          "Background: Tennis court",
          "Background: Hiking trail",
          "Background: Crossfit box",
          "Background: Pilates studio",
          "Background: Basketball court",
          "Background: Soccer field"
        ];

        const winterScenarios = [
          "Background: Autumn street",
          "Background: Fireplace setting",
          "Background: Cloudy skyline",
          "Background: Snowy mountain",
          "Background: Winter cabin",
          "Background: Foggy forest",
          "Background: Christmas market",
          "Background: Ski resort",
          "Background: Rainy street",
          "Background: Library nook"
        ];

        // PHASE 20: Conflict Resolution Logic
        // Verificar conflitos ANTES de aplicar regras específicas

        // Detectar tipos de produtos
        // PHASE 21 FIX: Melhorar detecção de roupas de banho e moda fitness
        const hasSport = allText.match(/legging|fitness|academia|tênis esportivo|tênis esportivo|sneaker|short corrida|dry fit|sport|atividade física|moda fitness|workout|gym|treino|esportivo/i);
        const hasNonSport = allText.match(/vestido|dress|jeans|alfaiataria|blazer|camisa|saia|skirt|salto|heels|terno|suit|formal/i);
        // PHASE 21 FIX: Detecção mais abrangente de roupas de banho (PRIORIDADE MÁXIMA)
        const hasBeach = allText.match(/biqu|bikini|maiô|maio|sunga|praia|beachwear|saída de praia|swimwear|moda praia|banho|nado|piscina|swim|beach|biquini|biquíni/i);
        const hasWinter = allText.match(/couro|leather|casaco|sobretudo|bota|cachecol|inverno|winter|coat|pérola|veludo|lã|wool|woollen|boot/i);
        const hasFormal = allText.match(/terno|blazer|social|alfaiataria|vestido longo|gravata|suit|formal|festa|gala|paetê|salto alto fino|clutch|vestido de festa|brilho/i);
        const hasCasual = allText.match(/jeans|t-shirt|moletom|tênis casual|jaqueta jeans|casual|street/i);
        const hasParty = allText.match(/festa|gala|paetê|salto alto fino|clutch|vestido de festa|brilho|noite|night|evening/i);
        
        // PHASE 21 FIX: Log detalhado de detecção para debug
        console.log("[API] 🔍 PHASE 21 FIX: Detecção de produtos:", {
          allText: allText.substring(0, 200),
          hasBeach: !!hasBeach,
          hasSport: !!hasSport,
          hasNonSport: !!hasNonSport,
          hasWinter: !!hasWinter,
          hasFormal: !!hasFormal,
          hasCasual: !!hasCasual,
          hasParty: !!hasParty,
          totalProdutos: products.length,
          produtos: products.map(p => ({ nome: p?.nome, categoria: p?.categoria }))
        });

        // REGRA 0: INVERNO/COURO (Prioridade ABSOLUTA - verificar PRIMEIRO)
        if (hasWinter) {
          // PHASE 21 FIX: Sempre sortear aleatoriamente
          const selectedIndex = Math.floor(Math.random() * winterScenarios.length);
          context = winterScenarios[selectedIndex];
          forbidden = [
            "Tropical Beach", "Beach", "Pool", "Swimming pool", "Sunny summer park", 
            "Ocean", "Sand", "Palm trees", "Summer", "Hot weather",
            "Beach resort", "Seaside", "Tropical", "Paradise beach", "Sunny beach", "Beach scene"
          ];
          console.log("[API] 🧥 PHASE 21 FIX: INVERNO/COURO detectado (PRIORIDADE) - PROIBINDO PRAIA (cenário selecionado:", selectedIndex + 1, "de", winterScenarios.length, ")");
          return { context, forbidden };
        }

        // PHASE 21 FIX: REGRA 1 - "BIKINI LAW" (STRICT - Se tem swimwear, DEVE ser Beach/Pool/Cachoeira)
        // PRIORIDADE ABSOLUTA (após inverno) - Se tem roupas de banho, SEMPRE usar cenário aquático
        if (hasBeach) {
          // PHASE 21 FIX: Sempre sortear aleatoriamente dos 15 cenários de praia/piscina/cachoeira
          const selectedIndex = Math.floor(Math.random() * beachScenarios.length);
          context = beachScenarios[selectedIndex];
          forbidden = [
            "Office", "City Street", "Snow", "Gym", "Shopping Mall", "Bedroom",
            "Urban", "Night", "Winter", "Indoor", "Corporate", "Formal",
            "Street", "City", "Urban street", "Busy street", "Neon-lit city",
            "Subway", "Skate park", "Coffee shop", "Rooftop terrace",
            "Fitness center", "Gym", "Academia", "Workout", "Exercise", "Training",
            "Modern fitness center", "Fitness", "Sport", "Athletic", "Running track",
            "Yoga studio", "Crossfit", "Basketball court", "Soccer field"
          ];
          console.log("[API] 🏖️ PHASE 21 FIX: BIKINI LAW - MODA PRAIA detectado - FORÇANDO Beach/Pool/Cachoeira (cenário selecionado:", selectedIndex + 1, "de", beachScenarios.length, ")");
          console.log("[API] 🏖️ PHASE 21 FIX: PROIBINDO TODOS os cenários de academia/fitness/gym");
          return { context, forbidden };
        }

        // PHASE 21 FIX: REGRA 2 - GYM INTEGRITY (STRICT - Requer UNANIMIDADE)
        // Gym/Academia/Corrida no parque SÓ é permitido se TODOS os produtos forem esportivos/fitness
        // Se houver qualquer produto não-esportivo, NÃO usar cenários de fitness
        // CRÍTICO: Se houver roupas de banho, NUNCA usar fitness (já foi tratado na regra anterior)
        if (hasSport && !hasNonSport && !hasBeach) {
          // PHASE 21 FIX: Sempre sortear aleatoriamente dos 10 cenários de fitness
          const selectedIndex = Math.floor(Math.random() * fitnessScenarios.length);
          context = fitnessScenarios[selectedIndex];
          forbidden = [
            "Bedroom", "Luxury Lobby", "Beach (sand)", "Formal Event", "Restaurant",
            "City Street", "Urban street", "Office", "Shopping Mall",
            "Beach", "Pool", "Swimming pool", "Ocean", "Tropical", "Resort"
          ];
          console.log("[API] 💪 PHASE 21 FIX: FITNESS/SPORT (UNANIMIDADE) - Gym/Academia permitido (cenário selecionado:", selectedIndex + 1, "de", fitnessScenarios.length, ")");
          return { context, forbidden };
        }

        // REGRA 3: PARTY/GALA (Prioridade sobre Formal)
        if (hasParty) {
          // PHASE 21 FIX: Sempre sortear aleatoriamente
          const selectedIndex = Math.floor(Math.random() * partyScenarios.length);
          context = partyScenarios[selectedIndex];
          forbidden = ["Beach", "Gym", "Messy Room", "Forest", "Dirt road", "Office", "Daylight"];
          console.log("[API] 🎉 PHASE 21 FIX: FESTA/GALA detectado - Party forçado (cenário selecionado:", selectedIndex + 1, "de", partyScenarios.length, ")");
          return { context, forbidden };
        }

        // REGRA 4: FORMAL DOMINANCE (Dominante - força contexto formal)
        if (hasFormal) {
          // PHASE 21 FIX: Sempre sortear aleatoriamente
          const selectedIndex = Math.floor(Math.random() * formalScenarios.length);
          context = formalScenarios[selectedIndex];
          forbidden = ["Beach", "Gym", "Messy Room", "Forest", "Dirt road"];
          console.log("[API] 👔 PHASE 21 FIX: SOCIAL/FORMAL (DOMINANTE) - Formal forçado (cenário selecionado:", selectedIndex + 1, "de", formalScenarios.length, ")");
          return { context, forbidden };
        }

        // REGRA 5: FALLBACK (Safe Zone - para conflitos como Vestido + Tênis)
        // Se houver conflito (ex: Sport + Non-Sport), usar cenários neutros
        if ((hasSport && hasNonSport) || (hasBeach && hasWinter)) {
          // PHASE 21 FIX: Sempre sortear aleatoriamente
          const selectedIndex = Math.floor(Math.random() * urbanScenarios.length);
          context = urbanScenarios[selectedIndex];
          forbidden = ["Gym", "Beach", "Swimming pool"];
          console.log("[API] 🏙️ PHASE 21 FIX: CONFLITO DETECTADO - Usando FALLBACK (Urban/Studio - cenário selecionado:", selectedIndex + 1, "de", urbanScenarios.length, ")", {
            hasSport: !!hasSport,
            hasNonSport: !!hasNonSport,
            hasBeach: !!hasBeach,
            hasWinter: !!hasWinter
          });
          return { context, forbidden };
        }

        // REGRA 6: CASUAL / STREET (se não houver conflito)
        if (hasCasual) {
          // PHASE 21 FIX: Sempre sortear aleatoriamente
          const selectedIndex = Math.floor(Math.random() * urbanScenarios.length);
          context = urbanScenarios[selectedIndex];
          forbidden = ["Gym", "Swimming pool", "Formal wedding"];
          console.log("[API] 👕 PHASE 21 FIX: CASUAL/STREET detectado (cenário selecionado:", selectedIndex + 1, "de", urbanScenarios.length, ")");
          return { context, forbidden };
        }

        // REGRA 7: LINGERIE / SLEEP
        if (allText.match(/pijama|lingerie|robe|camisola|sleep|nightwear/i)) {
          const lingerieScenarios = [
            "Background: Bright bedroom",
            "Background: Minimalist bathroom",
            "Background: Morning light window"
          ];
          // PHASE 21 FIX: Sempre sortear aleatoriamente
          const selectedIndex = Math.floor(Math.random() * lingerieScenarios.length);
          context = lingerieScenarios[selectedIndex];
          forbidden = ["Street", "Office", "Gym", "Public places", "Crowd"];
          console.log("[API] 🛏️ PHASE 21 FIX: LINGERIE/SLEEP detectado (cenário selecionado:", selectedIndex + 1, "de", lingerieScenarios.length, ")");
          return { context, forbidden };
        }

        // REGRA 8: CALÇADOS (Geral - apenas se não houver conflito)
        if (allText.match(/sandália|rasteirinha|sapatilha|calçado|shoe|footwear/i)) {
          // Usar cenários urbanos para calçados (pavimento, chão limpo)
          const shoesScenarios = [
            "Background: Paved street",
            "Background: Wooden floor",
            "Background: Tiled floor",
            "Background: Minimalist studio",
            "Background: City park"
          ];
          // PHASE 21 FIX: Sempre sortear aleatoriamente
          const selectedIndex = Math.floor(Math.random() * shoesScenarios.length);
          context = shoesScenarios[selectedIndex];
          forbidden = ["Mud", "Grass (hiding the shoe)", "Water"];
          console.log("[API] 👠 PHASE 21 FIX: CALÇADOS detectado (cenário selecionado:", selectedIndex + 1, "de", shoesScenarios.length, ")");
          return { context, forbidden };
        }

        // PHASE 21 FIX: Default: Urban/Studio (fallback final - sempre sortear aleatoriamente)
        // PHASE 24: Simplified fallback
        const selectedIndex = Math.floor(Math.random() * urbanScenarios.length);
        context = urbanScenarios[selectedIndex];
        console.log("[API] 🎬 PHASE 24: DEFAULT (Urban/Studio - cenário selecionado:", selectedIndex + 1, "de", urbanScenarios.length, ") - Nenhuma regra específica aplicada");

        return { context, forbidden };
      };

      // MASTER PROMPT: UNIFICAÇÃO DE QUALIDADE VISUAL
      // Detectar se é remix (lógica agressiva)
      const isRemix = (scenePrompts && scenePrompts.length > 0) || options?.gerarNovoLook || false;
      
      // IMPORTANTE: NÃO buscar cenário do Firestore
      // SEMPRE usar getSmartScenario que aplica todas as regras (Bikini Law, Gym Integrity, etc.)
      // Isso garante consistência e aplicação correta das regras de cenário

      // IMPORTANTE: SEMPRE usar getSmartScenario (ignorar qualquer cenário do frontend)
      // Isso garante que todas as regras (Bikini Law, Gym Integrity, etc.) sejam aplicadas
      // Frontend não deve buscar cenário - backend sempre determina via getSmartScenario
      let smartContext = "";
      let forbiddenScenarios: string[] = [];
      
      // SEMPRE calcular smartContext usando getSmartScenario
      const smartScenario = getSmartScenario(productsData, isRemix);
      smartContext = smartScenario.context;
      forbiddenScenarios = smartScenario.forbidden;
      
      if (isRemix) {
        console.log("[API] 🎨 REMIX - Gerando NOVO cenário via getSmartScenario:", {
          context: smartContext,
          forbidden: forbiddenScenarios,
          totalProdutos: productsData.length,
          note: "Cenário determinado pelo backend usando getSmartScenario (ignorando qualquer cenário do frontend)",
        });
      } else {
        console.log("[API] 📍 Smart Scenario aplicado (getSmartScenario):", {
          context: smartContext,
          forbidden: forbiddenScenarios,
          isRemix: false,
          totalProdutos: productsData.length,
          note: "Cenário determinado pelo backend usando getSmartScenario",
        });
      }
      
      // PHASE 21 FIX: Se houver scenePrompts, IGNORAR o cenário do scenePrompts e usar smartContext (ou imagem)
      // O scenePrompts pode conter instruções de pose, mas o cenário DEVE vir do smartContext ou scenarioImageUrl
      if (scenePrompts && scenePrompts.length > 0) {
        console.log("[API] ⚠️ PHASE 21 FIX: scenePrompts fornecido:", {
          scenePromptsPreview: scenePrompts[0].substring(0, 150) + "...",
          usandoImagemCenario: !!scenarioImageUrl,
          smartContext: smartContext || "N/A (usando imagem de cenário)",
          forbiddenScenarios: forbiddenScenarios,
        });
      }
      
      // Step 2: Framing Detection
      // Coletar categorias para detecção de framing
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
      
      // PHASE 31: QUALIDADE REMIX - Determinar categoria e framing
      // SEMPRE forçar Full Body Shot para evitar cortes (exceto para apenas acessórios)
      let productCategoryForPrompt = primaryProduct?.categoria || "";
      let smartFraming = "Full body shot, feet fully visible, standing on floor"; // PHASE 31: Default Full Body (qualidade Remix)
      
      if (hasShoes) {
        productCategoryForPrompt = "Calçados";
        smartFraming = "Full body shot, feet fully visible, standing on floor";
        console.log("[API] 🦶 PHASE 31: Smart Framing: CALÇADOS detectado - Full body shot (qualidade Remix)");
      } else if (hasOnlyAccessories) {
        productCategoryForPrompt = "Acessórios/Óculos/Joias";
        smartFraming = "close-up portrait, focus on face and neck";
        console.log("[API] 👓 PHASE 31: Smart Framing: APENAS ACESSÓRIOS detectado - Portrait shot");
      } else {
        productCategoryForPrompt = "Roupas";
        // PHASE 31: Para roupas, SEMPRE usar Full Body Shot (qualidade Remix) para evitar cortes
        smartFraming = "Full body shot, feet fully visible, standing on floor";
        console.log("[API] 👕 PHASE 31: Smart Framing: ROUPAS detectado - FORÇANDO Full Body Shot (qualidade Remix para evitar cortes)");
      }
      
      console.log("[API] 📊 PHASE 14 Smart Context Engine:", {
        smartContext,
        smartFraming,
        productCategoryForPrompt,
        totalProdutos: productsData.length,
      });
      
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
      
      // ========================================
      // FILA ASSÍNCRONA: Reservar crédito e criar Job
      // ========================================
      
      // 1. Reservar crédito ANTES de criar o job
      console.log("[API] 💳 Reservando crédito para geração assíncrona...");
      reservationResult = await reserveCredit(lojistaId);
      
      if (!reservationResult.success) {
        return applyCors(
          request,
          NextResponse.json(
            {
              error: reservationResult.message || "Erro ao reservar crédito",
              status: reservationResult.status || 402,
            },
            { status: reservationResult.status || 402 }
          )
        );
      }
      
      reservationId = reservationResult.reservationId;
      console.log("[API] ✅ Crédito reservado:", { reservationId, remainingBalance: reservationResult.remainingBalance });
      
      // 2. Criar Job no Firestore com status PENDING
      const jobId = randomUUID();
      const jobsRef = db.collection("generation_jobs");
      
      // ============================================
      // 4. FORCE O SALVAMENTO NO FIRESTORE (Job Data)
      // ============================================
      // Garantir que produtos normalizados sejam salvos no job
      const produtosParaJob = produtosParaSalvar.length > 0 
        ? produtosParaSalvar 
        : (productsData.length > 0 ? productsData : []);
      
      const productIdsParaJob = productIdsParaSalvar.length > 0 
        ? productIdsParaSalvar 
        : (productIds.length > 0 ? productIds : []);
      
      console.log("💾 [SALVANDO] Gravando", produtosParaJob.length, "produtos no job.");
      console.log("💾 [SALVANDO] Detalhes:", {
        produtos: produtosParaJob.map((p: any) => ({
          id: p.id,
          nome: p.nome,
          preco: p.preco,
          temImagemUrl: !!p.imagemUrl,
        })),
        productIds: productIdsParaJob,
      });
      
      const jobData = {
        id: jobId,
        lojistaId,
        customerId: customerId || null,
        status: "PENDING",
        reservationId,
        createdAt: FieldValue.serverTimestamp(),
        // ✅ FORCE: Produtos normalizados salvos no job
        produtos: produtosParaJob,
        productIds: productIdsParaJob,
        temProdutos: produtosParaJob.length > 0,
        params: {
          personImageUrl,
          productId: primaryProduct?.id || "",
          productImageUrl: finalProductImageUrl,
          productName: productsData.map(p => p.nome).join(" + "),
          productPrice: productsData.reduce((sum, p) => sum + (p.preco || 0), 0)
            ? `R$ ${productsData.reduce((sum, p) => sum + (p.preco || 0), 0).toFixed(2)}`
            : undefined,
          storeName: lojaData?.nome || "Minha Loja",
          logoUrl: lojaData?.logoUrl,
          scenePrompts: isRemix && scenePrompts && scenePrompts.length > 0 ? scenePrompts : undefined,
          options: {
            quality: options?.quality || "high",
            skipWatermark: options?.skipWatermark !== false,
            productUrl: primaryProduct.productUrl || undefined,
            lookType: "creative",
            allProductImageUrls: allProductImageUrls,
            productCategory: productCategoryForPrompt,
            gerarNovoLook: options?.gerarNovoLook || isRemix,
            forceNewPose: isRemix,
            smartContext: smartContext,
            smartFraming: smartFraming,
            forbiddenScenarios: forbiddenScenarios,
            productsData: productsData,
            scenarioImageUrl: undefined,
            scenarioLightingPrompt: scenarioLightingPrompt || undefined,
            scenarioCategory: scenarioCategory || undefined,
            scenarioInstructions: undefined,
          },
        },
      };
      
      await jobsRef.doc(jobId).set(jobData);
      console.log("[API] ✅ Job criado no Firestore:", { jobId, status: "PENDING" });
      
      // 3. Disparar processamento em background (não bloqueante)
      // IMPORTANTE: Usar URL absoluta baseada no request para garantir que funcione em qualquer ambiente
      const requestUrl = new URL(request.url);
      const protocol = requestUrl.protocol;
      const host = requestUrl.host;
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
                         process.env.NEXT_PUBLIC_PAINELADM_URL || 
                         `${protocol}//${host}`;
      
      console.log("[API] 🚀 Disparando processamento em background:", {
        backendUrl,
        jobId,
        endpoint: `${backendUrl}/api/internal/process-job`,
      });
      
      // Disparar processamento em background (não aguardar resposta)
      fetch(`${backendUrl}/api/internal/process-job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Request": "true",
        },
        body: JSON.stringify({ jobId }),
      })
      .then((response) => {
        if (!response.ok) {
          console.error("[API] ⚠️ Process-job retornou erro:", {
            status: response.status,
            statusText: response.statusText,
            jobId,
          });
        } else {
          console.log("[API] ✅ Process-job iniciado com sucesso:", { jobId });
        }
      })
      .catch((error) => {
        console.error("[API] ⚠️ Erro ao disparar processamento em background:", {
          error: error.message,
          jobId,
          backendUrl,
          nota: "O cron job vai processar este job depois se o disparo falhar",
        });
        // Não falhar a requisição se o disparo falhar - o cron job vai processar depois
      });
      
      // 4. Retornar jobId imediatamente
      return applyCors(
        request,
        NextResponse.json({
          success: true,
          jobId,
          status: "PENDING",
          message: "Geração iniciada. Use o jobId para consultar o status.",
        })
      );
      
      // Código síncrono antigo foi removido - agora processamento é assíncrono via Jobs
      // O job será processado em background pelo endpoint /api/internal/process-job
      
    } catch (error) {
      // Se houver erro ao criar job, fazer rollback do crédito (se foi reservado)
      // reservationId e lojistaId estão no escopo da função POST, acessíveis aqui
      if (reservationId && lojistaId) {
        try {
          await rollbackCredit(lojistaId, reservationId);
          console.log("[API] 🔄 Rollback de crédito realizado devido a erro");
        } catch (rollbackError) {
          console.error("[API] ⚠️ Erro ao fazer rollback de crédito:", rollbackError);
        }
      }
      console.error(`[API] Erro ao gerar composição:`, error);
      
      // PHASE 12: Logar erro crítico no Firestore
      await logError(
        "AI Generation API",
        error instanceof Error ? error : new Error(String(error)),
        {
          storeId: lojistaId || "unknown",
          errorType: "AIGenerationError",
          customerId: customerId || null,
          productIds: productIds,
        }
      ).catch(err => console.error("[API] Erro ao salvar log:", err));
      
      // Tratamento específico para diferentes tipos de erro
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      let userFriendlyMessage = "Erro ao gerar composição";
      let userFriendlyDetails = "Erro ao processar requisição. Tente novamente em alguns instantes.";
      let statusCode = 500;
      
      console.error("[API] Erro detalhado:", {
        message: errorMessage,
        name: error instanceof Error ? error.name : "Unknown",
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("Resource exhausted")) {
        userFriendlyMessage = "Limite de requisições atingido";
        userFriendlyDetails = "Muitas requisições foram feitas muito rápido. Por favor, aguarde pelo menos 30 segundos antes de tentar gerar outro look. Isso ajuda a evitar sobrecarga do sistema.";
        statusCode = 429;
      } else if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
        userFriendlyMessage = "Erro ao gerar composição";
        userFriendlyDetails = "O processo está demorando mais que o esperado. Tente novamente em alguns instantes.";
        statusCode = 504;
      } else if (errorMessage.includes("network") || errorMessage.includes("ECONNREFUSED") || errorMessage.includes("fetch failed")) {
        userFriendlyMessage = "Erro ao gerar composição";
        userFriendlyDetails = "Não foi possível conectar ao servidor. Verifique sua conexão com a internet.";
        statusCode = 503;
      } else if (errorMessage.includes("400") || errorMessage.includes("Bad Request") || errorMessage.includes("inválid")) {
        userFriendlyMessage = "Erro ao gerar composição";
        userFriendlyDetails = "Dados inválidos. Verifique se a foto e os produtos estão corretos.";
        statusCode = 400;
      } else if (errorMessage.includes("URL") || errorMessage.includes("url") || errorMessage.includes("imagem")) {
        userFriendlyMessage = "Erro ao gerar composição";
        userFriendlyDetails = "Erro ao processar imagem. Verifique se a foto está correta e tente novamente.";
        statusCode = 400;
      }
      
      return applyCors(
        request,
        NextResponse.json(
          {
            error: userFriendlyMessage,
            details: userFriendlyDetails,
            ...(process.env.NODE_ENV === 'development' && {
              originalError: errorMessage,
            }),
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
      primaryProduct: primaryProduct?.nome || "Produto",
      looksUrls: validLooks.map(l => ({
        id: l.id,
        url: l.imagemUrl?.substring(0, 80) + "...",
        valida: !!(l.imagemUrl && l.imagemUrl.trim() !== ""),
      })),
    });

    // Buscar nome do cliente se customerId foi fornecido mas customerName não
    if (customerId && !customerName && lojistaId) {
      try {
        const clienteDoc = await db
          .collection("lojas")
          .doc(lojistaId || "")
          .collection("clientes")
          .doc(customerId || "")
          .get();
        
        if (clienteDoc.exists) {
          const clienteData = clienteDoc.data();
          customerName = clienteData?.nome || clienteData?.name || null;
        }
      } catch (error) {
        console.warn("[API] Erro ao buscar nome do cliente:", error);
      }
    }

    // ============================================
    // SOLUÇÃO DEFINITIVA: Garantir produtos ANTES de salvar
    // ============================================
    // Usar produtos normalizados OU productsData processado
    // IMPORTANTE: Sempre usar TODOS os produtos, nunca apenas o primeiro
    let produtosFinaisParaComposicao: any[] = [];
    
    if (produtosParaSalvarNormalizados && produtosParaSalvarNormalizados.length > 0) {
      produtosFinaisParaComposicao = produtosParaSalvarNormalizados;
      console.log("🔥 [SOLUÇÃO DEFINITIVA] Usando produtos normalizados para composição:", produtosFinaisParaComposicao.length);
    } else if (productsData && productsData.length > 0) {
      // ✅ CORREÇÃO: Usar TODOS os produtos, não apenas o primeiro
      produtosFinaisParaComposicao = productsData;
      console.log("🔥 [SOLUÇÃO DEFINITIVA] Usando productsData processado para composição:", produtosFinaisParaComposicao.length);
      console.log("🔥 [SOLUÇÃO DEFINITIVA] Produtos incluídos:", produtosFinaisParaComposicao.map(p => ({ id: p.id, nome: p.nome })));
    } else if (primaryProduct) {
      // ⚠️ FALLBACK: Se só temos primaryProduct, usar ele, mas logar aviso
      produtosFinaisParaComposicao = [primaryProduct];
      console.warn("🔥 [SOLUÇÃO DEFINITIVA] ⚠️ Usando apenas primaryProduct como fallback - apenas 1 produto será salvo");
      console.warn("🔥 [SOLUÇÃO DEFINITIVA] ⚠️ Isso pode indicar que productsData não foi populado corretamente");
    } else {
      console.error("🔥 [SOLUÇÃO DEFINITIVA] ❌ ERRO: Nenhum produto disponível para salvar na composição!");
      produtosFinaisParaComposicao = [{
        id: `prod-minimo-${Date.now()}`,
        nome: "Produto",
        preco: 0,
        imagemUrl: null,
        categoria: null,
        tamanhos: ["Único"],
        cores: [],
        medidas: null,
        desconto: 0,
        descricao: null,
      }];
    }
    
    // Garantir que todos os produtos tenham estrutura completa
    produtosFinaisParaComposicao = produtosFinaisParaComposicao.map((p: any) => ({
      id: p.id || `prod-${Date.now()}-${Math.random()}`,
      nome: p.nome || p.name || "Produto Sem Nome",
      preco: Number(p.preco || p.price || 0),
      imagemUrl: p.imagemUrl || p.imageUrl || p.image || p.cover || p.productUrl || null,
      categoria: p.categoria || p.category || null,
      tamanhos: Array.isArray(p.tamanhos) ? p.tamanhos : (p.tamanho ? [p.tamanho] : ["Único"]),
      cores: Array.isArray(p.cores) ? p.cores : (p.cor ? [p.cor] : []),
      medidas: p.medidas || p.medida || null,
      desconto: p.desconto || 0,
      descricao: p.descricao || p.description || null,
    }));
    
    const productIdsFinaisParaComposicao = produtosFinaisParaComposicao.map((p: any) => p.id);
    
    // ✅ VALIDAÇÃO CRÍTICA: Garantir que temos múltiplos produtos se foram enviados
    if (produtosParaSalvarNormalizados && produtosParaSalvarNormalizados.length > 1 && produtosFinaisParaComposicao.length === 1) {
      console.error("🔥 [SOLUÇÃO DEFINITIVA] ❌ ERRO: Múltiplos produtos foram enviados mas apenas 1 está sendo salvo!");
      console.error("🔥 [SOLUÇÃO DEFINITIVA] Debug:", {
        produtosNormalizados: produtosParaSalvarNormalizados.length,
        produtosFinais: produtosFinaisParaComposicao.length,
        productsData: productsData.length,
      });
      // Forçar uso de todos os produtos normalizados
      produtosFinaisParaComposicao = produtosParaSalvarNormalizados.map((p: any) => ({
        id: p.id || `prod-${Date.now()}-${Math.random()}`,
        nome: p.nome || p.name || "Produto Sem Nome",
        preco: Number(p.preco || p.price || 0),
        imagemUrl: p.imagemUrl || p.imageUrl || p.image || p.cover || p.productUrl || null,
        categoria: p.categoria || p.category || null,
        tamanhos: Array.isArray(p.tamanhos) ? p.tamanhos : (p.tamanho ? [p.tamanho] : ["Único"]),
        cores: Array.isArray(p.cores) ? p.cores : (p.cor ? [p.cor] : []),
        medidas: p.medidas || p.medida || null,
        desconto: p.desconto || 0,
        descricao: p.descricao || p.description || null,
      }));
      console.log("🔥 [SOLUÇÃO DEFINITIVA] ✅ CORRIGIDO: Todos os produtos normalizados serão salvos:", produtosFinaisParaComposicao.length);
    }
    
    console.log("🔥 [SOLUÇÃO DEFINITIVA] Produtos finais preparados para composição:", {
      total: produtosFinaisParaComposicao.length,
      produtos: produtosFinaisParaComposicao.map((p: any) => ({
        id: p.id,
        nome: p.nome,
        preco: p.preco,
        temImagemUrl: !!p.imagemUrl,
      })),
      productIds: productIdsFinaisParaComposicao,
    });
    
    // Salvar composição no Firestore
    let composicaoId: string | null = null;
    try {
      composicaoId = randomUUID();
      const composicaoData = {
        id: composicaoId,
        lojistaId,
        customerId: customerId || null,
        customerName: customerName || null, // Adicionar customerName para o Radar funcionar
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
        // ✅ SOLUÇÃO DEFINITIVA: Usar produtos finais preparados diretamente
        produtos: produtosFinaisParaComposicao,
        // SALVAR TODOS OS PRODUCTIDS selecionados (não apenas o principal)
        productIds: productIdsFinaisParaComposicao.length > 0 
          ? productIdsFinaisParaComposicao 
          : (productIds.length > 0 
            ? productIds 
            : (primaryProduct && primaryProduct.id ? [primaryProduct.id] : [])),
        productUrl: productUrl || null,
        primaryProductId: primaryProduct?.id || null,
        primaryProductName: primaryProduct?.nome || null,
        totalCost,
        totalCostBRL,
        exchangeRate: usdToBrlRate,
        processingTime, // Tempo de processamento em milissegundos
        creativeCost, // Custo do Look Criativo em USD
        creativeCostBRL, // Custo do Look Criativo em BRL
        curtido: false,
        compartilhado: false,
      };

      // Log detalhado ANTES de salvar
      console.log("[API] 📦 DADOS DA COMPOSIÇÃO QUE SERÁ SALVA:", {
        composicaoId,
        lojistaId,
        totalProdutos: composicaoData.produtos?.length || 0,
        produtos: composicaoData.produtos?.map((p: any) => ({
          id: p.id,
          nome: p.nome,
          preco: p.preco,
          temImagemUrl: !!(p.imagemUrl || p.imageUrl),
        })) || [],
        totalProductIds: composicaoData.productIds?.length || 0,
        productIds: composicaoData.productIds || [],
      });

      // CRÍTICO: Garantir que temos produtos antes de salvar
      if (!composicaoData.produtos || composicaoData.produtos.length === 0) {
        console.error("[API] ❌ ERRO CRÍTICO: Tentando salvar composição SEM PRODUTOS!");
        console.error("[API] 📋 Debug:", {
          productsDataLength: productsData.length,
          productIdsLength: productIds.length,
          temPrimaryProduct: !!primaryProduct,
        });
      }

      await db
        .collection("lojas")
        .doc(lojistaId || "")
        .collection("composicoes")
        .doc(composicaoId || "")
        .set(composicaoData);

      console.log("[API] ✅ Composição salva no Firestore:", composicaoId);
      console.log("[API] ✅ Produtos salvos na composição:", {
        total: composicaoData.produtos?.length || 0,
        produtos: composicaoData.produtos?.map((p: any) => ({
          id: p.id,
          nome: p.nome,
          preco: p.preco,
        })) || [],
      });

      // NOVO: Registrar produtos no ProductRegistry
      if (composicaoData.produtos && composicaoData.produtos.length > 0 && composicaoId) {
        try {
          const { registerCompositionProducts } = await import("@/lib/firestore/productRegistry");
          // ✅ Type guard: garantir que composicaoId não seja null antes de usar
          // Como já verificamos no if acima, podemos usar non-null assertion
          const safeComposicaoId = composicaoId as string;
          const registeredProductIds = await registerCompositionProducts(
            lojistaId || "",
            safeComposicaoId, // TypeScript agora sabe que é string
            composicaoData.produtos
          );
          
          // Atualizar composição com os IDs registrados
          if (registeredProductIds.length > 0) {
            await db
              .collection("lojas")
              .doc(lojistaId || "")
              .collection("composicoes")
              .doc(composicaoId || "")
              .update({
                registeredProductIds: registeredProductIds,
                productIds: registeredProductIds, // Garantir que productIds também tenha os IDs
              });
            
            console.log("[API] ✅ Produtos registrados no ProductRegistry:", {
              total: registeredProductIds.length,
              productIds: registeredProductIds,
            });
          }
        } catch (registryError) {
          console.error("[API] ⚠️ Erro ao registrar produtos no ProductRegistry:", registryError);
          // Não falhar a requisição se o registry falhar
        }
      }

      // NOVO: Salvar na coleção 'generations' para controle de feedback e Radar
      // GARANTIR que TODOS os productIds sejam salvos (todos os produtos selecionados)
      const finalProductIds = productIds.length > 0 
        ? productIds 
        : (primaryProduct && primaryProduct.id ? [primaryProduct.id] : []);
      
      if (customerId && lojistaId) {
        try {
          // Garantir que temos produtos para salvar
          let produtosParaSalvar = composicaoData.produtos && composicaoData.produtos.length > 0
            ? composicaoData.produtos
            : null;
          
          // Garantir que temos productIds
          let productIdsParaSalvar = finalProductIds.length > 0
            ? finalProductIds
            : (primaryProduct && primaryProduct.id ? [primaryProduct.id] : []);
          
          console.log("[API] 📦 Preparando para salvar generation:", {
            compositionId: composicaoId,
            temProdutos: !!produtosParaSalvar,
            totalProdutos: produtosParaSalvar?.length || 0,
            temProductIds: productIdsParaSalvar.length > 0,
            totalProductIds: productIdsParaSalvar.length,
            productIds: productIdsParaSalvar,
          });
          
          // ============================================
          // ✅ Verificação Final: Alertar se array estiver vazio
          // ============================================
          // TypeScript: verificar null antes de acessar .length
          const temProdutos = produtosParaSalvar && produtosParaSalvar.length > 0;
          if (!temProdutos) {
            console.warn("[API] ⚠️⚠️⚠️ ATENÇÃO: Uma geração está sendo criada SEM PRODUTOS VINCULADOS!");
            console.warn("[API] 📋 Debug:", {
              composicaoId,
              temProdutosNaComposicao: !!composicaoData.produtos,
              produtosNaComposicao: composicaoData.produtos?.length || 0,
              temPrimaryProduct: !!primaryProduct,
              primaryProductId: primaryProduct?.id,
              primaryProductNome: primaryProduct?.nome,
              temProductIds: productIdsParaSalvar.length > 0,
              payloadRecebido: payloadRecebido ? {
                type: payloadRecebido.type,
                temProducts: !!payloadRecebido.products,
              } : null,
            });
            
            // Tentar usar produtos da composição como fallback
            if (composicaoData.produtos && composicaoData.produtos.length > 0) {
              produtosParaSalvar = composicaoData.produtos;
              console.warn("[API] ⚠️ Usando produtos da composição como fallback para generation");
            } else {
              // Se ainda não tem produtos, lançar erro
              throw new Error(
                `[API] ❌ ERRO CRÍTICO: Não é possível salvar generation sem produtos. ` +
                `compositionId: ${composicaoId}, lojistaId: ${lojistaId}, customerId: ${customerId}`
              );
            }
          }
          
          // ============================================
          // ✅ Persistência Dupla: Forçar inclusão do campo produtos na generation
          // ============================================
          // Se productIds estiver vazio mas houver produtos, gerar IDs manualmente
          if (productIdsParaSalvar.length === 0 && produtosParaSalvar && produtosParaSalvar.length > 0) {
            console.warn("[API] ⚠️ productIds vazio mas há produtos - gerando IDs manualmente");
            productIdsParaSalvar = produtosParaSalvar.map((p: any, index: number) => {
              if (p.id) return p.id;
              // ✅ Garantir que composicaoId não seja null
              const safeComposicaoId = composicaoId || `comp-${Date.now()}`;
              return `prod-${safeComposicaoId}-${index}-${Date.now()}`;
            });
            
            // Atualizar produtos com IDs gerados
            produtosParaSalvar = produtosParaSalvar.map((p: any, index: number) => ({
              ...p,
              id: p.id || productIdsParaSalvar[index],
            }));
            
            console.log("[API] ✅ IDs gerados manualmente:", productIdsParaSalvar);
          }
          
          // ============================================
          // ✅ Verificação Final: Alertar se array estiver vazio
          // ============================================
          if (!produtosParaSalvar || produtosParaSalvar.length === 0) {
            console.warn("[API] ⚠️⚠️⚠️ ATENÇÃO: Uma geração está sendo criada SEM PRODUTOS VINCULADOS!");
            console.warn("[API] 📋 Debug:", {
              composicaoId,
              temProdutosNaComposicao: !!composicaoData.produtos,
              produtosNaComposicao: composicaoData.produtos?.length || 0,
              temPrimaryProduct: !!primaryProduct,
              payloadRecebido,
            });
          }
          
          // FORÇAR salvamento duplo: Generation E Composição
          // GARANTIR que produtos completos sejam salvos (não apenas IDs)
          console.log("[API] 💾 FORÇANDO salvamento de produtos completos na generation:", {
            totalProdutos: produtosParaSalvar?.length || 0,
            produtos: produtosParaSalvar?.map((p: any) => ({
              id: p.id,
              nome: p.nome,
              preco: p.preco,
              temImagemUrl: !!(p.imagemUrl || p.imageUrl),
            })) || [],
            totalProductIds: productIdsParaSalvar.length,
            productIds: productIdsParaSalvar,
          });
          
          // ============================================
          // PASSO 3: FORCE A GRAVAÇÃO NO FIRESTORE
          // ============================================
          // Use as variáveis blindadas do COLETOR UNIVERSAL
          // Se produtos foram coletados do body, usar eles (prioridade máxima)
          const produtosFinaisParaGeneration = (produtosParaSalvar && produtosParaSalvar.length > 0)
            ? produtosParaSalvar
            : (produtosFinaisParaSalvar && produtosFinaisParaSalvar.length > 0)
              ? produtosFinaisParaSalvar
              : (composicaoData.produtos && composicaoData.produtos.length > 0)
                ? composicaoData.produtos
                : produtosFinaisParaComposicao;
          
          const productIdsFinaisParaGeneration = (productIdsParaSalvar && productIdsParaSalvar.length > 0)
            ? productIdsParaSalvar
            : (productIdsFinaisParaSalvar && productIdsFinaisParaSalvar.length > 0)
              ? productIdsFinaisParaSalvar
              : (composicaoData.productIds && composicaoData.productIds.length > 0)
                ? composicaoData.productIds
                : productIdsFinaisParaComposicao;
          
          console.log("💾 [FORÇA GRAVAÇÃO] Produtos finais para generation:", {
            total: produtosFinaisParaGeneration.length,
            produtos: produtosFinaisParaGeneration.map((p: any) => ({
              id: p.id,
              nome: p.nome,
              preco: p.preco,
              temImagemUrl: !!p.imagemUrl,
            })),
            productIds: productIdsFinaisParaGeneration,
            origem: produtosParaSalvar && produtosParaSalvar.length > 0 ? "COLETOR UNIVERSAL" : "PROCESSAMENTO INTERNO",
          });
          
          // ✅ Persistência Dupla: Forçar inclusão do campo produtos (array completo) e productIds
          await saveGeneration({
            lojistaId,
            userId: customerId,
            compositionId: composicaoId,
            jobId: null,
            imagemUrl: validLooks.length > 0 ? validLooks[0].imagemUrl : null,
            uploadImageUrl: personImageUrl || null,
            productIds: productIdsFinaisParaGeneration, // ✅ Array de IDs do COLETOR UNIVERSAL
            productName: primaryProduct?.nome || null,
            customerName: customerName || null,
            produtos: produtosFinaisParaGeneration, // ✅ Array completo do COLETOR UNIVERSAL - FORÇADO
          });
          
          // GARANTIR que a composição também tem os produtos
          if (composicaoData.produtos && composicaoData.produtos.length > 0) {
            console.log("[API] ✅ Salvamento duplo confirmado: produtos na composição E na generation");
            console.log("[API] 📦 Produtos salvos na composição:", composicaoData.produtos.map((p: any) => ({
              id: p.id,
              nome: p.nome,
              preco: p.preco,
              temImagemUrl: !!(p.imagemUrl || p.imageUrl),
            })));
          } else {
            console.error("[API] ❌ ERRO: Composição não tem produtos salvos!");
            // Tentar atualizar a composição com os produtos da generation
            if (produtosParaSalvar && produtosParaSalvar.length > 0) {
              try {
                await db
                  .collection("lojas")
                  .doc(lojistaId || "")
                  .collection("composicoes")
                  .doc(composicaoId || "")
                  .update({
                    produtos: produtosParaSalvar,
                    productIds: productIdsParaSalvar,
                  });
                console.log("[API] ✅ Composição atualizada com produtos da generation");
              } catch (updateError) {
                console.error("[API] ❌ Erro ao atualizar composição com produtos:", updateError);
              }
            }
          }
          
          console.log("[API] ✅ Generation salva na coleção 'generations':", {
            compositionId: composicaoId,
            totalProductIds: productIdsParaSalvar.length,
            productIds: productIdsParaSalvar,
            totalProdutos: produtosParaSalvar?.length || 0,
            produtos: produtosParaSalvar?.map((p: any) => ({
              id: p.id,
              nome: p.nome,
              preco: p.preco,
              temImagemUrl: !!(p.imagemUrl || p.imageUrl),
            })) || [],
            imagemUrl: validLooks.length > 0 ? validLooks[0].imagemUrl?.substring(0, 100) : null,
          });
          
          // Se não salvou produtos na generation mas tem na composição, atualizar a generation
          if ((!produtosParaSalvar || produtosParaSalvar.length === 0) && composicaoData.produtos && composicaoData.produtos.length > 0 && composicaoId) {
            console.log("[API] 🔄 Atualizando generation com produtos da composição...");
            try {
              const generationsRef = db.collection("generations");
              const existingGen = await generationsRef
                .where("compositionId", "==", composicaoId) // composicaoId não é null aqui devido à verificação acima
                .where("lojistaId", "==", lojistaId)
                .limit(1)
                .get();
              
              if (!existingGen.empty) {
                await existingGen.docs[0].ref.update({
                  produtos: composicaoData.produtos,
                  productIds: composicaoData.productIds || productIdsParaSalvar,
                });
                console.log("[API] ✅ Generation atualizada com produtos da composição");
              }
            } catch (updateError) {
              console.warn("[API] ⚠️ Erro ao atualizar generation com produtos:", updateError);
            }
          }
        } catch (generationError) {
          console.error("[API] ❌ Erro ao salvar generation:", generationError);
          // Não falhar a requisição se a generation falhar
        }
      } else {
        console.warn("[API] ⚠️ Generation NÃO salva - faltando dados:", {
          temCustomerId: !!customerId,
          temLojistaId: !!lojistaId,
        });
      }

      // Atualizar estatísticas do cliente se houver customerId
      // Agora conta TODAS as composições geradas, não apenas as com like
      if (customerId) {
        try {
          const { updateClienteComposicoesStats } = await import("@/lib/firestore/server");
          // Atualizar estatísticas imediatamente após gerar composição
          await updateClienteComposicoesStats(lojistaId || "", customerId || "");
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
