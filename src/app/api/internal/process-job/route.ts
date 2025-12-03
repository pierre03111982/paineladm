import { NextRequest, NextResponse } from "next/server";
import { db, getAdminStorage } from "@/lib/firebaseAdmin";
import { CompositionOrchestrator } from "@/lib/ai-services/composition-orchestrator";
import { FieldValue } from "firebase-admin/firestore";
import { findScenarioByProductTags } from "@/lib/scenarioMatcher";
import { rollbackCredit } from "@/lib/financials";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

/**
 * Faz upload de base64 data URL para Firebase Storage e retorna URL pública
 */
async function uploadBase64ToStorage(
  imageUrl: string,
  lojistaId: string,
  jobId: string
): Promise<string> {
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
  try {
    const body = await req.json();
    const { jobId } = body;

    if (!jobId) return NextResponse.json({ error: "Job ID required" }, { status: 400 });

    console.log(`[process-job] VERSAO FINAL BLINDADA - Job: ${jobId}`);
    
    const jobsRef = db.collection("generation_jobs");
    
    // Atualiza status para PROCESSING
    // Usamos toISOString() para garantir compatibilidade total
    await jobsRef.doc(jobId).update({
      status: "PROCESSING",
      startedAt: new Date().toISOString()
    });

    // Executa IA
    const orchestrator = new CompositionOrchestrator();
    const jobDoc = await jobsRef.doc(jobId).get();
    const jobData = jobDoc.data();
    
    if (!jobData) {
      throw new Error("Job não encontrado ou sem dados");
    }

    // FIX: Construir params a partir dos campos do job (não de jobData.params)
    // O job é criado com campos diretos: personImageUrl, productIds, options, etc.
    if (!jobData.personImageUrl) {
      throw new Error(`❌ personImageUrl inválida ou não fornecida: ${jobData.personImageUrl}`);
    }

    // Buscar produtos do Firestore
      const produtosSnapshot = await db
        .collection("lojas")
        .doc(jobData.lojistaId)
        .collection("produtos")
        .get();

      const productsData = produtosSnapshot.docs
      .filter(doc => jobData.productIds?.includes(doc.id))
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Array<{
          id: string;
          nome?: string;
          preco?: number;
          productUrl?: string;
          imagemUrl?: string;
          categoria?: string;
          [key: string]: any;
        }>;

      if (productsData.length === 0) {
        throw new Error("Nenhum produto encontrado");
      }

      const primaryProduct = productsData[0];
      
      // IMPORTANTE: TODOS os produtos serão aplicados na composição
      // allProductImageUrls contém TODAS as imagens de produtos para aplicar na pessoa
      const allProductImageUrls = productsData
        .map(p => p.productUrl || p.imagemUrl)
        .filter(Boolean);

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
    
    // Verificar se é remix (MASTER PROMPT: Detecção correta de remix)
    // Remix pode ser detectado por: scenePrompts OU gerarNovoLook OU forceNewPose
    // No REMIX: Aplicar TODOS os produtos + Gerar NOVO cenário + Mudar pose
    const isRemix = (jobData.scenePrompts && jobData.scenePrompts.length > 0) || 
                    jobData.options?.gerarNovoLook === true || 
                    jobData.options?.forceNewPose === true;
    
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
      // LÓGICA REMIX AGRESSIVA: 
      // 1. Aplicar TODOS os produtos na composição (allProductImageUrls)
      // 2. Gerar NOVO cenário aleatório (baseado no 1º produto para categoria)
      // 3. Mudar a pose da pessoa (forceNewPose será passado para o orchestrator)
      try {
        console.log("[process-job] 🎨 MASTER PROMPT: REMIX AGRESSIVO");
        console.log("[process-job] 📦 Produtos a aplicar na composição:", {
          totalProdutos: productsData.length,
          produtos: productsData.map(p => p.nome || "N/A"),
          nota: "TODOS os produtos serão aplicados na pessoa",
        });
        console.log("[process-job] 🎯 Buscando NOVO cenário baseado no 1º produto:", {
          primeiroProduto: firstProductOnly[0]?.nome || "N/A",
          categoria: firstProductOnly[0]?.categoria || "N/A",
          nota: "Cenário será baseado no 1º produto, mas TODOS os produtos serão aplicados",
        });
        // Buscar cenário baseado no primeiro produto para identificar categoria
        const baseScenario = await findScenarioByProductTags(firstProductOnly);
        
        if (baseScenario) {
          // Buscar TODOS os cenários da mesma categoria
          const { findScenarioByCategory } = await import("@/lib/scenarioMatcher");
          const categoryScenarios = await findScenarioByCategory(baseScenario.category);
          
          if (categoryScenarios && categoryScenarios.length > 0) {
            // Escolher aleatório (pode ser o mesmo ou diferente - importante é variar)
            const randomScenario = categoryScenarios[Math.floor(Math.random() * categoryScenarios.length)];
            // MASTER PROMPT PIVOT: Passar apenas STRINGS, NÃO URL de imagem
            scenarioImageUrl = undefined; // SEMPRE undefined - forçar geração via prompt
            scenarioLightingPrompt = randomScenario.lightingPrompt || baseScenario.lightingPrompt;
            scenarioCategory = randomScenario.category;
            scenarioInstructions = undefined; // Não usar instruções de imagem fixa
            console.log("[process-job] ✅ REMIX: Novo cenário aleatório selecionado:", {
              category: scenarioCategory,
              totalOptions: categoryScenarios.length,
              isDifferent: randomScenario.imageUrl !== baseScenario.imageUrl,
            });
          } else {
            // MASTER PROMPT PIVOT: Passar apenas STRINGS, NÃO URL de imagem
            scenarioImageUrl = undefined; // SEMPRE undefined - forçar geração via prompt
            scenarioLightingPrompt = baseScenario.lightingPrompt;
            scenarioCategory = baseScenario.category;
            scenarioInstructions = undefined; // Não usar instruções de imagem fixa
          }
        }
      } catch (error: any) {
        console.error("[process-job] ❌ Erro ao buscar cenário para Remix:", error);
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
            imageUrl: scenarioFromFirestore.imageUrl.substring(0, 100) + "...",
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
          // REMIX: Forçar nova pose se for remix
          ...(isRemix && { forceNewPose: true }),
        },
    };

    console.log("[process-job] Chamando Orchestrator com params:", {
      hasPersonImageUrl: !!params.personImageUrl,
      personImageUrl: params.personImageUrl?.substring(0, 100) + "...",
      productId: params.productId,
      productImageUrl: params.productImageUrl?.substring(0, 100) + "...",
      lojistaId: params.lojistaId,
      allProductImageUrlsCount: allProductImageUrls.length,
    });
    
    const finalResult = await orchestrator.createComposition(params);

    // --- ESTRATÉGIA DE SEGURANÇA MÁXIMA ---
    // Extrai apenas a URL como string simples.
    let finalUrl = "";
    const lojistaId = jobData.lojistaId || "unknown";
    
    if (finalResult.tryonImageUrl) {
      const imageUrl = String(finalResult.tryonImageUrl);
      // FIX: Se for base64, fazer upload para Storage
      if (imageUrl.startsWith("data:image/")) {
        console.log("[process-job] 🔄 Detectado base64, fazendo upload para Storage...");
        finalUrl = await uploadBase64ToStorage(imageUrl, lojistaId, jobId);
      } else {
        finalUrl = imageUrl;
      }
    }

    // Processar sceneImageUrls também se houver
    let processedSceneUrls: string[] = [];
    if (Array.isArray(finalResult.sceneImageUrls) && finalResult.sceneImageUrls.length > 0) {
      processedSceneUrls = await Promise.all(
        finalResult.sceneImageUrls.map(async (url: string) => {
          if (url && url.startsWith("data:image/")) {
            return await uploadBase64ToStorage(url, lojistaId, jobId);
          }
          return url;
        })
      );
    }

    console.log(`[process-job] Sucesso! URL gerada: ${finalUrl.substring(0, 100)}...`);

    // Incrementar métrica de gerações de API (independente de visualização)
    // lojistaId já foi declarado acima (linha 238)
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
    console.error("[process-job] ERRO FATAL:", error);
    
    // Tenta salvar o erro no Job e fazer rollback do crédito
    try {
        const b = await req.clone().json().catch(()=>({}));
        if(b.jobId) {
            const jobDoc = await db.collection("generation_jobs").doc(b.jobId).get();
            const jobData = jobDoc.data();
            
            // Atualizar status do Job
            await db.collection("generation_jobs").doc(b.jobId).update({
                status: "FAILED",
                error: String(error.message).substring(0, 200),
                failedAt: new Date().toISOString()
            });
            
            // Fazer rollback do crédito reservado
            if (jobData?.reservationId && jobData?.lojistaId) {
                console.log("[process-job] 🔄 Fazendo rollback do crédito reservado:", {
                    reservationId: jobData.reservationId,
                    lojistaId: jobData.lojistaId,
                });
        await rollbackCredit(jobData.lojistaId, jobData.reservationId);
            }
        }
    } catch(e) {
        console.error("[process-job] Erro ao fazer rollback:", e);
    }
    
    return NextResponse.json({ error: String(error.message) }, { status: 500 });
  }
}