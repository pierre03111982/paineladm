/**
 * API Route: Composições de Alta Conversão
 * GET /api/lojista/composicoes/high-conversion
 * 
 * Retorna IDs de composições com alta taxa de conversão
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { getHighConversionComposicoes } from "@/lib/firestore/composition-promotions";

export const dynamic = 'force-dynamic';

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
    const minLikes = parseInt(searchParams.get("minLikes") || "1");
    const minShares = parseInt(searchParams.get("minShares") || "0");
    const hasCheckout = searchParams.get("hasCheckout") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    const composicaoIds = await getHighConversionComposicoes(lojistaId, {
      minLikes,
      minShares,
      hasCheckout,
      limit,
    });

    return NextResponse.json({
      success: true,
      composicaoIds,
      total: composicaoIds.length,
    });
  } catch (error) {
    console.error("[high-conversion] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar composições de alta conversão",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

