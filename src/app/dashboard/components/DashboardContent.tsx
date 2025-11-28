"use client";

import { useState, useEffect } from "react";
import {
  ActiveCustomer,
  DashboardMock,
  DislikeReason,
  ExperimentPoint,
  ProductBreakdown,
} from "../../../lib/mocks/dashboard";
import {
  ArrowUpRight,
  Heart,
  MessageCircle,
  MonitorSmartphone,
  ShieldCheck,
  ShoppingCart,
  Share2,
  Star,
  TrendingUp,
  Users2,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Package,
} from "lucide-react";
import Link from "next/link";
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
import { CreditsManager } from "../../(lojista)/dashboard/credits-manager";
import { AIAssistantWidget } from "@/components/dashboard/AIAssistantWidget";

type DashboardContentProps = {
  data: DashboardMock;
  lojistaId?: string;
};

function ExperimentsLineChart({ points }: { points: ExperimentPoint[] }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const strokeColor = isDark ? "#06B6D4" : "#3B82F6";
  const gradientId = `colorExperiment${isDark ? "Dark" : "Light"}`;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <AreaChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorExperimentDark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorExperimentLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          {/* Grid removido para look mais limpo */}
          <XAxis
            dataKey="day"
            stroke={isDark ? "#6B7280" : "#9CA3AF"}
            tickLine={false}
            axisLine={false}
            tick={{ fill: isDark ? "#6B7280" : "#9CA3AF", fontSize: 11 }}
            className="opacity-60"
          />
          <YAxis
            stroke={isDark ? "#6B7280" : "#9CA3AF"}
            tickLine={false}
            axisLine={false}
            tick={{ fill: isDark ? "#6B7280" : "#9CA3AF", fontSize: 11 }}
            className="opacity-60"
          />
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className={`rounded-xl px-4 py-3 shadow-xl ${
                    isDark 
                      ? "bg-[#0B0E14] border border-cyan-500/20" 
                      : "bg-white border border-blue-200/50"
                  }`}>
                    <p className={`text-xs font-medium mb-1 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}>
                      {payload[0].payload.day}
                    </p>
                    <p className={`text-lg font-bold ${
                      isDark ? "text-cyan-400" : "text-blue-600"
                    }`}>
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
            activeDot={{ r: 5, fill: strokeColor, strokeWidth: 2, stroke: isDark ? "#FFFFFF" : "#FFFFFF" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProductPieChart({ data }: { data: ProductBreakdown[] }) {
  return (
    <div className="h-64 w-full">
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
            innerRadius={60}
            outerRadius={90}
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
    <div className="space-y-4">
      {customers.map((customer) => (
        <div
          key={customer.id}
          className="flex items-center justify-between neon-card rounded-xl px-4 py-3 shadow-md transition-colors duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
              {customer.avatarInitials}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{customer.name}</p>
              <p className="text-xs text-slate-600 dark:text-gray-400">
                {customer.totalCompositions} composições · {customer.lastActivity}
              </p>
            </div>
          </div>
          <Link
            href={`/clientes?focus=${encodeURIComponent(customer.id)}`}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 transition-all duration-200"
          >
            Ver cliente
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ))}
    </div>
  );
}

function FunnelStep({
  label,
  value,
  color,
  bgColor,
  conversionRate,
}: {
  label: string;
  value: number;
  color: string;
  bgColor: string;
  conversionRate?: string;
}) {
  return (
    <div className={`rounded-lg border-2 p-3 ${bgColor} transition-all duration-300 shadow-sm hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${color}`}>{label}</span>
        <span className={`text-sm font-bold ${color}`}>{value}</span>
      </div>
      {conversionRate && (
        <p className="text-[10px] font-medium text-purple-700 dark:text-purple-400 mt-1.5">
          Taxa: {conversionRate}%
        </p>
      )}
    </div>
  );
}

export function DashboardContent({ data, lojistaId }: DashboardContentProps) {
  const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);

  // Estados para métricas avançadas
  const [roiMetrics, setRoiMetrics] = useState<any>(null);
  const [funnel, setFunnel] = useState<any>(null);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  // Carregar métricas avançadas
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setIsLoadingMetrics(true);
        const response = await fetch("/api/lojista/dashboard-metrics");
        if (response.ok) {
          const metricsData = await response.json();
          setRoiMetrics(metricsData.roi);
          setFunnel(metricsData.funnel);
          setLowStockAlerts(metricsData.lowStockAlerts || []);
        }
      } catch (error) {
        console.error("[DashboardContent] Erro ao carregar métricas:", error);
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    loadMetrics();
  }, []);

  const opportunityLeads = data.opportunityRadar ?? [];
  const productAlerts = data.productAlerts ?? { fit: [], style: [] };
  const isMicroPlan = (data.plan?.tier ?? "").toLowerCase() === "micro";
  const hasProductAlerts =
    (productAlerts.fit?.length ?? 0) > 0 || (productAlerts.style?.length ?? 0) > 0;

  const reasonMeta: Record<
    DislikeReason,
    { label: string; action: string; chipClass: string }
  > = {
    garment_style: {
      label: "Preferiu outro estilo",
      action: "Sugira uma variação ou cor diferente",
      chipClass: "bg-pink-500/15 text-pink-200 border border-pink-400/40",
    },
    fit_issue: {
      label: "Ajuste/Tamanho",
      action: "Envie um tamanho alternativo no WhatsApp",
      chipClass: "bg-amber-500/15 text-amber-200 border border-amber-400/40",
    },
    ai_distortion: {
      label: "Imagem estranha",
      action: "Gere novamente e compartilhe com o cliente",
      chipClass: "bg-indigo-500/15 text-indigo-200 border border-indigo-400/40",
    },
    other: {
      label: "Feedback geral",
      action: "Pergunte o que gostaria de ver",
      chipClass: "bg-zinc-500/15 text-zinc-200 border border-zinc-400/40",
    },
  };

  const defaultReasonMeta = {
    label: "Cliente ativo",
    action: "Envie um convite personalizado agora",
    chipClass: "bg-zinc-800/70 text-zinc-200 border border-zinc-700",
  };

  const resolveReasonMeta = (reason?: DislikeReason | null) => {
    if (!reason) return defaultReasonMeta;
    return reasonMeta[reason] ?? defaultReasonMeta;
  };

  return (
    <div className="space-y-12 pb-12">

      {/* AI Assistant Widget - Top Priority */}
      <AIAssistantWidget lojistaId={lojistaId} />

      {/* Gerenciador de Créditos */}
      <CreditsManager lojistaId={lojistaId} />

      {/* Seção de Métricas ROI e Funil */}
      {roiMetrics && (
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Card ROI/Custo por Try-On */}
          <div className="neon-card p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <DollarSign className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                <span>$ ROI e Custo por Try-On</span>
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-gray-300">Custo Total</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatBRL(roiMetrics.totalCostBRL)}
                </p>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mt-1">
                  {roiMetrics.totalTryOns} Try-Ons realizados
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-gray-300">Custo Médio por Try-On</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {formatBRL(roiMetrics.costPerTryOn)}
                </p>
              </div>
              <div className="rounded-xl border-2 border-emerald-400/60 dark:border-emerald-500/60 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-950/40 p-4 shadow-lg" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03), 0 0 20px rgba(16, 185, 129, 0.25)' }}>
                <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">Receita Estimada</p>
                <p className="text-2xl font-bold text-emerald-950 dark:text-emerald-50">
                  {formatBRL(roiMetrics.estimatedRevenue)}
                </p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-bold ${
                    roiMetrics.roi >= 0 
                      ? "text-emerald-800 dark:text-emerald-300" 
                      : "text-red-700 dark:text-red-400"
                  }`}>
                    ROI: {roiMetrics.roi >= 0 ? "+" : ""}{roiMetrics.roi.toFixed(1)}%
                  </span>
                  <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                    ({roiMetrics.roiMultiplier.toFixed(2)}x retorno)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card Funil de Conversão */}
          {funnel && (
            <div className="neon-card p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <BarChart3 className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                  <span>Funil de Conversão</span>
                </span>
              </div>
              <div className="space-y-3">
                <FunnelStep
                  label="Visitantes"
                  value={funnel.visitantes}
                  color="text-blue-700 dark:text-blue-400"
                  bgColor="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50"
                />
                <FunnelStep
                  label="Try-Ons"
                  value={funnel.tryOns}
                  color="text-indigo-700 dark:text-indigo-400"
                  bgColor="bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50"
                  conversionRate={funnel.visitantes > 0 ? ((funnel.tryOns / funnel.visitantes) * 100).toFixed(1) : "0"}
                />
                <FunnelStep
                  label="Favoritos"
                  value={funnel.favoritos}
                  color="text-pink-700 dark:text-pink-400"
                  bgColor="bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800/50"
                  conversionRate={funnel.conversionRates.tryOnToFavorito.toFixed(1)}
                />
                <FunnelStep
                  label="Compartilhamentos"
                  value={funnel.compartilhamentos}
                  color="text-sky-700 dark:text-sky-400"
                  bgColor="bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/50"
                  conversionRate={funnel.conversionRates.favoritoToCompartilhamento.toFixed(1)}
                />
                <FunnelStep
                  label="Compras"
                  value={funnel.compras}
                  color="text-emerald-700 dark:text-emerald-400"
                  bgColor="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50"
                  conversionRate={funnel.conversionRates.tryOnToCompra.toFixed(1)}
                />
              </div>
            </div>
          )}
        </section>
      )}

      {/* Alerta de Estoque Baixo */}
      {lowStockAlerts.length > 0 && (
        <section className="neon-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">Alerta de Estoque Baixo</span>
            </div>
            <Link
              href="/produtos"
              className="inline-flex items-center gap-1 text-xs font-medium bg-amber-600 hover:bg-amber-700 dark:bg-orange-600 dark:hover:bg-orange-700 text-white border-none px-3 py-1.5 rounded-lg shadow-sm transition-all duration-200"
            >
              Ver produtos
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lowStockAlerts.slice(0, 6).map((alert) => (
              <div
                key={alert.produtoId}
                className={`neon-card rounded-xl border-2 p-3 transition-all duration-300 shadow-sm hover:shadow-md ${
                  alert.prioridade === "alta"
                    ? "border-red-400/70 dark:border-red-500/70 bg-red-50/80 dark:bg-red-950/30"
                    : alert.prioridade === "media"
                    ? "border-amber-400/70 dark:border-amber-500/70 bg-amber-50/80 dark:bg-amber-950/30"
                    : "border-yellow-400/70 dark:border-yellow-500/70 bg-yellow-50/80 dark:bg-yellow-950/30"
                }`}
                style={alert.prioridade === "alta" 
                  ? { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 0 20px rgba(239, 68, 68, 0.25)' }
                  : alert.prioridade === "media"
                  ? { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 0 20px rgba(245, 158, 11, 0.25)' }
                  : { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 0 20px rgba(234, 179, 8, 0.25)' }
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {alert.produtoNome}
                    </p>
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mt-1">
                      Estoque: {alert.estoqueAtual} unidades
                    </p>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mt-1">
                      {alert.experimentacoes} experimentações
                    </p>
                  </div>
                  {alert.prioridade === "alta" && (
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 ml-2" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {opportunityLeads.length > 0 && (
        <section className="relative neon-card p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-700">Radar de Oportunidades</p>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Clientes ativos nas últimas horas</h2>
            </div>
            <span className="text-xs text-indigo-700">
              {opportunityLeads.length} lead{opportunityLeads.length > 1 ? "s" : ""} aguardando contato
            </span>
          </div>

          <div
            className={`mt-4 grid gap-4 lg:grid-cols-2 ${
              isMicroPlan ? "blur-sm pointer-events-none select-none" : ""
            }`}
          >
            {opportunityLeads.slice(0, 4).map((lead) => {
              const meta = resolveReasonMeta(isMicroPlan ? undefined : lead.reason);
              return (
                <div key={lead.customerId} className="neon-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {isMicroPlan ? "Cliente confidencial" : lead.name}
                      </p>
                      <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                        {lead.lastActivity} · {lead.interactions} try-ons
                      </p>
                    </div>
                    {lead.lastProduct && !isMicroPlan && (
                      <span className="rounded-full border border-indigo-300 bg-indigo-100 px-3 py-1 text-[11px] text-indigo-700">
                        {lead.lastProduct}
                      </span>
                    )}
                  </div>
                  <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${meta.chipClass}`}>
                    {meta.label}
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-800 dark:text-gray-200">
                    {isMicroPlan ? "Desbloqueie o plano Lojista para ver nomes e insights completos." : meta.action}
                  </p>
                  {!isMicroPlan && lead.insight && (
                    <p className="mt-1 text-xs font-medium text-indigo-800 dark:text-indigo-300">{lead.insight}</p>
                  )}
                </div>
              );
            })}
          </div>

          {isMicroPlan && (
            <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-gray-200/50 dark:border-white/5 bg-white dark:bg-[#1C1F2E] text-center px-6 shadow-lg transition-colors duration-300">
              <p className="text-xs uppercase tracking-[0.4em] text-indigo-700 dark:text-indigo-300">Plano Impulso</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">5 clientes online agora!</h3>
              <p className="mt-2 text-sm text-slate-700 dark:text-gray-300">
                Assine o Plano Lojista para ver nomes, motivos e disparar ofertas em um clique.
              </p>
            <Link
              href="/planos"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white border-none shadow-sm px-5 py-2 text-sm font-medium transition-all duration-200"
            >
              Desbloquear dados
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            </div>
          )}
        </section>
      )}

      {hasProductAlerts && (
        <section className="neon-card p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-pink-700">Insights de Produto</p>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Feedback explícito dos clientes</h2>
            </div>
            <span className="text-xs text-pink-700">Atualizado em tempo real a cada voto</span>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="neon-card p-4">
              <div className="flex items-center justify-between text-xs text-amber-800">
                <span className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  Fit Alert
                </span>
                <span>{productAlerts.fit.length} produto(s)</span>
              </div>
              <div className="mt-4 space-y-3">
                {productAlerts.fit.slice(0, 4).map((alert) => (
                  <Link
                    key={alert.productId}
                    href={`/produtos?focus=${encodeURIComponent(alert.productId)}`}
                    className="flex items-center justify-between rounded-xl border border-amber-300 dark:border-amber-600 bg-white dark:bg-[#1C1F2E] px-4 py-3 shadow-sm transition hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-md"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{alert.productName}</p>
                      <p className="text-[11px] font-medium text-amber-800 dark:text-amber-400">
                        {alert.totalReports} alertas · {alert.percentage}% das últimas {alert.totalInteractions} interações
                      </p>
                    </div>
                    <span className="text-lg font-semibold text-slate-900 dark:text-white">{alert.percentage}%</span>
                  </Link>
                ))}
                {productAlerts.fit.length === 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">Nenhum alerta de tamanho no período.</p>
                )}
              </div>
            </div>
            <div className="neon-card p-4">
              <div className="flex items-center justify-between text-xs text-pink-800">
                <span className="flex items-center gap-2 font-semibold">
                  <Package className="h-4 w-4" />
                  Style Rejection
                </span>
                <span>{productAlerts.style.length} produto(s)</span>
              </div>
              <div className="mt-4 space-y-3">
                {productAlerts.style.slice(0, 4).map((alert) => (
                  <Link
                    key={alert.productId}
                    href={`/produtos?focus=${encodeURIComponent(alert.productId)}`}
                    className="flex items-center justify-between rounded-xl border border-pink-300 dark:border-pink-600 bg-white dark:bg-[#1C1F2E] px-4 py-3 shadow-sm transition hover:border-pink-400 dark:hover:border-pink-500 hover:shadow-md"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{alert.productName}</p>
                      <p className="text-[11px] font-medium text-pink-800 dark:text-pink-400">
                        {alert.totalReports} rejeições · {alert.percentage}% de {alert.totalInteractions} tentativas
                      </p>
                    </div>
                    <span className="text-lg font-semibold text-slate-900 dark:text-white">{alert.percentage}%</span>
                  </Link>
                ))}
                {productAlerts.style.length === 0 && (
                  <p className="text-xs text-pink-700 dark:text-pink-400">Nenhuma rejeição de estilo detectada.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-4">
        <div className="neon-card p-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-gray-300">
            <span>Experimentações hoje</span>
            <TrendingUp className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
            {data.metrics.experimentToday}
          </p>
          <p className="mt-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
            +18% vs. média da última semana
          </p>
          <div className="mt-6">
            <ExperimentsLineChart points={data.experimentsTrend} />
          </div>
        </div>

        <div className="neon-card p-6">
          <p className="text-xs font-semibold text-slate-700 dark:text-gray-300">Últimos 7 dias</p>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {data.metrics.experimentWeek}
          </p>
          <p className="mt-4 text-xs font-medium text-slate-600 dark:text-gray-400">
            Média de {Math.max(1, Math.round(data.metrics.experimentWeek / 7))} looks por dia.
          </p>
          <div className="mt-6 flex items-center gap-3 rounded-lg border-2 border-amber-400/60 dark:border-amber-500/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-200" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 0 15px rgba(245, 158, 11, 0.2)' }}>
            <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="font-medium">Campanhas personalizadas continuam alavancando resultados.</span>
          </div>
        </div>

        <div className="neon-card p-6">
          <p className="text-xs font-semibold text-slate-700 dark:text-gray-300">Curtidas acumuladas</p>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {data.metrics.likedTotal}
          </p>
          <p className="mt-4 text-xs font-medium text-slate-600 dark:text-gray-400">
            Clientes engajados convertem 3x mais em vendas.
          </p>
          <div className="mt-6 flex items-center gap-3 rounded-lg border-2 border-emerald-400/60 dark:border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-xs text-emerald-800 dark:text-emerald-200" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 0 15px rgba(16, 185, 129, 0.2)' }}>
            <Heart className="h-4 w-4 fill-current text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">Dê destaque ao que seus clientes mais amam.</span>
          </div>
        </div>

        <div className="space-y-4 neon-card p-6">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-gray-300">
              <Share2 className="h-4 w-4 text-sky-500 dark:text-sky-400" /> Compartilhamentos
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {data.metrics.sharesTotal}
            </p>
            <p className="text-xs font-medium text-slate-600 dark:text-gray-400">
              Mensagens e posts impulsionam o alcance da loja.
            </p>
          </div>

          <div className="rounded-lg border-2 border-amber-400/60 dark:border-amber-500/60 bg-amber-50 dark:bg-amber-950/30 p-4" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03), 0 0 20px rgba(245, 158, 11, 0.25)' }}>
            <p className="flex items-center gap-2 text-xs font-medium text-amber-900 dark:text-amber-200">
              <ShoppingCart className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Checkouts
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
              {data.metrics.checkoutTotal}
            </p>
            <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-300">
              {data.metrics.anonymousTotal} looks protegidos com avatar seguro.
            </p>
          </div>

          <p className="text-xs font-medium text-slate-600 dark:text-gray-400">
            {data.metrics.lastActionLabel}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-7">
        <div className="neon-card p-6 lg:col-span-4 space-y-6 transition-colors duration-300">
          <div className="flex items-center justify-between text-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Produtos mais provados
            </h2>
            <Link
              href="/produtos"
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 transition hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              Ver catálogo
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6">
            <ProductPieChart data={data.productBreakdown} />
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-700 dark:text-gray-300">
            {data.productBreakdown.map((product) => (
              <div
                key={product.name}
                className="flex items-center justify-between rounded-xl neon-card px-3 py-2"
              >
                <span className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: product.color }}
                    aria-hidden
                  />
                  {product.name}
                </span>
                <span className="text-xs text-slate-600 dark:text-gray-400">
                  {product.value}% das experimentações
                </span>
              </div>
            ))}
          </div>
        </div>

      </section>

      <section className="grid gap-6 lg:grid-cols-7">
        <div className="neon-card p-6 lg:col-span-4 space-y-6 transition-colors duration-300">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Conversões recentes
            </h2>
                      <p className="text-xs font-medium text-slate-700 dark:text-gray-300">
                Monitor de curtidas, compartilhamentos e checkouts.
              </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border-2 border-emerald-400/60 dark:border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/30 p-4" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03), 0 0 20px rgba(16, 185, 129, 0.25)' }}>
              <p className="flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                <Heart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Curtidas
              </p>
              <p className="mt-2 text-2xl font-bold text-[var(--text-main)]">
                {data.metrics.likedTotal}
              </p>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                Taxa de checkout:{" "}
                {data.metrics.conversionLikeRate.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg border-2 border-sky-400/60 dark:border-sky-500/60 bg-sky-50 dark:bg-sky-950/30 p-4" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03), 0 0 20px rgba(14, 165, 233, 0.25)' }}>
              <p className="flex items-center gap-2 text-xs font-medium text-sky-800 dark:text-sky-300">
                <Share2 className="h-4 w-4 text-sky-600 dark:text-sky-400" /> Compartilhamentos
              </p>
              <p className="mt-2 text-2xl font-bold text-[var(--text-main)]">
                {data.metrics.sharesTotal}
              </p>
              <p className="mt-1 text-xs text-sky-700 dark:text-sky-400">
                Taxa de checkout:{" "}
                {data.metrics.conversionCheckoutRate.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4">
              <p className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-300">
                <ShoppingCart className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Checkouts
              </p>
              <p className="mt-2 text-2xl font-bold text-[var(--text-main)]">
                {data.metrics.checkoutTotal}
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                {data.metrics.anonymousTotal} looks com anonimização ativa.
              </p>
            </div>
          </div>
        </div>

        <div className="neon-card p-6 lg:col-span-3 transition-colors duration-300">
          <div className="flex items-center justify-between text-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Clientes mais ativos
            </h2>
            <Link
              href="/clientes"
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 transition hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              Ver clientes
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6">
            <CustomersList customers={data.activeCustomers} />
          </div>
        </div>
      </section>
    </div>
  );
}




