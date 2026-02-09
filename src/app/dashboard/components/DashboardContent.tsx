"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ActiveCustomer,
  DashboardMock,
  ExperimentPoint,
  ProductBreakdown,
} from "../../../lib/mocks/dashboard";
import Image from "next/image";
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
  LayoutDashboard,
} from "lucide-react";
import { IconPageHeader } from "@/app/(lojista)/components/icon-page-header";
import { getPageHeaderColors } from "@/app/(lojista)/components/page-header-colors";
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
import { DisplayPreview } from "@/components/dashboard/DisplayPreview";
import { DashboardMiniCharts } from "@/components/dashboard/DashboardMiniCharts";
import { FinancialWidget } from "@/components/dashboard/FinancialWidget";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { StaggeredContainer } from "@/components/ui/StaggeredContainer";
import { StaggeredItem } from "@/components/ui/StaggeredItem";

type DashboardContentProps = {
  data: DashboardMock;
  lojistaId?: string;
  lojaLogo?: string | null;
  lojaNome?: string;
  initials?: string;
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

export function DashboardContent({ data, lojistaId, lojaLogo = null, lojaNome, initials = "EA" }: DashboardContentProps) {
  const router = useRouter();

  // Estados para métricas avançadas
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  // Estilos forçados apenas para cards de produto e elementos com data-force-white (não mexe no grid das métricas)
  useEffect(() => {
    const forceStyles = () => {
      // Forçar texto branco nos cards de produto
      const productCards = document.querySelectorAll('[data-product-card]') as NodeListOf<HTMLElement>
      productCards.forEach((card) => {
        const allTextElements = card.querySelectorAll('h3, span, p, div, button')
        allTextElements.forEach((el) => {
          const htmlEl = el as HTMLElement
          // Não aplicar em elementos com preço (amarelo)
          if (!htmlEl.textContent?.includes('R$') || htmlEl.style.color === '#facc15') {
            if (htmlEl.style.color !== '#facc15') {
              htmlEl.style.setProperty('color', '#FFFFFF', 'important')
              htmlEl.style.setProperty('-webkit-text-fill-color', '#FFFFFF', 'important')
            }
          }
        })
      })

      // Forçar texto branco em elementos com data-force-white
      const forceWhiteElements = document.querySelectorAll('[data-force-white="true"]') as NodeListOf<HTMLElement>
      forceWhiteElements.forEach((el) => {
        el.style.setProperty('color', '#FFFFFF', 'important')
        el.style.setProperty('-webkit-text-fill-color', '#FFFFFF', 'important')
      })
    }

    // Executar imediatamente e após delays
    forceStyles()
    const timeout = setTimeout(forceStyles, 100)
    const timeout2 = setTimeout(forceStyles, 500)

    return () => {
      clearTimeout(timeout)
      clearTimeout(timeout2)
    }
  }, [])

  // Carregar métricas apenas uma vez ao montar o componente
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

    // Carregar apenas uma vez ao montar
    loadMetrics();

    // Atualizar apenas a cada 5 minutos (sem piscar)
    const intervalId = setInterval(() => {
      loadMetrics();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(intervalId);
  }, []);

  const colors = getPageHeaderColors('/dashboard');

  return (
    <div className="dashboard-page space-y-3 pb-6 min-w-0 max-w-full overflow-visible">
      {/* Caixa da logo: 67.67 × 67.67 px; logo ajustada dentro */}
      <div className="flex items-start gap-3 w-full mb-2">
        <div
          className="relative rounded-xl bg-blue-900/30 backdrop-blur-sm shadow-lg border border-blue-800/30 flex items-center justify-center overflow-hidden shrink-0"
          style={{ width: 67.67, height: 67.67 }}
        >
          {lojaLogo ? (
            <Image
              src={lojaLogo}
              alt={lojaNome || "Logo"}
              fill
              className="object-contain"
              sizes="68px"
              unoptimized={lojaLogo?.startsWith("data:") || lojaLogo?.includes("blob:")}
            />
          ) : (
            <span className="text-white text-sm font-bold">{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex">
          <IconPageHeader
            icon={LayoutDashboard}
            title="Dashboard"
            description="Acompanhe métricas, estatísticas e insights sobre o desempenho da sua loja no provador virtual."
            gradientFrom={colors.from}
            gradientTo={colors.to}
            shadowColor={colors.shadow}
            noMargin
          />
        </div>
      </div>

      {/* Grid único 12 colunas: overflow-visible para as sombras das caixas não serem cortadas. */}
      <section
        className="grid grid-cols-12 gap-4 w-full min-w-0 max-w-full overflow-visible mt-4"
        style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}
      >
        {/* ——— Linha 1: 6 KPIs (cada um 2/12 da largura) ——— */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0 }}
          className="col-span-2 min-w-0 rounded-xl bg-white p-4 h-28 flex items-center gap-3 transition-shadow dashboard-kpi-card"
        >
          <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 p-2.5 text-white">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-2xl font-bold text-slate-900 leading-none truncate">{data.metrics.experimentToday}</p>
            <p className="text-sm font-medium text-slate-600 truncate">Exp. hoje</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="col-span-2 min-w-0 rounded-xl bg-white p-4 h-28 flex items-center gap-3 transition-shadow dashboard-kpi-card"
        >
          <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 text-white">
            <MonitorSmartphone className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-2xl font-bold text-slate-900 leading-none truncate">{data.metrics.experimentWeek}</p>
            <p className="text-sm font-medium text-slate-600 truncate">Últimos 7 dias</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="col-span-2 min-w-0 rounded-xl bg-white p-4 h-28 flex items-center gap-3 transition-shadow dashboard-kpi-card"
        >
          <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 p-2.5 text-white">
            <Heart className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-2xl font-bold text-slate-900 leading-none truncate">{data.metrics.likedTotal}</p>
            <p className="text-sm font-medium text-slate-600 truncate">Like</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="col-span-2 min-w-0 rounded-xl bg-white p-4 h-28 flex items-center gap-3 transition-shadow dashboard-kpi-card"
        >
          <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 p-2.5 text-white">
            <Share2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-2xl font-bold text-slate-900 leading-none truncate">{data.metrics.sharesTotal}</p>
            <p className="text-sm font-medium text-slate-600 truncate">Compartilh.</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="col-span-2 min-w-0 rounded-xl bg-white p-4 h-28 flex items-center gap-3 transition-shadow dashboard-kpi-card"
        >
          <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-2.5 text-white">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-2xl font-bold text-slate-900 leading-none truncate">{data.metrics.checkoutTotal}</p>
            <p className="text-sm font-medium text-slate-600 truncate">Checkouts</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="col-span-2 min-w-0 rounded-xl bg-white p-4 h-28 flex items-center gap-3 transition-shadow dashboard-kpi-card"
        >
          <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 p-2.5 text-white">
            <Package className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-2xl font-bold text-slate-900 leading-none truncate">{data.metrics.totalProdutos ?? 0}</p>
            <p className="text-sm font-medium text-slate-600 truncate">Produtos</p>
          </div>
        </motion.div>

        {/* ——— Linha 2: 4 widgets (cada um 3/12 da largura), mesma largura total da linha de cima ——— */}
        <div className="col-span-12 md:col-span-3 min-w-0 h-56">
          {lojistaId && <FinancialWidget lojistaId={lojistaId} />}
        </div>
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
          inlineMode={true}
          gridCellClassName="col-span-12 md:col-span-3 min-w-0"
        />
      </section>

      {/* FASE 2: Insights + Display lado a lado — bases alinhadas (mesma altura, Display encostado embaixo) */}
      {lojistaId && (
        <section className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
          <div className="flex-1 min-w-0 order-2 lg:order-1 flex flex-col min-h-0">
            <div className="flex-1 min-h-0">
              <AIInsightsFeed lojistaId={lojistaId} />
            </div>
          </div>
          <div className="shrink-0 order-1 lg:order-2 flex flex-col justify-end">
            <DisplayPreview lojistaId={lojistaId} />
          </div>
        </section>
      )}

      {/* FASE 2: Grid 3 Caixas Lado a Lado - 4-4-4 colunas */}
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
              
              {/* Lista Visual Rica com Miniaturas Quadradas */}
              <div className="space-y-2 overflow-y-auto flex-1">
                {data.activeCustomers.length > 0 ? (
                  data.activeCustomers.slice(0, 5).map((customer, index) => {
                  const lastCompositionImage = customer.lastCompositionImageUrl || null;
                  const hasComposition = customer.totalCompositions > 0;
                  const isVIP = customer.totalCompositions >= 5;

                  return (
                    <Link
                      key={customer.id}
                      href={`/clientes/${customer.id}?view=cockpit`}
                      className="group block bg-white rounded-lg p-2.5 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Miniatura Quadrada - Última Composição */}
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 rounded-md overflow-hidden border border-slate-200 shadow-sm group-hover:scale-105 transition-transform bg-slate-100 relative">
                            {lastCompositionImage ? (
                              <img
                                src={lastCompositionImage}
                                alt={`Última composição de ${customer.name}`}
                                className="w-full h-full object-contain"
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
                        </div>
                        
                        {/* Informações */}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-blue-600 group-hover:text-blue-700 transition-colors block truncate">
                            {customer.name}
                            {isVIP && <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">VIP</span>}
                          </span>
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
                        <div className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 group-hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-xs font-medium group-hover:shadow-sm">
                          <MonitorSmartphone className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Cockpit</span>
                        </div>
                      </div>
                    </Link>
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
                  className="mt-3 pt-3 border-t border-slate-200 text-xs text-center text-blue-600 hover:text-blue-700 hover:underline transition-colors font-medium block"
                >
                  Ver radar de oportunidades →
                </Link>
              )}
            </AnimatedCard>
          </div>

        {/* CAIXA 2: Alerta de Estoque (4 cols) - Âmbar */}
        <div className="col-span-12 lg:col-span-4 h-full">
            <AnimatedCard className="p-4 h-full flex flex-col bg-gradient-to-br from-amber-50 to-orange-50">
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
              
              {/* Lista Visual Rica com Miniaturas Quadradas */}
              <div className="space-y-2 overflow-y-auto flex-1">
                {lowStockAlerts.length > 0 ? (
                  lowStockAlerts.slice(0, 5).map((alert, index) => (
                    <Link
                      key={alert.produtoId}
                      href={`/produtos?edit=${alert.produtoId}`}
                      className="group block bg-white rounded-lg p-2.5 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Miniatura Quadrada - Foto do Produto */}
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 rounded-md overflow-hidden shadow-sm group-hover:scale-105 transition-transform bg-slate-100 relative">
                            {alert.produtoImagem ? (
                              <img
                                src={alert.produtoImagem}
                                alt={alert.produtoNome}
                                className="w-full h-full object-contain"
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent && !parent.querySelector('.fallback-image')) {
                                    const fallback = document.createElement('div');
                                    fallback.className = 'fallback-image w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50';
                                    fallback.innerHTML = `<svg class="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>`;
                                    parent.appendChild(fallback);
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
                                <ImageIcon className="h-5 w-5 text-amber-400" />
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Informações */}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-amber-600 group-hover:text-amber-700 transition-colors block truncate">
                            {alert.produtoNome}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              Restam {alert.estoqueAtual} un
                            </span>
                            {alert.experimentacoes > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                                {alert.experimentacoes} exp.
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Botão Editar */}
                        <div className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 group-hover:bg-amber-100 text-amber-600 rounded-lg transition-colors text-xs font-medium group-hover:shadow-sm">
                          <MonitorSmartphone className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Editar</span>
                        </div>
                      </div>
                    </Link>
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
                  className="mt-3 pt-3 border-t border-slate-200 text-xs text-center text-amber-600 hover:text-amber-700 hover:underline transition-colors font-medium block"
                >
                  Ver todos os alertas →
                </Link>
              )}
            </AnimatedCard>
          </div>

        {/* CAIXA 3: Top Produtos (4 cols) - Roxo */}
        <div className="col-span-12 lg:col-span-4 h-full">
            <AnimatedCard className="p-4 h-full flex flex-col bg-gradient-to-br from-purple-50 to-indigo-50">
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
                      className="group block bg-white rounded-lg p-2.5 hover:shadow-md transition-all"
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
                  className="mt-3 pt-3 border-t border-slate-200 text-xs text-center text-purple-600 hover:text-purple-700 hover:underline transition-colors font-medium block"
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




