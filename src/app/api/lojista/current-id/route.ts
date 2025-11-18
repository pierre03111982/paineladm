import { NextRequest, NextResponse } from "next/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

export const dynamic = 'force-dynamic';

/**
 * GET /api/lojista/current-id
 * Retorna o lojistaId do usuário logado
 */
export async function GET(request: NextRequest) {
  try {
    const lojistaId = await getCurrentLojistaId();
    
    if (!lojistaId) {
      return NextResponse.json(
        { error: "Usuário não está associado a nenhuma loja" },
        { status: 404 }
      );
    }

    return NextResponse.json({ lojistaId });
  } catch (error) {
    console.error("[API Current LojistaId] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao obter lojistaId" },
      { status: 500 }
    );
  }
}




