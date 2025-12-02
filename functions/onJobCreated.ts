/**
 * PHASE 27: Cloud Function Trigger para Firestore
 * 
 * Esta função é executada automaticamente quando um novo Job é criado no Firestore.
 * 
 * Para usar esta função:
 * 1. Instale o Firebase CLI: npm install -g firebase-tools
 * 2. Configure o projeto: firebase init functions
 * 3. Deploy: firebase deploy --only functions
 * 
 * OU use o endpoint HTTP /api/triggers/process-pending-jobs como alternativa.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Inicializar Firebase Admin se ainda não estiver inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Trigger que executa quando um Job é criado na coleção generation_jobs
 */
export const onJobCreated = functions.firestore
  .document("generation_jobs/{jobId}")
  .onCreate(async (snap, context) => {
    const jobId = context.params.jobId;
    const jobData = snap.data();

    // Verificar se o Job está com status PENDING
    if (jobData.status !== "PENDING") {
      console.log(`[onJobCreated] Job ${jobId} não está PENDING, ignorando`);
      return null;
    }

    console.log(`[onJobCreated] Novo Job criado: ${jobId}`);

    // URL do backend (ajustar conforme necessário)
    const backendUrl = process.env.BACKEND_URL || 
                       process.env.PAINELADM_URL || 
                       "https://your-backend-url.vercel.app";

    try {
      // Chamar endpoint interno de processamento
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

      console.log(`[onJobCreated] Job ${jobId} processado com sucesso`);
      return { success: true, jobId };
    } catch (error: any) {
      console.error(`[onJobCreated] Erro ao processar Job ${jobId}:`, error);
      
      // Atualizar Job com erro (mas não marcar como FAILED ainda - pode ser retry)
      await snap.ref.update({
        error: error.message || "Erro ao processar Job",
        errorDetails: error.stack || error,
      });

      throw error;
    }
  });

/**
 * Função alternativa: Processar Jobs pendentes periodicamente (cron)
 * Executa a cada 1 minuto para pegar Jobs que podem ter sido perdidos
 */
export const processPendingJobsCron = functions.pubsub
  .schedule("every 1 minutes")
  .onRun(async (context) => {
    const db = admin.firestore();
    const jobsRef = db.collection("generation_jobs");

    // Buscar Jobs pendentes criados há mais de 2 minutos (para evitar processar Jobs muito recentes)
    const twoMinutesAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 2 * 60 * 1000)
    );

    const pendingJobs = await jobsRef
      .where("status", "==", "PENDING")
      .where("createdAt", "<", twoMinutesAgo)
      .limit(10)
      .get();

    if (pendingJobs.empty) {
      console.log("[processPendingJobsCron] Nenhum Job pendente encontrado");
      return null;
    }

    const backendUrl = process.env.BACKEND_URL || 
                       process.env.PAINELADM_URL || 
                       "https://your-backend-url.vercel.app";

    const results = await Promise.allSettled(
      pendingJobs.docs.map(async (doc) => {
        const jobId = doc.id;
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
            throw new Error(`HTTP ${response.status}`);
          }

          console.log(`[processPendingJobsCron] Job ${jobId} processado`);
          return { success: true, jobId };
        } catch (error: any) {
          console.error(`[processPendingJobsCron] Erro ao processar Job ${jobId}:`, error);
          return { success: false, jobId, error: error.message };
        }
      })
    );

    const successful = results.filter(r => r.status === "fulfilled").length;
    console.log(`[processPendingJobsCron] Processados ${successful} de ${pendingJobs.size} Jobs`);

    return { processed: successful, total: pendingJobs.size };
  });

