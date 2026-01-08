/**
 * FASE 6: API de Estatísticas do Sistema (Super Admin)
 * 
 * GET /api/admin/system-stats
 * Retorna estatísticas globais do sistema
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireSuperAdmin } from "@/lib/auth/admin-auth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const db = getAdminDb();
    
    // Contar lojistas por plano
    const lojasSnapshot = await db.collection("lojas").get();
    const planStats = {
      start: 0,
      pro: 0,
      elite: 0,
      test_unlimited: 0,
      total: lojasSnapshot.size,
    };

    let totalGenerated = 0;
    let totalCredits = 0;

    lojasSnapshot.forEach((doc) => {
      const data = doc.data();
      const subscription = data.subscription || {};
      const planId = subscription.planId || "start";
      const clientType = subscription.clientType || "standard";
      
      if (clientType === "test_unlimited") {
        planStats.test_unlimited++;
      } else if (planId in planStats) {
        planStats[planId as keyof typeof planStats]++;
      }

      // Somar métricas
      const usageMetrics = data.usageMetrics || {};
      totalGenerated += usageMetrics.totalGenerated || 0;
      totalCredits += data.aiCredits || data.saldo || 0;
    });

    // Contar anúncios ativos
    const adsSnapshot = await db.collection("marketplace_ads").where("status", "==", "active").get();
    const activeAds = adsSnapshot.size;

    // Contar composições geradas (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const composicoesSnapshot = await db
      .collection("composicoes")
      .where("createdAt", ">", thirtyDaysAgo)
      .limit(10000)
      .get();
    const recentCompositions = composicoesSnapshot.size;

    return NextResponse.json({
      planStats,
      totalGenerated,
      totalCredits,
      activeAds,
      recentCompositions,
    });
  } catch (error: any) {
    console.error("[SystemStats] Erro:", error);
    
    if (error.message?.includes("FORBIDDEN") || error.message?.includes("super_admin")) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas super_admin pode acessar." },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Erro ao buscar estatísticas" },
      { status: 500 }
    );
  }
}




