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

    const mimeType = matches[1];
    const base64Data = matches[2];
    
    // Gerar nome único para o arquivo
    const fileName = `generations/${lojistaId}/job-${jobId}-${Date.now()}.${mimeType === 'png' ? 'png' : 'jpg'}`;
    
    // Criar buffer a partir do base64
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Fazer upload
    const file = bucket.file(fileName);
    await file.save(buffer, {
      metadata: {
        contentType: `image/${mimeType}`,
        cacheControl: 'public, max-age=31536000',
      },
      public: true,
    });
    
    // Retornar URL pública
    const publicUrl = `https://storage.googleapis.com/${storageBucket}/${fileName}`;
    console.log("[uploadBase64ToStorage] ✅ Upload concluído:", publicUrl.substring(0, 100) + "...");
    return publicUrl;
  } catch (error: any) {
    console.error("[uploadBase64ToStorage] Erro ao fazer upload:", error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  let jobId: string | undefined;
  let validatedJobId: string | undefined; // Declarar no escopo externo para uso no catch
  let jobData: any = null;
  
  // Instanciar o orchestrator
  const orchestrator = new CompositionOrchestrator();
  
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

    if (!jobId || typeof jobId !== 'string') {
      console.error("[process-job] ❌ JobId não fornecido no body");
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    // Garantir que jobId é string para TypeScript
    // Após a validação acima, jobId é garantidamente string
    validatedJobId = jobId as string;
    console.log(`[process-job] 📋 VERSAO FINAL BLINDADA - Job: ${validatedJobId}`);
    
    // VALIDAÇÃO: Verificar se o Firestore está acessível
    if (!db) {
      console.error("[process-job] ❌ Firestore não está inicializado");
      throw new Error("Firestore não está inicializado");
    }
    
    const jobsRef = db.collection("generation_jobs");
    
    // VALIDAÇÃO: Verificar se o job existe antes de atualizar
    const jobDocCheck = await jobsRef.doc(validatedJobId).get();
    if (!jobDocCheck.exists) {
      console.error(`[process-job] ❌ Job não encontrado: ${validatedJobId}`);
      return NextResponse.json({ 
        error: `Job não encontrado: ${validatedJobId}` 
      }, { status: 404 });
    }
    
    // PROTEÇÃO CONTRA DUPLICAÇÃO: Verificar se o job já está sendo processado ou já foi processado
    const currentStatus = jobDocCheck.data()?.status;
    const existingCompositionId = jobDocCheck.data()?.composition_id;
    
    // Se já tem compositionId salvo, significa que o job já foi processado
    if (existingCompositionId) {
      console.warn(`[process-job] ⚠️ Job ${validatedJobId} já foi processado com compositionId ${existingCompositionId}. Ignorando processamento duplicado.`);
      return NextResponse.json({ 
        message: `Job já foi processado`,
        status: currentStatus || "COMPLETED",
        compositionId: existingCompositionId,
        jobId: validatedJobId 
      }, { status: 200 });
    }
    
    if (currentStatus === "PROCESSING" || currentStatus === "COMPLETED" || currentStatus === "FAILED") {
      console.warn(`[process-job] ⚠️ Job ${validatedJobId} já está com status ${currentStatus}. Ignorando processamento duplicado.`);
      return NextResponse.json({ 
        message: `Job já foi processado ou está em processamento`,
        status: currentStatus,
        jobId: validatedJobId 
      }, { status: 200 });
    }
    
    // Atualiza status para PROCESSING usando transação para evitar race condition
    // Usamos toISOString() para garantir compatibilidade total
    try {
      await db.runTransaction(async (transaction) => {
        const jobRef = jobsRef.doc(validatedJobId);
        const jobSnapshot = await transaction.get(jobRef);
        
        if (!jobSnapshot.exists) {
          throw new Error("Job não encontrado durante transação");
        }
        
        const jobData = jobSnapshot.data();
        const existingStatus = jobData?.status;
        
        // Verificar novamente dentro da transação para evitar race condition
        if (existingStatus === "PROCESSING" || existingStatus === "COMPLETED" || existingStatus === "FAILED") {
          throw new Error(`Job já está com status ${existingStatus}`);
        }
        
        // Atualizar status dentro da transação
        transaction.update(jobRef, {
          status: "PROCESSING",
          startedAt: new Date().toISOString()
        });
      });
      console.log("[process-job] ✅ Status atualizado para PROCESSING (com proteção contra duplicação)");
    } catch (updateError: any) {
      // Se o erro for porque o job já está sendo processado, retornar sucesso
      if (updateError?.message?.includes("já está com status")) {
        console.warn(`[process-job] ⚠️ ${updateError.message}. Ignorando processamento duplicado.`);
        return NextResponse.json({ 
          message: "Job já está sendo processado",
          jobId: validatedJobId 
        }, { status: 200 });
      }
      
      console.error("[process-job] ❌ Erro ao atualizar status:", {
        error: updateError?.message,
        stack: updateError?.stack?.substring(0, 500),
      });
      // Não falhar a requisição se a atualização falhar por outro motivo
    }
    
    // Buscar dados do job
    jobData = jobDocCheck.data();
    if (!jobData) {
      console.error(`[process-job] ❌ Job data vazio para: ${validatedJobId}`);
      return NextResponse.json({ 
        error: `Job data não encontrado: ${validatedJobId}` 
      }, { status: 404 });
    }
    
    console.log("[process-job] 📦 Job data carregado:", {
      lojistaId: jobData.lojistaId,
      customerId: jobData.customerId,
      hasPersonImageUrl: !!jobData.personImageUrl,
      hasProducts: !!jobData.produtos,
      productsCount: jobData.produtos?.length || 0,
      hasProductIds: !!jobData.productIds,
      productIdsCount: jobData.productIds?.length || 0,
    });

    // Buscar dados da loja
    let lojaData: any = null;
    try {
      const lojaDoc = await db.collection("lojas").doc(jobData.lojistaId).get();
      if (lojaDoc.exists) {
        lojaData = lojaDoc.data();
        console.log("[process-job] ✅ Dados da loja carregados:", lojaData?.nome || "sem nome");
      } else {
        console.warn("[process-job] ⚠️ Loja não encontrada:", jobData.lojistaId);
      }
    } catch (lojaError: any) {
      console.error("[process-job] ❌ Erro ao buscar dados da loja:", lojaError?.message);
      // Não falhar se a loja não for encontrada
    }
    
    // ============================================
    // USAR PRODUTOS DO JOB DATA (já normalizados)
    // ============================================
    // Prioridade: produtos do jobData > productIds do jobData > buscar do Firestore
    let produtosParaSalvar: any[] = [];
    let productIdsParaSalvar: string[] = [];
    
    if (jobData.produtos && Array.isArray(jobData.produtos) && jobData.produtos.length > 0) {
      produtosParaSalvar = jobData.produtos;
      productIdsParaSalvar = jobData.productIds || produtosParaSalvar.map((p: any) => p.id);
      console.log("[process-job] ✅ Usando produtos do jobData:", produtosParaSalvar.length);
      console.log("[process-job] 📦 Produtos do jobData:", produtosParaSalvar.map((p: any) => ({
        id: p.id,
        nome: p.nome,
        preco: p.preco,
        temImagemUrl: !!p.imagemUrl,
      })));
    } else if (jobData.productIds && Array.isArray(jobData.productIds) && jobData.productIds.length > 0) {
      productIdsParaSalvar = jobData.productIds;
      console.log("[process-job] ⚠️ Produtos não encontrados no jobData, usando productIds para buscar do Firestore");
    } else {
      console.warn(`[process-job] ⚠️ productIds inválido ou vazio no jobData: ${JSON.stringify(jobData.productIds)}`);
      console.warn(`[process-job] ⚠️ Tentando buscar produtos dos params.options.productsData...`);
      
      // Última tentativa: buscar de params.options.productsData
      if (jobData.params?.options?.productsData && Array.isArray(jobData.params.options.productsData) && jobData.params.options.productsData.length > 0) {
        produtosParaSalvar = jobData.params.options.productsData;
        productIdsParaSalvar = produtosParaSalvar.map((p: any) => p.id);
        console.log("[process-job] ✅ Produtos encontrados em params.options.productsData:", produtosParaSalvar.length);
      } else {
        const errorMsg = `❌ productIds inválido ou vazio e produtos não encontrados em nenhum lugar`;
      console.error(`[process-job] ${errorMsg}`);
      throw new Error(errorMsg);
    }
    }

    // Buscar produtos do Firestore (apenas se não tiver produtos no jobData)
    let productsData: any[] = [];
    let primaryProduct: any = null;
    let allProductImageUrls: string[] = [];
    
    if (produtosParaSalvar.length > 0) {
      // Usar produtos já normalizados do jobData
      productsData = produtosParaSalvar;
      primaryProduct = productsData[0];
      
      // Extrair todas as URLs de imagens dos produtos
      allProductImageUrls = productsData
        .map((p) => p.productUrl || p.imagemUrl)
        .filter((url): url is string => {
          if (!url || typeof url !== 'string' || url.trim() === '') {
            return false;
          }
          return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/');
        });
      
      console.log("[process-job] ✅ Usando produtos normalizados do jobData, pulando busca no Firestore");
      console.log("[process-job] ✅ Imagens de produtos extraídas:", {
        totalImagens: allProductImageUrls.length,
        imagens: allProductImageUrls.map((url, i) => ({
          indice: i + 1,
          url: url.substring(0, 80) + "...",
          tipo: url.startsWith("http") ? "HTTP" : url.startsWith("data:") ? "BASE64" : "UNKNOWN",
        })),
      });
    } else {
      // Buscar do Firestore usando productIds
    console.log("[process-job] 🔍 Buscando produtos do Firestore:", {
      lojistaId: jobData.lojistaId,
        productIds: productIdsParaSalvar,
        productIdsCount: productIdsParaSalvar.length,
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
          productIdsBuscados: productIdsParaSalvar,
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
      productsData = produtosSnapshot.docs
        .filter(doc => {
          const docId = doc.id;
          const isIncluded = productIdsParaSalvar.includes(docId);
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
        const errorMsg = `Nenhum produto encontrado. ProductIds esperados: ${JSON.stringify(productIdsParaSalvar)}, Produtos encontrados no Firestore: ${produtosSnapshot.docs.map(d => d.id).join(", ")}`;
        console.error(`[process-job] ❌ ${errorMsg}`);
        // Não lançar erro - usar produtos do jobData se disponíveis
        if (produtosParaSalvar.length > 0) {
          console.warn("[process-job] ⚠️ Usando produtos do jobData como fallback");
          productsData = produtosParaSalvar;
        } else {
        throw new Error(errorMsg);
        }
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

      primaryProduct = productsData[0];
      
      // IMPORTANTE: TODOS os produtos serão aplicados na composição
      // allProductImageUrls contém TODAS as imagens de produtos para aplicar na pessoa
      // FIX: Validar que cada produto tem pelo menos uma URL válida
      allProductImageUrls = productsData
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
            productUrl: p.productUrl?.substring(0, 50) || "N/A",
            imagemUrl: p.imagemUrl?.substring(0, 50) || "N/A",
          })),
        });
        throw new Error(errorMsg);
      }
      
      console.log("[process-job] ✅ Imagens de produtos validadas:", {
        totalImagens: allProductImageUrls.length,
        imagens: allProductImageUrls.map((url, i) => ({
          indice: i + 1,
          url: url.substring(0, 80) + "...",
          tipo: url.startsWith("http") ? "HTTP" : url.startsWith("data:") ? "BASE64" : "UNKNOWN",
          })),
        });
      }
      
    // Processar personImageUrl (pode ser data:image/ ou HTTP URL)
    let personImageUrl = jobData.personImageUrl || jobData.params?.personImageUrl;
    
    if (!personImageUrl) {
      const errorMsg = "personImageUrl não encontrado no jobData";
      console.error(`[process-job] ❌ ${errorMsg}`);
      throw new Error(errorMsg);
      }
      
    // Se personImageUrl for data:image/, fazer upload para Storage
      if (personImageUrl.startsWith("data:image/")) {
        try {
        console.log("[process-job] 🔄 Detectado data:image/ para personImageUrl, fazendo upload...");
          personImageUrl = await uploadBase64ToStorage(personImageUrl, jobData.lojistaId, validatedJobId);
        console.log("[process-job] ✅ Upload de personImageUrl concluído:", personImageUrl.substring(0, 100) + "...");
        } catch (uploadError: any) {
        console.error("[process-job] ❌ Erro ao fazer upload de personImageUrl:", uploadError);
        // Continuar com a URL original se o upload falhar
        console.warn("[process-job] ⚠️ Continuando com personImageUrl original");
        }
      } else if (!personImageUrl.startsWith("http://") && !personImageUrl.startsWith("https://")) {
      const errorMsg = `personImageUrl inválido: ${personImageUrl.substring(0, 100)}`;
      console.error(`[process-job] ❌ ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
    // Detectar se é REMIX (baseImageUrl presente)
    const isRemix = !!jobData.baseImageUrl || !!jobData.params?.baseImageUrl;
    console.log("[process-job] 📋 Tipo de geração:", isRemix ? "REMIX" : "NOVO LOOK");

    // Buscar primeiro produto para lógica de cenário
    const firstProductOnly = productsData.slice(0, 1);

    // PHASE 15: Buscar cenário do Firestore baseado nas tags do produto
    let scenarioImageUrl: string | undefined = undefined;
    let scenarioLightingPrompt: string | undefined = undefined;
    let scenarioCategory: string | undefined = undefined;
    let scenarioInstructions: string | undefined = undefined;
    let forbiddenScenarios: string[] = [];

    if (firstProductOnly.length > 0 && !isRemix) {
      try {
        console.log("[process-job] 🔍 Buscando cenário do Firestore para o primeiro produto:", {
          produtoId: firstProductOnly[0].id,
          produtoNome: firstProductOnly[0].nome,
          categoria: firstProductOnly[0].categoria,
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

    // Validação: garantir que temos primaryProduct e allProductImageUrls
    if (!primaryProduct || !primaryProduct.id) {
      const errorMsg = "primaryProduct não encontrado ou inválido";
      console.error(`[process-job] ❌ ${errorMsg}`);
      console.error("[process-job] Debug:", {
        temPrimaryProduct: !!primaryProduct,
        productsDataLength: productsData.length,
        produtosParaSalvarLength: produtosParaSalvar.length,
      });
      throw new Error(errorMsg);
    }
    
    if (!allProductImageUrls || allProductImageUrls.length === 0) {
      const errorMsg = "allProductImageUrls está vazio ou inválido";
      console.error(`[process-job] ❌ ${errorMsg}`);
      console.error("[process-job] Debug:", {
        allProductImageUrlsLength: allProductImageUrls?.length || 0,
        productsDataLength: productsData.length,
        produtosParaSalvarLength: produtosParaSalvar.length,
      });
      throw new Error(errorMsg);
    }

    // ============================================
    // GERAR COMPOSITIONID BASEADO NO JOBID (CRÍTICO PARA EVITAR DUPLICAÇÃO)
    // ============================================
    // Gerar compositionId ANTES de chamar o orchestrator, baseado no jobId
    // Isso garante que o mesmo job sempre gere o mesmo ID, mesmo se processado duas vezes
    const preGeneratedCompositionId = `comp_${validatedJobId}_${Date.now()}`;
    
    // Verificar se já existe uma generation com este compositionId (proteção adicional)
    try {
      const existingGeneration = await db
        .collection("generations")
        .where("compositionId", "==", preGeneratedCompositionId)
        .where("lojistaId", "==", jobData.lojistaId)
        .limit(1)
        .get();
      
      if (!existingGeneration.empty) {
        console.warn(`[process-job] ⚠️ Generation já existe com compositionId ${preGeneratedCompositionId}. Job já foi processado.`);
        return NextResponse.json({ 
          message: `Job já foi processado`,
          compositionId: preGeneratedCompositionId,
          jobId: validatedJobId 
        }, { status: 200 });
      }
    } catch (checkError: any) {
      console.warn("[process-job] ⚠️ Erro ao verificar generation existente (continuando):", checkError.message);
    }
    
    console.log("[process-job] ✅ CompositionId pré-gerado:", preGeneratedCompositionId);

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
        compositionId: preGeneratedCompositionId, // ✅ Passar ID pré-gerado para evitar duplicação
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
    
    if (validationErrors.length > 0) {
      const errorMsg = `Validação falhou: ${validationErrors.join(", ")}`;
      console.error(`[process-job] ❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    console.log("[process-job] ✅ Validação passou, chamando Orchestrator...");
    console.log("[process-job] 📋 Parâmetros finais:", {
      hasPersonImageUrl: !!params.personImageUrl,
      personImageUrlPreview: params.personImageUrl?.substring(0, 100) || "N/A",
      productId: params.productId,
      productImageUrlPreview: params.productImageUrl?.substring(0, 100) || "N/A",
      allProductImageUrlsCount: params.options.allProductImageUrls?.length || 0,
      productsDataCount: params.options.productsData?.length || 0,
      isRemix,
      lookType: params.options?.lookType,
      hasScenarioCategory: !!params.options?.scenarioCategory,
      hasScenarioLightingPrompt: !!params.options?.scenarioLightingPrompt,
      scenarioImageUrl: params.options?.scenarioImageUrl || "undefined (correto - será gerado via prompt)",
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
      
      // ============================================
      // 3. BLINDE A CHAMADA DA IA (Erro 429)
      // ============================================
      try {
      finalResult = await orchestrator.createComposition(params);
      } catch (aiError: any) {
        const errorMessage = aiError?.message || String(aiError);
        
        // Tratar erro 429 (Resource Exhausted) especificamente
        if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("Resource exhausted")) {
          console.error("[process-job] ❌ ERRO 429 - Resource Exhausted na API do Gemini");
          console.error("[process-job] 📋 Detalhes:", {
            message: errorMessage,
            jobId: validatedJobId,
            lojistaId: jobData.lojistaId,
          });
          
          // Atualizar job com erro 429
          await db.collection("generation_jobs").doc(validatedJobId).update({
            status: "FAILED",
            error: "Limite de requisições atingido (429). Aguarde 1 minuto antes de tentar novamente.",
            failedAt: new Date().toISOString(),
            errorDetails: {
              name: "ResourceExhausted",
              message: errorMessage.substring(0, 500),
              errorType: "429_RATE_LIMIT",
            }
          });
          
          // Fazer rollback do crédito
          if (jobData?.reservationId && jobData?.lojistaId) {
            try {
              await rollbackCredit(jobData.lojistaId, jobData.reservationId);
              console.log("[process-job] ✅ Rollback de crédito realizado (erro 429)");
            } catch (rollbackError) {
              console.error("[process-job] ❌ Erro ao fazer rollback de crédito:", rollbackError);
            }
          }
          
          // Retornar erro amigável
          return NextResponse.json({
            error: "Limite de requisições atingido",
            details: "Muitas requisições foram feitas muito rápido. Por favor, aguarde pelo menos 1 minuto antes de tentar gerar outro look.",
            errorType: "429_RATE_LIMIT",
            jobId: validatedJobId,
          }, { status: 429 });
        }
        
        // Para outros erros, relançar
        throw aiError;
      }
      
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
      finalUrl = await uploadBase64ToStorage(imageUrl, lojistaId, validatedJobId);
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
      const validJobId = validatedJobId; // TypeScript guard
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

    // ============================================
    // 4. FORCE O SALVAMENTO NO FIRESTORE (Job + Generation)
    // ============================================
    // Garantir que produtos sejam salvos mesmo se a IA falhar depois
    const produtosFinaisParaSalvar = jobData.produtos && jobData.produtos.length > 0
      ? jobData.produtos
      : (productsData.length > 0 ? productsData : []);
    
    const productIdsFinaisParaSalvar = jobData.productIds && jobData.productIds.length > 0
      ? jobData.productIds
      : (productsData.map((p: any) => p.id));
    
    console.log("💾 [SALVANDO] Gravando", produtosFinaisParaSalvar.length, "produtos no job e generation.");
    console.log("💾 [SALVANDO] Detalhes:", {
      produtos: produtosFinaisParaSalvar.map((p: any) => ({
        id: p.id,
        nome: p.nome,
        preco: p.preco,
        temImagemUrl: !!p.imagemUrl,
      })),
      productIds: productIdsFinaisParaSalvar,
    });

    // Salva no Firestore usando estrutura PLANA (na raiz).
    // Isso evita o erro "invalid nested entity" 100% das vezes.
    // FIX: Usar JSON.parse/stringify para remover undefined
    const updateData: any = {
      status: "COMPLETED",
      completedAt: FieldValue.serverTimestamp(),
      final_image_url: finalUrl,
      composition_id: String(finalResult.compositionId || ""),
      // ✅ FORCE: Produtos salvos no job
      produtos: produtosFinaisParaSalvar,
      productIds: productIdsFinaisParaSalvar,
      temProdutos: produtosFinaisParaSalvar.length > 0,
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
        
        await jobsRef.doc(validatedJobId).update(cleanUpdateData);

    // ============================================
    // SALVAR GENERATION COM PRODUTOS (CRÍTICO)
    // ============================================
    if (finalResult.compositionId && jobData.lojistaId) {
      try {
        const { saveGeneration } = await import("@/lib/firestore/generations");
        
        // Garantir que temos produtos para salvar
        const produtosParaGeneration = produtosFinaisParaSalvar.length > 0 
          ? produtosFinaisParaSalvar 
          : (productsData.length > 0 ? productsData : []);
        
        const productIdsParaGeneration = productIdsFinaisParaSalvar.length > 0
          ? productIdsFinaisParaSalvar
          : (productsData.map((p: any) => p.id));
        
        await saveGeneration({
          lojistaId: jobData.lojistaId,
          userId: jobData.customerId || "unknown",
          compositionId: finalResult.compositionId,
          jobId: validatedJobId,
          imagemUrl: finalUrl,
          uploadImageUrl: jobData.params?.personImageUrl || null,
          productIds: productIdsParaGeneration,
          productName: productsData[0]?.nome || null,
          customerName: jobData.params?.customerName || null,
          produtos: produtosParaGeneration, // ✅ Array completo de objetos
        });
        console.log("[process-job] ✅ Generation salva com produtos:", {
          compositionId: finalResult.compositionId,
          totalProdutos: produtosParaGeneration.length,
          produtos: produtosParaGeneration.map((p: any) => ({
            id: p.id,
            nome: p.nome,
            preco: p.preco,
            temImagemUrl: !!p.imagemUrl,
          })),
        });
        
        // ============================================
        // REGISTRAR PRODUTOS NO PRODUCTREGISTRY
        // ============================================
        if (produtosParaGeneration.length > 0 && finalResult.compositionId) {
          try {
            const { registerCompositionProducts } = await import("@/lib/firestore/productRegistry");
            await registerCompositionProducts(jobData.lojistaId, finalResult.compositionId, produtosParaGeneration);
            console.log("[process-job] ✅ Produtos registrados no ProductRegistry:", produtosParaGeneration.length);
          } catch (registryError: any) {
            console.warn("[process-job] ⚠️ Erro ao registrar produtos no ProductRegistry:", registryError.message);
            // Não falhar se o registro falhar
          }
        }
        
        // ============================================
        // SALVAR COMPOSIÇÃO COM PRODUTOS (CRÍTICO)
        // ============================================
        if (finalResult.compositionId && jobData.lojistaId) {
          try {
            const composicaoData: any = {
              lojistaId: jobData.lojistaId,
              customerId: jobData.customerId || null,
              imagemUrl: finalUrl,
              produtos: produtosParaGeneration,
              productIds: productIdsParaGeneration,
              temProdutos: produtosParaGeneration.length > 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              status: "completed",
              jobId: validatedJobId || null,
              sceneImageUrls: processedSceneUrls.length > 0 ? processedSceneUrls : null,
            };
            
            // Salvar na subcoleção lojas/{lojistaId}/composicoes
            await db
              .collection("lojas")
              .doc(jobData.lojistaId)
              .collection("composicoes")
              .doc(finalResult.compositionId)
              .set(composicaoData);
            
            console.log("[process-job] ✅ Composição salva na subcoleção com produtos:", {
              compositionId: finalResult.compositionId,
              totalProdutos: produtosParaGeneration.length,
              produtos: produtosParaGeneration.map((p: any) => ({
                id: p.id,
                nome: p.nome,
                preco: p.preco,
                temImagemUrl: !!p.imagemUrl,
              })),
            });
            
            // Também salvar na collection raiz "composicoes" para compatibilidade
            try {
              await db
                .collection("composicoes")
                .doc(finalResult.compositionId)
                .set(composicaoData);
              console.log("[process-job] ✅ Composição também salva na collection raiz");
            } catch (rootError: any) {
              console.warn("[process-job] ⚠️ Erro ao salvar composição na collection raiz:", rootError.message);
              // Não falhar se falhar
            }
          } catch (compError: any) {
            console.error("[process-job] ⚠️ Erro ao salvar composição:", compError);
            console.error("[process-job] Stack:", compError?.stack);
            // Não falhar o job se a composição não for salva, mas logar o erro
          }
        }
      } catch (genError: any) {
        console.error("[process-job] ⚠️ Erro ao salvar generation:", genError);
        console.error("[process-job] Stack:", genError?.stack);
        // Não falhar o job se a generation não for salva, mas logar o erro
      }
    } else {
      console.warn("[process-job] ⚠️ Não foi possível salvar generation - dados faltando:", {
        temCompositionId: !!finalResult.compositionId,
        temLojistaId: !!jobData.lojistaId,
        temCustomerId: !!jobData.customerId,
      });
    }

    return NextResponse.json({ success: true, jobId: validatedJobId });
    } catch (error: any) {
    console.error("[process-job] ❌ ERRO FATAL NO PROCESS-JOB:", {
      message: error?.message || "Erro desconhecido",
      name: error?.name,
      stack: error?.stack?.substring(0, 1000),
      errorType: error?.constructor?.name,
    });
    
    // Tenta salvar o erro no Job e fazer rollback do crédito
    try {
        const jobIdFromBody = validatedJobId || (await req.clone().json().catch(() => ({}))).jobId;
        
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
      jobId: validatedJobId || "unknown"
    }, { status: 500 });
  }
}
