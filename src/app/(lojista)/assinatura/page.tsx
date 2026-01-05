/**
 * FASE 5: Página de Assinatura (Self-Service)
 * 
 * Permite ao lojista visualizar planos disponíveis e fazer upgrade/downgrade
 */

import { PlanosPageClient } from "./components/PlanosPageClient";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { fetchLojaPerfil } from "@/lib/firestore/server";
import { PLANS_CONFIG } from "@/lib/plans-config";

export const dynamic = 'force-dynamic';

async function getCurrentSubscription(lojistaId: string) {
  try {
    const db = getAdminDb();
    const lojaRef = db.collection("lojas").doc(lojistaId);
    const lojaDoc = await lojaRef.get();

    if (!lojaDoc.exists) {
      return null;
    }

    const lojaData = lojaDoc.data() || {};
    const subscription = lojaData.subscription || {
      planId: "start",
      status: "active",
      adSlotsLimit: 0,
      clientType: "standard",
    };

    const usageMetrics = lojaData.usageMetrics || {
      totalGenerated: 0,
      creditsUsed: 0,
      creditsRemaining: 0,
    };

    return {
      subscription,
      usageMetrics,
      credits: lojaData.aiCredits || lojaData.saldo || 0,
    };
  } catch (error) {
    console.error("[AssinaturaPage] Erro ao buscar subscription:", error);
    return null;
  }
}

export default async function AssinaturaPage() {
  const lojistaId = await getCurrentLojistaId();

  if (!lojistaId) {
    return (
      <div className="p-6">
        <p className="text-red-600">Erro: Lojista não autenticado</p>
      </div>
    );
  }

  const currentData = await getCurrentSubscription(lojistaId);
  const perfil = await fetchLojaPerfil(lojistaId);

  return (
    <PlanosPageClient
      lojistaId={lojistaId}
      currentSubscription={currentData?.subscription}
      usageMetrics={currentData?.usageMetrics}
      currentCredits={currentData?.credits || 0}
      lojistaNome={perfil?.nome || "Loja"}
    />
  );
}


