/**
 * GET /api/lojista/display-produtos?lojistaId=xxx
 * Retorna produtos marcados para exibir no display da loja (exibirNoDisplay === true).
 * imagemModeloFrente = catalogImageUrls[2] (Modelo Frente) ou fallback para primeira imagem.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchProdutos } from "@/lib/firestore/server";

export type DisplayProdutoItem = {
  id: string;
  nome: string;
  imagemModeloFrente: string;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lojistaId = searchParams.get("lojistaId");
    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    const produtos = await fetchProdutos(lojistaId);
    const paraDisplay = produtos
      .filter((p) => p.exibirNoDisplay === true)
      .filter((p) => {
        const url = getModeloFrenteUrl(p);
        return !!url;
      })
      .map((p): DisplayProdutoItem => ({
        id: p.id,
        nome: p.nome || "",
        imagemModeloFrente: getModeloFrenteUrl(p)!,
      }));

    return NextResponse.json({ produtos: paraDisplay });
  } catch (error) {
    console.error("[display-produtos] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao carregar produtos do display" },
      { status: 500 }
    );
  }
}

/** Modelo Frente = catalogImageUrls[2]; fallback: catalogImageUrls[0], imagemUrlCatalogo, imagemUrl */
function getModeloFrenteUrl(p: {
  catalogImageUrls?: string[];
  imagemUrlCatalogo?: string;
  imagemUrl?: string;
}): string | null {
  const urls = p.catalogImageUrls;
  if (Array.isArray(urls) && urls.length > 0) {
    const modeloFrente = urls[2];
    if (modeloFrente && typeof modeloFrente === "string" && modeloFrente.trim())
      return modeloFrente.trim();
    if (urls[0] && typeof urls[0] === "string" && urls[0].trim())
      return urls[0].trim();
  }
  if (p.imagemUrlCatalogo && p.imagemUrlCatalogo.trim())
    return p.imagemUrlCatalogo.trim();
  if (p.imagemUrl && p.imagemUrl.trim()) return p.imagemUrl.trim();
  return null;
}
