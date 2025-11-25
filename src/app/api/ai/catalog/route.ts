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
    const { 
      produtoId, 
      imagemUrl, 
      corManequim, 
      cenario,
      lojistaId,
      preco: precoEnviado,
      precoPromocional: precoPromocionalEnviado,
      descontoRedesSociais: descontoRedesSociaisEnviado,
      descontoEspecial: descontoEspecialEnviado,
    } = body

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
      cenario: cenario ? cenario.substring(0, 50) + "..." : "não fornecido",
      precoEnviado,
      precoPromocionalEnviado,
      descontoRedesSociaisEnviado,
      descontoEspecialEnviado,
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
    // Prioridade: valores enviados no body > valores do Firestore
    const precoBase = precoEnviado ?? produtoData.preco ?? 0
    
    // Calcular preço promocional se não foi enviado
    let precoPromocionalFinal: number | null = null
    if (precoPromocionalEnviado !== undefined) {
      // Usar valor enviado diretamente
      precoPromocionalFinal = precoPromocionalEnviado > 0 ? precoPromocionalEnviado : null
    } else if (descontoRedesSociaisEnviado !== undefined || descontoEspecialEnviado !== undefined) {
      // Calcular baseado nos descontos enviados
      const descontoRedes = descontoRedesSociaisEnviado ?? 0
      const descontoEspecial = descontoEspecialEnviado ?? 0
      const descontoTotal = descontoRedes + descontoEspecial
      
      if (precoBase > 0 && descontoTotal > 0) {
        precoPromocionalFinal = precoBase * (1 - descontoTotal / 100)
      }
    } else {
      // Fallback para valores do Firestore
      precoPromocionalFinal = produtoData.precoPromocional || produtoData.precoPromo || null
    }

    const produto = {
      nome: produtoData.nome || "Produto",
      preco: precoBase,
      precoPromocional: precoPromocionalFinal,
      tamanhos: produtoData.tamanhos || [],
      corManequim: corManequim || "branco fosco",
    }

    console.log("[api/ai/catalog] Dados do produto para prompt:", {
      nome: produto.nome,
      preco: produto.preco,
      precoPromocional: produto.precoPromocional,
      temDesconto: produto.precoPromocional != null && produto.precoPromocional < produto.preco,
    })

    // Gerar prompt
    const prompt = buildCatalogPrompt(
      produto, 
      corManequim || "branco fosco",
      cenario || null
    )

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

    // ATUALIZAÇÃO: Salvar automaticamente como imagem principal do catálogo
    // Salvar a imagem original separadamente (se ainda não existir)
    const imagemUrlOriginal = produtoData.imagemUrlOriginal || produtoData.imagemUrl || imagemUrl
    
    // Atualizar produto no Firestore com:
    // - imagemUrlCatalogo: imagem gerada (principal, será exibida em todos os lugares)
    // - imagemUrlOriginal: foto original (se ainda não tiver)
    const updateData: any = {
      imagemUrlCatalogo: imageUrl,
      catalogGeneratedAt: new Date(),
      displayReady: true,
    }

    // Se não tiver imagemUrlOriginal ainda, salvar a original
    if (!produtoData.imagemUrlOriginal) {
      updateData.imagemUrlOriginal = imagemUrlOriginal
    }

    await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("produtos")
      .doc(produtoId)
      .update(updateData)

    console.log("[api/ai/catalog] Produto atualizado com imagem de catálogo como principal")

    return NextResponse.json({
      success: true,
      imageUrl,
      produtoId,
      savedAsMain: true, // Indica que foi salvo automaticamente
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

