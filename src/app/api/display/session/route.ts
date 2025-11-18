/**
 * API Route: Gerenciar sessões do Display
 * GET /api/display/session - Buscar dados da sessão
 * POST /api/display/session - Criar/atualizar sessão
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

const db = getAdminDb();

function applyCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin") ?? "*";
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set(
    "Access-Control-Allow-Headers",
    request.headers.get("access-control-request-headers") ?? "Content-Type, Authorization"
  );
  response.headers.set(
    "Access-Control-Allow-Methods",
    request.headers.get("access-control-request-method") ?? "GET, POST, OPTIONS"
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  return applyCors(request, response);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return applyCors(
        request,
        NextResponse.json({ error: "sessionId é obrigatório" }, { status: 400 })
      );
    }

    const sessionDoc = await db.collection("display_sessions").doc(sessionId).get();

    if (!sessionDoc.exists) {
      return applyCors(
        request,
        NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
      );
    }

    const data = sessionDoc.data();
    return applyCors(
      request,
      NextResponse.json({
        success: true,
        session: {
          id: sessionDoc.id,
          ...data,
        },
      })
    );
  } catch (error) {
    console.error("[API Display Session] Erro:", error);
    return applyCors(
      request,
      NextResponse.json(
        { error: "Erro ao buscar sessão", details: error instanceof Error ? error.message : "Erro desconhecido" },
        { status: 500 }
      )
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, lojistaId, looks, composicaoId, customerName } = body;

    if (!sessionId || !lojistaId) {
      return applyCors(
        request,
        NextResponse.json({ error: "sessionId e lojistaId são obrigatórios" }, { status: 400 })
      );
    }

    const sessionData: any = {
      lojistaId,
      updatedAt: new Date(),
    };

    if (looks) {
      sessionData.looks = looks;
    }

    if (composicaoId) {
      sessionData.composicaoId = composicaoId;
    }

    if (customerName) {
      sessionData.customerName = customerName;
    }

    // Se não existe, criar com createdAt
    const sessionDoc = await db.collection("display_sessions").doc(sessionId).get();
    if (!sessionDoc.exists) {
      sessionData.createdAt = new Date();
    }

    await db.collection("display_sessions").doc(sessionId).set(sessionData, { merge: true });

    return applyCors(
      request,
      NextResponse.json({
        success: true,
        message: "Sessão atualizada com sucesso",
      })
    );
  } catch (error) {
    console.error("[API Display Session] Erro:", error);
    return applyCors(
      request,
      NextResponse.json(
        { error: "Erro ao atualizar sessão", details: error instanceof Error ? error.message : "Erro desconhecido" },
        { status: 500 }
      )
    );
  }
}




























































































