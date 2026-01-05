/**
 * FASE 2: Novo Widget Financeiro
 * 
 * Card compacto com barra circular de créditos (estilo "Parede de Gelo")
 * Mostra: Créditos disponíveis, Plano atual, usageMetrics.totalGenerated (para lojas teste)
 */

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, AlertCircle, RefreshCw, Zap } from "lucide-react";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { getPlanConfig, type PlanId } from "@/lib/plans-config";

interface FinancialWidgetProps {
  lojistaId: string;
}

interface FinancialData {
  credits: number;
  planId: PlanId | null;
  planName: string;
  clientType: "standard" | "test_unlimited" | null;
  totalGenerated: number; // usageMetrics.totalGenerated
  creditsUsed: number;
  creditsRemaining: number;
}

export function FinancialWidget({ lojistaId }: FinancialWidgetProps) {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar dados financeiros da loja
      const response = await fetch(`/api/lojista/financial-data?lojistaId=${encodeURIComponent(lojistaId)}`);
      
      if (!response.ok) {
        throw new Error("Erro ao carregar dados financeiros");
      }

      const result = await response.json();
      
      const planConfig = result.subscription?.planId 
        ? getPlanConfig(result.subscription.planId)
        : getPlanConfig("start");

      setData({
        credits: result.credits || 0,
        planId: result.subscription?.planId || "start",
        planName: planConfig?.name || "Start",
        clientType: result.subscription?.clientType || "standard",
        totalGenerated: result.usageMetrics?.totalGenerated || 0,
        creditsUsed: result.usageMetrics?.creditsUsed || 0,
        creditsRemaining: result.usageMetrics?.creditsRemaining || result.credits || 0,
      });
    } catch (err: any) {
      console.error("[FinancialWidget] Erro:", err);
      setError(err.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (lojistaId) {
      loadFinancialData();
      // Auto-refresh a cada 30 segundos
      const interval = setInterval(loadFinancialData, 30000);
      return () => clearInterval(interval);
    }
  }, [lojistaId]);

  if (loading) {
    return (
      <AnimatedCard className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 h-56">
        <div className="flex items-center justify-center h-full">
          <RefreshCw className="h-5 w-5 text-slate-400 animate-spin" />
        </div>
      </AnimatedCard>
    );
  }

  if (error || !data) {
    return (
      <AnimatedCard className="p-4 bg-gradient-to-br from-red-50 to-rose-50 border-red-200 h-56">
        <div className="flex items-center gap-2 text-red-600 h-full">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">{error || "Dados não disponíveis"}</span>
        </div>
      </AnimatedCard>
    );
  }

  const isTestUnlimited = data.clientType === "test_unlimited";
  const planConfig = getPlanConfig(data.planId);
  const creditsLimit = planConfig?.credits || 100;
  const percentage = isTestUnlimited ? 100 : Math.min((data.creditsRemaining / creditsLimit) * 100, 100);
  
  // Cores baseadas no plano
  const getPlanColor = () => {
    switch (data.planId) {
      case "elite":
        return { bg: "from-purple-500 to-indigo-600", text: "text-purple-700", border: "border-purple-300" };
      case "pro":
        return { bg: "from-blue-500 to-cyan-600", text: "text-blue-700", border: "border-blue-300" };
      default:
        return { bg: "from-emerald-500 to-teal-600", text: "text-emerald-700", border: "border-emerald-300" };
    }
  };

  const colors = getPlanColor();

  const showLowBalanceAlert = !isTestUnlimited && data.creditsRemaining < 10;

  return (
    <AnimatedCard className={`p-4 bg-gradient-to-br ${colors.bg} border-2 ${colors.border} shadow-lg h-56 flex flex-col`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Sparkles className="h-5 w-5 text-white icon-animate-once" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">Créditos IA</h3>
            <p className="text-xs text-white/80">{data.planName} Plan</p>
          </div>
          {/* Ícone de alerta com tooltip */}
          {showLowBalanceAlert && (
            <div className="relative group flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-300 cursor-help hover:text-amber-200 transition-colors icon-animate-once" />
              {/* Tooltip */}
              <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 text-white text-xs rounded-lg px-3 py-2 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none whitespace-nowrap">
                <div className="absolute -top-1 right-4 w-2 h-2 bg-zinc-900 transform rotate-45"></div>
                Saldo baixo! Recarregue seus créditos.
              </div>
            </div>
          )}
        </div>
        <button
          onClick={loadFinancialData}
          className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm flex-shrink-0"
          title="Atualizar"
        >
          <RefreshCw className={`h-4 w-4 text-white ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Barra Circular de Progresso */}
      <div className="relative w-24 h-24 mx-auto mb-3 flex-shrink-0">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 120 120">
          {/* Círculo de fundo */}
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="8"
          />
          {/* Círculo de progresso */}
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 50}`}
            strokeDashoffset={`${2 * Math.PI * 50 * (1 - percentage / 100)}`}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Valor central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-white">
            {isTestUnlimited ? "∞" : data.creditsRemaining.toLocaleString("pt-BR")}
          </span>
          <span className="text-[10px] text-white/80">disponíveis</span>
        </div>
      </div>

      {/* Informações adicionais */}
      <div className="space-y-1.5 flex-1 flex flex-col justify-end">
        {isTestUnlimited ? (
          <div className="flex items-center gap-2 text-xs text-white/90 bg-white/10 rounded-lg px-2 py-1.5">
            <Zap className="h-3.5 w-3.5 icon-animate-once" />
            <span className="font-medium">Modo Teste Ilimitado</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/80">Usados este mês:</span>
              <span className="font-bold text-white">{data.creditsUsed.toLocaleString("pt-BR")}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/80">Limite do plano:</span>
              <span className="font-bold text-white">{creditsLimit.toLocaleString("pt-BR")}</span>
            </div>
          </>
        )}

        {/* FASE 2: Mostrar totalGenerated para lojas teste (auditoria de GPU) */}
        {isTestUnlimited && data.totalGenerated > 0 && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/80 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 icon-animate-once" />
                Total gerado (auditoria):
              </span>
              <span className="font-bold text-white">{data.totalGenerated.toLocaleString("pt-BR")}</span>
            </div>
          </div>
        )}
      </div>
    </AnimatedCard>
  );
}

