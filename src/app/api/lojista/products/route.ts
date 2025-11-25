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
    const filteredProdutos = includeArchived 
      ? produtos 
      : produtos.filter((p) => !p.arquivado);

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
    } = body;

    if (!nome || !categoria || preco === undefined) {
      console.error("[API Products POST] Campos obrigatórios faltando:", { nome, categoria, preco });
      return NextResponse.json(
        { error: "nome, categoria e preco são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar e processar preço
    const precoNum = typeof preco === 'string' 
      ? parseFloat(preco.replace(",", ".").replace(/[^\d.,-]/g, "")) 
      : Number(preco);
    
    if (isNaN(precoNum) || precoNum < 0) {
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
      nome: String(nome).trim(),
      categoria: String(categoria).trim(),
      preco: precoNum,
      imagemUrl: imagemUrlFinal,
      cores: Array.isArray(cores) ? cores : (cores && String(cores).trim() ? [String(cores).trim()] : []),
      tamanhos: Array.isArray(tamanhos) ? tamanhos : (tamanhos && String(tamanhos).trim() ? [String(tamanhos).trim()] : []),
      tags: Array.isArray(tags) ? tags : (tags && String(tags).trim() ? [String(tags).trim()] : []),
      observacoes: observacoes ? String(observacoes).trim() : "",
      medidas: medidas ? String(medidas).trim() : "",
    };

    // Só adiciona estoque se for um número válido (não undefined/null/vazio)
    if (estoque !== undefined && estoque !== null && estoque !== "") {
      const estoqueNum = Number(estoque);
      if (!isNaN(estoqueNum)) {
        produtoData.estoque = estoqueNum;
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
