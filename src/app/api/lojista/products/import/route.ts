import { NextRequest, NextResponse } from "next/server";
import { productSchema, type ProductPayload } from "@/lib/validators/products";
import { createProdutosEmLote } from "@/lib/firestore/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

export const dynamic = 'force-dynamic';

type ProdutoImportPayload = {
  linha: number;
  dados: unknown;
};

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
      return NextResponse.json(
        { error: "lojistaId não encontrado" },
        { status: 400 }
      );
    }

    const json = await request.json();
    const produtosBrutos: ProdutoImportPayload[] = Array.isArray(json?.produtos)
      ? json.produtos
      : [];

    if (produtosBrutos.length === 0) {
      return NextResponse.json(
        {
          error: "Nenhum produto recebido para importação.",
        },
        { status: 400 }
      );
    }

    const validos: {
      linha: number;
      dados: ProductPayload;
    }[] = [];
    const falhasValidacao: {
      linha: number;
      mensagem: string;
    }[] = [];

    produtosBrutos.forEach((entrada, index) => {
      const linha =
        typeof entrada?.linha === "number" ? entrada.linha : index + 2;
      const resultado = productSchema.safeParse(entrada?.dados ?? {});
      if (resultado.success) {
        validos.push({ linha, dados: resultado.data });
      } else {
        falhasValidacao.push({
          linha,
          mensagem: resultado.error.issues
            .map((issue) => issue.message)
            .join("; "),
        });
      }
    });

    if (validos.length === 0) {
      return NextResponse.json(
        {
          error: "Nenhum produto válido para importação.",
          falhasValidacao,
        },
        { status: 400 }
      );
    }

    const resultadoCriacao = await createProdutosEmLote(
      lojistaId,
      validos.map((item) => item.dados)
    );

    const falhasEscrita = resultadoCriacao.errors.map((erro) => ({
      linha: validos[erro.index]?.linha ?? erro.index + 2,
      mensagem: erro.message,
    }));

    return NextResponse.json(
      {
        criados: resultadoCriacao.created.length,
        produtos: resultadoCriacao.created,
        falhasValidacao,
        falhasEscrita,
      },
      { status: falhasValidacao.length || falhasEscrita.length ? 207 : 201 }
    );
  } catch (error) {
    console.error(
      "[api/lojista/products/import] erro ao importar produtos:",
      error
    );
    return NextResponse.json(
      { error: "Erro interno ao importar produtos." },
      { status: 500 }
    );
  }
}




