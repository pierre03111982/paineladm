import { NextRequest, NextResponse } from "next/server";
import { updateProduto, archiveProduto } from "@/lib/firestore/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    
    // Prioridade: query string (modo admin) > usuário logado > env var
    const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
    const lojistaId =
      lojistaIdFromQuery ||
      lojistaIdFromAuth ||
      process.env.NEXT_PUBLIC_LOJISTA_ID ||
      process.env.LOJISTA_ID ||
      "";

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId não encontrado" },
        { status: 400 }
      );
    }

    const { productId } = await params;
    if (!productId) {
      return NextResponse.json(
        { error: "productId é obrigatório." },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log("[api/lojista/products/[productId]] PATCH recebido:", {
      lojistaId,
      productId,
      body,
    });

    const {
      nome,
      categoria,
      preco,
      imagemUrl,
      cores,
      tamanhos,
      estoque,
      tags,
      observacoes,
    } = body;

    const updateData = {
      nome,
      categoria,
      preco,
      imagemUrl,
      cores,
      tamanhos,
      estoque,
      tags,
      observacoes,
    };

    // Remover campos undefined
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    console.log("[api/lojista/products/[productId]] Dados para atualizar:", updateData);

    await updateProduto(lojistaId, productId, updateData);

    console.log("[api/lojista/products/[productId]] Produto atualizado com sucesso");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api/lojista/products/[productId]] erro ao atualizar produto:", error);
    console.error("[api/lojista/products/[productId]] Stack trace:", error?.stack);
    return NextResponse.json(
      { 
        error: "Erro ao atualizar produto.",
        details: error?.message || "Erro desconhecido"
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    
    // Prioridade: query string (modo admin) > usuário logado > env var
    const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
    const lojistaId =
      lojistaIdFromQuery ||
      lojistaIdFromAuth ||
      process.env.NEXT_PUBLIC_LOJISTA_ID ||
      process.env.LOJISTA_ID ||
      "";

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId não encontrado" },
        { status: 400 }
      );
    }

    const { productId } = await params;
    if (!productId) {
      return NextResponse.json(
        { error: "productId é obrigatório." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === "archive") {
      await archiveProduto(lojistaId, productId);
      return NextResponse.json({ success: true, arquivado: true });
    } else if (action === "restore") {
      await updateProduto(lojistaId, productId, { arquivado: false });
      return NextResponse.json({ success: true, arquivado: false });
    } else {
      return NextResponse.json(
        { error: "Ação inválida. Use 'archive' ou 'restore'." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[api/lojista/products/[productId]] erro ao alterar status:", error);
    return NextResponse.json(
      { error: "Erro ao alterar status do produto." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    
    // Prioridade: query string (modo admin) > usuário logado > env var
    const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
    const lojistaId =
      lojistaIdFromQuery ||
      lojistaIdFromAuth ||
      process.env.NEXT_PUBLIC_LOJISTA_ID ||
      process.env.LOJISTA_ID ||
      "";

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId não encontrado" },
        { status: 400 }
      );
    }

    const { productId } = await params;
    if (!productId) {
      return NextResponse.json(
        { error: "productId é obrigatório." },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    await db.collection("lojas").doc(lojistaId).collection("produtos").doc(productId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/lojista/products/[productId]] erro ao excluir:", error);
    return NextResponse.json(
      { error: "Erro ao excluir produto." },
      { status: 500 }
    );
  }
}

