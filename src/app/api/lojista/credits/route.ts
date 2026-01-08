import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

/**
 * API para consultar créditos do lojista
 * FASE 32: Estúdio de Criação Digital
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaId = searchParams.get("lojistaId");

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const lojaDoc = await db.collection("lojas").doc(lojistaId).get();

    if (!lojaDoc.exists) {
      return NextResponse.json(
        { error: "Loja não encontrada" },
        { status: 404 }
      );
    }

    const lojaData = lojaDoc.data() || {};
    const lojaNome = lojaData.nome || lojaData.name || "";
    
    // Verificar se é a loja Pierre Moda (teste ilimitado)
    const isPierreModa = lojaNome.toLowerCase().includes("pierre") && 
                         (lojaNome.toLowerCase().includes("moda") || lojaNome.toLowerCase().includes("fashion"));
    const subscription = lojaData.subscription || {};
    const isTestUnlimited = subscription.clientType === "test_unlimited" || isPierreModa;

    // Se for teste ilimitado, retornar valores altos para exibição (mas não são debitados)
    const credits = isTestUnlimited ? 999999 : (lojaData.credits || 0);
    const catalogPack = isTestUnlimited ? 999999 : (lojaData.catalogPack || 0);

    return NextResponse.json({
      credits,
      catalogPack,
      isUnlimited: isTestUnlimited, // Flag para indicar que é ilimitado
    });
  } catch (error: any) {
    console.error("[api/lojista/credits] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao consultar créditos",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

