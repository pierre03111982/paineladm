import { NextRequest, NextResponse } from "next/server";
import { db, getAdminStorage } from "@/lib/firebaseAdmin";
import { CompositionOrchestrator } from "@/lib/ai-services/composition-orchestrator";
import { FieldValue } from "firebase-admin/firestore";
import { findScenarioByProductTags } from "@/lib/scenarioMatcher";
import { rollbackCredit } from "@/lib/financials";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

/**
 * Faz upload de base64 data URL ou blob URL para Firebase Storage e retorna URL pública
 */
async function uploadBase64ToStorage(
  imageUrl: string,
  lojistaId: string,
  jobId: string
): Promise<string> {
  // Se for blob:, tentar buscar e converter para base64 primeiro
  if (imageUrl.startsWith("blob:")) {
    try {
      console.log("[uploadBase64ToStorage] Convertendo blob: para base64...");
      // Nota: blob: URLs não podem ser acessadas diretamente no servidor
      // Se chegou aqui, o frontend deveria ter convertido antes
      // Por segurança, retornar erro informativo
      throw new Error("blob: URLs não podem ser processadas no servidor. O frontend deve converter para data: ou HTTP URL antes de enviar.");
    } catch (error: any) {
      console.error("[uploadBase64ToStorage] Erro ao processar blob: URL:", error);
      throw error;
    }
  }
  
  // Se não for base64 data URL, retornar como está
  if (!imageUrl.startsWith("data:image/")) {
    return imageUrl;
  }

  try {
    const storage = getAdminStorage();
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
    
    // Obter bucket explícito
    const bucket = storage.bucket(storageBucket);
    
    // Extrair mime type e dados base64
    const matches = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      console.warn("[process-job] Formato base64 inválido, retornando como está");
      return imageUrl;
    }

    const mimeType = matches[1] || "png";
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");
    
    // Criar nome do arquivo único
    const timestamp = Date.now();
    const fileName = `generations/${lojistaId}/${jobId}-${timestamp}.${mimeType}`;
    const file = bucket.file(fileName);
    
    // Fazer upload
    await file.save(buffer, {
      metadata: {
        contentType: `image/${mimeType}`,
        metadata: {
        jobId,
          lojistaId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });
    
    // Tornar público e obter URL
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    
    console.log("[process-job] ✅ Base64 convertido para Storage URL:", {
      originalLength: imageUrl.length,
      fileName,
      publicUrl: publicUrl.substring(0, 100) + "...",
    });
    
    return publicUrl;
  } catch (error: any) {
    console.error("[process-job] ❌ Erro ao fazer upload para Storage:", error);
    // Se falhar, retornar como está (pode causar erro depois, mas melhor que quebrar aqui)
    return imageUrl;
  }
}

export async function POST(req: NextRequest) {
  let jobId: string | undefined;
  let jobData: any = null;
  
  try {
    console.log("[process-job] 🚀 Iniciando process-job endpoint...");
    
    // VALIDAÇÃO INICIAL: Verificar se o body pode ser parseado
    let body: any;
    try {
      body = await req.json();
      console.log("[process-job] ✅ Body parseado com sucesso");
    } catch (parseError: any) {
      console.error("[process-job] ❌ Erro ao fazer parse do body:", {
        error: parseError?.message,
        stack: parseError?.stack?.substring(0, 500),
      });
      return NextResponse.json({ 
        error: "Erro ao processar requisição: body inválido",
        details: parseError?.message 
      }, { status: 400 });
    }
    
    jobId = body.jobId;

    if (!jobId) {
      console.error("[process-job] ❌ JobId não fornecido no body");
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    console.log(`[process-job] 📋 VERSAO FINAL BLINDADA - Job: ${jobId}`);
    
    // VALIDAÇÃO: Verificar se o Firestore está acessível
    if (!db) {
      console.error("[process-job] ❌ Firestore não está inicializado");
      throw new Error("Firestore não está inicializado");
    }
    
    const jobsRef = db.collection("generation_jobs");
    
    // VALIDAÇÃO: Verificar se o job existe antes de atualizar
    const jobDocCheck = await jobsRef.doc(jobId).get();
    if (!jobDocCheck.exists) {
      console.error(`[process-job] ❌ Job não encontrado: ${jobId}`);
      return NextResponse.json({ 
        error: `Job não encontrado: ${jobId}` 
      }, { status: 404 });
    }
    
    // Atualiza status para PROCESSING
    // Usamos toISOString() para garantir compatibilidade total
    try {
      await jobsRef.doc(jobId).update({
        status: "PROCESSING",
        startedAt: new Date().toISOString()
      });
      console.log("[process-job] ✅ Status atualizado para PROCESSING");
    } catch (updateError: any) {
      console.error("[process-job] ❌ Erro ao atualizar status para PROCESSING:", {
        error: updateError?.message,
        stack: updateError?.stack?.substring(0, 500),
      });
      throw new Error(`Erro ao atualizar status do job: ${updateError?.message}`);
    }

    // Executa IA
    console.log("[process-job] 🎨 Inicializando CompositionOrchestrator...");
    const orchestrator = new CompositionOrchestrator();
    
    // Buscar dados do job (já verificamos que existe acima)
    const jobDoc = await jobsRef.doc(jobId).get();
    jobData = jobDoc.data();
    
    if (!jobData) {
      const errorMsg = "Job não encontrado ou sem dados após atualização de status";
      console.error(`[process-job] ❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    console.log("[process-job] ✅ Dados do job carregados:", {
      hasPersonImageUrl: !!jobData.personImageUrl,
      hasProductIds: !!jobData.productIds,
      productIdsCount: Array.isArray(jobData.productIds) ? jobData.productIds.length : 0,
      hasLojistaId: !!jobData.lojistaId,
      hasOptions: !!jobData.options,
    });

    // FIX: Construir params a partir dos campos do job (não de jobData.params)
    // O job é criado com campos diretos: personImageUrl, productIds, options, etc.
    console.log("[process-job] 📋 Validando dados do job:", {
      hasPersonImageUrl: !!jobData.personImageUrl,
      personImageUrlType: jobData.personImageUrl?.startsWith("http") ? "HTTP" : jobData.personImageUrl?.startsWith("data:") ? "BASE64" : "UNKNOWN",
      hasLojistaId: !!jobData.lojistaId,
      hasProductIds: !!jobData.productIds,
      productIdsCount: Array.isArray(jobData.productIds) ? jobData.productIds.length : 0,
      hasOptions: !!jobData.options,
    });
    
    if (!jobData.personImageUrl) {
      const errorMsg = `❌ personImageUrl inválida ou não fornecida: ${jobData.personImageUrl}`;
      console.error(`[process-job] ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    if (!jobData.lojistaId) {
      const errorMsg = `❌ lojistaId inválido ou não fornecido: ${jobData.lojistaId}`;
      console.error(`[process-job] ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    if (!jobData.productIds || !Array.isArray(jobData.productIds) || jobData.productIds.length === 0) {
      const errorMsg = `❌ productIds inválido ou vazio: ${JSON.stringify(jobData.productIds)}`;
      console.error(`[process-job] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Buscar produtos do Firestore
    console.log("[process-job] 🔍 Buscando produtos do Firestore:", {
      lojistaId: jobData.lojistaId,
      productIds: jobData.productIds,
      productIdsCount: jobData.productIds.length,
    });
    
    let produtosSnapshot;
    try {
      produtosSnapshot = await db
        .collection("lojas")
        .doc(jobData.lojistaId)
        .collection("produtos")
        .get();
      console.log("[process-job] ✅ Produtos buscados do Firestore:", {
        totalDocs: produtosSnapshot.docs.length,
        productIdsBuscados: jobData.productIds,
      });
    } catch (firestoreError: any) {
      console.error("[process-job] ❌ Erro ao buscar produtos do Firestore:", {
        error: firestoreError?.message,
        lojistaId: jobData.lojistaId,
        stack: firestoreError?.stack?.substring(0, 500),
      });
      throw new Error(`Erro ao buscar produtos: ${firestoreError?.message || "Erro desconhecido"}`);
    }

      // FIX: Validar e mapear produtos com tratamento de erros
      const productsData = produtosSnapshot.docs
        .filter(doc => {
          const docId = doc.id;
          const isIncluded = jobData.productIds?.includes(docId);
          if (!isIncluded) {
            console.log(`[process-job] Produto ${docId} não está na lista de productIds, ignorando...`);
          }
          return isIncluded;
        })
        .map((doc, index) => {
          try {
            const docData = doc.data();
            const productData = {
              id: doc.id,
              nome: docData?.nome || docData?.name || `Produto ${index + 1}`,
              preco: docData?.preco || docData?.price || 0,
              productUrl: docData?.productUrl || docData?.product_url || null,
              imagemUrl: docData?.imagemUrl || docData?.imagem_url || docData?.imageUrl || docData?.image_url || null,
              categoria: docData?.categoria || docData?.category || "Geral",
              ...docData, // Incluir outros campos para compatibilidade
            };
            
            // Validar que pelo menos uma URL existe
            if (!productData.productUrl && !productData.imagemUrl) {
              console.warn(`[process-job] ⚠️ Produto ${productData.id} não tem productUrl nem imagemUrl`);
            }
            
            return productData;
          } catch (mapError: any) {
            console.error(`[process-job] ❌ Erro ao mapear produto ${doc.id}:`, {
              error: mapError?.message,
              stack: mapError?.stack?.substring(0, 300),
            });
            // Retornar produto básico em caso de erro
            return {
              id: doc.id,
              nome: `Produto ${index + 1}`,
              preco: 0,
              productUrl: null,
              imagemUrl: null,
              categoria: "Geral",
            };
          }
        })
        .filter((p): p is {
          id: string;
          nome: string;
          preco: number;
          productUrl: string | null;
          imagemUrl: string | null;
          categoria: string;
          [key: string]: any;
        } => {
          // Filtrar apenas produtos válidos (com ID)
          return !!p && !!p.id;
        });

      if (productsData.length === 0) {
        const errorMsg = `Nenhum produto encontrado. ProductIds esperados: ${JSON.stringify(jobData.productIds)}, Produtos encontrados no Firestore: ${produtosSnapshot.docs.map(d => d.id).join(", ")}`;
        console.error(`[process-job] ❌ ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      console.log("[process-job] ✅ Produtos mapeados com sucesso:", {
        totalProdutos: productsData.length,
        produtos: productsData.map(p => ({
          id: p.id,
          nome: p.nome,
          categoria: p.categoria,
          hasProductUrl: !!p.productUrl,
          hasImagemUrl: !!p.imagemUrl,
        })),
      });

      const primaryProduct = productsData[0];
      
      // IMPORTANTE: TODOS os produtos serão aplicados na composição
      // allProductImageUrls contém TODAS as imagens de produtos para aplicar na pessoa
      // FIX: Validar que cada produto tem pelo menos uma URL válida
      const allProductImageUrls = productsData
        .map((p, index) => {
          const url = p.productUrl || p.imagemUrl;
          if (!url) {
            console.warn(`[process-job] ⚠️ Produto ${index + 1} (${p.id}) não tem productUrl nem imagemUrl:`, {
              produtoId: p.id,
              produtoNome: p.nome,
              hasProductUrl: !!p.productUrl,
              hasImagemUrl: !!p.imagemUrl,
            });
          }
          return url;
        })
        .filter((url): url is string => {
          // Filtrar apenas URLs válidas (não null, não undefined, não vazias)
          if (!url || typeof url !== 'string' || url.trim() === '') {
            return false;
          }
          // Validar que é HTTP URL ou data URL
          const isValid = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/');
          if (!isValid) {
            console.warn(`[process-job] ⚠️ URL de produto inválida (não é HTTP nem data URL):`, url.substring(0, 100));
          }
          return isValid;
        });

      // VALIDAÇÃO CRÍTICA: Garantir que temos pelo menos uma imagem de produto
      if (allProductImageUrls.length === 0) {
        const errorMsg = "Nenhuma imagem de produto válida encontrada para geração";
        console.error(`[process-job] ❌ ${errorMsg}`);
        console.error("[process-job] Produtos analisados:", {
          totalProdutos: productsData.length,
          produtos: productsData.map(p => ({
            id: p.id,
            nome: p.nome,
            categoria: p.categoria,
            hasProductUrl: !!p.productUrl,
            hasImagemUrl: !!p.imagemUrl,
            productUrl: p.productUrl?.substring(0, 50) || "N/A",
            imagemUrl: p.imagemUrl?.substring(0, 50) || "N/A",
          })),
          productIdsEsperados: jobData.productIds,
          produtosEncontrados: productsData.map(p => p.id),
        });
        throw new Error(errorMsg);
      }
      
      // VALIDAÇÃO ADICIONAL: Verificar se todas as URLs são válidas
      const invalidUrls = allProductImageUrls.filter(url => !url || (!url.startsWith("http") && !url.startsWith("data:")));
      if (invalidUrls.length > 0) {
        console.warn("[process-job] ⚠️ URLs de produtos inválidas detectadas:", {
          invalidUrlsCount: invalidUrls.length,
          invalidUrls: invalidUrls.map((url, i) => ({
            indice: i,
            url: url?.substring(0, 100) || "N/A",
            tipo: url?.startsWith("http") ? "HTTP" : url?.startsWith("data:") ? "BASE64" : "INVALID",
          })),
        });
      }
      
      // VALIDAÇÃO: Verificar se personImageUrl é válida e converter se necessário
      let personImageUrl = jobData.personImageUrl;
      
      // Rejeitar blob: URLs - o frontend deve converter antes de enviar
      if (personImageUrl.startsWith("blob:")) {
        const errorMsg = `❌ personImageUrl é blob: URL - o frontend deve converter para HTTP ou data: antes de enviar. URL recebida: ${personImageUrl.substring(0, 100)}`;
        console.error(`[process-job] ${errorMsg}`);
        throw new Error("Foto inválida: blob: URLs não podem ser processadas no servidor. Por favor, faça upload novamente.");
      }
      
      // Se for data:image/, converter para HTTP URL antes de passar ao orchestrator
      if (personImageUrl.startsWith("data:image/")) {
        console.log("[process-job] 🔄 Detectado data: URL na personImageUrl, convertendo para HTTP URL...");
        try {
          if (!jobId) throw new Error("JobId não disponível para upload de personImageUrl");
          personImageUrl = await uploadBase64ToStorage(personImageUrl, jobData.lojistaId, jobId);
          console.log("[process-job] ✅ personImageUrl convertida para HTTP URL:", personImageUrl.substring(0, 100) + "...");
        } catch (uploadError: any) {
          console.error("[process-job] ❌ Erro ao converter personImageUrl:", {
            error: uploadError?.message,
            stack: uploadError?.stack?.substring(0, 500),
          });
          throw new Error(`Erro ao processar foto da pessoa: ${uploadError?.message || "Erro desconhecido"}`);
        }
      } else if (!personImageUrl.startsWith("http://") && !personImageUrl.startsWith("https://")) {
        const errorMsg = `❌ personImageUrl inválida (deve ser HTTP URL ou data:image/): ${personImageUrl.substring(0, 100)}`;
        console.error(`[process-job] ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      // Atualizar jobData com a URL convertida
      jobData.personImageUrl = personImageUrl;
      
      console.log("[process-job] ✅ Imagens de produtos coletadas:", {
        totalProdutos: productsData.length,
        imagensValidas: allProductImageUrls.length,
        produtos: productsData.map(p => p.nome || "N/A"),
        imagens: allProductImageUrls.map((url, i) => ({
          indice: i + 1,
          tipo: `IMAGEM_PRODUTO_${i + 1}`,
          url: url ? url.substring(0, 80) + "..." : "N/A",
        })),
      });

    // Buscar dados da loja
    const lojaDoc = await db.collection("lojas").doc(jobData.lojistaId).get();
    const lojaData = lojaDoc.exists ? lojaDoc.data() : null;

    // MASTER PROMPT PIVOT: Buscar cenário do Firestore baseado em tags de produtos
    // REGRA IMPORTANTE: 
    // - Para APLICAR na composição: TODOS os produtos (allProductImageUrls)
    // - Para BUSCAR o cenário: APENAS o primeiro produto (firstProductOnly)
    // IMPORTANTE: Passar apenas STRINGS (prompt/categoria), NÃO URL de imagem
    let scenarioImageUrl: string | undefined = undefined; // SEMPRE undefined - forçar geração via prompt
    let scenarioLightingPrompt: string | undefined = undefined;
    let scenarioCategory: string | undefined = undefined;
    let scenarioInstructions: string | undefined = undefined; // Não usar instruções de imagem fixa
    let forbiddenScenarios: string[] = []; // IMPORTANTE: Array de cenários proibidos para negative prompt
    
    // Verificar se é remix (MASTER PROMPT: Detecção correta de remix)
    // Remix pode ser detectado por: scenePrompts OU gerarNovoLook OU forceNewPose
    // No REMIX: Aplicar TODOS os produtos + Gerar NOVO cenário + Mudar pose
    const isRemix = (jobData.scenePrompts && jobData.scenePrompts.length > 0) || 
                    jobData.options?.gerarNovoLook === true || 
                    jobData.options?.forceNewPose === true;
    
    console.log("[process-job] 🔍 Detecção de Remix:", {
      isRemix,
      hasScenePrompts: !!(jobData.scenePrompts && jobData.scenePrompts.length > 0),
      scenePromptsCount: jobData.scenePrompts?.length || 0,
      gerarNovoLook: jobData.options?.gerarNovoLook,
      forceNewPose: jobData.options?.forceNewPose,
      totalProdutos: productsData.length,
    });
    
    // REGRA DO 1º PRODUTO: Usar APENAS o produto no índice 0 para BUSCAR o cenário
    // NOTA: Todos os produtos serão aplicados na composição, mas o cenário é baseado no 1º produto
    const firstProductOnly = productsData.length > 0 ? [productsData[0]] : [];
    
    // Se o job já tem categoria/prompt, usar eles (vem do frontend ou de geração anterior)
    if (jobData.options?.scenarioCategory || jobData.options?.scenarioLightingPrompt) {
      scenarioLightingPrompt = jobData.options.scenarioLightingPrompt;
      scenarioCategory = jobData.options.scenarioCategory;
      // NÃO usar scenarioImageUrl - forçar geração via prompt
      scenarioImageUrl = undefined;
      scenarioInstructions = undefined;
      console.log("[process-job] 🎯 MASTER PROMPT PIVOT: Usando cenário do job como TEXTO:", {
        category: scenarioCategory || "N/A",
        lightingPrompt: scenarioLightingPrompt?.substring(0, 50) || "N/A",
        nota: "Cenário será GERADO via prompt, não usado como input visual",
      });
    } else if (isRemix && firstProductOnly.length > 0) {
      // LÓGICA REMIX: Usar getSmartScenario (mesma lógica do endpoint generate)
      // Isso garante que todas as regras (Bikini Law, Gym Integrity, etc.) sejam aplicadas
      try {
        console.log("[process-job] 🎨 MASTER PROMPT: REMIX - Calculando cenário via getSmartScenario");
        console.log("[process-job] 📦 Produtos a aplicar na composição:", {
          totalProdutos: productsData.length,
          produtos: productsData.map(p => p.nome || "N/A"),
          nota: "TODOS os produtos serão aplicados na pessoa",
        });
        
        // IMPORTANTE: Copiar lógica do getSmartScenario do endpoint generate
        // Isso garante que Bikini Law, Gym Integrity e outras regras sejam aplicadas
        const getSmartScenario = (products: any[], isRemix: boolean = false): { context: string; forbidden: string[] } => {
          let context = "Background: Clean studio";
          let forbidden: string[] = [];

          if (products.length === 0) {
            return { context, forbidden };
          }

          const firstProduct = products[0];
          const firstProductCategory = (firstProduct?.categoria || "").toLowerCase();
          const firstProductName = (firstProduct?.nome || "").toLowerCase();
          const allText = `${firstProductCategory} ${firstProductName}`;

          const beachScenarios = [
            "Background: Sunny tropical beach", "Background: Luxury pool deck",
            "Background: Golden hour sand dunes", "Background: Tropical garden",
            "Background: Infinity pool at sunset", "Background: Wooden pier",
            "Background: Beach bar", "Background: Rocky coastline",
            "Background: Yacht deck", "Background: Secluded beach",
            "Background: Natural waterfall", "Background: Resort pool",
            "Background: Beach at sunset", "Background: Modern infinity pool",
            "Background: Natural pool in forest"
          ];

          const urbanScenarios = [
            "Background: Urban street", "Background: Minimalist studio",
            "Background: Coffee shop", "Background: City park",
            "Background: Industrial loft", "Background: Graffiti alleyway",
            "Background: Rooftop terrace", "Background: Subway station",
            "Background: Skate park", "Background: Neon-lit street"
          ];

          const formalScenarios = [
            "Background: Corporate office", "Background: Luxury hotel lobby",
            "Background: Minimalist apartment", "Background: Abstract architecture",
            "Background: Classic library", "Background: Conference room",
            "Background: Museum gallery", "Background: Upscale restaurant",
            "Background: Co-working space", "Background: Private jet interior"
          ];

          const partyScenarios = [
            "Background: Red carpet event", "Background: Elegant ballroom",
            "Background: Rooftop bar", "Background: Luxury mansion",
            "Background: Opera house", "Background: Garden party",
            "Background: Champagne bar", "Background: VIP club",
            "Background: Wedding reception", "Background: Casino"
          ];

          const fitnessScenarios = [
            "Background: Modern gym", "Background: Running track",
            "Background: Yoga studio", "Background: Urban stairs",
            "Background: Tennis court", "Background: Hiking trail",
            "Background: Crossfit box", "Background: Pilates studio",
            "Background: Basketball court", "Background: Soccer field"
          ];

          const winterScenarios = [
            "Background: Autumn street", "Background: Fireplace setting",
            "Background: Cloudy skyline", "Background: Snowy mountain",
            "Background: Winter cabin", "Background: Foggy forest",
            "Background: Christmas market", "Background: Ski resort",
            "Background: Rainy street", "Background: Library nook"
          ];

          const hasSport = allText.match(/legging|fitness|academia|tênis esportivo|sneaker|short corrida|dry fit|sport|atividade física|moda fitness|workout|gym|treino|esportivo/i);
          const hasNonSport = allText.match(/vestido|dress|jeans|alfaiataria|blazer|camisa|saia|skirt|salto|heels|terno|suit|formal/i);
          const hasBeach = allText.match(/biqu|bikini|maiô|maio|sunga|praia|beachwear|saída de praia|swimwear|moda praia|banho|nado|piscina|swim|beach|biquini|biquíni/i);
          const hasWinter = allText.match(/couro|leather|casaco|sobretudo|bota|cachecol|inverno|winter|coat|pérola|veludo|lã|wool|woollen|boot/i);
          const hasFormal = allText.match(/terno|blazer|social|alfaiataria|vestido longo|gravata|suit|formal|festa|gala|paetê|salto alto fino|clutch|vestido de festa|brilho/i);
          const hasCasual = allText.match(/jeans|t-shirt|moletom|tênis casual|jaqueta jeans|casual|street/i);
          const hasParty = allText.match(/festa|gala|paetê|salto alto fino|clutch|vestido de festa|brilho|noite|night|evening/i);

          // REGRA 0: INVERNO/COURO (Prioridade ABSOLUTA)
          if (hasWinter) {
            const selectedIndex = Math.floor(Math.random() * winterScenarios.length);
            context = winterScenarios[selectedIndex];
            forbidden = ["Tropical Beach", "Beach", "Pool", "Swimming pool", "Sunny summer park", "Ocean", "Sand", "Palm trees", "Summer", "Hot weather", "Beach resort", "Seaside", "Tropical", "Paradise beach", "Sunny beach", "Beach scene"];
            return { context, forbidden };
          }

          // REGRA 1: BIKINI LAW (STRICT)
          if (hasBeach) {
            const selectedIndex = Math.floor(Math.random() * beachScenarios.length);
            context = beachScenarios[selectedIndex];
            forbidden = ["Office", "City Street", "Snow", "Gym", "Shopping Mall", "Bedroom", "Urban", "Night", "Winter", "Indoor", "Corporate", "Formal", "Street", "City", "Urban street", "Busy street", "Neon-lit city", "Subway", "Skate park", "Coffee shop", "Rooftop terrace", "Fitness center", "Gym", "Academia", "Workout", "Exercise", "Training", "Modern fitness center", "Fitness", "Sport", "Athletic", "Running track", "Yoga studio", "Crossfit", "Basketball court", "Soccer field"];
            return { context, forbidden };
          }

          // REGRA 2: GYM INTEGRITY (STRICT - Requer UNANIMIDADE)
          if (hasSport && !hasNonSport && !hasBeach) {
            const selectedIndex = Math.floor(Math.random() * fitnessScenarios.length);
            context = fitnessScenarios[selectedIndex];
            forbidden = ["Bedroom", "Luxury Lobby", "Beach (sand)", "Formal Event", "Restaurant", "City Street", "Urban street", "Office", "Shopping Mall", "Beach", "Pool", "Swimming pool", "Ocean", "Tropical", "Resort"];
            return { context, forbidden };
          }

          // REGRA 3: PARTY/GALA
          if (hasParty) {
            const selectedIndex = Math.floor(Math.random() * partyScenarios.length);
            context = partyScenarios[selectedIndex];
            forbidden = ["Beach", "Gym", "Messy Room", "Forest", "Dirt road", "Office", "Daylight"];
            return { context, forbidden };
          }

          // REGRA 4: FORMAL DOMINANCE
          if (hasFormal) {
            const selectedIndex = Math.floor(Math.random() * formalScenarios.length);
            context = formalScenarios[selectedIndex];
            forbidden = ["Beach", "Gym", "Messy Room", "Forest", "Dirt road"];
            return { context, forbidden };
          }

          // REGRA 5: FALLBACK (Safe Zone)
          if ((hasSport && hasNonSport) || (hasBeach && hasWinter)) {
            const selectedIndex = Math.floor(Math.random() * urbanScenarios.length);
            context = urbanScenarios[selectedIndex];
            forbidden = ["Gym", "Beach", "Swimming pool"];
            return { context, forbidden };
          }

          // REGRA 6: CASUAL/STREET
          if (hasCasual) {
            const selectedIndex = Math.floor(Math.random() * urbanScenarios.length);
            context = urbanScenarios[selectedIndex];
            forbidden = ["Gym", "Swimming pool", "Formal wedding"];
            return { context, forbidden };
          }

          // DEFAULT: Urban/Studio
          const selectedIndex = Math.floor(Math.random() * urbanScenarios.length);
          context = urbanScenarios[selectedIndex];
          forbidden = [];
          return { context, forbidden };
        };
        
        const smartScenario = getSmartScenario(productsData, true); // true = isRemix
        
        // MASTER PROMPT PIVOT: Passar apenas STRINGS, NÃO URL de imagem
        scenarioImageUrl = undefined; // SEMPRE undefined - forçar geração via prompt
        scenarioLightingPrompt = smartScenario.context; // Usar o contexto do getSmartScenario como lightingPrompt
        scenarioCategory = undefined; // Não usar categoria específica, deixar o prompt gerar
        scenarioInstructions = undefined; // Não usar instruções de imagem fixa
        
        // IMPORTANTE: Salvar forbiddenScenarios para passar ao orchestrator (negative prompt)
        forbiddenScenarios = smartScenario.forbidden;
        
        // IMPORTANTE: Também passar smartContext para o orchestrator usar no prompt
        // O orchestrator usa smartContext para construir o prompt de cenário
        if (!jobData.options) {
          jobData.options = {};
        }
        jobData.options.smartContext = smartScenario.context;
        
        console.log("[process-job] ✅ REMIX: Cenário determinado via getSmartScenario:", {
          context: smartScenario.context,
          forbidden: smartScenario.forbidden,
          forbiddenCount: smartScenario.forbidden.length,
          totalProdutos: productsData.length,
          nota: "Cenário será GERADO via prompt usando o contexto do getSmartScenario",
        });
      } catch (error: any) {
        console.error("[process-job] ❌ Erro ao buscar cenário para Remix:", {
          error: error?.message,
          stack: error?.stack?.substring(0, 500),
        });
        // Continuar sem cenário específico - usar fallback genérico
        console.warn("[process-job] ⚠️ Continuando com cenário genérico devido ao erro");
      }
    } else if (!isRemix && firstProductOnly.length > 0) {
      // GERAÇÃO NORMAL: Buscar cenário baseado no primeiro produto
      try {
        console.log("[process-job] 🎯 MASTER PROMPT: Buscando cenário baseado APENAS no primeiro produto (índice 0)...");
        console.log("[process-job] 📦 Primeiro produto usado para cenário:", {
          nome: firstProductOnly[0]?.nome || "N/A",
          categoria: firstProductOnly[0]?.categoria || "N/A",
          totalProdutos: productsData.length,
          nota: "Produtos secundários são IGNORADOS para seleção de cenário",
        });
        
        const scenarioFromFirestore = await findScenarioByProductTags(firstProductOnly);
        
        if (scenarioFromFirestore) {
          console.log("[process-job] ✅ Cenário encontrado baseado no primeiro produto:", {
            category: scenarioFromFirestore.category,
            hasImageUrl: !!scenarioFromFirestore.imageUrl,
            imageUrl: scenarioFromFirestore.imageUrl?.substring(0, 100) + "..." || "N/A",
          });
          
          // MASTER PROMPT PIVOT: Passar apenas STRINGS, NÃO URL de imagem
          scenarioImageUrl = undefined; // SEMPRE undefined - forçar geração via prompt
          scenarioLightingPrompt = scenarioFromFirestore.lightingPrompt;
          scenarioCategory = scenarioFromFirestore.category;
          scenarioInstructions = undefined; // Não usar instruções de imagem fixa
        } else {
          console.log("[process-job] ⚠️ Nenhum cenário encontrado, usando prompt genérico");
        }
      } catch (error: any) {
        console.error("[process-job] ❌ Erro ao buscar cenário do Firestore:", error);
        // Continuar sem cenário do Firestore, usar prompt genérico
      }
    }

    // PHASE 31: QUALIDADE REMIX - Calcular smartFraming (mesma lógica do endpoint generate)
    // SEMPRE forçar Full Body Shot para evitar cortes (exceto para apenas acessórios)
    let smartFraming = "Full body shot, feet fully visible, standing on floor"; // PHASE 31: Default Full Body (qualidade Remix)
    const allTextForFraming = productsData.map(p => `${p?.categoria || ""} ${p?.nome || ""}`).join(" ").toLowerCase();
    const hasShoesForFraming = allTextForFraming.match(/calçado|calcado|sapato|tênis|tenis|sneaker|shoe|footwear|bota|boot/i);
    const hasTopForFraming = allTextForFraming.match(/camisa|blusa|blouse|shirt|top|jaqueta|jacket|moletom|hoodie/i);
    const hasBottomForFraming = allTextForFraming.match(/calça|pants|jeans|saia|skirt|shorts|vestido|dress/i);
    const hasOnlyAccessories = allTextForFraming.match(/óculos|oculos|glasses|sunglasses|relógio|relogio|watch|joia|jewelry|joias|cosmético|cosmetico/i) && 
                              !hasTopForFraming && !hasBottomForFraming && !hasShoesForFraming;
    
    if (hasShoesForFraming) {
      smartFraming = "Full body shot, feet fully visible, standing on floor";
      console.log("[process-job] 🦶 PHASE 31: Smart Framing: CALÇADOS detectado - Full body shot (qualidade Remix)");
    } else if (hasOnlyAccessories) {
      smartFraming = "close-up portrait, focus on face and neck";
      console.log("[process-job] 👓 PHASE 31: Smart Framing: APENAS ACESSÓRIOS detectado - Portrait shot");
    } else {
      // PHASE 31: Para roupas, SEMPRE usar Full Body Shot (qualidade Remix) para evitar cortes
      smartFraming = "Full body shot, feet fully visible, standing on floor";
      console.log("[process-job] 👕 PHASE 31: Smart Framing: ROUPAS detectado - FORÇANDO Full Body Shot (qualidade Remix para evitar cortes)");
    }

    // Construir params para o orchestrator
    const params = {
        personImageUrl: jobData.personImageUrl,
        productId: primaryProduct.id,
        productImageUrl: allProductImageUrls[0] || "",
        lojistaId: jobData.lojistaId,
        customerId: jobData.customerId,
        productName: productsData.map(p => p.nome).join(" + "),
        productPrice: productsData.reduce((sum, p) => sum + (p.preco || 0), 0)
          ? `R$ ${productsData.reduce((sum, p) => sum + (p.preco || 0), 0).toFixed(2)}`
          : undefined,
        storeName: lojaData?.nome || "Minha Loja",
        logoUrl: lojaData?.logoUrl,
        scenePrompts: jobData.scenePrompts,
        options: {
          ...jobData.options,
          // IMPORTANTE: TODOS os produtos serão aplicados na composição
          allProductImageUrls, // Array com TODAS as imagens de produtos
          productsData, // Array com TODOS os dados dos produtos
          // MASTER PROMPT PIVOT: Passar apenas STRINGS (categoria/prompt), NÃO URL de imagem
          // scenarioImageUrl deve ser undefined para forçar geração de fundo
          scenarioImageUrl: undefined, // SEMPRE undefined - forçar geração via prompt
          ...(scenarioLightingPrompt && { scenarioLightingPrompt }),
          ...(scenarioCategory && { scenarioCategory }),
          scenarioInstructions: undefined, // Não usar instruções de imagem fixa
          // IMPORTANTE: Passar smartContext, smartFraming e forbiddenScenarios para o orchestrator
          // smartContext será usado no prompt de cenário
          // smartFraming será usado no prompt de enquadramento
          // forbiddenScenarios será usado no negative prompt
          ...(scenarioLightingPrompt && { smartContext: scenarioLightingPrompt }), // smartContext = contexto do cenário
          smartFraming, // Framing inteligente calculado acima
          ...(forbiddenScenarios.length > 0 && { forbiddenScenarios }),
          // REMIX: Forçar nova pose se for remix
          ...(isRemix && { forceNewPose: true }),
        },
    };

    // VALIDAÇÃO FINAL ANTES DE CHAMAR ORCHESTRATOR
    console.log("[process-job] 🔍 Validação final antes de chamar Orchestrator:");
    
    const validationErrors: string[] = [];
    
    if (!params.personImageUrl || params.personImageUrl.trim() === "") {
      validationErrors.push("personImageUrl está vazia ou inválida");
    }
    
    if (!params.productId || params.productId.trim() === "") {
      validationErrors.push("productId está vazio ou inválido");
    }
    
    if (!params.productImageUrl || params.productImageUrl.trim() === "") {
      validationErrors.push("productImageUrl está vazia ou inválida");
    }
    
    if (!params.lojistaId || params.lojistaId.trim() === "") {
      validationErrors.push("lojistaId está vazio ou inválido");
    }
    
    if (!allProductImageUrls || allProductImageUrls.length === 0) {
      validationErrors.push("allProductImageUrls está vazio");
    }
    
    if (!productsData || productsData.length === 0) {
      validationErrors.push("productsData está vazio");
    }
    
    if (validationErrors.length > 0) {
      const errorMsg = `❌ Validação falhou: ${validationErrors.join(", ")}`;
      console.error(`[process-job] ${errorMsg}`);
      console.error("[process-job] Estado dos parâmetros:", {
        hasPersonImageUrl: !!params.personImageUrl,
        personImageUrlLength: params.personImageUrl?.length || 0,
        hasProductId: !!params.productId,
        hasProductImageUrl: !!params.productImageUrl,
        hasLojistaId: !!params.lojistaId,
        allProductImageUrlsCount: allProductImageUrls.length,
        productsDataCount: productsData.length,
      });
      throw new Error(errorMsg);
    }
    
    console.log("[process-job] ✅ Validação passou - todos os parâmetros estão válidos");
    
    console.log("[process-job] 🚀 Chamando Orchestrator com params:", {
      hasPersonImageUrl: !!params.personImageUrl,
      personImageUrl: params.personImageUrl?.substring(0, 100) + "...",
      personImageUrlType: params.personImageUrl?.startsWith("http") ? "HTTP" : params.personImageUrl?.startsWith("data:") ? "BASE64" : "UNKNOWN",
      productId: params.productId,
      productImageUrl: params.productImageUrl?.substring(0, 100) + "...",
      lojistaId: params.lojistaId,
      allProductImageUrlsCount: allProductImageUrls.length,
      allProductImageUrls: allProductImageUrls.map((url, i) => ({
        indice: i + 1,
        tipo: `IMAGEM_PRODUTO_${i + 1}`,
        url: url ? url.substring(0, 80) + "..." : "N/A",
        urlType: url?.startsWith("http") ? "HTTP" : url?.startsWith("data:") ? "BASE64" : "UNKNOWN",
        urlLength: url?.length || 0,
      })),
      productsDataCount: productsData.length,
      productsData: productsData.map(p => ({
        id: p.id,
        nome: p.nome,
        categoria: p.categoria,
      })),
      isRemix,
      forceNewPose: params.options?.forceNewPose,
      gerarNovoLook: params.options?.gerarNovoLook,
      hasScenePrompts: !!(params.scenePrompts && params.scenePrompts.length > 0),
      scenePrompts: params.scenePrompts,
      scenarioCategory: params.options?.scenarioCategory,
      scenarioLightingPrompt: params.options?.scenarioLightingPrompt?.substring(0, 50) || "N/A",
      lookType: params.options?.lookType || "creative",
    });
    
    let finalResult: any;
    try {
      console.log("[process-job] 🚀 Iniciando geração de composição com Orchestrator...");
      console.log("[process-job] 📋 Validação pré-orchestrator:", {
        hasPersonImageUrl: !!params.personImageUrl,
        personImageUrlType: params.personImageUrl?.startsWith("http") ? "HTTP" : params.personImageUrl?.startsWith("data:") ? "BASE64" : "UNKNOWN",
        allProductImageUrlsCount: allProductImageUrls.length,
        allProductImageUrlsValid: allProductImageUrls.every(url => url && (url.startsWith("http") || url.startsWith("data:"))),
        isRemix,
        lookType: params.options?.lookType,
        hasScenarioCategory: !!params.options?.scenarioCategory,
        hasScenarioLightingPrompt: !!params.options?.scenarioLightingPrompt,
        scenarioImageUrl: params.options?.scenarioImageUrl || "undefined (correto - será gerado via prompt)",
      });
      
      finalResult = await orchestrator.createComposition(params);
      
      console.log("[process-job] ✅ Orchestrator retornou resultado:", {
        hasTryonImageUrl: !!finalResult.tryonImageUrl,
        tryonImageUrlLength: finalResult.tryonImageUrl?.length || 0,
        tryonImageUrlPreview: finalResult.tryonImageUrl?.substring(0, 100) || "N/A",
        tryonImageUrlType: finalResult.tryonImageUrl?.startsWith("http") ? "HTTP" : finalResult.tryonImageUrl?.startsWith("data:") ? "BASE64" : "UNKNOWN",
        compositionId: finalResult.compositionId,
        sceneImageUrlsCount: finalResult.sceneImageUrls?.length || 0,
        totalCost: finalResult.totalCost,
        processingTime: finalResult.processingTime,
      });
      
    } catch (orchestratorError: any) {
      console.error("[process-job] ❌ ERRO CRÍTICO no Orchestrator:", {
        message: orchestratorError?.message || "Erro desconhecido",
        name: orchestratorError?.name,
        stack: orchestratorError?.stack?.substring(0, 500),
      });
      console.error("[process-job] 📋 Parâmetros que causaram o erro:", {
        hasPersonImageUrl: !!params.personImageUrl,
        personImageUrlPreview: params.personImageUrl?.substring(0, 100) || "N/A",
        allProductImageUrlsCount: allProductImageUrls.length,
        allProductImageUrls: allProductImageUrls.map((url, i) => ({
          indice: i + 1,
          url: url ? url.substring(0, 80) + "..." : "N/A",
          isValid: url && (url.startsWith("http") || url.startsWith("data:")),
        })),
        isRemix,
        lookType: params.options?.lookType,
        scenarioCategory: params.options?.scenarioCategory,
        scenarioLightingPrompt: params.options?.scenarioLightingPrompt?.substring(0, 50) || "N/A",
        scenarioImageUrl: params.options?.scenarioImageUrl || "undefined (correto)",
      });
      throw orchestratorError;
    }

    // --- ESTRATÉGIA DE SEGURANÇA MÁXIMA ---
    // Extrai apenas a URL como string simples.
    let finalUrl = "";
    const lojistaId = jobData.lojistaId || "unknown";
    
    // VALIDAÇÃO CRÍTICA: Verificar se tryonImageUrl foi retornado
    if (!finalResult.tryonImageUrl) {
      const errorMsg = "Nenhum Look foi gerado - tryonImageUrl não foi retornado pelo orchestrator";
      console.error(`[process-job] ❌ ${errorMsg}`);
      console.error("[process-job] Resultado do orchestrator:", {
        hasTryonImageUrl: !!finalResult.tryonImageUrl,
        hasSceneImageUrls: Array.isArray(finalResult.sceneImageUrls) && finalResult.sceneImageUrls.length > 0,
        compositionId: finalResult.compositionId,
        status: finalResult.status,
        finalResultKeys: Object.keys(finalResult),
      });
      throw new Error(errorMsg);
    }
    
    const imageUrl = String(finalResult.tryonImageUrl);
    // FIX: Se for base64, fazer upload para Storage
    if (imageUrl.startsWith("data:image/")) {
      console.log("[process-job] 🔄 Detectado base64, fazendo upload para Storage...");
      if (!jobId) throw new Error("JobId não disponível para upload");
      finalUrl = await uploadBase64ToStorage(imageUrl, lojistaId, jobId);
    } else {
      finalUrl = imageUrl;
    }

    // Validação final: garantir que temos uma URL válida
    if (!finalUrl || finalUrl.trim() === "") {
      const errorMsg = "Nenhum Look foi gerado - URL final está vazia após processamento";
      console.error(`[process-job] ❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Processar sceneImageUrls também se houver
    let processedSceneUrls: string[] = [];
    if (Array.isArray(finalResult.sceneImageUrls) && finalResult.sceneImageUrls.length > 0) {
      if (!jobId) throw new Error("JobId não disponível para upload de sceneImageUrls");
      const validJobId = jobId; // TypeScript guard
      processedSceneUrls = await Promise.all(
        finalResult.sceneImageUrls.map(async (url: string) => {
          if (url && url.startsWith("data:image/")) {
            return await uploadBase64ToStorage(url, lojistaId, validJobId);
          }
          return url;
        })
      );
    }

    console.log(`[process-job] ✅ Sucesso! URL gerada: ${finalUrl.substring(0, 100)}...`);

    // Incrementar métrica de gerações de API (independente de visualização)
    const lojistaRef = db.collection("lojistas").doc(lojistaId);
    
    try {
      await lojistaRef.update({
        "metrics.api_generations_count": FieldValue.increment(1),
      });
      console.log("[process-job] ✅ Métrica api_generations_count incrementada");
    } catch (metricError) {
      console.warn("[process-job] ⚠️ Erro ao incrementar métrica (não crítico):", metricError);
    }

    // Salva no Firestore usando estrutura PLANA (na raiz).
    // Isso evita o erro "invalid nested entity" 100% das vezes.
    // FIX: Usar JSON.parse/stringify para remover undefined
    const updateData: any = {
      status: "COMPLETED",
      completedAt: FieldValue.serverTimestamp(),
      final_image_url: finalUrl,
      composition_id: String(finalResult.compositionId || ""),
      result: { 
          imageUrl: finalUrl,
          compositionId: finalResult.compositionId,
          sceneImageUrls: processedSceneUrls.length > 0 ? processedSceneUrls : undefined,
          totalCost: typeof finalResult.totalCost === "number" ? finalResult.totalCost : undefined,
          processingTime: typeof finalResult.processingTime === "number" ? finalResult.processingTime : undefined,
          status: "success"
      }
    };
    
    // Limpar undefined values
        const cleanUpdateData = JSON.parse(JSON.stringify(updateData));
        
        await jobsRef.doc(jobId).update(cleanUpdateData);

    return NextResponse.json({ success: true, jobId });

    } catch (error: any) {
    console.error("[process-job] ❌ ERRO FATAL NO PROCESS-JOB:", {
      message: error?.message || "Erro desconhecido",
      name: error?.name,
      stack: error?.stack?.substring(0, 1000),
      errorType: error?.constructor?.name,
    });
    
    // Tenta salvar o erro no Job e fazer rollback do crédito
    try {
        const jobIdFromBody = jobId || (await req.clone().json().catch(()=>({}))).jobId;
        
        if(jobIdFromBody) {
            console.log("[process-job] 🔄 Tentando atualizar job e fazer rollback:", { jobId: jobIdFromBody });
            
            const jobDoc = await db.collection("generation_jobs").doc(jobIdFromBody).get();
            const jobData = jobDoc.data();
            
            // Atualizar status do Job
            await db.collection("generation_jobs").doc(jobIdFromBody).update({
                status: "FAILED",
                error: String(error.message || "Erro desconhecido").substring(0, 500),
                failedAt: new Date().toISOString(),
                errorDetails: {
                  name: error?.name,
                  message: error?.message?.substring(0, 500),
                  stack: error?.stack?.substring(0, 1000),
                }
            });
            
            console.log("[process-job] ✅ Job atualizado com status FAILED");
            
            // Fazer rollback do crédito reservado
            if (jobData?.reservationId && jobData?.lojistaId) {
                console.log("[process-job] 🔄 Fazendo rollback do crédito reservado:", {
                    reservationId: jobData.reservationId,
                    lojistaId: jobData.lojistaId,
                });
                try {
                  await rollbackCredit(jobData.lojistaId, jobData.reservationId);
                  console.log("[process-job] ✅ Rollback de crédito concluído");
                } catch (rollbackError) {
                  console.error("[process-job] ❌ Erro ao fazer rollback de crédito:", rollbackError);
                }
            } else {
              console.warn("[process-job] ⚠️ Não foi possível fazer rollback - dados faltando:", {
                hasReservationId: !!jobData?.reservationId,
                hasLojistaId: !!jobData?.lojistaId,
              });
            }
        } else {
          console.warn("[process-job] ⚠️ JobId não encontrado no body - não foi possível atualizar job");
        }
    } catch(cleanupError: any) {
        console.error("[process-job] ❌ Erro ao fazer cleanup (atualizar job/rollback):", {
          message: cleanupError?.message,
          stack: cleanupError?.stack?.substring(0, 500),
        });
    }
    
    // Retornar erro detalhado para debug
    const errorMessage = error?.message || "Erro desconhecido no processamento";
    console.error("[process-job] 📤 Retornando erro 500 para o cliente:", {
      errorMessage: errorMessage.substring(0, 200),
      errorName: error?.name,
    });
    
    return NextResponse.json({ 
      error: errorMessage,
      errorType: error?.name,
      jobId: jobId || "unknown"
    }, { status: 500 });
  }
}