/**
 * API Route: Gerenciar lojistas (Admin)
 * PATCH /api/admin/lojistas/[lojistaId]
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

const db = getAdminDb();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ lojistaId: string }> }
) {
  try {
    const { lojistaId } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Ação é obrigatória" },
        { status: 400 }
      );
    }

    const lojaRef = db.collection("lojas").doc(lojistaId);
    const lojaDoc = await lojaRef.get();

    if (!lojaDoc.exists) {
      return NextResponse.json(
        { error: "Lojista não encontrado" },
        { status: 404 }
      );
    }

    let updateData: any = {};

    switch (action) {
      case "approve":
        updateData = {
          status: "ativo",
          updatedAt: new Date(),
        };
        break;
      case "reject":
        updateData = {
          status: "rejeitado",
          updatedAt: new Date(),
        };
        break;
      case "suspend":
        updateData = {
          status: "suspenso",
          updatedAt: new Date(),
        };
        break;
      case "activate":
        updateData = {
          status: "ativo",
          updatedAt: new Date(),
        };
        break;
      default:
        return NextResponse.json(
          { error: "Ação inválida" },
          { status: 400 }
        );
    }

    await lojaRef.update(updateData);

    const updatedDoc = await lojaRef.get();
    const data = updatedDoc.data();

    return NextResponse.json({
      id: updatedDoc.id,
      status: data?.status || updateData.status,
      ...updateData,
    });
  } catch (error) {
    console.error("[API Admin Lojistas] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao atualizar lojista",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

