"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ActiveCustomer,
  DashboardMock,
  ExperimentPoint,
  ProductBreakdown,
} from "../../../lib/mocks/dashboard";
import {
  ArrowUpRight,
  Heart,
  MonitorSmartphone,
  ShieldCheck,
  ShoppingCart,
  Share2,
  Star,
  TrendingUp,
  Users2,
  AlertTriangle,
  Clock,
  Image as ImageIcon,
  ExternalLink,
  Package,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Cell,
  Line,
  LineChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { AIInsightsFeed } from "@/components/dashboard/AIInsightsFeed";
import { DashboardMiniCharts } from "@/components/dashboard/DashboardMiniCharts";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { StaggeredContainer } from "@/components/ui/StaggeredContainer";
import { StaggeredItem } from "@/components/ui/StaggeredItem";

type DashboardContentProps = {
  data: DashboardMock;
  lojistaId?: string;
};

function ExperimentsLineChart({ points }: { points: ExperimentPoint[] }) {
  const strokeColor = "#3B82F6";
  const gradientId = "colorExperimentLight";

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <AreaChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorExperimentLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            stroke="#9CA3AF"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#9CA3AF", fontSize: 11 }}
            className="opacity-60"
          />
          <YAxis
            stroke="#9CA3AF"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#9CA3AF", fontSize: 11 }}
            className="opacity-60"
          />
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-xl px-4 py-3 shadow-xl bg-white border border-blue-200/50">
                    <p className="text-xs font-medium mb-1 text-gray-600">
                      {payload[0].payload.day}
                    </p>
                    <p className="text-lg font-bold text-blue-600">
                      {payload[0].value} experimentações
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke={strokeColor}
            strokeWidth={3}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 5, fill: strokeColor, strokeWidth: 2, stroke: "#FFFFFF" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProductPieChart({ data }: { data: ProductBreakdown[] }) {
  return (
    <div className="w-full h-full">
      <ResponsiveContainer>
        <PieChart>
          <Tooltip
            contentStyle={{
              backgroundColor: "#09090b",
              borderRadius: 12,
              border: "1px solid rgba(168,85,247,0.35)",
              color: "#f9fafb",
            }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={4}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function CustomersList({ customers }: { customers: ActiveCustomer[] }) {
  return (
    <div className="space-y-2">
      {customers.slice(0, 5).map((customer) => (
        <Link
          key={customer.id}
          href={`/clientes/${customer.id}?view=cockpit`}
          className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg px-2.5 py-2 hover:border-indigo-300 hover:shadow-sm transition-all text-left group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 flex-shrink-0">
              {customer.avatarInitials}
            </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{customer.name}</p>
            <p className="text-xs text-slate-500">
                {customer.totalCompositions} composições · {customer.lastActivity}
              </p>
          </div>
          <ArrowUpRight className="h-3 w-3 text-slate-400 group-hover:text-indigo-600 transition-colors flex-shrink-0" />
          </Link>
      ))}
    </div>
  );
}

export function DashboardContent({ data, lojistaId }: DashboardContentProps) {
  const router = useRouter();

  // Estados para métricas avançadas
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  // Auto-refresh do dashboard a cada 20 segundos
  useEffect(() => {
    if (!lojistaId) return;

    const refreshDashboard = () => {
      try {
        console.log("[DashboardContent] Atualizando dados do dashboard...");
        // Usar router.refresh() para atualizar os dados do servidor sem recarregar a página inteira
        router.refresh();
      } catch (error) {
        console.error("[DashboardContent] Erro ao atualizar dashboard:", error);
      }
    };

    // Atualizar a cada 15 segundos para garantir que novas imagens apareçam rapidamente
    const intervalId = setInterval(refreshDashboard, 15000);
    
    return () => clearInterval(intervalId);
  }, [lojistaId, router]);

  // Carregar métricas avançadas
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setIsLoadingMetrics(true);
        const response = await fetch("/api/lojista/dashboard-metrics");
        if (response.ok) {
          const metricsData = await response.json();
          setLowStockAlerts(metricsData.lowStockAlerts || []);
        }
      } catch (error) {
        console.error("[DashboardContent] Erro ao carregar métricas:", error);
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    loadMetrics();
    
    // Atualizar métricas a cada 20 segundos também
    const metricsInterval = setInterval(loadMetrics, 20000);
    return () => clearInterval(metricsInterval);
  }, []);

  return (
    <div className="space-y-3 pb-6">

      {/* FASE 1: Pequenas Caixas Coloridas (KPIs) - Estilo Neon NO TOPO */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full">
        {/* KPI 1: Experimentações Hoje - Verde */}
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, delay: 0, ease: "easeOut" }}
          whileHover={{ y: -2, scale: 1.02, transition: { duration: 0.2 } }}
          className="neon-card p-4 border-emerald-500/70 dark:border-emerald-500/70 hover:shadow-lg transition-shadow h-28 flex items-center gap-3" 
          style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03), 0 0 30px rgba(16, 185, 129, 0.4), 0 0 60px rgba(16, 185, 129, 0.2)' }}
        >
          <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 p-2.5 shadow-lg shadow-emerald-500/30 text-white">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none mb-1">
              {data.metrics.experimentToday}
            </p>
            <p className="text-sm font-medium text-slate-600 dark:text-gray-400 truncate">
              Exp. hoje
            </p>
          </div>
        </motion.div>

        {/* KPI 2: Últimos 7 Dias - Azul */}
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          whileHover={{ y: -2, scale: 1.02, transition: { duration: 0.2 } }}
          className="neon-card p-4 border-blue-500/70 dark:border-indigo-500/70 hover:shadow-lg transition-shadow h-28 flex items-center gap-3" 
          style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03), 0 0 30px rgba(59, 130, 246, 0.4), 0 0 60px rgba(59, 130, 246, 0.2)' }}
        >
          <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shadow-lg shadow-blue-500/30 text-white">
            <MonitorSmartphone className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none mb-1">
              {data.metrics.experimentWeek}
            </p>
            <p className="text-sm font-medium text-slate-600 dark:text-gray-400 truncate">
              Últimos 7 dias
            </p>
          </div>
        </motion.div>

        {/* KPI 3: Like - Vermelho */}
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          whileHover={{ y: -2, scale: 1.02, transition: { duration: 0.2 } }}
          className="neon-card p-4 border-red-500/70 dark:border-red-500/70 hover:shadow-lg transition-shadow h-28 flex items-center gap-3" 
          style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03), 0 0 30px rgba(239, 68, 68, 0.4), 0 0 60px rgba(239, 68, 68, 0.2)' }}
        >
          <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 p-2.5 shadow-lg shadow-red-500/30 text-white">
            <Heart className="h-5 w-5 fill-current" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none mb-1">
              {data.metrics.likedTotal}
            </p>
            <p className="text-sm font-medium text-slate-600 dark:text-gray-400 truncate">
              Like
            </p>
          </div>
        </motion.div>

        {/* KPI 4: Compartilhamentos - Ciano */}
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
          whileHover={{ y: -2, scale: 1.02, transition: { duration: 0.2 } }}
          className="neon-card p-4 border-cyan-500/70 dark:border-cyan-500/70 hover:shadow-lg transition-shadow h-28 flex items-center gap-3" 
          style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03), 0 0 30px rgba(6, 182, 212, 0.4), 0 0 60px rgba(6, 182, 212, 0.2)' }}
        >
          <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 p-2.5 shadow-lg shadow-cyan-500/30 text-white">
            <Share2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none mb-1">
              {data.metrics.sharesTotal}
            </p>
            <p className="text-sm font-medium text-slate-600 dark:text-gray-400 truncate">
              Compartilh.
            </p>
          </div>
        </motion.div>

        {/* KPI 5: Checkouts - Âmbar */}
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
          whileHover={{ y: -2, scale: 1.02, transition: { duration: 0.2 } }}
          className="neon-card p-4 border-amber-500/70 dark:border-orange-500/70 hover:shadow-lg transition-shadow h-28 flex items-center gap-3" 
          style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03), 0 0 30px rgba(245, 158, 11, 0.4), 0 0 60px rgba(245, 158, 11, 0.2)' }}
        >
          <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-2.5 shadow-lg shadow-amber-500/30 text-white">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none mb-1">
              {data.metrics.checkoutTotal}
            </p>
            <p className="text-sm font-medium text-slate-600 dark:text-gray-400 truncate">
              Checkouts
            </p>
          </div>
        </motion.div>
      </section>

      {/* Performance Rápida - Mini Gráficos */}
      <DashboardMiniCharts
        experimentsTrend={data.experimentsTrend}
        productBreakdown={data.productBreakdown}
        metrics={{
          experimentWeek: data.metrics.experimentWeek,
          likedTotal: data.metrics.likedTotal,
          dislikedTotal: data.metrics.dislikedTotal,
          totalImagensGeradas: data.metrics.totalImagensGeradas,
          checkoutTotal: data.metrics.checkoutTotal,
        }}
      />

      {/* FASE 2: Cérebro da Loja - Feed de Insights da IA */}
      {lojistaId && <AIInsightsFeed lojistaId={lojistaId} />}

      {/* FASE 3: Grid 3 Caixas Lado a Lado - 4-4-4 colunas */}
      <section className="grid grid-cols-12 gap-3 h-[500px]">
        {/* CAIXA 1: Últimas Atividades (4 cols) - Azul */}
        <div className="col-span-12 lg:col-span-4 h-full">
            <AnimatedCard className="p-4 h-full flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <h2 className="text-base font-bold text-blue-900 font-heading">
                    Últimas Atividades
                  </h2>
                </div>
                <Link
                  href="/clientes"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  Ver todas →
                </Link>
              </div>
              
              {/* Lista Visual Rica com Miniaturas 9:16 */}
              <div className="space-y-2 overflow-y-auto flex-1">
                {data.activeCustomers.length > 0 ? (
                  data.activeCustomers.slice(0, 5).map((customer, index) => {
                  const lastCompositionImage = customer.lastCompositionImageUrl || null;
                  const hasComposition = customer.totalCompositions > 0;
                  const isVIP = customer.totalCompositions >= 5;

                  return (
                    <motion.div
                      key={customer.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ 
                        duration: 0.4, 
                        delay: index * 0.1,
                        ease: "easeOut"
                      }}
                      whileHover={{ 
                        y: -2, 
                        scale: 1.02,
                        transition: { duration: 0.2 }
                      }}
                      className="group relative bg-white rounded-lg p-2.5 hover:shadow-md transition-all animated-card-border"
                      style={{ border: '1px solid oklch(67.3% 0.182 276.935)' }}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Miniatura 9:16 - Última Composição */}
                        <Link
                          href={`/clientes/${customer.id}`}
                          className="flex-shrink-0"
                        >
                          <div className="w-12 h-20 rounded-md overflow-hidden border border-slate-200 shadow-sm group-hover:scale-105 transition-transform bg-slate-100 relative">
                            {lastCompositionImage ? (
                              <img
                                src={lastCompositionImage}
                                alt={`Última composição de ${customer.name}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent && !parent.querySelector('.fallback-avatar')) {
                                    const fallback = document.createElement('div');
                                    fallback.className = 'fallback-avatar w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100';
                                    fallback.innerHTML = `<span class="text-xs font-semibold text-slate-700">${customer.avatarInitials}</span>`;
                                    parent.appendChild(fallback);
                                  }
                                }}
                              />
                            ) : hasComposition ? (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
                                <ShoppingCart className="h-5 w-5 text-emerald-400" />
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
                                <span className="text-xs font-semibold text-slate-700">
                                  {customer.avatarInitials}
                                </span>
                              </div>
                            )}
                          </div>
                        </Link>
                        
                        {/* Informações */}
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/clientes/${customer.id}`}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors block truncate"
                          >
                            {customer.name}
                            {isVIP && <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">VIP</span>}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-xs text-slate-600">
                              {customer.totalCompositions} {customer.totalCompositions === 1 ? 'composição' : 'composições'}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              <Clock className="h-3 w-3" />
                              {customer.lastActivity.replace('há ', '')}
                            </span>
                          </div>
                        </div>
                        
                        {/* Botão Cockpit */}
                        <Link
                          href={`/clientes/${customer.id}?view=cockpit`}
                          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-xs font-medium group-hover:shadow-sm"
                        >
                          <MonitorSmartphone className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Cockpit</span>
                        </Link>
                      </div>
                    </motion.div>
                  );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <Clock className="h-12 w-12 text-blue-300 mb-3" />
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Nenhuma atividade recente
                    </p>
                    <p className="text-xs text-blue-700">
                      As interações dos clientes aparecerão aqui
                    </p>
                  </div>
                )}
              </div>
              
              {/* Rodapé com link para Radar de Oportunidades */}
              {data.activeCustomers.length > 0 && (
                <Link
                  href="/radar-oportunidades"
                  className="mt-3 pt-3 border-t border-blue-200 text-xs text-center text-blue-600 hover:text-blue-700 hover:underline transition-colors font-medium block"
                >
                  Ver radar de oportunidades →
                </Link>
              )}
            </AnimatedCard>
          </div>

        {/* CAIXA 2: Alerta de Estoque (4 cols) - Âmbar */}
        <div className="col-span-12 lg:col-span-4 h-full">
            <div className="p-4 h-full flex flex-col bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-sm" style={{ border: '1px solid rgb(255, 152, 0)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <h2 className="text-base font-bold text-amber-900 font-heading">
                    Alerta de Estoque
                  </h2>
                </div>
                <Link
                  href="/produtos?filter=low-stock"
                  className="text-xs font-medium text-amber-600 hover:text-amber-700 hover:underline transition-colors"
                >
                  Repor agora →
                </Link>
              </div>
              
              <div className="space-y-2 overflow-y-auto flex-1">
                {lowStockAlerts.length > 0 ? (
                  lowStockAlerts.slice(0, 5).map((alert, index) => (
                    <motion.div
                      key={alert.produtoId}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ 
                        duration: 0.4, 
                        delay: index * 0.1,
                        ease: "easeOut"
                      }}
                      whileHover={{ 
                        y: -2, 
                        scale: 1.02,
                        transition: { duration: 0.2 }
                      }}
                      className="group relative bg-white rounded-lg p-2.5 hover:shadow-md transition-all"
                      style={{ border: '1px solid rgb(255, 152, 0)' }}
                    >
                      <Link
                        href={`/produtos?edit=${alert.produtoId}`}
                        className="flex items-center gap-2.5"
                      >
                        {/* Miniatura 9:16 - Foto do Produto */}
                        <div className="flex-shrink-0 w-12 h-20 rounded-md overflow-hidden shadow-sm group-hover:scale-105 transition-transform bg-slate-100" style={{ border: '1px solid rgb(255, 152, 0)' }}>
                          {alert.produtoImagem ? (
                            <img
                              src={alert.produtoImagem}
                              alt={alert.produtoNome}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `
                                    <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
                                      <svg class="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                  `;
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
                              <ImageIcon className="h-5 w-5 text-amber-400" />
                            </div>
                          )}
                        </div>
                        
                        {/* Nome e Estoque */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 group-hover:text-amber-700 transition-colors truncate mb-1.5">
                            {alert.produtoNome}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              Restam {alert.estoqueAtual} un
                            </span>
                            {alert.experimentacoes > 0 && (
                              <span className="text-xs text-slate-500 font-medium">
                                {alert.experimentacoes} exp.
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Ícone de Ação Rápida (Hover) */}
                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 group-hover:bg-amber-100 transition-colors">
                            <ExternalLink className="h-4 w-4 text-amber-600" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-amber-300 mb-3" />
                    <p className="text-sm font-medium text-amber-900 mb-1">
                      Nenhum alerta no momento
                    </p>
                    <p className="text-xs text-amber-700">
                      Todos os produtos estão com estoque adequado
                    </p>
                  </div>
                )}
              </div>
              
              {/* Rodapé com link */}
              {lowStockAlerts.length > 0 && (
                <Link
                  href="/produtos?filter=low-stock"
                  className="mt-3 pt-3 text-xs text-center text-amber-600 hover:text-amber-700 hover:underline transition-colors font-medium block"
                  style={{ borderTop: '1px solid rgb(255, 152, 0)' }}
                >
                  Ver todos os alertas →
                </Link>
              )}
            </div>
          </div>

        {/* CAIXA 3: Top Produtos (4 cols) - Roxo */}
        <div className="col-span-12 lg:col-span-4 h-full">
            <AnimatedCard className="p-4 h-full flex flex-col bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  <h2 className="text-base font-bold text-purple-900 font-heading">
                    Top Produtos
                  </h2>
                </div>
                <Link
                  href="/produtos"
                  className="text-xs font-medium text-purple-600 hover:text-purple-700 hover:underline transition-colors"
                >
                  Ver catálogo →
                </Link>
              </div>
              
              {/* Lista de Produtos - Cada produto em uma caixa clicável */}
              <div className="space-y-2 flex-1 overflow-y-auto">
                {data.productBreakdown.length > 0 ? (
                  data.productBreakdown.slice(0, 5).map((product, index) => {
                  // Mock de estoque baixo para demonstração
                  const estoqueSimulado = index === 0 ? 3 : index === 1 ? 8 : 15;
                  const estoqueBaixo = estoqueSimulado < 5;
                  
                  return (
                    <Link
                      key={product.name}
                      href={`/produtos?view=${encodeURIComponent(product.name)}`}
                      className="group block bg-white rounded-lg border border-slate-200 p-2.5 hover:border-purple-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-slate-900 group-hover:text-purple-700 transition-colors truncate flex-1">
                          {product.name}
                        </span>
                        <div className="flex items-center gap-1.5 ml-2">
                          {estoqueBaixo && (
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                          )}
                          <span className={`text-xs font-semibold ${estoqueBaixo ? 'text-red-600' : 'text-purple-700'}`}>
                            {estoqueBaixo ? `${estoqueSimulado} un` : `${product.value}%`}
                          </span>
                        </div>
                      </div>
                      
                      {/* Barra de Progresso */}
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${product.value}%`,
                            backgroundColor: estoqueBaixo ? '#ef4444' : product.color,
                          }}
                        />
                      </div>
                    </Link>
                  );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <Package className="h-12 w-12 text-purple-300 mb-3" />
                    <p className="text-sm font-medium text-purple-900 mb-1">
                      Nenhum produto cadastrado
                    </p>
                    <p className="text-xs text-purple-700">
                      Adicione produtos ao catálogo para ver estatísticas
                    </p>
                  </div>
                )}
              </div>
              
              {/* Rodapé com link */}
              {data.productBreakdown.length > 0 && (
                <Link
                  href="/produtos"
                  className="mt-3 pt-3 border-t border-purple-200 text-xs text-center text-purple-600 hover:text-purple-700 hover:underline transition-colors font-medium block"
                >
                  Ver catálogo completo →
                </Link>
              )}
            </AnimatedCard>
          </div>
      </section>




    </div>
  );
}




