/**
 * FASE 5: Cliente da Página de Assinatura
 */

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Zap, Crown, Sparkles, ArrowRight, AlertCircle, Monitor, Megaphone } from "lucide-react";
import { PLANS_CONFIG, getPlanConfig, type PlanId } from "@/lib/plans-config";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { Button } from "@/components/ui/button";
import type { SubscriptionData } from "@/lib/firestore/types";

interface PlanosPageClientProps {
  lojistaId: string;
  currentSubscription?: SubscriptionData;
  usageMetrics?: {
    totalGenerated: number;
    creditsUsed: number;
    creditsRemaining: number;
  };
  currentCredits: number;
  lojistaNome: string;
}

export function PlanosPageClient({
  lojistaId,
  currentSubscription,
  usageMetrics,
  currentCredits,
  lojistaNome,
}: PlanosPageClientProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentPlanId = currentSubscription?.planId || "start";
  const currentPlan = getPlanConfig(currentPlanId);

  const handleUpgrade = async (targetPlanId: PlanId) => {
    if (targetPlanId === currentPlanId) {
      setError("Você já está neste plano");
      return;
    }

    setLoading(targetPlanId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/lojista/subscription/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lojistaId,
          targetPlanId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao alterar plano");
      }

      const data = await response.json();
      setSuccess(`Plano alterado para ${getPlanConfig(targetPlanId)?.name} com sucesso!`);
      
      // Recarregar página após 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      console.error("[AssinaturaPage] Erro:", err);
      setError(err.message || "Erro ao alterar plano");
    } finally {
      setLoading(null);
    }
  };

  const plans = Object.values(PLANS_CONFIG);

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Planos e Assinaturas</h1>
        <p className="text-slate-600">
          Escolha o plano ideal para sua loja. Você pode alterar a qualquer momento.
        </p>
      </div>

      {/* Plano Atual */}
      {currentPlan && (
        <AnimatedCard className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Plano Atual: {currentPlan.name}
              </h2>
              <p className="text-sm text-slate-600">
                {currentCredits.toLocaleString("pt-BR")} créditos disponíveis
                {usageMetrics && (
                  <> · {usageMetrics.creditsUsed} usados este mês</>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">
                {currentPlan.price === 0 ? "Grátis" : `R$ ${currentPlan.price.toFixed(2)}/mês`}
              </p>
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* Mensagens de Feedback */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <Check className="h-5 w-5 text-emerald-600" />
          <span className="text-sm text-emerald-700">{success}</span>
        </div>
      )}

      {/* Grid de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, index) => {
          const isCurrent = plan.id === currentPlanId;
          const isUpgrade = plan.price > (currentPlan?.price || 0);
          const isDowngrade = plan.price < (currentPlan?.price || 0);

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={`relative ${isCurrent ? "md:col-span-1" : ""}`}
            >
              <AnimatedCard
                className={`p-6 h-full flex flex-col ${
                  isCurrent
                    ? "border-2 border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50"
                    : "border border-slate-200"
                }`}
              >
                {/* Badge de Plano Atual */}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Plano Atual
                    </span>
                  </div>
                )}

                {/* Header do Plano */}
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-3">
                    {plan.id === "elite" ? (
                      <Crown className="h-8 w-8 text-amber-500" />
                    ) : plan.id === "pro" ? (
                      <Zap className="h-8 w-8 text-blue-500" />
                    ) : (
                      <Sparkles className="h-8 w-8 text-slate-400" />
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-slate-900">
                      {plan.price === 0 ? "Grátis" : `R$ ${plan.price.toFixed(2)}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-sm text-slate-600">/mês</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Botão de Ação */}
                <Button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrent || loading !== null}
                  className={`w-full ${
                    isCurrent
                      ? "bg-slate-300 text-slate-600 cursor-not-allowed"
                      : isUpgrade
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                      : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                  }`}
                >
                  {loading === plan.id ? (
                    <>Processando...</>
                  ) : isCurrent ? (
                    <>Plano Atual</>
                  ) : isUpgrade ? (
                    <>
                      Fazer Upgrade <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Fazer Downgrade <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </AnimatedCard>
            </motion.div>
          );
        })}
      </div>

      {/* FASE 5: Seção Adicionais - Display Mode e Pacote Ads */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Extras e Adicionais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Display Mode */}
          <AnimatedCard className="p-6 border-2 border-blue-200 hover:border-blue-400 transition-all">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 p-3 shadow-lg text-white">
                  <Monitor className="h-6 w-6" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Display Mode</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Modo de exibição avançado para vitrines e displays físicos. Ideal para lojas físicas.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-600">+R$ 49,00</span>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      // TODO: Implementar compra de Display Mode
                      alert("Funcionalidade de compra de Display Mode em desenvolvimento");
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          </AnimatedCard>

          {/* Card Pacote Ads */}
          <AnimatedCard className="p-6 border-2 border-purple-200 hover:border-purple-400 transition-all">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 p-3 shadow-lg text-white">
                  <Megaphone className="h-6 w-6" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Pacote Ads</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Aumente seus slots de anúncios no marketplace. Mais visibilidade para sua loja.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-purple-600">Variável</span>
                  <Button
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => {
                      // TODO: Implementar compra de Pacote Ads
                      alert("Funcionalidade de compra de Pacote Ads em desenvolvimento");
                    }}
                  >
                    Ver Opções
                  </Button>
                </div>
              </div>
            </div>
          </AnimatedCard>
        </div>
      </div>

      {/* Informações Adicionais */}
      <AnimatedCard className="p-6 bg-slate-50">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Como funciona?</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>• Você pode alterar seu plano a qualquer momento</li>
          <li>• Upgrades são aplicados imediatamente</li>
          <li>• Downgrades são agendados para o final do período atual</li>
          <li>• Créditos não utilizados são mantidos</li>
          <li>• Suporte prioritário disponível para planos Pro e Elite</li>
        </ul>
      </AnimatedCard>
    </div>
  );
}

