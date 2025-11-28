import { NextRequest, NextResponse } from "next/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

/**
 * GET /api/lojista/display-settings
 * Busca configurações de display do lojista
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    
    // Se não veio na query, tentar pegar do usuário logado
    let lojistaId = lojistaIdFromQuery;
    if (!lojistaId) {
      try {
        lojistaId = await getCurrentLojistaId();
      } catch {
        // Se não conseguir, retornar erro
      }
    }

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
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

    // Buscar configurações do perfil
    const perfilRef = db.collection("lojas").doc(lojistaId).collection("perfil").doc("dados");
    const perfilDoc = await perfilRef.get();

    if (perfilDoc.exists) {
      const data = perfilDoc.data();
      return NextResponse.json({
        orientation: data?.displayOrientation || "horizontal",
      });
    }

    // Se não encontrou em perfil/dados, tentar no documento da loja
    const lojaRef = db.collection("lojas").doc(lojistaId);
    const lojaDoc = await lojaRef.get();

    if (lojaDoc.exists) {
      const data = lojaDoc.data();
      return NextResponse.json({
        orientation: data?.displayOrientation || "horizontal",
      });
    }

    // Retornar padrão se não encontrou
    return NextResponse.json({
      orientation: "horizontal",
    });
  } catch (error: any) {
    console.error("[display-settings] Erro ao buscar configurações:", error);
    return NextResponse.json(
      { error: "Erro ao buscar configurações" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lojista/display-settings
 * Salva configurações de display do lojista
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lojistaId: lojistaIdFromBody, orientation } = body;

    // Se não veio no body, tentar pegar do usuário logado
    let lojistaId = lojistaIdFromBody;
    if (!lojistaId) {
      try {
        lojistaId = await getCurrentLojistaId();
      } catch {
        // Se não conseguir, retornar erro
      }
    }

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    if (!orientation || (orientation !== "horizontal" && orientation !== "vertical")) {
      return NextResponse.json(
        { error: "orientation deve ser 'horizontal' ou 'vertical'" },
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

    // Salvar em perfil/dados (prioridade)
    const perfilRef = db.collection("lojas").doc(lojistaId).collection("perfil").doc("dados");
    await perfilRef.set(
      {
        displayOrientation: orientation,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Também salvar no documento da loja para compatibilidade
    const lojaRef = db.collection("lojas").doc(lojistaId);
    await lojaRef.set(
      {
        displayOrientation: orientation,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    console.log("[display-settings] ✅ Configuração salva:", { lojistaId, orientation });

    return NextResponse.json({
      success: true,
      orientation,
    });
  } catch (error: any) {
    console.error("[display-settings] Erro ao salvar configurações:", error);
    return NextResponse.json(
      { error: "Erro ao salvar configurações" },
      { status: 500 }
    );
  }
}







