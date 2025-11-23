import { NextRequest, NextResponse } from "next/server";
import { fetchProdutos } from "@/lib/firestore/server";

function resolveLojistaId(request: NextRequest): string | null {
  const param = request.nextUrl.searchParams.get("lojista");
  if (param && param.trim().length > 0) {
    return param.trim();
  }
  return (
    process.env.NEXT_PUBLIC_LOJISTA_ID ||
    process.env.LOJISTA_ID ||
    null
  );
}

function buildCorsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": request.headers.get("access-control-request-headers") ?? "*",
    Vary: "Origin",
  };
}

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}

export async function GET(request: NextRequest) {
  const lojistaId = resolveLojistaId(request);

  if (!lojistaId) {
    return NextResponse.json(
      { error: "lojistaId não configurado." },
      { status: 400 }
    );
  }

  try {
    const produtos = await fetchProdutos(lojistaId);
    const payload = produtos
      .filter((produto) => !produto.arquivado)
      .map((produto) => ({
        id: produto.id,
        nome: produto.nome,
        preco: produto.preco,
        categoria: produto.categoria,
        cores: produto.cores,
        tamanhos: produto.tamanhos,
        tags: produto.tags,
        imagemUrl: produto.imagemUrl,
      }));

    return NextResponse.json(
      {
        lojistaId,
        produtos: payload,
        total: payload.length,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
          ...buildCorsHeaders(request),
        },
      }
    );
  } catch (error) {
    console.error("[api/public/products] erro ao carregar produtos:", error);
    return NextResponse.json(
      { error: "Erro interno ao carregar produtos." },
      {
        status: 500,
        headers: buildCorsHeaders(request),
      }
    );
  }
}




