import { NextRequest, NextResponse } from "next/server";
import { fetchFavoriteLooks } from "@/lib/firestore/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const lojistaId = request.nextUrl.searchParams.get("lojistaId");
    const customerId = request.nextUrl.searchParams.get("customerId");
    const timestamp = request.nextUrl.searchParams.get("_t");

    console.log("[api/cliente/favoritos] Buscando favoritos:", { lojistaId, customerId, timestamp });

    if (!lojistaId || !customerId) {
      console.error("[api/cliente/favoritos] Parâmetros faltando:", { lojistaId: !!lojistaId, customerId: !!customerId });
      return NextResponse.json(
        { error: "lojistaId e customerId são obrigatórios" },
        { status: 400 }
      );
    }

    // Adicionar headers para evitar cache
    let favorites: any[] = [];
    try {
      favorites = await fetchFavoriteLooks({ lojistaId, customerId });
    } catch (fetchError: any) {
      console.error("[api/cliente/favoritos] Erro ao buscar favoritos:", fetchError);
      console.error("[api/cliente/favoritos] Stack:", fetchError?.stack);
      // Retornar array vazio em vez de erro 500
      favorites = [];
    }
    
    console.log(`[api/cliente/favoritos] Favoritos encontrados: ${favorites.length}`);
    if (favorites.length > 0) {
      console.log(`[api/cliente/favoritos] Primeiro favorito (mais recente):`, {
        id: favorites[0].id,
        imagemUrl: favorites[0].imagemUrl?.substring(0, 50),
        createdAt: favorites[0].createdAt,
        action: favorites[0].action
      });
    }

    return NextResponse.json(
      { favorites },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error: any) {
    console.error("[api/cliente/favoritos] Erro crítico:", error);
    console.error("[api/cliente/favoritos] Stack:", error?.stack);
    // Retornar array vazio em vez de erro 500 para não quebrar o frontend
    return NextResponse.json(
      { 
        favorites: [],
        error: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 200 } // Retornar 200 com array vazio
    );
  }
}
