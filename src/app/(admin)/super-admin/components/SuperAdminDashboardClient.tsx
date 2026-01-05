/**
 * FASE 6: Dashboard Super Admin (Client Component)
 */

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Zap,
  Crown,
  TrendingUp,
  AlertTriangle,
  Package,
  Activity,
  BarChart3,
  Settings,
  Database,
} from "lucide-react";
import Link from "next/link";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { PLANS_CONFIG } from "@/lib/plans-config";

interface SystemStats {
  planStats: {
    start: number;
    pro: number;
    elite: number;
    test_unlimited: number;
    total: number;
  };
  totalGenerated: number;
  totalCredits: number;
  activeAds: number;
  recentCompositions: number;
}

interface SuperAdminDashboardClientProps {
  initialStats: SystemStats;
}

export function SuperAdminDashboardClient({ initialStats }: SuperAdminDashboardClientProps) {
  const [stats, setStats] = useState(initialStats);

  const refreshStats = async () => {
    try {
      const response = await fetch("/api/admin/system-stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("[SuperAdmin] Erro ao atualizar estatísticas:", error);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Crown className="h-8 w-8 text-amber-500" />
            Dashboard Super Admin
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Visão completa do sistema e ferramentas de gerenciamento avançado
          </p>
        </div>
        <button
          onClick={refreshStats}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          Atualizar
        </button>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Lojistas */}
        <AnimatedCard className="p-6 bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-400/50">
          <div className="flex items-center justify-between mb-4">
            <Users className="h-8 w-8 text-blue-400" />
            <span className="text-xs text-blue-300 font-medium">Total</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.planStats.total}</p>
          <p className="text-sm text-blue-200">Lojistas cadastrados</p>
        </AnimatedCard>

        {/* Geração Total (GPU Audit) */}
        <AnimatedCard className="p-6 bg-gradient-to-br from-amber-500/20 to-amber-600/20 border-amber-400/50">
          <div className="flex items-center justify-between mb-4">
            <Activity className="h-8 w-8 text-amber-400" />
            <span className="text-xs text-amber-300 font-medium">GPU Audit</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {stats.totalGenerated.toLocaleString("pt-BR")}
          </p>
          <p className="text-sm text-amber-200">Imagens geradas (total)</p>
        </AnimatedCard>

        {/* Créditos Totais */}
        <AnimatedCard className="p-6 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border-emerald-400/50">
          <div className="flex items-center justify-between mb-4">
            <Package className="h-8 w-8 text-emerald-400" />
            <span className="text-xs text-emerald-300 font-medium">Créditos</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {stats.totalCredits.toLocaleString("pt-BR")}
          </p>
          <p className="text-sm text-emerald-200">Créditos disponíveis</p>
        </AnimatedCard>

        {/* Anúncios Ativos */}
        <AnimatedCard className="p-6 bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-400/50">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="h-8 w-8 text-purple-400" />
            <span className="text-xs text-purple-300 font-medium">Marketplace</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.activeAds}</p>
          <p className="text-sm text-purple-200">Anúncios ativos</p>
        </AnimatedCard>
      </div>

      {/* Estatísticas por Plano */}
      <AnimatedCard className="p-6 bg-zinc-900/50 border-zinc-800">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Distribuição por Plano
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(PLANS_CONFIG).map(([planId, plan]) => {
            const count = stats.planStats[planId as keyof typeof stats.planStats] || 0;
            const percentage = stats.planStats.total > 0 
              ? ((count / stats.planStats.total) * 100).toFixed(1)
              : 0;

            return (
              <div
                key={planId}
                className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-white">{plan.name}</span>
                  <span className="text-xs text-zinc-400">{percentage}%</span>
                </div>
                <p className="text-2xl font-bold text-white">{count}</p>
                <div className="mt-2 h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
          
          {/* Lojas Teste Ilimitado */}
          <div className="p-4 bg-amber-900/30 rounded-lg border border-amber-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-amber-200 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Teste Ilimitado
              </span>
              <span className="text-xs text-amber-300">
                {stats.planStats.total > 0 
                  ? ((stats.planStats.test_unlimited / stats.planStats.total) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-200">
              {stats.planStats.test_unlimited}
            </p>
            <p className="text-xs text-amber-300 mt-1">Lojas em modo teste</p>
          </div>
        </div>
      </AnimatedCard>

      {/* Ferramentas Rápidas */}
      <AnimatedCard className="p-6 bg-zinc-900/50 border-zinc-800">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Ferramentas de Gerenciamento
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/lojistas"
            className="p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-all group"
          >
            <Users className="h-6 w-6 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-white mb-1">Gerenciar Lojistas</h3>
            <p className="text-sm text-zinc-400">
              Ver, editar e gerenciar todas as lojas
            </p>
          </Link>

          <Link
            href="/admin/custos"
            className="p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-all group"
          >
            <Database className="h-6 w-6 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-white mb-1">Análise de Custos</h3>
            <p className="text-sm text-zinc-400">
              Custos de API e métricas financeiras
            </p>
          </Link>

          <Link
            href="/admin/planos"
            className="p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-all group"
          >
            <Package className="h-6 w-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-white mb-1">Gerenciar Planos</h3>
            <p className="text-sm text-zinc-400">
              Configurar planos e assinaturas
            </p>
          </Link>
        </div>
      </AnimatedCard>

      {/* Alerta de Auditoria GPU */}
      {stats.planStats.test_unlimited > 0 && (
        <AnimatedCard className="p-6 bg-amber-900/30 border-amber-700/50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-200 mb-2">
                Auditoria de GPU - Lojas Teste Ilimitado
              </h3>
              <p className="text-sm text-amber-300 mb-3">
                {stats.planStats.test_unlimited} loja(s) em modo teste ilimitado.
                Total de imagens geradas por essas lojas: {stats.totalGenerated.toLocaleString("pt-BR")}
              </p>
              <Link
                href="/admin/lojistas?filter=test_unlimited"
                className="text-sm text-amber-400 hover:text-amber-300 underline"
              >
                Ver lojas teste →
              </Link>
            </div>
          </div>
        </AnimatedCard>
      )}
    </div>
  );
}


