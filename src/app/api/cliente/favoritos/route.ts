import { NextRequest, NextResponse } from "next/server";
import { fetchFavoriteLooks } from "@/lib/firestore/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const lojistaId = request.nextUrl.searchParams.get("lojistaId");
    const customerId = request.nextUrl.searchParams.get("customerId");

    console.log("[api/cliente/favoritos] Buscando favoritos:", { lojistaId, customerId });

    if (!lojistaId || !customerId) {
      console.error("[api/cliente/favoritos] Parâmetros faltando:", { lojistaId: !!lojistaId, customerId: !!customerId });
      return NextResponse.json(
        { error: "lojistaId e customerId são obrigatórios" },
        { status: 400 }
      );
    }

    const favorites = await fetchFavoriteLooks({ lojistaId, customerId });
    
    console.log(`[api/cliente/favoritos] Favoritos encontrados: ${favorites.length}`);

    return NextResponse.json({ favorites });
  } catch (error: any) {
    console.error("[api/cliente/favoritos] Erro ao buscar favoritos:", error);
    console.error("[api/cliente/favoritos] Stack:", error?.stack);
    return NextResponse.json(
      { 
        error: "Erro interno ao buscar favoritos",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}


