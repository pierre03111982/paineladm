import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const lojistaId = body?.lojistaId as string | undefined;
    const salesConfig = body?.salesConfig;

    if (!lojistaId) {
      return NextResponse.json(
        { success: false, error: "lojistaId obrigatório" },
        { status: 400 }
      );
    }

    if (!salesConfig) {
      return NextResponse.json(
        { success: false, error: "salesConfig obrigatório" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("perfil")
      .doc("dados")
      .set(
        {
          salesConfig,
        },
        { merge: true }
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/lojista/sales-config] Erro ao salvar:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao salvar salesConfig." },
      { status: 500 }
    );
  }
}



