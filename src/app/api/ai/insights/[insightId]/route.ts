/**
 * API Route: Atualizar Insight
 * PATCH /api/ai/insights/[insightId]
 * 
 * Marca um insight como lido
 */

import { NextRequest, NextResponse } from "next/server";
import { markAsRead } from "@/lib/firestore/insights";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ insightId: string }> }
) {
  try {
    const { insightId } = await params;
    const body = await request.json();
    const { lojistaId: lojistaIdFromBody, isRead } = body;

    // Obter lojistaId do body ou do auth
    const lojistaIdFromAuth = lojistaIdFromBody ? null : await getCurrentLojistaId();
    const lojistaId = lojistaIdFromBody || lojistaIdFromAuth;

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    if (!insightId) {
      return NextResponse.json(
        { error: "insightId é obrigatório" },
        { status: 400 }
      );
    }

    // Marcar como lido se solicitado
    if (isRead) {
      await markAsRead(lojistaId, insightId);
    }

    return NextResponse.json({
      success: true,
      message: "Insight atualizado com sucesso",
    });
  } catch (error) {
    console.error("[API/AI/Insights] Erro:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}



