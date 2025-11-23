import { NextRequest, NextResponse } from "next/server";
import { fetchClientes, createCliente } from "@/lib/firestore/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

/**
 * GET /api/lojista/clientes
 * Lista clientes do lojista
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    const includeArchived = searchParams.get("includeArchived") === "true";
    const includeBlocked = searchParams.get("includeBlocked") === "true";

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
        { error: "lojistaId não encontrado" },
        { status: 400 }
      );
    }

    const clientes = await fetchClientes(lojistaId, 1000, includeArchived, includeBlocked);

    return NextResponse.json({ clientes });
  } catch (error: any) {
    console.error("[API Clientes GET] Erro:", error);
    console.error("[API Clientes GET] Stack:", error?.stack);
    return NextResponse.json(
      { 
        error: "Erro ao listar clientes",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lojista/clientes
 * Cria um novo cliente
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");

    // Ler body primeiro para verificar se lojistaId vem do modelo 1
    const body = await request.json();
    const { nome, whatsapp, email, observacoes, password, lojistaId: lojistaIdFromBody } = body;

    // Prioridade: query string (modo admin) > body (modelo 1) > usuário logado
    const lojistaIdFromAuth = (lojistaIdFromQuery || lojistaIdFromBody) ? null : await getCurrentLojistaId();
    const lojistaId =
      lojistaIdFromQuery ||
      lojistaIdFromBody ||
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

    if (!nome || nome.trim().length === 0) {
      return NextResponse.json(
        { error: "Nome é obrigatório" },
        { status: 400 }
      );
    }

    // Fazer hash da senha se fornecida
    let passwordHash: string | undefined = undefined;
    if (password && password.trim().length > 0) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Senha deve ter no mínimo 6 caracteres" },
          { status: 400 }
        );
      }
      passwordHash = await bcrypt.hash(password, 10);
    }

    const clienteId = await createCliente(lojistaId, {
      nome,
      whatsapp,
      email,
      observacoes,
      passwordHash,
    });

    return NextResponse.json({
      success: true,
      clienteId,
      message: "Cliente cadastrado com sucesso",
    });
  } catch (error: any) {
    console.error("[API Clientes POST] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao cadastrar cliente" },
      { status: 500 }
    );
  }
}














