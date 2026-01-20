import { NextRequest, NextResponse } from "next/server";
import { updateProduto, archiveProduto } from "@/lib/firestore/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { convertImageUrlToPng } from "@/lib/utils/image-converter";
import { normalizeCategory } from "@/lib/categories/consolidated-categories";

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    
    // Prioridade: query string (modo admin) > usuário logado > env var
    const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
    const lojistaId =
      lojistaIdFromQuery ||
      lojistaIdFromAuth ||
      process.env.NEXT_PUBLIC_LOJISTA_ID ||
      process.env.LOJISTA_ID ||
      "";

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId não encontrado" },
        { status: 400 }
      );
    }

    const { productId } = await params;
    if (!productId) {
      return NextResponse.json(
        { error: "productId é obrigatório." },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log("[api/lojista/products/[productId]] PATCH recebido:", {
      lojistaId,
      productId,
      body,
    });

    const {
      nome,
      categoria,
      preco,
      imagemUrl,
      cores,
      tamanhos,
      estoque,
      tags,
      observacoes,
      // Campos novos: imagem original, catálogo e desconto específico
      imagemUrlOriginal,
      imagemUrlCatalogo,
      descontoProduto,
      // Fase 13: Campos para catálogo e display (legados)
      displayReady,
      catalogImageUrl,
      catalogGeneratedAt,
      // Novos campos da análise IA
      product_type,
      detected_fabric,
      dominant_colors,
      // Campos adicionais da análise IA
      analiseIA,
      nome_sugerido,
      descricao_seo,
      suggested_category,
      categoria_sugerida,
      cor_predominante,
      tecido_estimado,
      detalhes,
      // Campo de variações
      variacoes,
      unidadeMedida,
      imagemUrlCombinada,
      imagemMedidasCustomizada,
    } = body;

    // Converter imagem de link para PNG se necessário
    let imagemUrlFinal = imagemUrl;
    if (imagemUrl && String(imagemUrl).trim()) {
      const urlTrimmed = String(imagemUrl).trim();
      try {
        new URL(urlTrimmed); // Validar URL
        
        // Se não for do Firebase Storage, converter para PNG e fazer upload
        if (!urlTrimmed.includes("storage.googleapis.com") && !urlTrimmed.includes("firebasestorage.googleapis.com")) {
          console.log("[api/lojista/products/[productId]] Convertendo imagem de link para PNG:", urlTrimmed);
          try {
            const convertedUrl = await convertImageUrlToPng(urlTrimmed, lojistaId, productId);
            if (convertedUrl) {
              imagemUrlFinal = convertedUrl;
              console.log("[api/lojista/products/[productId]] Imagem convertida com sucesso:", imagemUrlFinal);
            } else {
              console.warn("[api/lojista/products/[productId]] Conversão retornou null, usando URL original");
              imagemUrlFinal = urlTrimmed;
            }
          } catch (conversionError: any) {
            console.error("[api/lojista/products/[productId]] Erro ao converter imagem, usando URL original:", conversionError);
            imagemUrlFinal = urlTrimmed;
          }
        }
      } catch {
        console.warn("[api/lojista/products/[productId]] URL de imagem inválida, ignorando:", urlTrimmed);
        imagemUrlFinal = undefined;
      }
    }

    // Normalizar categoria para categoria consolidada (agrupa produtos similares)
    const normalizedCategoria = categoria ? normalizeCategory(categoria) : undefined;

    const updateData: any = {
      nome,
      categoria: normalizedCategoria,
      preco,
      imagemUrl: imagemUrlFinal,
      cores,
      tamanhos,
      estoque,
      tags,
      observacoes,
    };

    // Adicionar unidadeMedida se fornecido
    if (unidadeMedida !== undefined) {
      updateData.unidadeMedida = unidadeMedida ? String(unidadeMedida).trim() : "UN";
    }

    // Campos novos: imagem original, catálogo, combinada, medidas customizada e desconto
    if (imagemUrlOriginal !== undefined) {
      updateData.imagemUrlOriginal = imagemUrlOriginal;
    }
    if (imagemUrlCatalogo !== undefined) {
      updateData.imagemUrlCatalogo = imagemUrlCatalogo;
    }
    if (imagemUrlCombinada !== undefined) {
      updateData.imagemUrlCombinada = imagemUrlCombinada;
    }
    if (imagemMedidasCustomizada !== undefined) {
      updateData.imagemMedidasCustomizada = imagemMedidasCustomizada;
    }
    if (descontoProduto !== undefined) {
      // Validar que é um número entre 0 e 100
      const desconto = parseFloat(String(descontoProduto));
      if (!isNaN(desconto) && desconto >= 0 && desconto <= 100) {
        updateData.descontoProduto = desconto;
      } else if (descontoProduto === null || descontoProduto === "") {
        // Permitir remover desconto
        updateData.descontoProduto = null;
      }
    }
    // Fase 13: Campos legados para catálogo/display
    if (displayReady !== undefined) {
      updateData.displayReady = displayReady;
    }
    if (catalogImageUrl) {
      updateData.catalogImageUrl = catalogImageUrl;
    }
    if (catalogGeneratedAt) {
      updateData.catalogGeneratedAt = catalogGeneratedAt;
    }

    // Novos campos da análise IA
    if (product_type !== undefined) {
      updateData.product_type = product_type ? String(product_type).trim() : null;
    }
    if (detected_fabric !== undefined) {
      updateData.detected_fabric = detected_fabric ? String(detected_fabric).trim() : null;
    }
    if (dominant_colors !== undefined) {
      updateData.dominant_colors = Array.isArray(dominant_colors) ? dominant_colors : null;
    }

    // Atualizar o objeto analiseIA COMPLETO
    if (analiseIA || product_type || detected_fabric || dominant_colors || nome_sugerido || descricao_seo) {
      const analiseIABase = analiseIA || {};
      updateData.analiseIA = {
        ...analiseIABase,
        // Nome e descrição
        ...(nome_sugerido && { nome_sugerido: String(nome_sugerido).trim() }),
        ...(descricao_seo && { descricao_seo: String(descricao_seo).trim() }),
        // Categoria e tipo (normalizar categorias para consolidadas)
        ...(suggested_category && { 
          suggested_category: normalizeCategory(String(suggested_category).trim()),
          categoria_sugerida: normalizeCategory(String(suggested_category).trim())
        }),
        ...(categoria_sugerida && !suggested_category && { 
          categoria_sugerida: normalizeCategory(String(categoria_sugerida).trim())
        }),
        ...(product_type && { product_type: String(product_type).trim() }),
        // Tecido
        ...(detected_fabric && { 
          detected_fabric: String(detected_fabric).trim(),
          tecido_estimado: String(detected_fabric).trim()
        }),
        ...(tecido_estimado && { tecido_estimado: String(tecido_estimado).trim() }),
        // Cores
        ...(dominant_colors && Array.isArray(dominant_colors) && { dominant_colors }),
        ...(cor_predominante && { cor_predominante: String(cor_predominante).trim() }),
        // Detalhes
        ...(detalhes && Array.isArray(detalhes) && { detalhes }),
        ...(tags && Array.isArray(tags) && { tags }),
        // Metadados
        ultimaAtualizacao: new Date().toISOString(),
      };
    }

    // Salvar variações se fornecidas
    if (variacoes !== undefined) {
      if (Array.isArray(variacoes) && variacoes.length > 0) {
        // Salvar apenas variações válidas (com variacao preenchida)
        const variacoesValidas = variacoes
          .filter((v: any) => v && v.variacao && String(v.variacao).trim())
          .map((v: any) => ({
            variacao: String(v.variacao).trim(),
            estoque: parseInt(v.estoque) || 0,
            sku: v.sku ? String(v.sku).trim() : "",
          }));
        
        if (variacoesValidas.length > 0) {
          updateData.variacoes = variacoesValidas;
          // Se tem variações, também atualizar tamanhos baseado nas variações
          updateData.tamanhos = variacoesValidas.map((v: any) => v.variacao);
          // Calcular estoque total
          const estoqueTotal = variacoesValidas.reduce((sum: number, v: any) => sum + (v.estoque || 0), 0);
          if (estoqueTotal > 0) {
            updateData.estoque = estoqueTotal;
          }
        } else {
          // Se array vazio, limpar variações
          updateData.variacoes = null;
        }
      } else if (variacoes === null || (Array.isArray(variacoes) && variacoes.length === 0)) {
        // Se null ou array vazio, remover variações
        updateData.variacoes = null;
      }
    }

    // Remover campos undefined
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    console.log("[api/lojista/products/[productId]] Dados para atualizar:", updateData);

    await updateProduto(lojistaId, productId, updateData);

    console.log("[api/lojista/products/[productId]] Produto atualizado com sucesso");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api/lojista/products/[productId]] erro ao atualizar produto:", error);
    console.error("[api/lojista/products/[productId]] Stack trace:", error?.stack);
    return NextResponse.json(
      { 
        error: "Erro ao atualizar produto.",
        details: error?.message || "Erro desconhecido"
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    
    // Prioridade: query string (modo admin) > usuário logado > env var
    const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
    const lojistaId =
      lojistaIdFromQuery ||
      lojistaIdFromAuth ||
      process.env.NEXT_PUBLIC_LOJISTA_ID ||
      process.env.LOJISTA_ID ||
      "";

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId não encontrado" },
        { status: 400 }
      );
    }

    const { productId } = await params;
    if (!productId) {
      return NextResponse.json(
        { error: "productId é obrigatório." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === "archive") {
      await archiveProduto(lojistaId, productId);
      return NextResponse.json({ success: true, arquivado: true });
    } else if (action === "restore") {
      await updateProduto(lojistaId, productId, { arquivado: false });
      return NextResponse.json({ success: true, arquivado: false });
    } else {
      return NextResponse.json(
        { error: "Ação inválida. Use 'archive' ou 'restore'." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[api/lojista/products/[productId]] erro ao alterar status:", error);
    return NextResponse.json(
      { error: "Erro ao alterar status do produto." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    
    // Prioridade: query string (modo admin) > usuário logado > env var
    const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
    const lojistaId =
      lojistaIdFromQuery ||
      lojistaIdFromAuth ||
      process.env.NEXT_PUBLIC_LOJISTA_ID ||
      process.env.LOJISTA_ID ||
      "";

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId não encontrado" },
        { status: 400 }
      );
    }

    const { productId } = await params;
    if (!productId) {
      return NextResponse.json(
        { error: "productId é obrigatório." },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    await db.collection("lojas").doc(lojistaId).collection("produtos").doc(productId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/lojista/products/[productId]] erro ao excluir:", error);
    return NextResponse.json(
      { error: "Erro ao excluir produto." },
      { status: 500 }
    );
  }
}
