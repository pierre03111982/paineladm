/**
 * FASE 6: Dashboard Super Admin
 * 
 * Página dedicada para super admins com funcionalidades avançadas
 */

import { SuperAdminDashboardClient } from "./components/SuperAdminDashboardClient";
import { requireSuperAdmin } from "@/lib/auth/admin-auth";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

async function getSystemStats() {
  try {
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
      .limit(10000) // Limite para performance
      .get();
    const recentCompositions = composicoesSnapshot.size;

    return {
      planStats,
      totalGenerated,
      totalCredits,
      activeAds,
      recentCompositions,
    };
  } catch (error) {
    console.error("[SuperAdmin] Erro ao buscar estatísticas:", error);
    return {
      planStats: { start: 0, pro: 0, elite: 0, test_unlimited: 0, total: 0 },
      totalGenerated: 0,
      totalCredits: 0,
      activeAds: 0,
      recentCompositions: 0,
    };
  }
}

export default async function SuperAdminPage() {
  await requireSuperAdmin();
  const stats = await getSystemStats();

  return <SuperAdminDashboardClient initialStats={stats} />;
}




