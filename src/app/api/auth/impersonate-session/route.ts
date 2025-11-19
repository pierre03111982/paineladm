import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/impersonate-session
 * Verifica se há uma sessão de impersonação ativa
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Implementar verificação de sessão de impersonação
    return NextResponse.json({ isImpersonating: false })
  } catch (error) {
    console.error("[API Impersonate Session] Erro:", error)
    return NextResponse.json(
      { error: "Erro ao verificar sessão de impersonação" },
      { status: 500 }
    )
  }
}

