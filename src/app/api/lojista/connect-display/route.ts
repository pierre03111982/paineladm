import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = 'force-dynamic';

/**
 * PHASE 16: Connect Display API
 * Conecta um display ao lojista (pareia)
 * Endpoint: POST /api/lojista/connect-display
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lojistaId, displayUuid } = body;

    if (!lojistaId || !displayUuid) {
      return NextResponse.json(
        { error: "lojistaId e displayUuid são obrigatórios" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: "Firebase Admin não configurado" },
        { status: 500 }
      );
    }

    // Atualizar display para status 'paired' e associar ao lojista
    const displayRef = db.collection("displays").doc(displayUuid);
    
    await displayRef.set(
      {
        lojistaId,
        status: "paired",
        pairedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log("[connect-display] ✅ Display conectado:", {
      displayUuid,
      lojistaId,
    });

    return NextResponse.json({
      success: true,
      displayUuid,
      lojistaId,
    });
  } catch (error: any) {
    console.error("[connect-display] ❌ Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao conectar display",
        details: error.message,
      },
      { status: 500 }
    );
  }
}






