/**
 * API Route: Gerenciar planos (Admin)
 * GET /api/admin/planos - Listar planos
 * POST /api/admin/planos - Criar plano
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

const db = getAdminDb();

export async function GET() {
  try {
    const snapshot = await db.collection("planos").get();
    
    const planos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ planos });
  } catch (error) {
    console.error("[API Admin Planos] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao buscar planos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, preco, limiteImagens, descricao, ativo } = body;

    if (!nome || preco === undefined || limiteImagens === undefined) {
      return NextResponse.json(
        { error: "Nome, preço e limite de imagens são obrigatórios" },
        { status: 400 }
      );
    }

    const planoData = {
      nome,
      preco: parseFloat(preco),
      limiteImagens: parseInt(limiteImagens),
      descricao: descricao || "",
      ativo: ativo !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Usar nome como ID (normalizado)
    const planoId = nome.toLowerCase().replace(/\s+/g, "-");
    await db.collection("planos").doc(planoId).set(planoData);

    return NextResponse.json({
      id: planoId,
      ...planoData,
    });
  } catch (error) {
    console.error("[API Admin Planos] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao criar plano",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}















































































