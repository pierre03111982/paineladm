import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/chat/history
 * Retorna o histórico de mensagens do chat persistido no Firestore
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lojistaIdFromQuery = searchParams.get("lojistaId");

    // Obter lojistaId
    const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
    const lojistaId = lojistaIdFromQuery || lojistaIdFromAuth;

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const lojaRef = db.collection("lojas").doc(lojistaId);
    const chatMessagesRef = lojaRef.collection("chat_messages");

    // Buscar últimas 50 mensagens ordenadas por data
    const historySnapshot = await chatMessagesRef
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const messages = historySnapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          role: data.role,
          content: data.content,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
      })
      .reverse(); // Reverter para ordem cronológica (mais antiga primeiro)

    console.log("[AI/Chat/History] 📚 Histórico carregado:", messages.length, "mensagens");

    return NextResponse.json({
      success: true,
      messages,
      count: messages.length,
    });
  } catch (error: any) {
    console.error("[AI/Chat/History] ❌ Erro:", error);
    return NextResponse.json(
      { error: "Erro ao carregar histórico", details: error.message },
      { status: 500 }
    );
  }
}



