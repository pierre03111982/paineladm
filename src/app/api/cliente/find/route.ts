import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

/**
 * GET /api/cliente/find
 * Busca cliente por lojistaId e whatsapp
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const lojistaId = searchParams.get("lojistaId")
    const whatsapp = searchParams.get("whatsapp")

    if (!lojistaId || !whatsapp) {
      return NextResponse.json(
        { error: "lojistaId e whatsapp são obrigatórios" },
        { status: 400 }
      )
    }

    // TODO: Implementar busca de cliente
    return NextResponse.json({ cliente: null })
  } catch (error) {
    console.error("[API Cliente Find] Erro:", error)
    return NextResponse.json(
      { error: "Erro ao buscar cliente" },
      { status: 500 }
    )
  }
}

