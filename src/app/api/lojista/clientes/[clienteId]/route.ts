import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

export const dynamic = 'force-dynamic';

/**
 * GET /api/lojista/clientes/[clienteId]
 * Busca um cliente específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  try {
    const { clienteId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    
    // Prioridade: query string (modo admin) > usuário logado
    const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
    const lojistaId =
      lojistaIdFromQuery ||
      lojistaIdFromAuth ||
      process.env.NEXT_PUBLIC_LOJISTA_ID ||
      process.env.LOJISTA_ID ||
      "";

    if (!lojistaId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }
    const db = getAdminDb();
    const clienteDoc = await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes")
      .doc(clienteId)
      .get();

    if (!clienteDoc.exists) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    const data = clienteDoc.data();
    return NextResponse.json({
      id: clienteDoc.id,
      nome: data?.nome || "Cliente",
      whatsapp: data?.whatsapp || null,
      email: data?.email || null,
      avatarUrl: data?.avatarUrl || null,
      totalComposicoes: data?.totalComposicoes || 0,
      observacoes: data?.observacoes || null,
      status: data?.status || "ativo",
      arquivado: data?.arquivado || false,
      acessoBloqueado: data?.acessoBloqueado || false,
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || null,
    });
  } catch (error) {
    console.error(`[API Cliente GET] Erro:`, error);
    return NextResponse.json(
      { error: "Erro ao buscar cliente" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/lojista/clientes/[clienteId]
 * Atualiza um cliente
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  try {
    const { clienteId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    
    // Prioridade: query string (modo admin) > usuário logado
    const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
    const lojistaId =
      lojistaIdFromQuery ||
      lojistaIdFromAuth ||
      process.env.NEXT_PUBLIC_LOJISTA_ID ||
      process.env.LOJISTA_ID ||
      "";

    if (!lojistaId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }
    const body = await request.json();
    const db = getAdminDb();

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.nome !== undefined) updateData.nome = body.nome;
    if (body.whatsapp !== undefined) updateData.whatsapp = body.whatsapp;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.observacoes !== undefined) updateData.observacoes = body.observacoes;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.acessoBloqueado !== undefined) updateData.acessoBloqueado = body.acessoBloqueado;
    if (body.arquivado !== undefined) {
      updateData.arquivado = body.arquivado;
      // Quando arquivar, também bloquear acesso
      if (body.arquivado === true) {
        updateData.acessoBloqueado = true;
      }
    }

    await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes")
      .doc(clienteId)
      .update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[API Cliente PATCH] Erro:`, error);
    return NextResponse.json(
      { error: "Erro ao atualizar cliente" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lojista/clientes/[clienteId]
 * Arquivar/desarquivar cliente
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  try {
    const { clienteId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    
    // Prioridade: query string (modo admin) > usuário logado
    const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
    const lojistaId =
      lojistaIdFromQuery ||
      lojistaIdFromAuth ||
      process.env.NEXT_PUBLIC_LOJISTA_ID ||
      process.env.LOJISTA_ID ||
      "";

    if (!lojistaId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }
    const body = await request.json();
    const { action } = body; // "archive" ou "unarchive"

    const db = getAdminDb();
    
    // Buscar dados atuais do cliente para verificar acessoBloqueado
    const clienteDoc = await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes")
      .doc(clienteId)
      .get();
    
    const clienteData = clienteDoc.data();
    const updateData: any = {
      arquivado: action === "archive",
      updatedAt: new Date(),
    };
    
    if (action === "archive") {
      // Ao arquivar, também bloquear acesso
      updateData.acessoBloqueado = true;
    } else if (action === "unarchive") {
      // Ao desarquivar, também desbloquear acesso (permitir que o cliente acesse novamente)
      updateData.acessoBloqueado = false;
    }
    
    await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes")
      .doc(clienteId)
      .update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[API Cliente POST] Erro:`, error);
    return NextResponse.json(
      { error: "Erro ao arquivar/desarquivar cliente" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lojista/clientes/[clienteId]
 * Excluir cliente (apenas admin)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  try {
    // Verificar se é admin
    const { requireAdmin } = await import("@/lib/auth/admin-auth");
    await requireAdmin();

    const { clienteId } = await params;
    const lojistaId = request.nextUrl.searchParams.get("lojistaId");
    
    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes")
      .doc(clienteId)
      .delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[API Cliente DELETE] Erro:`, error);
    return NextResponse.json(
      { error: "Erro ao excluir cliente" },
      { status: 500 }
    );
  }
}

