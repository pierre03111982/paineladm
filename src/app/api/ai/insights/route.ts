/**
 * API Route: Insights da IA (IA Consultiva)
 * GET /api/ai/insights
 * 
 * Retorna insights não lidos do lojista
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnreadInsights } from "@/lib/firestore/insights";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Obter lojistaId da query string ou do auth
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    
    const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
    const lojistaId = lojistaIdFromQuery || lojistaIdFromAuth;

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar insights não lidos (com limite configurável)
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    const insights = await getUnreadInsights(lojistaId, limit);

    console.log("[API/AI/Insights] Resposta:", {
      lojistaId,
      limit,
      insightsCount: insights.length,
      insights: insights.map(i => ({ id: i.id, type: i.type, title: i.title }))
    });

    return NextResponse.json({
      success: true,
      insights,
      count: insights.length,
    });
  } catch (error) {
    console.error("[API/AI/Insights] Erro:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        insights: [],
      },
      { status: 500 }
    );
  }
}
