import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin-auth"

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/impersonate/[lojistaId]
 * Permite que um admin faça impersonação de um lojista
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lojistaId: string }> }
) {
  try {
    // Verificar se o usuário é admin
    await requireAdmin()

    const { lojistaId } = await params

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      )
    }

    // TODO: Implementar lógica de impersonação
    // Por enquanto, retornar erro indicando que está em desenvolvimento
    return NextResponse.json(
      { error: "Funcionalidade de impersonação em desenvolvimento" },
      { status: 501 }
    )
  } catch (error: any) {
    console.error("[API Impersonate] Erro:", error)
    
    if (error.message === "Unauthorized" || error.message?.includes("admin")) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem fazer impersonação." },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: "Erro ao fazer impersonação" },
      { status: 500 }
    )
  }
}

