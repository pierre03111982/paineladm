/**
 * API Route: Validar e trocar token de impersonificação
 * GET /api/auth/impersonate-session?sessionId=xxx
 * 
 * Valida o session ID e retorna informações para iniciar a sessão de impersonificação
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp, getAdminDb } from "@/lib/firebaseAdmin";

const auth = getAuth(getAdminApp());
const db = getAdminDb();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar sessão no Firestore
    const sessionDoc = await db.collection("impersonation_sessions").doc(sessionId).get();

    if (!sessionDoc.exists) {
      return NextResponse.json(
        { error: "Sessão de impersonificação não encontrada ou expirada" },
        { status: 404 }
      );
    }

    const sessionData = sessionDoc.data();
    if (!sessionData) {
      return NextResponse.json(
        { error: "Dados da sessão inválidos" },
        { status: 400 }
      );
    }

    // Verificar se a sessão expirou
    const expiresAt = sessionData.expiresAt?.toDate?.() || new Date(sessionData.expiresAt);
    if (expiresAt < new Date()) {
      // Deletar sessão expirada
      await db.collection("impersonation_sessions").doc(sessionId).delete();
      return NextResponse.json(
        { error: "Sessão de impersonificação expirada" },
        { status: 401 }
      );
    }

    // Verificar se já foi usada
    if (sessionData.used === true) {
      return NextResponse.json(
        { error: "Sessão de impersonificação já foi utilizada" },
        { status: 403 }
      );
    }

    // Marcar como usada
    await db.collection("impersonation_sessions").doc(sessionId).update({
      used: true,
      usedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      customToken: sessionData.customToken,
      lojistaId: sessionData.lojistaId,
      lojistaEmail: sessionData.lojistaEmail,
      adminEmail: sessionData.adminEmail,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[ImpersonateSession] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao validar sessão de impersonificação",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

