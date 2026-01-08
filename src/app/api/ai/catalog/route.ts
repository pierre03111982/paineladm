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
      nome: nomeEnviado, // Para novos produtos
    } = body

    // Validações
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

    console.log("[api/ai/catalog] Gerando catálogo:", {
      produtoId: produtoId || "novo produto",
      lojistaId,
      corManequim: corManequim || "branco fosco",
      cenario: cenario ? cenario.substring(0, 50) + "..." : "não fornecido",
      precoEnviado,
      precoPromocionalEnviado,
      descontoRedesSociaisEnviado,
      descontoEspecialEnviado,
      nomeEnviado,
    })

    // Buscar dados do produto no Firestore (Admin) - apenas se produtoId existir
    let produtoData: any = null
    if (produtoId) {
      const db = getAdminDb()
      const produtoDoc = await db.collection("lojas").doc(lojistaId).collection("produtos").doc(produtoId).get()
      
      if (!produtoDoc.exists) {
        return NextResponse.json(
          { error: "Produto não encontrado" },
          { status: 404 }
        )
      }

      produtoData = produtoDoc.data()

      // Verificar se produtoData existe
      if (!produtoData) {
        return NextResponse.json(
          { error: "Dados do produto não disponíveis" },
          { status: 404 }
        )
      }
    }

    // Preparar dados do produto para o prompt
    // Prioridade: valores enviados no body > valores do Firestore
    const precoBase = precoEnviado ?? produtoData?.preco ?? 0
    
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
    } else if (produtoData) {
      // Fallback para valores do Firestore (apenas se produto existir)
      precoPromocionalFinal = produtoData.precoPromocional || produtoData.precoPromo || null
    }

    const produto = {
      nome: nomeEnviado || produtoData?.nome || "Produto",
      preco: precoBase,
      precoPromocional: precoPromocionalFinal,
      tamanhos: produtoData?.tamanhos || [],
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
    // Usar produtoId temporário se não existir (para novos produtos)
    const produtoIdParaGeracao = produtoId || `temp-${Date.now()}`
    const imageUrl = await generateCatalogImage(
      prompt,
      imagemUrl, // Imagem original do produto
      lojistaId,
      produtoIdParaGeracao
    )

    console.log("[api/ai/catalog] Imagem de catálogo gerada com sucesso:", imageUrl)

    // ATUALIZAÇÃO: Salvar automaticamente como imagem principal do catálogo
    // Apenas se o produto já existir (produtoId fornecido)
    if (produtoId && produtoData) {
      const db = getAdminDb()
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
    } else {
      // Para novos produtos, apenas retornar a URL da imagem gerada
      // O produto será salvo depois no formulário
      console.log("[api/ai/catalog] Imagem gerada para novo produto (não salva ainda)")
      
      return NextResponse.json({
        success: true,
        imageUrl,
        produtoId: null,
        savedAsMain: false, // Não foi salvo porque produto ainda não existe
      })
    }
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

