import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");
    const lojistaId = searchParams.get("lojistaId");

    if (!sessionId || !lojistaId) {
      return NextResponse.json(
        { error: "sessionId e lojistaId são obrigatórios" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const doc = await db
      .collection("display_sessions")
      .doc(sessionId)
      .get();

    if (!doc.exists) {
      return NextResponse.json({ photoUrl: null });
    }

    const data = doc.data();
    if (data?.lojistaId !== lojistaId) {
      return NextResponse.json(
        { error: "Sessão não pertence a este lojista" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      photoUrl: data?.photoUrl || null,
    });
  } catch (error) {
    console.error("Erro ao buscar foto:", error);
    return NextResponse.json(
      { error: "Erro ao buscar foto" },
      { status: 500 }
    );
  }
}

