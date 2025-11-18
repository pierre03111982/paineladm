/**
 * API Route: Geração de Variações de Look
 * POST /api/lojista/composicoes/generate-variations
 * 
 * Gera múltiplas variações de um look para marketing em redes sociais
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { generateLookVariations } from "@/lib/ai-services/look-variations";

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
    const { baseImageUrl, productUrls, compositionId, variationCount, styles, backgrounds } = body;

    if (!baseImageUrl || !Array.isArray(productUrls) || productUrls.length === 0) {
      return NextResponse.json(
        { error: "baseImageUrl e productUrls são obrigatórios" },
        { status: 400 }
      );
    }

    // Buscar customerId da composição se disponível
    let customerId: string | undefined;
    if (compositionId) {
      try {
        const { getAdminDb } = await import("@/lib/firebaseAdmin");
        const db = getAdminDb();
        const compDoc = await db
          .collection("lojas")
          .doc(lojistaId)
          .collection("composicoes")
          .doc(compositionId)
          .get();
        
        if (compDoc.exists) {
          const compData = compDoc.data();
          customerId = compData?.customerId;
        }
      } catch (error) {
        console.warn("[generate-variations] Erro ao buscar customerId:", error);
      }
    }

    const result = await generateLookVariations({
      baseImageUrl,
      productUrls,
      lojistaId,
      customerId,
      variationCount: variationCount || 5,
      styles,
      backgrounds,
    });

    if (result.success && result.variations) {
      return NextResponse.json({
        success: true,
        variations: result.variations,
        message: `${result.variations.length} variações geradas com sucesso`,
      });
    } else {
      return NextResponse.json(
        {
          error: result.error || "Erro ao gerar variações",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[generate-variations] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao gerar variações",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

