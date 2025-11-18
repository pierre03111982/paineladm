import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/auth/admin-auth";

// Forçar renderização dinâmica
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/lojas
 * Lista todas as lojas cadastradas
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const db = getAdminDb();
    const lojasSnapshot = await db.collection("lojas").get();

    const lojas = lojasSnapshot.docs.map((doc) => ({
      id: doc.id,
      nome: doc.data().nome || "Loja sem nome",
      email: doc.data().email || "",
      status: doc.data().status || "pendente",
      planoAtual: doc.data().planoAtual || "free",
    }));

    return NextResponse.json({ lojas });
  } catch (error) {
    console.error("[API Lojas GET] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao listar lojas" },
      { status: 500 }
    );
  }
}




