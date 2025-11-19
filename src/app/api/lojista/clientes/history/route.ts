/**
 * API Route: Histórico de Tentativas de Clientes
 * POST /api/lojista/clientes/history
 * 
 * Atualiza histórico de tentativas para um cliente específico ou todos os clientes
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import {
  updateClienteTentativasHistory,
  updateAllClientesTentativasHistory,
} from "@/lib/firestore/client-history";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const lojistaId = await getCurrentLojistaId();
    if (!lojistaId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { clienteId } = body;

    if (clienteId) {
      // Atualizar histórico de um cliente específico
      await updateClienteTentativasHistory(lojistaId, clienteId);
      return NextResponse.json({
        success: true,
        message: "Histórico atualizado para o cliente",
      });
    } else {
      // Atualizar histórico de todos os clientes
      const result = await updateAllClientesTentativasHistory(lojistaId);
      return NextResponse.json({
        success: true,
        message: "Histórico atualizado para todos os clientes",
        updated: result.updated,
        errors: result.errors,
      });
    }
  } catch (error) {
    console.error("[clientes/history] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao atualizar histórico",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const lojistaId = await getCurrentLojistaId();
    if (!lojistaId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get("clienteId");

    if (!clienteId) {
      return NextResponse.json(
        { error: "clienteId é obrigatório" },
        { status: 400 }
      );
    }

    const { getClienteTentativasHistory } = await import("@/lib/firestore/client-history");
    const historico = await getClienteTentativasHistory(lojistaId, clienteId);

    return NextResponse.json({
      success: true,
      historico,
    });
  } catch (error) {
    console.error("[clientes/history] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar histórico",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

