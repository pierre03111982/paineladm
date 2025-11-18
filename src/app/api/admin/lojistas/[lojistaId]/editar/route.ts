import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/auth/admin-auth";

// Forçar renderização dinâmica
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/lojistas/[lojistaId]/editar
 * Permite ao admin editar qualquer informação da loja
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ lojistaId: string }> }
) {
  try {
    await requireAdmin();

    const { lojistaId } = await params;
    const body = await request.json();
    const db = getAdminDb();

    // Atualizar dados da loja
    const lojaRef = db.collection("lojas").doc(lojistaId);
    const lojaDoc = await lojaRef.get();

    if (!lojaDoc.exists) {
      return NextResponse.json(
        { error: "Loja não encontrada" },
        { status: 404 }
      );
    }

    // Atualizar campos permitidos
    const updateData: any = {};
    
    if (body.nome !== undefined) updateData.nome = body.nome;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.descricao !== undefined) updateData.descricao = body.descricao;
    if (body.planoAtual !== undefined) updateData.planoAtual = body.planoAtual;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.statusPagamento !== undefined) updateData.statusPagamento = body.statusPagamento;
    if (body.limiteImagens !== undefined) updateData.limiteImagens = body.limiteImagens;
    if (body.imagensGeradasMes !== undefined) updateData.imagensGeradasMes = body.imagensGeradasMes;
    if (body.dataVencimento !== undefined) updateData.dataVencimento = body.dataVencimento;
    if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl;
    
    // Permitir atualizar qualquer outro campo
    Object.keys(body).forEach((key) => {
      if (!["nome", "email", "descricao", "planoAtual", "status", "statusPagamento", "limiteImagens", "imagensGeradasMes", "dataVencimento", "logoUrl"].includes(key)) {
        updateData[key] = body[key];
      }
    });

    updateData.updatedAt = new Date();
    updateData.updatedBy = "admin";

    await lojaRef.update(updateData);

    return NextResponse.json({ success: true, data: updateData });
  } catch (error: any) {
    console.error("[API Lojistas Editar] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar loja" },
      { status: 500 }
    );
  }
}




