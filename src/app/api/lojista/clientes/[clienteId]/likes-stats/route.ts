import { NextRequest, NextResponse } from "next/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

/**
 * GET /api/lojista/clientes/[clienteId]/likes-stats
 * Busca estatísticas de likes e dislikes de um cliente
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  try {
    const { clienteId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");

    // Prioridade: query string (modo admin) > usuário logado
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

    if (!clienteId) {
      return NextResponse.json(
        { error: "clienteId é obrigatório" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const favoritosRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes")
      .doc(clienteId)
      .collection("favoritos");

    const snapshot = await favoritosRef.get();

    let totalLikes = 0;
    let totalDislikes = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const action = data?.action || data?.tipo || data?.votedType || "like";
      if (action === "like") {
        totalLikes++;
      } else if (action === "dislike") {
        totalDislikes++;
      }
    });

    return NextResponse.json({ totalLikes, totalDislikes });
  } catch (error) {
    console.error("[API Likes Stats GET] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao buscar estatísticas", totalLikes: 0, totalDislikes: 0 },
      { status: 500 }
    );
  }
}

