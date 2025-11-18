/**
 * API Route: Atualizar Métricas de Qualidade de Produtos
 * POST /api/lojista/products/quality
 * 
 * Atualiza métricas de qualidade para um produto específico ou todos os produtos
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import {
  updateProductQualityMetrics,
  updateAllProductsQualityMetrics,
} from "@/lib/firestore/product-quality";

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
    const { produtoId } = body;

    if (produtoId) {
      // Atualizar métricas de um produto específico
      await updateProductQualityMetrics(lojistaId, produtoId);
      return NextResponse.json({
        success: true,
        message: "Métricas atualizadas para o produto",
      });
    } else {
      // Atualizar métricas de todos os produtos
      const result = await updateAllProductsQualityMetrics(lojistaId);
      return NextResponse.json({
        success: true,
        message: "Métricas atualizadas para todos os produtos",
        updated: result.updated,
        errors: result.errors,
      });
    }
  } catch (error) {
    console.error("[products/quality] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao atualizar métricas de qualidade",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

