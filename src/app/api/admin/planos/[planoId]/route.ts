/**
 * API Route: Gerenciar plano específico (Admin)
 * PATCH /api/admin/planos/[planoId] - Atualizar plano
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

const db = getAdminDb();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planoId: string }> }
) {
  try {
    const { planoId } = await params;
    const body = await request.json();
    const { action, ...updateData } = body;

    const planoRef = db.collection("planos").doc(planoId);
    const planoDoc = await planoRef.get();

    if (!planoDoc.exists) {
      return NextResponse.json(
        { error: "Plano não encontrado" },
        { status: 404 }
      );
    }

    let finalUpdateData: any = {
      updatedAt: new Date(),
    };

    if (action === "toggle") {
      const currentData = planoDoc.data();
      finalUpdateData.ativo = !currentData?.ativo;
    } else {
      // Atualização completa
      if (updateData.nome) finalUpdateData.nome = updateData.nome;
      if (updateData.preco !== undefined) finalUpdateData.preco = parseFloat(updateData.preco);
      if (updateData.limiteImagens !== undefined) finalUpdateData.limiteImagens = parseInt(updateData.limiteImagens);
      if (updateData.descricao !== undefined) finalUpdateData.descricao = updateData.descricao;
      if (updateData.ativo !== undefined) finalUpdateData.ativo = updateData.ativo;
    }

    await planoRef.update(finalUpdateData);

    const updatedDoc = await planoRef.get();
    const data = updatedDoc.data();

    return NextResponse.json({
      id: updatedDoc.id,
      ...data,
    });
  } catch (error) {
    console.error("[API Admin Planos] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao atualizar plano",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

