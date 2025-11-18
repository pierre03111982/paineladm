import { NextRequest, NextResponse } from "next/server";
import { fetchLojaPerfil, fetchProdutos } from "@/lib/firestore/server";

function applyCors(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get("origin") || "*";
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  return applyCors(response, request);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaId = searchParams.get("lojistaId");

    console.log("[API Simulator] Recebida requisição:", { lojistaId });

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar dados da loja e produtos
    const [perfil, produtos] = await Promise.all([
      fetchLojaPerfil(lojistaId),
      fetchProdutos(lojistaId),
    ]);

    console.log("[API Simulator] Dados buscados:", {
      perfil: perfil ? { nome: perfil.nome, logoUrl: perfil.logoUrl } : null,
      produtosCount: produtos.length,
      produtos: produtos.map(p => ({ id: p.id, nome: p.nome, arquivado: p.arquivado || false })),
    });

    // Transformar dados para o formato esperado pelo app cliente
    const lojistaData = {
      id: lojistaId,
      nome: perfil?.nome || "Loja",
      logoUrl: perfil?.logoUrl || null,
      redesSociais: {
        instagram: perfil?.instagram || null,
        tiktok: perfil?.tiktok || null,
        facebook: perfil?.facebook || null,
      },
      salesConfig: {
        channel: (perfil as any)?.salesConfig?.channel || ((perfil as any)?.salesConfig?.checkoutLink || (perfil as any)?.checkoutLink ? "checkout" : "whatsapp"),
        salesWhatsapp: (perfil as any)?.salesConfig?.salesWhatsapp || (perfil as any)?.whatsapp || null,
        checkoutLink: (perfil as any)?.salesConfig?.checkoutLink || (perfil as any)?.checkoutLink || null,
        // Compatibilidade com formato antigo
        whatsappLink: (perfil as any)?.salesConfig?.salesWhatsapp
          ? `https://wa.me/${(perfil as any).salesConfig.salesWhatsapp.replace(/\D/g, "")}`
          : (perfil as any)?.whatsapp
          ? `https://wa.me/${(perfil as any).whatsapp.replace(/\D/g, "")}`
          : null,
        ecommerceUrl: (perfil as any)?.salesConfig?.checkoutLink || (perfil as any)?.checkoutLink || null,
      },
    };

    // Transformar produtos para o formato esperado (apenas produtos ativos)
    // Incluir produtos sem status definido (assumir que são ativos)
    const produtosFormatados = produtos
      .filter((produto) => {
        return !produto.arquivado;
      })
      .map((produto) => ({
        id: produto.id,
        nome: produto.nome,
        preco: produto.preco || 0,
        imagemUrl: produto.imagemUrl || "",
        categoria: produto.categoria || "Outros",
        tamanhos: produto.tamanhos || [],
        cores: produto.cores || [],
        medidas: produto.medidas || undefined,
        estoque: produto.estoque || null,
        obs: produto.obs || undefined,
      }));

    console.log("[API Simulator] Produtos formatados:", {
      total: produtos.length,
      ativos: produtosFormatados.length,
      formatados: produtosFormatados.map(p => ({ id: p.id, nome: p.nome })),
    });

    const response = NextResponse.json({
      lojistaData,
      produtos: produtosFormatados,
    });
    
    return applyCors(response, request);
  } catch (error) {
    console.error("Erro ao buscar dados do simulador:", error);
    const errorResponse = NextResponse.json(
      { error: "Erro ao buscar dados", details: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    );
    return applyCors(errorResponse, request);
  }
}


