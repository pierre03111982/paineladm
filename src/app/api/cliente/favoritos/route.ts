import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

/**
 * GET /api/cliente/favoritos
 * Lista favoritos do cliente
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const lojistaId = searchParams.get("lojistaId")
    const customerId = searchParams.get("customerId")

    if (!lojistaId || !customerId) {
      return NextResponse.json(
        { error: "lojistaId e customerId são obrigatórios" },
        { status: 400 }
      )
    }

    // TODO: Implementar busca de favoritos
    return NextResponse.json({ favorites: [], favoritos: [] })
  } catch (error) {
    console.error("[API Cliente Favoritos] Erro:", error)
    return NextResponse.json(
      { error: "Erro ao buscar favoritos" },
      { status: 500 }
    )
  }
}

