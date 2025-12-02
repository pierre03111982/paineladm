/**
 * PHASE 27: Endpoint Interno de Processamento de Jobs
 * 
 * Este endpoint processa Jobs de geração de forma assíncrona.
 * É chamado automaticamente quando um Job é criado, ou pode ser chamado manualmente.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminStorage } from "@/lib/firebaseAdmin";
import { getCompositionOrchestrator } from "@/lib/ai-services/composition-orchestrator";
import { rollbackCredit } from "@/lib/financials";
import { FieldValue } from "firebase-admin/firestore";
// Tipos locais (se não existirem em @/lib/types)
type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

interface GenerationJob {
  id: string;
  lojistaId: string;
  customerId?: string;
  customerName?: string;
  status: JobStatus;
  reservationId: string;
  createdAt: any;
  startedAt?: any;
  completedAt?: any;
  failedAt?: any;
  error?: string;
  errorDetails?: any;
  personImageUrl: string;
  productIds: string[];
  productUrl?: string;
  scenePrompts?: string[];
  options?: any;
  result?: {
    compositionId?: string;
    imageUrl?: string;
    sceneImageUrls?: string[];
    totalCost?: number;
    processingTime?: number;
  };
  apiCost?: number;
  viewedAt?: any;
  creditCommitted?: boolean;
  retryCount?: number; // PHASE 27: Contador de tentativas
  maxRetries?: number; // PHASE 27: Máximo de tentativas (padrão: 3)
}

const db = getAdminDb();

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

/**
 * Faz upload de base64 data URL para Firebase Storage e retorna URL pública
 * Se não for base64 ou for URL HTTP/HTTPS, retorna como está
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

  // Se for base64 mas pequeno (< 100KB), pode salvar direto
  // Mas para evitar problemas, vamos fazer upload de qualquer base64
  try {
    const storage = getAdminStorage();
    const bucket = storage.bucket();
    
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
    // Se falhar, tentar retornar como está (pode causar erro depois, mas melhor que quebrar aqui)
    return imageUrl;
  }
}

export async function POST(request: NextRequest) {
  // Verificar se é requisição interna
  const internalHeader = request.headers.get("X-Internal-Request");
  if (internalHeader !== "true" && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId é obrigatório" },
        { status: 400 }
      );
    }

    const jobsRef = db.collection("generation_jobs");
    const jobDoc = await jobsRef.doc(jobId).get();

    if (!jobDoc.exists) {
      return NextResponse.json(
        { error: "Job não encontrado" },
        { status: 404 }
      );
    }

    const jobData = jobDoc.data() as GenerationJob;

    // PHASE 27: Verificar se o Job pode ser reprocessado (retry)
    const retryCount = jobData.retryCount || 0;
    const maxRetries = jobData.maxRetries || 3;
    
    // Se já está completo, retornar resultado
    if (jobData.status === "COMPLETED") {
      return NextResponse.json(
        { 
          message: "Job já processado",
          status: jobData.status,
          result: jobData.result,
        },
        { status: 200 }
      );
    }
    
    // Se falhou mas ainda pode tentar novamente
    if (jobData.status === "FAILED" && retryCount < maxRetries) {
      console.log("[process-job] Job falhou anteriormente, tentando novamente:", {
        jobId,
        retryCount,
        maxRetries,
        previousError: jobData.error,
      });
      // Resetar status para PENDING para reprocessar
      await jobsRef.doc(jobId).update({
        status: "PENDING" as JobStatus,
        retryCount: retryCount + 1,
        error: null,
        errorDetails: null,
      });
    } else if (jobData.status === "FAILED" && retryCount >= maxRetries) {
      return NextResponse.json(
        { 
          message: "Job falhou após todas as tentativas",
          status: jobData.status,
          error: jobData.error,
          retryCount,
          maxRetries,
        },
        { status: 200 }
      );
    }

    // Atualizar status para PROCESSING
    await jobsRef.doc(jobId).update({
      status: "PROCESSING" as JobStatus,
      startedAt: FieldValue.serverTimestamp(),
    });

    console.log("[process-job] Iniciando processamento do Job:", {
      jobId,
      lojistaId: jobData.lojistaId,
      reservationId: jobData.reservationId,
    });

    try {
      // Buscar dados da loja
      const lojaDoc = await db.collection("lojas").doc(jobData.lojistaId).get();
      const lojaData = lojaDoc.exists ? lojaDoc.data() : null;

      // Buscar produtos
      const produtosSnapshot = await db
        .collection("lojas")
        .doc(jobData.lojistaId)
        .collection("produtos")
        .get();

      const productsData = produtosSnapshot.docs
        .filter(doc => jobData.productIds.includes(doc.id))
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
      const allProductImageUrls = productsData
        .map(p => p.productUrl || p.imagemUrl)
        .filter(Boolean);

      // Preparar dados para o orchestrator
      const orchestrator = getCompositionOrchestrator();
      const startTime = Date.now();

      const creativeResult = await orchestrator.createComposition({
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
          allProductImageUrls,
          productsData,
        },
      });

      const processingTime = Date.now() - startTime;

      // PHASE 27: Incrementar métrica de gerações de API (sempre, independente de visualização)
      await db.collection("lojistas").doc(jobData.lojistaId).update({
        "metrics.api_generations_count": FieldValue.increment(1),
      });

      // Atualizar Job com resultado
      // PHASE 27: Garantir que todos os valores sejam primitivos serializáveis pelo Firestore
      // Firestore não aceita objetos aninhados complexos, apenas primitivos e arrays de primitivos
      const sanitizedResult: any = {};
      
      // Sanitizar compositionId
      if (creativeResult.compositionId) {
        sanitizedResult.compositionId = String(creativeResult.compositionId);
      }
      
      // Sanitizar imageUrl - FIX: Converter base64 para Storage URL se necessário
      if (creativeResult.tryonImageUrl) {
        const imageUrl = String(creativeResult.tryonImageUrl);
        // Se for base64 data URL, fazer upload para Storage
        if (imageUrl.startsWith("data:image/")) {
          console.log("[process-job] 🔄 Detectado base64, fazendo upload para Storage...");
          sanitizedResult.imageUrl = await uploadBase64ToStorage(
            imageUrl,
            jobData.lojistaId,
            jobId
          );
        } else {
          sanitizedResult.imageUrl = imageUrl;
        }
      }
      
      // Sanitizar sceneImageUrls - garantir que seja array de strings
      // FIX: Converter base64 para Storage URL se necessário
      if (Array.isArray(creativeResult.sceneImageUrls) && creativeResult.sceneImageUrls.length > 0) {
        // Primeiro, processar todas as URLs (incluindo uploads de base64)
        const processedUrls = await Promise.all(
          creativeResult.sceneImageUrls.map(async (url: any) => {
            let imageUrl: string;
            // Se for string, usar diretamente
            if (typeof url === "string") {
              imageUrl = url;
            } else if (url && typeof url === "object") {
              // Se for objeto com propriedade imageUrl ou url, extrair
              imageUrl = String(url.imageUrl || url.url || "");
            } else {
              // Caso contrário, converter para string
              imageUrl = String(url || "");
            }
            
            // Se for base64, fazer upload para Storage
            if (imageUrl && imageUrl.startsWith("data:image/")) {
              return await uploadBase64ToStorage(imageUrl, jobData.lojistaId, jobId);
            }
            
            return imageUrl;
          })
        );
        
        // Filtrar URLs vazias após processamento
        sanitizedResult.sceneImageUrls = processedUrls.filter(
          (url: string) => url && url.length > 0
        );
        
        // Se após sanitização o array estiver vazio, não incluir
        if (sanitizedResult.sceneImageUrls.length === 0) {
          delete sanitizedResult.sceneImageUrls;
        }
      }
      
      // Sanitizar totalCost
      if (typeof creativeResult.totalCost === "number" && !isNaN(creativeResult.totalCost)) {
        sanitizedResult.totalCost = creativeResult.totalCost;
      }
      
      // Sanitizar processingTime
      if (typeof processingTime === "number" && !isNaN(processingTime)) {
        sanitizedResult.processingTime = processingTime;
      }
      
      console.log("[process-job] Result sanitizado antes de salvar:", {
        hasCompositionId: !!sanitizedResult.compositionId,
        hasImageUrl: !!sanitizedResult.imageUrl,
        sceneImageUrlsCount: sanitizedResult.sceneImageUrls?.length || 0,
        hasTotalCost: typeof sanitizedResult.totalCost === "number",
        hasProcessingTime: typeof sanitizedResult.processingTime === "number",
        sanitizedResultKeys: Object.keys(sanitizedResult),
      });
      
      // PHASE 27: Função recursiva para garantir que o objeto seja completamente plano
      const deepSanitize = (obj: any, depth = 0): any => {
        // Limitar profundidade para evitar loops infinitos
        if (depth > 3) return null;
        
        if (obj === null || obj === undefined) return null;
        
        // Primitivos: retornar diretamente
        if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
          return obj;
        }
        
        // Arrays: sanitizar cada item
        if (Array.isArray(obj)) {
          const sanitized = obj
            .map((item: any) => {
              if (typeof item === "string") return item;
              if (typeof item === "number") return item;
              if (typeof item === "boolean") return item;
              // Se for objeto, tentar extrair string
              if (item && typeof item === "object") {
                const str = String(item.imageUrl || item.url || item.toString || "");
                return str.length > 0 ? str : null;
              }
              return null;
            })
            .filter((item: any) => item !== null && item !== undefined);
          
          return sanitized.length > 0 ? sanitized : null;
        }
        
        // Objetos: converter para objeto plano (sem aninhamento)
        if (typeof obj === "object") {
          const flat: any = {};
          for (const [key, value] of Object.entries(obj)) {
            // Ignorar chaves que começam com _ ou são funções
            if (key.startsWith("_") || typeof value === "function") continue;
            
            const sanitized = deepSanitize(value, depth + 1);
            if (sanitized !== null && sanitized !== undefined) {
              // Garantir que a chave seja string válida
              const safeKey = String(key);
              if (typeof sanitized === "string" || typeof sanitized === "number" || typeof sanitized === "boolean") {
                flat[safeKey] = sanitized;
              } else if (Array.isArray(sanitized) && sanitized.length > 0) {
                flat[safeKey] = sanitized;
              }
            }
          }
          return Object.keys(flat).length > 0 ? flat : null;
        }
        
        return null;
      };
      
      // Aplicar sanitização profunda
      const finalResult = deepSanitize(sanitizedResult);
      
      // Se após sanitização não houver nada válido, criar estrutura mínima
      if (!finalResult || (typeof finalResult === "object" && Object.keys(finalResult).length === 0)) {
        console.warn("[process-job] ⚠️ Result vazio após sanitização, criando estrutura mínima");
        const minimalResult: any = {};
        if (creativeResult.compositionId) minimalResult.compositionId = String(creativeResult.compositionId);
        if (creativeResult.tryonImageUrl) minimalResult.imageUrl = String(creativeResult.tryonImageUrl);
        Object.assign(finalResult || {}, minimalResult);
      }
      
      console.log("[process-job] Result final validado:", {
        keys: finalResult ? Object.keys(finalResult) : [],
        hasCompositionId: !!finalResult?.compositionId,
        hasImageUrl: !!finalResult?.imageUrl,
        sceneImageUrlsType: Array.isArray(finalResult?.sceneImageUrls) ? "array" : typeof finalResult?.sceneImageUrls,
        finalResultJSON: JSON.stringify(finalResult).substring(0, 200),
      });
      
      // Validar que finalResult não contém objetos aninhados
      const validateFlat = (obj: any, path = "root"): boolean => {
        if (obj === null || obj === undefined) return true;
        if (typeof obj !== "object") return true;
        if (Array.isArray(obj)) {
          return obj.every((item, idx) => validateFlat(item, `${path}[${idx}]`));
        }
        // Se chegou aqui, é um objeto - verificar se tem propriedades não primitivas
        for (const [key, value] of Object.entries(obj)) {
          if (value !== null && value !== undefined && typeof value === "object" && !Array.isArray(value)) {
            console.error(`[process-job] ❌ Objeto aninhado encontrado em ${path}.${key}:`, typeof value);
            return false;
          }
          if (!validateFlat(value, `${path}.${key}`)) return false;
        }
        return true;
      };
      
      if (!validateFlat(finalResult)) {
        console.error("[process-job] ❌ Result ainda contém objetos aninhados após sanitização!");
        // Criar versão ultra-simplificada
        const ultraSimple: any = {};
        if (creativeResult.compositionId) ultraSimple.compositionId = String(creativeResult.compositionId);
        if (creativeResult.tryonImageUrl) ultraSimple.imageUrl = String(creativeResult.tryonImageUrl);
        Object.assign(finalResult, ultraSimple);
      }
      
      // PHASE 27: Tentar salvar com estrutura validada
      // FIX: Remover valores 'undefined' que o Firestore rejeita usando JSON.parse/stringify
      try {
        const updateData: any = {
          status: "COMPLETED" as JobStatus,
          completedAt: FieldValue.serverTimestamp(),
        };
        
        // Adicionar result apenas se for válido
        if (finalResult && typeof finalResult === "object" && Object.keys(finalResult).length > 0) {
          // FIX: Remove 'undefined' values which Firestore rejects
          // JSON.parse/stringify remove automaticamente campos undefined e garante Plain Object
          try {
            updateData.result = JSON.parse(JSON.stringify(finalResult));
          } catch (jsonError) {
            // Se JSON falhar (ex: circular reference), usar sanitização manual
            console.warn("[process-job] JSON.parse falhou, usando sanitização manual:", jsonError);
            const manualClean: any = {};
            for (const [key, value] of Object.entries(finalResult)) {
              if (value !== undefined && value !== null) {
                if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
                  manualClean[key] = value;
                } else if (Array.isArray(value)) {
                  manualClean[key] = value.filter(item => item !== undefined && item !== null);
                }
              }
            }
            updateData.result = manualClean;
          }
        } else {
          // Estrutura mínima absoluta - FIX: Converter base64 se necessário
          let minimalImageUrl = String(creativeResult.tryonImageUrl || "");
          if (minimalImageUrl.startsWith("data:image/")) {
            console.log("[process-job] 🔄 Estrutura mínima: convertendo base64 para Storage...");
            minimalImageUrl = await uploadBase64ToStorage(
              minimalImageUrl,
              jobData.lojistaId,
              jobId
            );
          }
          updateData.result = {
            compositionId: String(creativeResult.compositionId || ""),
            imageUrl: minimalImageUrl,
          };
        }
        
        // Adicionar apiCost
        const apiCostValue = typeof creativeResult.totalCost === "number" && !isNaN(creativeResult.totalCost) 
          ? creativeResult.totalCost 
          : 0;
        if (apiCostValue > 0) {
          updateData.apiCost = apiCostValue;
        }
        
        // FIX: Limpar updateData também para remover undefined
        const cleanUpdateData = JSON.parse(JSON.stringify(updateData));
        
        console.log("[process-job] Tentando atualizar Job com:", {
          hasResult: !!cleanUpdateData.result,
          resultKeys: cleanUpdateData.result ? Object.keys(cleanUpdateData.result) : [],
          hasApiCost: !!cleanUpdateData.apiCost,
        });
        
        await jobsRef.doc(jobId).update(cleanUpdateData);
        console.log("[process-job] ✅ Job atualizado com sucesso no Firestore");
      } catch (firestoreError: any) {
        console.error("[process-job] ❌ Erro ao atualizar Job no Firestore:", firestoreError);
        console.error("[process-job] Detalhes do erro:", {
          message: firestoreError.message,
          code: firestoreError.code,
          resultStructure: JSON.stringify(finalResult, null, 2),
          resultType: typeof finalResult,
          resultKeys: finalResult ? Object.keys(finalResult) : [],
        });
        
        // PHASE 27: Tentar salvar com estrutura absolutamente mínima como último recurso
        try {
          console.log("[process-job] Tentando salvar com estrutura mínima absoluta...");
          // FIX: Converter base64 para Storage URL antes de salvar
          let minimalImageUrl = String(creativeResult.tryonImageUrl || "");
          if (minimalImageUrl.startsWith("data:image/")) {
            console.log("[process-job] 🔄 Estrutura mínima (fallback): convertendo base64 para Storage...");
            minimalImageUrl = await uploadBase64ToStorage(
              minimalImageUrl,
              jobData.lojistaId,
              jobId
            );
          }
          const minimalData = {
            status: "COMPLETED" as JobStatus,
            completedAt: FieldValue.serverTimestamp(),
            result: {
              compositionId: String(creativeResult.compositionId || jobId),
              imageUrl: minimalImageUrl,
            },
            apiCost: typeof creativeResult.totalCost === "number" && !isNaN(creativeResult.totalCost) 
              ? creativeResult.totalCost 
              : 0,
          };
          
          // FIX: Limpar valores undefined também no fallback
          const cleanMinimalData = JSON.parse(JSON.stringify(minimalData));
          
          await jobsRef.doc(jobId).update(cleanMinimalData);
          console.log("[process-job] ✅ Job atualizado com estrutura mínima");
        } catch (minimalError: any) {
          console.error("[process-job] ❌ Erro mesmo com estrutura mínima:", minimalError);
          throw firestoreError; // Lançar o erro original
        }
      }

      console.log("[process-job] Job processado com sucesso:", {
        jobId,
        compositionId: creativeResult.compositionId,
        processingTime,
      });

      return NextResponse.json({
        success: true,
        jobId,
        status: "COMPLETED",
        result: {
          compositionId: creativeResult.compositionId,
          imageUrl: creativeResult.tryonImageUrl,
          sceneImageUrls: creativeResult.sceneImageUrls,
          totalCost: creativeResult.totalCost,
          processingTime,
        },
      });
    } catch (error: any) {
      console.error("[process-job] Erro ao processar Job:", error);

      // PHASE 27: Detectar se o erro é retryável (API do Gemini)
      const errorMessage = error.message || String(error);
      const isRetryable = 
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.includes("429") ||
        errorMessage.includes("RATE_LIMIT") ||
        errorMessage.includes("QUOTA_EXCEEDED") ||
        errorMessage.includes("INTERNAL") ||
        errorMessage.includes("UNAVAILABLE") ||
        errorMessage.includes("DEADLINE_EXCEEDED") ||
        errorMessage.includes("timeout") ||
        error?.code === 429 ||
        error?.code === 503 ||
        error?.code === 500;

      // Se é retryável e ainda há tentativas disponíveis
      if (isRetryable && retryCount < maxRetries) {
        const nextRetryCount = retryCount + 1;
        const delaySeconds = Math.pow(2, nextRetryCount); // Exponential backoff: 2s, 4s, 8s
        
        console.warn(`[process-job] Erro retryável detectado. Agendando retry ${nextRetryCount}/${maxRetries} em ${delaySeconds}s...`, {
          jobId,
          error: errorMessage,
          retryCount: nextRetryCount,
        });

        // Sanitizar mensagem de erro para salvar
        const sanitizedErrorMsg = String(errorMessage || "Erro retryável").substring(0, 200);

        // Atualizar Job para PENDING com novo retryCount
        await jobsRef.doc(jobId).update({
          status: "PENDING" as JobStatus,
          retryCount: nextRetryCount,
          error: `Erro retryável: ${sanitizedErrorMsg}`,
          errorDetails: `Tentativa ${nextRetryCount}/${maxRetries}. Próximo retry em ${delaySeconds}s.`,
        });

        // Agendar retry após delay (usando setTimeout ou chamando o trigger)
        // Como estamos em um ambiente serverless, vamos marcar o Job como PENDING
        // e deixar o cron/trigger processar novamente
        setTimeout(async () => {
          try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
                             process.env.NEXT_PUBLIC_PAINELADM_URL || 
                             "http://localhost:3000";
            
            await fetch(`${backendUrl}/api/internal/process-job`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Internal-Request": "true",
              },
              body: JSON.stringify({ jobId }),
            }).catch((retryError) => {
              console.error(`[process-job] Erro ao disparar retry para Job ${jobId}:`, retryError);
            });
          } catch (retryError) {
            console.error(`[process-job] Erro ao agendar retry para Job ${jobId}:`, retryError);
          }
        }, delaySeconds * 1000);

        return NextResponse.json({
          success: false,
          jobId,
          status: "PENDING",
          message: `Erro retryável. Tentativa ${nextRetryCount}/${maxRetries}. Retry agendado em ${delaySeconds}s.`,
          retryCount: nextRetryCount,
          maxRetries,
        }, { status: 200 }); // 200 porque o Job será reprocessado
      }

      // Erro não retryável ou tentativas esgotadas
      console.error("[process-job] Erro fatal ou tentativas esgotadas:", {
        jobId,
        error: errorMessage,
        retryCount,
        maxRetries,
        isRetryable,
      });

      // Fazer rollback da reserva de crédito apenas se não for retryável ou tentativas esgotadas
      try {
        await rollbackCredit(jobData.lojistaId, jobData.reservationId);
      } catch (rollbackError) {
        console.error("[process-job] Erro ao fazer rollback da reserva:", rollbackError);
      }

      // Atualizar Job com erro
      // PHASE 27: Sanitizar errorDetails para evitar problemas com Firestore
      const sanitizedError = String(error.message || "Erro desconhecido");
      const sanitizedErrorDetails = error.stack 
        ? String(error.stack).substring(0, 1000) // Limitar tamanho do stack trace
        : (typeof error === "string" ? error.substring(0, 1000) : JSON.stringify(error).substring(0, 1000));
      
      await jobsRef.doc(jobId).update({
        status: "FAILED" as JobStatus,
        failedAt: FieldValue.serverTimestamp(),
        error: sanitizedError,
        errorDetails: sanitizedErrorDetails,
        retryCount: retryCount + 1, // Incrementar para mostrar tentativas feitas
      });

      return NextResponse.json(
        {
          success: false,
          jobId,
          status: "FAILED",
          error: error.message || "Erro ao processar Job",
          retryCount: retryCount + 1,
          maxRetries,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[process-job] Erro inesperado:", error);
    return NextResponse.json(
      {
        error: "Erro interno ao processar Job",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

