import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

/**
 * DELETE /api/lojista/pedidos/[orderId]
 * Deleta um pedido
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    
    // Verificar autenticação
    const lojistaId = await getCurrentLojistaId();
    if (!lojistaId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const db = getAdminDb();
    
    // Verificar se o pedido pertence ao lojista
    const orderRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("orders")
      .doc(orderId);

    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 }
      );
    }

    // Deletar o pedido
    await orderRef.delete();

    return NextResponse.json(
      { 
        success: true,
        message: "Pedido excluído com sucesso" 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("[DELETE /api/lojista/pedidos/[orderId]] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao excluir pedido" },
      { status: 500 }
    );
  }
}










