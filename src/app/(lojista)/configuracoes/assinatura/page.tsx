/**
 * FASE 5: Página de Assinatura (Self-Service)
 * Rota: /configuracoes/assinatura
 * 
 * Permite ao lojista visualizar planos disponíveis e fazer upgrade/downgrade
 * Esta é a rota correta conforme especificado no documento de ajustes estratégicos
 */

import { PlanosPageClient } from "@/app/(lojista)/assinatura/components/PlanosPageClient";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { fetchLojaPerfil } from "@/lib/firestore/server";
import { PLANS_CONFIG } from "@/lib/plans-config";
import { IconPageHeader } from "@/app/(lojista)/components/icon-page-header";
import { getPageHeaderColors } from "@/app/(lojista)/components/page-header-colors";
import { CreditCard } from "lucide-react";

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

export default async function AssinaturaConfigPage() {
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
  const colors = getPageHeaderColors('/configuracoes/assinatura');

  return (
    <div className="space-y-6">
      <IconPageHeader
        icon={CreditCard}
        title="Assinatura"
        description="Gerencie seu plano e assinatura. Faça upgrade ou downgrade a qualquer momento."
        gradientFrom={colors.from}
        gradientTo={colors.to}
        shadowColor={colors.shadow}
      />
      
      <PlanosPageClient
        lojistaId={lojistaId}
        currentSubscription={currentData?.subscription}
        usageMetrics={currentData?.usageMetrics}
        currentCredits={currentData?.credits || 0}
        lojistaNome={perfil?.nome || "Loja"}
      />
    </div>
  );
}




