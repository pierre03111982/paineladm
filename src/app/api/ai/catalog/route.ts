import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebaseAdmin"
import { buildCatalogPrompt } from "@/lib/ai/catalog-prompt"
import { generateCatalogImage } from "@/lib/ai/imagen-generate"

export const dynamic = 'force-dynamic'

/**
 * API para gerar imagem de catálogo de produto com IA
 * Fase 13: Gerador de Catálogo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { produtoId, imagemUrl, corManequim, lojistaId } = body

    // Validações
    if (!produtoId) {
      return NextResponse.json(
        { error: "produtoId é obrigatório" },
        { status: 400 }
      )
    }

    if (!imagemUrl) {
      return NextResponse.json(
        { error: "imagemUrl é obrigatória" },
        { status: 400 }
      )
    }

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      )
    }

    console.log("[api/ai/catalog] Gerando catálogo para produto:", {
      produtoId,
      lojistaId,
      corManequim: corManequim || "branco fosco",
    })

    // Buscar dados do produto no Firestore (Admin)
    const db = getAdminDb()
    const produtoDoc = await db.collection("lojas").doc(lojistaId).collection("produtos").doc(produtoId).get()
    
    if (!produtoDoc.exists) {
      return NextResponse.json(
        { error: "Produto não encontrado" },
        { status: 404 }
      )
    }

    const produtoData = produtoDoc.data()

    // Verificar se produtoData existe
    if (!produtoData) {
      return NextResponse.json(
        { error: "Dados do produto não disponíveis" },
        { status: 404 }
      )
    }

    // Preparar dados do produto para o prompt
    const produto = {
      nome: produtoData.nome || "Produto",
      preco: produtoData.preco || 0,
      precoPromocional: produtoData.precoPromocional || produtoData.precoPromo || null,
      tamanhos: produtoData.tamanhos || [],
      corManequim: corManequim || "branco fosco",
    }

    // Gerar prompt
    const prompt = buildCatalogPrompt(produto, corManequim || "branco fosco")

    console.log("[api/ai/catalog] Prompt gerado:", {
      promptLength: prompt.length,
      produtoNome: produto.nome,
      temDesconto: produto.precoPromocional != null && produto.precoPromocional < produto.preco,
    })

    // Gerar imagem usando Imagen 3
    const imageUrl = await generateCatalogImage(
      prompt,
      imagemUrl, // Imagem original do produto
      lojistaId,
      produtoId
    )

    console.log("[api/ai/catalog] Imagem de catálogo gerada com sucesso:", imageUrl)

    return NextResponse.json({
      success: true,
      imageUrl,
      produtoId,
    })
  } catch (error: any) {
    console.error("[api/ai/catalog] Erro:", error)
    return NextResponse.json(
      {
        error: "Erro ao gerar imagem de catálogo",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

