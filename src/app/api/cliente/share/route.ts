import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

/**
 * POST /api/cliente/share
 * Cria link de compartilhamento para cliente
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // TODO: Implementar criação de link de compartilhamento
    return NextResponse.json({
      shareUrl: "",
      success: false
    })
  } catch (error) {
    console.error("[API Cliente Share] Erro:", error)
    return NextResponse.json(
      { error: "Erro ao criar link de compartilhamento" },
      { status: 500 }
    )
  }
}

