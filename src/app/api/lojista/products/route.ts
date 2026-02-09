import { NextRequest, NextResponse } from "next/server";
import { createProduto, fetchProdutos } from "@/lib/firestore/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { convertImageUrlToPng } from "@/lib/utils/image-converter";

export const dynamic = 'force-dynamic';

// Função helper para adicionar CORS
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    const includeArchived = searchParams.get("includeArchived") === "true";
    const includeDraft = searchParams.get("includeDraft") === "true";
    
    // Prioridade: query string (modo admin) > usuário logado > env var
    const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
    const lojistaId =
      lojistaIdFromQuery ||
      lojistaIdFromAuth ||
      process.env.NEXT_PUBLIC_LOJISTA_ID ||
      process.env.LOJISTA_ID ||
      "";

    if (!lojistaId) {
      const response = NextResponse.json(
        { error: "lojistaId não encontrado" },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }

    const produtos = await fetchProdutos(lojistaId);
    
    // Filtrar arquivados se necessário
    let filteredProdutos = includeArchived 
      ? produtos 
      : produtos.filter((p) => !p.arquivado);

    // Catálogo do app cliente: só produtos publicados. Para editor (ex.: miniaturas look combinado) incluir rascunhos.
    if (!includeDraft) {
      filteredProdutos = filteredProdutos.filter((p) => p.status !== "draft");
    }

    // Retornar array direto para compatibilidade com appmelhorado
    // Garantir que sempre retornamos um array, mesmo que vazio
    const response = NextResponse.json(Array.isArray(filteredProdutos) ? filteredProdutos : []);
    return addCorsHeaders(response);
  } catch (error: any) {
    console.error("[API Products GET] Erro:", error);
    console.error("[API Products GET] Stack:", error?.stack);
    // Retornar array vazio em caso de erro para não quebrar o frontend
    const response = NextResponse.json([]);
    return addCorsHeaders(response);
  }
}

export async function POST(request: NextRequest) {
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
      console.error("[API Products POST] lojistaId não encontrado");
      return NextResponse.json(
        { error: "lojistaId não encontrado" },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log("[API Products POST] Body recebido:", JSON.stringify(body, null, 2));
    
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
      medidas,
      unidadeMedida,
      imagemUrlOriginal,
      imagemUrlCatalogo,
      imagemUrlCombinada,
      catalogImageUrls,
      imagemMedidasCustomizada,
      exibirNoDisplay,
      // Rascunho: status 'draft' permite criar com dados mínimos
      status,
      // Objeto completo da análise IA (rascunho / edição)
      analiseIA,
      // Novos campos da análise IA (quando não vem analiseIA)
      product_type,
      detected_fabric,
      dominant_colors,
      // Campo de variações
      variacoes,
      // Foto Verso e extras (persistir para não perder ao redirecionar após criar rascunho)
      extraImageUrls,
    } = body;

    const isDraft = status === "draft";
    const nomeFinal = (nome && String(nome).trim()) || (isDraft ? "Rascunho" : "");
    const categoriaFinal = (categoria && String(categoria).trim()) || (isDraft ? "Roupas" : "");
    const precoFinal = preco !== undefined && preco !== null
      ? (typeof preco === "string" ? parseFloat(preco.replace(",", ".").replace(/[^\d.,-]/g, "")) : Number(preco))
      : (isDraft ? 0 : undefined);

    if (!isDraft && (!nomeFinal || !categoriaFinal || precoFinal === undefined)) {
      console.error("[API Products POST] Campos obrigatórios faltando:", { nome, categoria, preco });
      return NextResponse.json(
        { error: "nome, categoria e preco são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar e processar preço
    const precoNum = isDraft ? (typeof precoFinal === "number" ? precoFinal : 0) : (typeof preco === "string"
      ? parseFloat(preco.replace(",", ".").replace(/[^\d.,-]/g, ""))
      : Number(preco));
    const precoValid = isDraft ? Math.max(0, precoNum) : precoNum;
    if (!isDraft && (isNaN(precoValid) || precoValid < 0)) {
      console.error("[API Products POST] Preço inválido:", preco);
      return NextResponse.json(
        { error: "Preço inválido" },
        { status: 400 }
      );
    }

    // Validar e converter URL da imagem para PNG no Firebase Storage
    let imagemUrlFinal = "";
    if (imagemUrl && String(imagemUrl).trim()) {
      const urlTrimmed = String(imagemUrl).trim();
      try {
        // Validar se é uma URL válida
        new URL(urlTrimmed);
        
        // Se não for do Firebase Storage, converter para PNG e fazer upload
        if (!urlTrimmed.includes("storage.googleapis.com") && !urlTrimmed.includes("firebasestorage.googleapis.com")) {
          console.log("[API Products POST] Convertendo imagem de link para PNG:", urlTrimmed);
          try {
            const convertedUrl = await convertImageUrlToPng(urlTrimmed, lojistaId);
            if (convertedUrl) {
              imagemUrlFinal = convertedUrl;
              console.log("[API Products POST] Imagem convertida com sucesso:", imagemUrlFinal);
            } else {
              console.warn("[API Products POST] Conversão retornou null, usando URL original");
              imagemUrlFinal = urlTrimmed;
            }
          } catch (conversionError: any) {
            console.error("[API Products POST] Erro ao converter imagem, usando URL original:", conversionError);
            // Se falhar a conversão, usar a URL original
            imagemUrlFinal = urlTrimmed;
          }
        } else {
          // Já é do Firebase Storage, usar como está
          imagemUrlFinal = urlTrimmed;
        }
      } catch {
        console.warn("[API Products POST] URL de imagem inválida, ignorando:", urlTrimmed);
        imagemUrlFinal = "";
      }
    }

    const produtoData: any = {
      nome: nomeFinal,
      categoria: categoriaFinal,
      preco: precoValid,
      imagemUrl: imagemUrlFinal,
      cores: Array.isArray(cores) ? cores : (cores && String(cores).trim() ? [String(cores).trim()] : []),
      tamanhos: Array.isArray(tamanhos) ? tamanhos : (tamanhos && String(tamanhos).trim() ? [String(tamanhos).trim()] : []),
      tags: Array.isArray(tags) ? tags : (tags && String(tags).trim() ? [String(tags).trim()] : []),
      observacoes: observacoes ? String(observacoes).trim() : "",
      medidas: medidas ? String(medidas).trim() : "",
      unidadeMedida: unidadeMedida ? String(unidadeMedida).trim() : "UN",
    };

    // Adicionar campos de imagens se fornecidos
    if (imagemUrlOriginal) {
      produtoData.imagemUrlOriginal = String(imagemUrlOriginal).trim();
    }
    if (imagemUrlCatalogo) {
      produtoData.imagemUrlCatalogo = String(imagemUrlCatalogo).trim();
    }
    if (imagemUrlCombinada) {
      produtoData.imagemUrlCombinada = String(imagemUrlCombinada).trim();
    }
    if (Array.isArray(catalogImageUrls) && catalogImageUrls.length > 0) {
      produtoData.catalogImageUrls = catalogImageUrls
        .filter((u): u is string => typeof u === "string" && u.trim() !== "")
        .map((u) => u.trim())
        .slice(0, 6);
    }
    if (imagemMedidasCustomizada) {
      produtoData.imagemMedidasCustomizada = String(imagemMedidasCustomizada).trim();
    }
    if (status === "draft" || status === "published") {
      produtoData.status = status;
    }
    if (typeof exibirNoDisplay === "boolean") {
      produtoData.exibirNoDisplay = exibirNoDisplay;
    }
    if (Array.isArray(extraImageUrls) && extraImageUrls.length > 0) {
      produtoData.extraImageUrls = extraImageUrls.map((e: any) =>
        typeof e === "object" && e != null && typeof e.idx === "number" && typeof e.url === "string"
          ? { idx: e.idx, url: String(e.url).trim() }
          : null
      ).filter(Boolean);
    }

    // Adicionar campos da análise IA: usar objeto completo se enviado (rascunho), senão montar a partir dos campos
    if (analiseIA && typeof analiseIA === "object" && !Array.isArray(analiseIA)) {
      produtoData.analiseIA = { ...analiseIA, ultimaAtualizacao: new Date().toISOString() };
    } else {
      if (product_type) {
        produtoData.product_type = String(product_type).trim();
      }
      if (detected_fabric) {
        produtoData.detected_fabric = String(detected_fabric).trim();
      }
      if (dominant_colors && Array.isArray(dominant_colors)) {
        produtoData.dominant_colors = dominant_colors;
      }
      if (product_type || detected_fabric || dominant_colors) {
        produtoData.analiseIA = {
          ...(product_type && { product_type: String(product_type).trim() }),
          ...(detected_fabric && { detected_fabric: String(detected_fabric).trim(), tecido_estimado: String(detected_fabric).trim() }),
          ...(dominant_colors && Array.isArray(dominant_colors) && { dominant_colors }),
          ultimaAtualizacao: new Date().toISOString(),
        };
      }
    }

    // Processar variações se fornecidas
    if (variacoes !== undefined && Array.isArray(variacoes) && variacoes.length > 0) {
      // Filtrar apenas variações válidas (com variacao preenchida)
      const variacoesValidas = variacoes
        .filter((v: any) => v && v.variacao && String(v.variacao).trim())
        .map((v: any) => ({
          variacao: String(v.variacao).trim(),
          estoque: parseInt(v.estoque) || 0,
          sku: v.sku ? String(v.sku).trim() : "",
        }));
      
      if (variacoesValidas.length > 0) {
        produtoData.variacoes = variacoesValidas;
        // Se tem variações, também atualizar tamanhos baseado nas variações
        produtoData.tamanhos = variacoesValidas.map((v: any) => v.variacao);
        // Calcular estoque total das variações
        const estoqueTotal = variacoesValidas.reduce((sum: number, v: any) => sum + (v.estoque || 0), 0);
        if (estoqueTotal > 0) {
          produtoData.estoque = estoqueTotal;
        }
      }
    } else {
      // Só adiciona estoque se for um número válido (não undefined/null/vazio) e não houver variações
      if (estoque !== undefined && estoque !== null && estoque !== "") {
        const estoqueNum = Number(estoque);
        if (!isNaN(estoqueNum)) {
          produtoData.estoque = estoqueNum;
        }
      }
    }

    console.log("[API Products POST] Dados processados:", JSON.stringify(produtoData, null, 2));

    const productId = await createProduto(lojistaId, produtoData);

    return NextResponse.json({ success: true, productId });
  } catch (error: any) {
    console.error("[API Products POST] Erro completo:", error);
    console.error("[API Products POST] Stack:", error?.stack);
    return NextResponse.json(
      { 
        error: error?.message || "Erro ao criar produto",
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}
