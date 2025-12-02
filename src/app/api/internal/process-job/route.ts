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
      
      // PHASE 27: Validar estrutura final antes de salvar
      // Garantir que não há objetos aninhados ou valores não serializáveis
      const finalResult: any = {};
      for (const [key, value] of Object.entries(sanitizedResult)) {
        if (value === null || value === undefined) continue;
        
        // Validar tipo do valor
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          finalResult[key] = value;
        } else if (Array.isArray(value)) {
          // Validar que o array contém apenas primitivos
          const sanitizedArray = value
            .map((item: any) => {
              if (typeof item === "string") return item;
              if (typeof item === "number") return item;
              if (typeof item === "boolean") return item;
              return null;
            })
            .filter((item: any) => item !== null);
          
          if (sanitizedArray.length > 0) {
            finalResult[key] = sanitizedArray;
          }
        }
        // Ignorar objetos complexos
      }
      
      console.log("[process-job] Result final validado:", {
        keys: Object.keys(finalResult),
        hasCompositionId: !!finalResult.compositionId,
        hasImageUrl: !!finalResult.imageUrl,
        sceneImageUrlsType: Array.isArray(finalResult.sceneImageUrls) ? "array" : typeof finalResult.sceneImageUrls,
      });
      
      try {
        await jobsRef.doc(jobId).update({
          status: "COMPLETED" as JobStatus,
          completedAt: FieldValue.serverTimestamp(),
          result: finalResult,
          apiCost: typeof creativeResult.totalCost === "number" && !isNaN(creativeResult.totalCost) 
            ? creativeResult.totalCost 
            : 0,
        });
        console.log("[process-job] ✅ Job atualizado com sucesso no Firestore");
      } catch (firestoreError: any) {
        console.error("[process-job] ❌ Erro ao atualizar Job no Firestore:", firestoreError);
        console.error("[process-job] Detalhes do erro:", {
          message: firestoreError.message,
          code: firestoreError.code,
          resultStructure: JSON.stringify(finalResult, null, 2),
        });
        throw firestoreError;
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

