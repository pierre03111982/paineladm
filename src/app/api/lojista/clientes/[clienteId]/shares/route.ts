import { NextRequest, NextResponse } from "next/server";
import { getClientShareStats, getClientReferrals } from "@/lib/firestore/shares";

export const dynamic = 'force-dynamic';

/**
 * GET /api/lojista/clientes/[clienteId]/shares
 * Retorna estatísticas de compartilhamento de um cliente
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  try {
    const { clienteId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const lojistaId = searchParams.get("lojistaId");

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    const stats = await getClientShareStats(lojistaId, clienteId);

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error("[API Cliente Shares] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar estatísticas" },
      { status: 500 }
    );
  }
}

