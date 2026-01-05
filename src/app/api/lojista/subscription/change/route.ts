/**
 * FASE 5: API para Alterar Plano (Self-Service)
 * 
 * POST /api/lojista/subscription/change
 * Permite ao lojista fazer upgrade ou downgrade de plano
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { getPlanConfig, type PlanId } from "@/lib/plans-config";
import { FieldValue } from "firebase-admin/firestore";

const db = getAdminDb();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lojistaId: lojistaIdFromBody, targetPlanId } = body;

    // Resolver lojistaId
    const lojistaIdFromAuth = lojistaIdFromBody ? null : await getCurrentLojistaId();
    const lojistaId = lojistaIdFromBody || lojistaIdFromAuth;

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    if (!targetPlanId || !["start", "pro", "elite"].includes(targetPlanId)) {
      return NextResponse.json(
        { error: "targetPlanId inválido. Deve ser 'start', 'pro' ou 'elite'" },
        { status: 400 }
      );
    }

    const targetPlan = getPlanConfig(targetPlanId);
    if (!targetPlan) {
      return NextResponse.json(
        { error: "Plano não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se é o próprio lojista
    const currentLojistaId = await getCurrentLojistaId();
    if (currentLojistaId !== lojistaId) {
      return NextResponse.json(
        { error: "Não autorizado. Você só pode alterar seu próprio plano." },
        { status: 403 }
      );
    }

    const lojaRef = db.collection("lojas").doc(lojistaId);

    return await db.runTransaction(async (transaction) => {
      const lojaDoc = await transaction.get(lojaRef);

      if (!lojaDoc.exists) {
        return NextResponse.json(
          { error: "Loja não encontrada" },
          { status: 404 }
        );
      }

      const lojaData = lojaDoc.data() || {};
      const currentSubscription = lojaData.subscription || {
        planId: "start",
        status: "active",
        adSlotsLimit: 0,
        clientType: "standard",
      };

      const currentPlanId = currentSubscription.planId || "start";
      const currentPlan = getPlanConfig(currentPlanId);

      // Verificar se já está no plano
      if (currentPlanId === targetPlanId) {
        return NextResponse.json(
          { error: "Você já está neste plano" },
          { status: 400 }
        );
      }

      // Determinar se é upgrade ou downgrade
      const isUpgrade = (targetPlan.price || 0) > (currentPlan?.price || 0);
      const isDowngrade = (targetPlan.price || 0) < (currentPlan?.price || 0);

      // Atualizar subscription
      const now = new Date();
      const newSubscription = {
        planId: targetPlanId,
        status: "active" as const,
        adSlotsLimit: targetPlan.adSlotsLimit,
        clientType: currentSubscription.clientType || "standard",
        startedAt: isUpgrade ? now : currentSubscription.startedAt || now,
        // Se for downgrade, agendar para o final do período
        scheduledDowngrade: isDowngrade
          ? {
              planId: targetPlanId,
              effectiveAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 dias
            }
          : undefined,
      };

      // Se for upgrade, aplicar imediatamente
      if (isUpgrade) {
        transaction.update(lojaRef, {
          subscription: newSubscription,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Adicionar créditos do novo plano (se houver diferença)
        const creditsToAdd = targetPlan.credits - (currentPlan?.credits || 0);
        if (creditsToAdd > 0) {
          transaction.update(lojaRef, {
            aiCredits: FieldValue.increment(creditsToAdd),
            saldo: FieldValue.increment(creditsToAdd),
          });
        }

        console.log("[SubscriptionChange] ✅ Upgrade aplicado:", {
          lojistaId,
          from: currentPlanId,
          to: targetPlanId,
          creditsAdded: creditsToAdd,
        });

        return NextResponse.json({
          success: true,
          message: `Plano alterado para ${targetPlan.name} com sucesso!`,
          subscription: newSubscription,
          applied: true, // Aplicado imediatamente
        });
      } else {
        // Downgrade: apenas agendar
        transaction.update(lojaRef, {
          subscription: {
            ...currentSubscription,
            scheduledDowngrade: newSubscription.scheduledDowngrade,
          },
          updatedAt: FieldValue.serverTimestamp(),
        });

        console.log("[SubscriptionChange] 📅 Downgrade agendado:", {
          lojistaId,
          from: currentPlanId,
          to: targetPlanId,
          effectiveAt: newSubscription.scheduledDowngrade?.effectiveAt,
        });

        return NextResponse.json({
          success: true,
          message: `Downgrade para ${targetPlan.name} agendado para o final do período atual.`,
          subscription: {
            ...currentSubscription,
            scheduledDowngrade: newSubscription.scheduledDowngrade,
          },
          applied: false, // Agendado
        });
      }
    });
  } catch (error: any) {
    console.error("[SubscriptionChange] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao alterar plano" },
      { status: 500 }
    );
  }
}


