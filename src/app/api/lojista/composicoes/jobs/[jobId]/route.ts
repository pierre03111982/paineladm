/**
 * PHASE 27: Endpoint de Polling para Status do Job
 * 
 * GET /api/lojista/composicoes/jobs/[jobId]
 * Retorna o status atual do Job de geração
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId é obrigatório" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    let jobDoc;
    let jobData;
    
    try {
      jobDoc = await db.collection("generation_jobs").doc(jobId).get();

      if (!jobDoc.exists) {
        return NextResponse.json(
          { error: "Job não encontrado" },
          { status: 404 }
        );
      }

      jobData = jobDoc.data();
    } catch (readError: any) {
      // FIX: Se houver erro ao ler (pode ser por base64 muito longo no documento)
      if (readError.message?.includes("invalid nested entity") || readError.code === 3) {
        console.error("[jobs] Erro ao ler job (possível base64 muito longo):", readError);
        // Tentar ler apenas campos básicos sem o result
        try {
          const jobRef = db.collection("generation_jobs").doc(jobId);
          const jobSnapshot = await jobRef.get();
          
          if (!jobSnapshot.exists) {
            return NextResponse.json(
              { error: "Job não encontrado" },
              { status: 404 }
            );
          }
          
          // Retornar apenas status básico, sem result (que pode estar corrompido)
          return NextResponse.json({
            jobId,
            status: jobSnapshot.get("status") || "UNKNOWN",
            reservationId: jobSnapshot.get("reservationId"),
            error: "Job contém dados inválidos. Por favor, tente gerar novamente.",
            result: null, // Não retornar result corrompido
          });
        } catch (fallbackError: any) {
          console.error("[jobs] Erro no fallback:", fallbackError);
          return NextResponse.json(
            {
              error: "Erro ao ler Job. O job pode conter dados inválidos.",
              details: readError.message,
            },
            { status: 500 }
          );
        }
      }
      throw readError; // Re-lançar se não for o erro esperado
    }

    // Converter Timestamps do Firestore para ISO strings
    const formatTimestamp = (ts: any) => {
      if (!ts) return null;
      if (ts.toDate) return ts.toDate().toISOString();
      if (ts instanceof Date) return ts.toISOString();
      return ts;
    };

    // PHASE 27: Sanitizar result antes de retornar (caso contenha estruturas inválidas)
    // FIX: Truncar base64 data URLs muito longos para evitar erros
    const sanitizeResult = (result: any): any => {
      if (!result || typeof result !== "object") return result;
      
      const sanitized: any = {};
      
      // Copiar apenas campos primitivos e arrays de primitivos
      for (const [key, value] of Object.entries(result)) {
        if (value === null || value === undefined) continue;
        
        if (typeof value === "string") {
          // FIX: Se for base64 data URL muito longo, truncar ou remover
          if (value.startsWith("data:image/") && value.length > 100000) {
            // Base64 muito longo - remover para evitar erros
            console.warn(`[jobs] Base64 muito longo detectado em ${key}, removendo para evitar erro`);
            continue; // Não incluir este campo
          }
          sanitized[key] = value;
        } else if (typeof value === "number" || typeof value === "boolean") {
          sanitized[key] = value;
        } else if (Array.isArray(value)) {
          // Validar que o array contém apenas primitivos
          const sanitizedArray = value
            .map((item: any) => {
              if (typeof item === "string") {
                // FIX: Truncar base64 muito longos no array também
                if (item.startsWith("data:image/") && item.length > 100000) {
                  console.warn(`[jobs] Base64 muito longo no array ${key}, removendo`);
                  return null;
                }
                return item;
              }
              if (typeof item === "number") return item;
              if (typeof item === "boolean") return item;
              // Se for objeto, tentar extrair string
              if (item && typeof item === "object") {
                const extracted = String(item.imageUrl || item.url || item.toString || "");
                // Verificar se o extraído também é base64 muito longo
                if (extracted.startsWith("data:image/") && extracted.length > 100000) {
                  return null;
                }
                return extracted;
              }
              return null;
            })
            .filter((item: any) => item !== null && item !== "");
          
          if (sanitizedArray.length > 0) {
            sanitized[key] = sanitizedArray;
          }
        }
        // Ignorar objetos complexos aninhados
      }
      
      return Object.keys(sanitized).length > 0 ? sanitized : null;
    };

    return NextResponse.json({
      jobId,
      status: jobData?.status,
      reservationId: jobData?.reservationId,
      createdAt: formatTimestamp(jobData?.createdAt),
      startedAt: formatTimestamp(jobData?.startedAt),
      completedAt: formatTimestamp(jobData?.completedAt),
      failedAt: formatTimestamp(jobData?.failedAt),
      error: jobData?.error,
      errorDetails: jobData?.errorDetails,
      result: sanitizeResult(jobData?.result),
      viewedAt: formatTimestamp(jobData?.viewedAt),
      creditCommitted: jobData?.creditCommitted || false,
    });
  } catch (error: any) {
    console.error("[jobs] Erro ao buscar Job:", error);
    return NextResponse.json(
      {
        error: "Erro interno ao buscar Job",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

