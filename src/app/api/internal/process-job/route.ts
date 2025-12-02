/**
 * PHASE 27: Endpoint Interno de Processamento de Jobs
 * 
 * Este endpoint processa Jobs de geração de forma assíncrona.
 * É chamado automaticamente quando um Job é criado, ou pode ser chamado manualmente.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
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
      
      // Sanitizar imageUrl
      if (creativeResult.tryonImageUrl) {
        sanitizedResult.imageUrl = String(creativeResult.tryonImageUrl);
      }
      
      // Sanitizar sceneImageUrls - garantir que seja array de strings
      if (Array.isArray(creativeResult.sceneImageUrls) && creativeResult.sceneImageUrls.length > 0) {
        sanitizedResult.sceneImageUrls = creativeResult.sceneImageUrls
          .map((url: any) => {
            // Se for string, usar diretamente
            if (typeof url === "string") return url;
            // Se for objeto com propriedade imageUrl ou url, extrair
            if (url && typeof url === "object") {
              return String(url.imageUrl || url.url || "");
            }
            // Caso contrário, converter para string
            return String(url || "");
          })
          .filter((url: string) => url && url.length > 0);
        
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
      // Se falhar, tentar com estrutura mínima absoluta
      try {
        const updateData: any = {
          status: "COMPLETED" as JobStatus,
          completedAt: FieldValue.serverTimestamp(),
        };
        
        // Adicionar result apenas se for válido
        if (finalResult && typeof finalResult === "object" && Object.keys(finalResult).length > 0) {
          updateData.result = finalResult;
        } else {
          // Estrutura mínima absoluta
          updateData.result = {
            compositionId: String(creativeResult.compositionId || ""),
            imageUrl: String(creativeResult.tryonImageUrl || ""),
          };
        }
        
        // Adicionar apiCost
        const apiCostValue = typeof creativeResult.totalCost === "number" && !isNaN(creativeResult.totalCost) 
          ? creativeResult.totalCost 
          : 0;
        if (apiCostValue > 0) {
          updateData.apiCost = apiCostValue;
        }
        
        console.log("[process-job] Tentando atualizar Job com:", {
          hasResult: !!updateData.result,
          resultKeys: updateData.result ? Object.keys(updateData.result) : [],
          hasApiCost: !!updateData.apiCost,
        });
        
        await jobsRef.doc(jobId).update(updateData);
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
          await jobsRef.doc(jobId).update({
            status: "COMPLETED" as JobStatus,
            completedAt: FieldValue.serverTimestamp(),
            result: {
              compositionId: String(creativeResult.compositionId || jobId),
              imageUrl: String(creativeResult.tryonImageUrl || ""),
            },
            apiCost: typeof creativeResult.totalCost === "number" && !isNaN(creativeResult.totalCost) 
              ? creativeResult.totalCost 
              : 0,
          });
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

      // Fazer rollback da reserva de crédito
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
      });

      return NextResponse.json(
        {
          success: false,
          jobId,
          status: "FAILED",
          error: error.message || "Erro ao processar Job",
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

