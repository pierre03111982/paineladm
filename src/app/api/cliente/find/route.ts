import { NextRequest, NextResponse } from "next/server";
import { fetchClienteByWhatsapp, fetchFavoriteLooks } from "@/lib/firestore/server";

function buildCorsHeaders() {
  const origin =
    process.env.NEXT_PUBLIC_CLIENT_APP_URL ?? "http://localhost:3002";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}

/**
 * GET /api/cliente/find?lojistaId=xxx&whatsapp=xxx
 * Busca cliente por WhatsApp e retorna dados completos (incluindo favoritos)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaId = searchParams.get("lojistaId");
    const whatsapp = searchParams.get("whatsapp");

    if (!lojistaId || !whatsapp) {
      return NextResponse.json(
        { error: "lojistaId e whatsapp são obrigatórios" },
        { status: 400, headers: buildCorsHeaders() }
      );
    }

    const cliente = await fetchClienteByWhatsapp(lojistaId, whatsapp);

    if (!cliente) {
      return NextResponse.json(
        { cliente: null, favoritos: [] },
        { headers: buildCorsHeaders() }
      );
    }

    // Buscar favoritos do cliente
    const favoritos = await fetchFavoriteLooks({
      lojistaId,
      customerId: cliente.id,
    });

    return NextResponse.json(
      {
        cliente: {
          id: cliente.id,
          nome: cliente.nome,
          whatsapp: cliente.whatsapp,
          email: cliente.email,
          totalComposicoes: cliente.totalComposicoes,
          createdAt: cliente.createdAt,
        },
        favoritos,
      },
      { headers: buildCorsHeaders() }
    );
  } catch (error: any) {
    console.error("[API Cliente Find] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar cliente" },
      { status: 500, headers: buildCorsHeaders() }
    );
  }
}

