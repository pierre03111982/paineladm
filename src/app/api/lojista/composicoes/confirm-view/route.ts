/**
 * PHASE 27: Endpoint de Confirmação de Visualização
 * 
 * Este endpoint é chamado pelo Frontend quando o usuário visualiza a imagem gerada.
 * Ele confirma o débito do crédito que foi reservado anteriormente.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { commitCredit } from "@/lib/financials";
import { FieldValue } from "firebase-admin/firestore";

const db = getAdminDb();

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, lojistaId } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId é obrigatório" },
        { status: 400 }
      );
    }

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
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

    const jobData = jobDoc.data();

    // Verificar se o Job está completo
    if (jobData?.status !== "COMPLETED") {
      return NextResponse.json(
        { 
          error: "Job ainda não está completo",
          status: jobData?.status,
        },
        { status: 400 }
      );
    }

    // Verificar se já foi confirmado
    if (jobData?.creditCommitted) {
      return NextResponse.json(
        { 
          message: "Crédito já foi confirmado",
          alreadyCommitted: true,
        },
        { status: 200 }
      );
    }

    // Confirmar débito do crédito
    const commitResult = await commitCredit(lojistaId, jobData.reservationId);

    if (!commitResult.success) {
      return NextResponse.json(
        {
          error: "Erro ao confirmar crédito",
          message: commitResult.message,
        },
        { status: 500 }
      );
    }

    // Atualizar Job com confirmação de visualização
    await jobsRef.doc(jobId).update({
      viewedAt: FieldValue.serverTimestamp(),
      creditCommitted: true,
    });

    console.log("[confirm-view] Visualização confirmada:", {
      jobId,
      lojistaId,
      reservationId: jobData.reservationId,
    });

    return NextResponse.json({
      success: true,
      message: "Visualização confirmada e crédito debitado",
      jobId,
    });
  } catch (error: any) {
    console.error("[confirm-view] Erro inesperado:", error);
    return NextResponse.json(
      {
        error: "Erro interno ao confirmar visualização",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

