/**
 * API Route: Segmentação Automática de Clientes
 * POST /api/lojista/clientes/segmentation
 * 
 * Calcula e atualiza segmentação automática para um cliente específico ou todos os clientes
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import {
  updateClienteSegmentation,
  updateAllClientesSegmentation,
} from "@/lib/firestore/client-segmentation";

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
      // Atualizar segmentação de um cliente específico
      await updateClienteSegmentation(lojistaId, clienteId);
      return NextResponse.json({
        success: true,
        message: "Segmentação atualizada para o cliente",
      });
    } else {
      // Atualizar segmentação de todos os clientes
      const result = await updateAllClientesSegmentation(lojistaId);
      return NextResponse.json({
        success: true,
        message: "Segmentação atualizada para todos os clientes",
        updated: result.updated,
        errors: result.errors,
      });
    }
  } catch (error) {
    console.error("[clientes/segmentation] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao atualizar segmentação",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

