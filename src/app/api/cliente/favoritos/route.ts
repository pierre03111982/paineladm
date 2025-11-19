import { NextRequest, NextResponse } from "next/server";
import { fetchFavoriteLooks } from "@/lib/firestore/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const lojistaId = request.nextUrl.searchParams.get("lojistaId");
    const customerId = request.nextUrl.searchParams.get("customerId");

    if (!lojistaId || !customerId) {
      return NextResponse.json(
        { error: "lojistaId e customerId são obrigatórios" },
        { status: 400 }
      );
    }

    const favorites = await fetchFavoriteLooks({ lojistaId, customerId });

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error("[api/cliente/favoritos] Erro ao buscar favoritos:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar favoritos" },
      { status: 500 }
    );
  }
}


