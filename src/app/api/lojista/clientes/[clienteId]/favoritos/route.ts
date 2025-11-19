import { NextRequest, NextResponse } from "next/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

/**
 * GET /api/lojista/clientes/[clienteId]/favoritos
 * Busca favoritos (likes) de um cliente
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  try {
    const { clienteId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    const limit = parseInt(searchParams.get("limit") || "20");

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

    // Buscar apenas likes, ordenados por data (mais recentes primeiro)
    const snapshot = await favoritosRef
      .where("action", "==", "like")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const favoritos: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      favoritos.push({
        id: doc.id,
        imagemUrl: data?.imagemUrl || "",
        action: data?.action || "like",
        createdAt: data?.createdAt?.toDate?.() || new Date(data?.createdAt || 0),
      });
    });

    return NextResponse.json({ favoritos });
  } catch (error: any) {
    console.error("[API Favoritos GET] Erro:", error);
    // Se falhar por falta de índice, tentar buscar todos e filtrar
    if (error?.code === "failed-precondition") {
      try {
        const { clienteId } = await params;
        const searchParams = request.nextUrl.searchParams;
        const lojistaIdFromQuery = searchParams.get("lojistaId");
        const limit = parseInt(searchParams.get("limit") || "20");

        const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
        const lojistaId =
          lojistaIdFromQuery ||
          lojistaIdFromAuth ||
          process.env.NEXT_PUBLIC_LOJISTA_ID ||
          process.env.LOJISTA_ID ||
          "";

        const db = getAdminDb();
        const favoritosRef = db
          .collection("lojas")
          .doc(lojistaId)
          .collection("clientes")
          .doc(clienteId)
          .collection("favoritos");

        const allSnapshot = await favoritosRef.get();
        const favoritos: any[] = [];
        allSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data?.action === "like" || data?.tipo === "like" || data?.votedType === "like") {
            favoritos.push({
              id: doc.id,
              imagemUrl: data?.imagemUrl || "",
              action: "like",
              createdAt: data?.createdAt?.toDate?.() || new Date(data?.createdAt || 0),
            });
          }
        });

        // Ordenar por data e limitar
        favoritos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return NextResponse.json({ favoritos: favoritos.slice(0, limit) });
      } catch (fallbackError) {
        console.error("[API Favoritos GET] Erro no fallback:", fallbackError);
        return NextResponse.json(
          { error: "Erro ao buscar favoritos" },
          { status: 500 }
        );
      }
    }
    return NextResponse.json(
      { error: "Erro ao buscar favoritos" },
      { status: 500 }
    );
  }
}

