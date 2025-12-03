import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin"; 
// Agora esta importação vai funcionar porque você criou o arquivo!
import { VertexAgent } from "@/lib/ai-services/vertex-agent";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { message, lojistaId } = await req.json();

    if (!message || !lojistaId) {
      return NextResponse.json({ reply: "Erro: Faltam dados." });
    }

    // 1. Busca Contexto Básico (Sem travar)
    const db = getAdminDb();
    let contextData = "Dados indisponíveis no momento.";

    try {
      // Busca contagem simples para não precisar de índice complexo
      const productsRef = db.collection(`lojas/${lojistaId}/produtos`);
      const snapshot = await productsRef.limit(1).get(); // Apenas verifica se tem produtos
      const hasProducts = !snapshot.empty;
      
      contextData = hasProducts ? "O lojista possui produtos cadastrados." : "O lojista ainda não tem produtos.";
    } catch (e) {
      console.warn("Erro ao ler contexto:", e);
    }

    // 2. Chama a IA
    const agent = new VertexAgent();
    const reply = await agent.sendMessage(message, contextData);

    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error("[Chat API] Erro:", error);
    return NextResponse.json({ reply: "Erro interno no servidor." }, { status: 500 });
  }
}