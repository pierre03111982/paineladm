import { NextRequest, NextResponse } from "next/server";
import { getClientReferrals } from "@/lib/firestore/shares";

export const dynamic = 'force-dynamic';

/**
 * GET /api/lojista/clientes/[clienteId]/referrals
 * Retorna lista de clientes referenciados por um cliente
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

    const referrals = await getClientReferrals(lojistaId, clienteId);

    return NextResponse.json({ referrals });
  } catch (error: any) {
    console.error("[API Cliente Referrals] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar referrals" },
      { status: 500 }
    );
  }
}

