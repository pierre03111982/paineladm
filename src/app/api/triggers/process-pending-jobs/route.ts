/**
 * PHASE 27: Trigger para Processar Jobs Pendentes
 * 
 * Este endpoint pode ser chamado por:
 * 1. Cloud Function trigger do Firestore (quando um Job é criado)
 * 2. Cron job (para processar Jobs pendentes que podem ter falhado no trigger)
 * 
 * Ele busca Jobs com status PENDING e os processa.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

const db = getAdminDb();

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

/**
 * Processa um Job individual
 */
async function processJob(jobId: string): Promise<void> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
                     process.env.NEXT_PUBLIC_PAINELADM_URL || 
                     "http://localhost:3000";

  try {
    const response = await fetch(`${backendUrl}/api/internal/process-job`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Request": "true",
      },
      body: JSON.stringify({ jobId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    console.log(`[trigger] Job ${jobId} processado com sucesso`);
  } catch (error: any) {
    console.error(`[trigger] Erro ao processar Job ${jobId}:`, error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  // PHASE 27: Verificar se é requisição autorizada
  // Pode vir de: Vercel Cron, Cloud Function, ou chamada interna
  const authHeader = request.headers.get("Authorization");
  const internalHeader = request.headers.get("X-Internal-Request");
  const vercelCronHeader = request.headers.get("x-vercel-cron"); // Header enviado pelo Vercel Cron
  
  // Permitir se:
  // 1. É requisição interna (X-Internal-Request: true)
  // 2. É Vercel Cron (x-vercel-cron header presente)
  // 3. Tem token de autorização válido (Bearer token)
  // 4. Está em desenvolvimento (local)
  const isAuthorized = 
    internalHeader === "true" ||
    vercelCronHeader !== null ||
    authHeader === `Bearer ${process.env.TRIGGER_SECRET}` ||
    process.env.NODE_ENV !== "production";
  
  if (!isAuthorized) {
    console.warn("[trigger] Requisição não autorizada:", {
      hasInternalHeader: !!internalHeader,
      hasVercelCron: !!vercelCronHeader,
      hasAuth: !!authHeader,
      env: process.env.NODE_ENV,
    });
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  console.log("[trigger] Requisição autorizada:", {
    source: vercelCronHeader ? "Vercel Cron" : internalHeader ? "Internal" : "Bearer Token",
    timestamp: new Date().toISOString(),
  });

  try {
    const body = await request.json().catch(() => ({}));
    const { jobId, limit = 10 } = body;

    // Se jobId específico foi fornecido, processar apenas ele
    if (jobId) {
      await processJob(jobId);
      return NextResponse.json({
        success: true,
        message: `Job ${jobId} processado`,
        processed: 1,
      });
    }

    // Caso contrário, buscar Jobs pendentes
    const jobsRef = db.collection("generation_jobs");
    
    // Buscar Jobs com status PENDING, ordenados por data de criação
    const pendingJobsSnapshot = await jobsRef
      .where("status", "==", "PENDING")
      .orderBy("createdAt", "asc")
      .limit(limit)
      .get();

    if (pendingJobsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: "Nenhum Job pendente encontrado",
        processed: 0,
      });
    }

    const jobsToProcess = pendingJobsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`[trigger] Encontrados ${jobsToProcess.length} Jobs pendentes para processar`);

    // Processar Jobs em paralelo (mas limitado)
    const results = await Promise.allSettled(
      jobsToProcess.map(job => processJob(job.id))
    );

    const successful = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;

    return NextResponse.json({
      success: true,
      message: `Processados ${successful} de ${jobsToProcess.length} Jobs`,
      processed: successful,
      failed,
      total: jobsToProcess.length,
    });
  } catch (error: any) {
    console.error("[trigger] Erro ao processar Jobs pendentes:", error);
    return NextResponse.json(
      {
        error: "Erro interno ao processar Jobs",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Endpoint para verificar status do trigger (health check)
 */
export async function GET() {
  try {
    const jobsRef = db.collection("generation_jobs");
    
    const pendingCount = await jobsRef
      .where("status", "==", "PENDING")
      .count()
      .get();

    const processingCount = await jobsRef
      .where("status", "==", "PROCESSING")
      .count()
      .get();

    const failedCount = await jobsRef
      .where("status", "==", "FAILED")
      .count()
      .get();

    return NextResponse.json({
      status: "ok",
      stats: {
        pending: pendingCount.data().count,
        processing: processingCount.data().count,
        failed: failedCount.data().count,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

