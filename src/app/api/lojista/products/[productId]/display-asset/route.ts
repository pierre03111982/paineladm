import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebaseAdmin"

export const dynamic = 'force-dynamic'

/**
 * API para salvar imagem de catálogo na subcoleção display_assets
 * Fase 13: Salvar para Display
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const lojistaId = searchParams.get("lojistaId")
    
    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      )
    }

    const { productId } = await params
    if (!productId) {
      return NextResponse.json(
        { error: "productId é obrigatório" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { imagemUrl, metadata } = body

    if (!imagemUrl) {
      return NextResponse.json(
        { error: "imagemUrl é obrigatória" },
        { status: 400 }
      )
    }

    const db = getAdminDb()

    // Salvar na subcoleção display_assets
    const displayAssetRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("produtos")
      .doc(productId)
      .collection("display_assets")
      .doc()

    await displayAssetRef.set({
      imagemUrl,
      metadata: metadata || {},
      createdAt: new Date(),
      displayReady: true,
    })

    // Também atualizar o produto principal com a flag displayReady
    await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("produtos")
      .doc(productId)
      .update({
        displayReady: true,
        catalogImageUrl: imagemUrl,
        catalogGeneratedAt: new Date(),
      })

    console.log("[display-asset] Imagem salva para display:", {
      lojistaId,
      productId,
      assetId: displayAssetRef.id,
    })

    return NextResponse.json({
      success: true,
      assetId: displayAssetRef.id,
    })
  } catch (error: any) {
    console.error("[display-asset] Erro:", error)
    return NextResponse.json(
      {
        error: "Erro ao salvar para display",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

