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

type DashboardContentProps = {
  data: DashboardMock;
  lojistaId?: string;
};

function ExperimentsLineChart({ points }: { points: ExperimentPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={points}>
          <CartesianGrid stroke="rgba(99,102,241,0.1)" vertical={false} />
          <XAxis
            dataKey="day"
            stroke="#a5b4fc"
            tickLine={false}
            axisLine={{ stroke: "rgba(99,102,241,0.4)" }}
          />
          <YAxis
            stroke="#a5b4fc"
            tickLine={false}
            axisLine={{ stroke: "rgba(99,102,241,0.4)" }}
          />
          <Tooltip
            cursor={{ stroke: "#4c1d95", strokeWidth: 1 }}
            contentStyle={{
              backgroundColor: "#09090b",
              borderRadius: 12,
              border: "1px solid rgba(99,102,241,0.4)",
              color: "#f9fafb",
            }}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#818cf8"
            strokeWidth={3}
            dot={{ r: 4, fill: "#c7d2fe" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
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
          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              {customer.avatarInitials}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">{customer.name}</p>
              <p className="text-xs text-slate-600">
                {customer.totalCompositions} composições · {customer.lastActivity}
              </p>
            </div>
          </div>
          <Link
            href={`/clientes?focus=${encodeURIComponent(customer.id)}`}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-slate-700 transition hover:bg-gray-200"
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
    <div className={`rounded-lg border ${bgColor} p-3`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${color}`}>{label}</span>
        <span className={`text-sm font-semibold ${color}`}>{value}</span>
      </div>
      {conversionRate && (
        <p className="text-[10px] text-purple-600 mt-1">
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
      <header className="flex flex-col gap-8 rounded-3xl border border-gray-200 bg-gradient-to-br from-white via-slate-50 to-white p-10 shadow-lg lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20 text-2xl font-semibold text-indigo-200 overflow-hidden">
            {data.brand.logoUrl ? (
              <img
                src={data.brand.logoUrl}
                alt={`Logo da ${data.brand.name}`}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              data.brand.name
                .split(" ")
                .slice(0, 2)
                .map((word) => word[0])
                .join("")
            )}
          </div>
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 text-xs text-emerald-600">
              <TrendingUp className="h-4 w-4" /> {data.brand.lastSync}
            </p>
            <h1 className="text-3xl font-semibold text-slate-900 lg:text-4xl">
              {data.brand.name}
            </h1>
            <p className="text-sm text-slate-600">{data.brand.tagline}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-sm text-slate-700 lg:text-right">
          <p>
            Mostre o valor do seu catálogo com <span className="text-slate-900 font-semibold">promoções personalizadas</span>.
          </p>
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <Link
              href="/compartilhamento"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar promoção via WhatsApp
            </Link>
            <Link
              href="/simulador"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-indigo-400/50 bg-indigo-500/20 px-6 py-3 text-sm font-semibold text-indigo-100 transition hover:border-indigo-300/70 hover:text-white"
            >
              <MonitorSmartphone className="h-4 w-4" />
              Simular composição
            </Link>
          </div>
        </div>
      </header>

      {/* Gerenciador de Créditos */}
      <CreditsManager lojistaId={lojistaId} />

      {/* Seção de Métricas ROI e Funil */}
      {roiMetrics && (
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Card ROI/Custo por Try-On */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-center justify-between text-xs text-emerald-700 mb-4">
              <span className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                ROI e Custo por Try-On
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-emerald-700">Custo Total</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {formatBRL(roiMetrics.totalCostBRL)}
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  {roiMetrics.totalTryOns} Try-Ons realizados
                </p>
              </div>
              <div>
                <p className="text-xs text-emerald-700">Custo Médio por Try-On</p>
                <p className="text-xl font-semibold text-slate-900">
                  {formatBRL(roiMetrics.costPerTryOn)}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-100 p-4">
                <p className="text-xs text-emerald-700">Receita Estimada</p>
                <p className="text-2xl font-semibold text-emerald-900">
                  {formatBRL(roiMetrics.estimatedRevenue)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-sm font-semibold ${
                    roiMetrics.roi >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}>
                    ROI: {roiMetrics.roi >= 0 ? "+" : ""}{roiMetrics.roi.toFixed(1)}%
                  </span>
                  <span className="text-xs text-emerald-600">
                    ({roiMetrics.roiMultiplier.toFixed(2)}x retorno)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card Funil de Conversão */}
          {funnel && (
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-6">
              <div className="flex items-center justify-between text-xs text-purple-700 mb-4">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Funil de Conversão
                </span>
              </div>
              <div className="space-y-3">
                <FunnelStep
                  label="Visitantes"
                  value={funnel.visitantes}
                  color="text-blue-700"
                  bgColor="bg-blue-50 border-blue-200"
                />
                <FunnelStep
                  label="Try-Ons"
                  value={funnel.tryOns}
                  color="text-indigo-700"
                  bgColor="bg-indigo-50 border-indigo-200"
                  conversionRate={funnel.visitantes > 0 ? ((funnel.tryOns / funnel.visitantes) * 100).toFixed(1) : "0"}
                />
                <FunnelStep
                  label="Favoritos"
                  value={funnel.favoritos}
                  color="text-pink-700"
                  bgColor="bg-pink-50 border-pink-200"
                  conversionRate={funnel.conversionRates.tryOnToFavorito.toFixed(1)}
                />
                <FunnelStep
                  label="Compartilhamentos"
                  value={funnel.compartilhamentos}
                  color="text-sky-700"
                  bgColor="bg-sky-50 border-sky-200"
                  conversionRate={funnel.conversionRates.favoritoToCompartilhamento.toFixed(1)}
                />
                <FunnelStep
                  label="Compras"
                  value={funnel.compras}
                  color="text-emerald-700"
                  bgColor="bg-emerald-50 border-emerald-200"
                  conversionRate={funnel.conversionRates.tryOnToCompra.toFixed(1)}
                />
              </div>
            </div>
          )}
        </section>
      )}

      {/* Alerta de Estoque Baixo */}
      {lowStockAlerts.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-semibold">Alerta de Estoque Baixo</span>
            </div>
            <Link
              href="/produtos"
              className="inline-flex items-center gap-1 text-xs text-amber-700 transition hover:text-amber-900"
            >
              Ver produtos
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lowStockAlerts.slice(0, 6).map((alert) => (
              <div
                key={alert.produtoId}
                className={`rounded-xl border p-3 ${
                  alert.prioridade === "alta"
                    ? "border-red-300 bg-red-50"
                    : alert.prioridade === "media"
                    ? "border-amber-300 bg-amber-50"
                    : "border-yellow-300 bg-yellow-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {alert.produtoNome}
                    </p>
                    <p className="text-xs text-amber-800 mt-1">
                      Estoque: {alert.estoqueAtual} unidades
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      {alert.experimentacoes} experimentações
                    </p>
                  </div>
                  {alert.prioridade === "alta" && (
                    <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 ml-2" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {opportunityLeads.length > 0 && (
        <section className="relative rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-700">Radar de Oportunidades</p>
              <h2 className="text-xl font-semibold text-slate-900">Clientes ativos nas últimas horas</h2>
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
                <div key={lead.customerId} className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {isMicroPlan ? "Cliente confidencial" : lead.name}
                      </p>
                      <p className="text-xs text-indigo-700">
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
                  <p className="mt-3 text-sm text-slate-700">
                    {isMicroPlan ? "Desbloqueie o plano Lojista para ver nomes e insights completos." : meta.action}
                  </p>
                  {!isMicroPlan && lead.insight && (
                    <p className="mt-1 text-xs text-indigo-700">{lead.insight}</p>
                  )}
                </div>
              );
            })}
          </div>

          {isMicroPlan && (
            <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-indigo-300 bg-white/95 text-center px-6 shadow-lg">
              <p className="text-xs uppercase tracking-[0.4em] text-indigo-700">Plano Impulso</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">5 clientes online agora!</h3>
              <p className="mt-2 text-sm text-slate-700">
                Assine o Plano Lojista para ver nomes, motivos e disparar ofertas em um clique.
              </p>
              <Link
                href="/planos"
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Desbloquear dados
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>
      )}

      {hasProductAlerts && (
        <section className="rounded-2xl border border-pink-200 bg-pink-50 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-pink-700">Insights de Produto</p>
              <h2 className="text-xl font-semibold text-slate-900">Feedback explícito dos clientes</h2>
            </div>
            <span className="text-xs text-pink-700">Atualizado em tempo real a cada voto</span>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
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
                    className="flex items-center justify-between rounded-xl border border-amber-300 bg-white px-4 py-3 transition hover:border-amber-400"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{alert.productName}</p>
                      <p className="text-[11px] text-amber-700">
                        {alert.totalReports} alertas · {alert.percentage}% das últimas {alert.totalInteractions} interações
                      </p>
                    </div>
                    <span className="text-lg font-semibold text-slate-900">{alert.percentage}%</span>
                  </Link>
                ))}
                {productAlerts.fit.length === 0 && (
                  <p className="text-xs text-amber-700">Nenhum alerta de tamanho no período.</p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-pink-200 bg-pink-50 p-4">
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
                    className="flex items-center justify-between rounded-xl border border-pink-300 bg-white px-4 py-3 transition hover:border-pink-400"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{alert.productName}</p>
                      <p className="text-[11px] text-pink-700">
                        {alert.totalReports} rejeições · {alert.percentage}% de {alert.totalInteractions} tentativas
                      </p>
                    </div>
                    <span className="text-lg font-semibold text-slate-900">{alert.percentage}%</span>
                  </Link>
                ))}
                {productAlerts.style.length === 0 && (
                  <p className="text-xs text-pink-700">Nenhuma rejeição de estilo detectada.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-4">
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
          <div className="flex items-center justify-between text-xs text-indigo-700">
            <span>Experimentações hoje</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="mt-4 text-3xl font-semibold text-slate-900">
            {data.metrics.experimentToday}
          </p>
          <p className="mt-2 text-xs text-indigo-700">
            +18% vs. média da última semana
          </p>
          <div className="mt-6">
            <ExperimentsLineChart points={data.experimentsTrend} />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="text-xs text-slate-600">Últimos 7 dias</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">
            {data.metrics.experimentWeek}
          </p>
          <p className="mt-4 text-xs text-slate-600">
            Média de {Math.max(1, Math.round(data.metrics.experimentWeek / 7))} looks por dia.
          </p>
          <div className="mt-6 flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <Star className="h-4 w-4 text-amber-600" />
            Campanhas personalizadas continuam alavancando resultados.
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="text-xs text-emerald-700">Curtidas acumuladas</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">
            {data.metrics.likedTotal}
          </p>
          <p className="mt-4 text-xs text-emerald-700">
            Clientes engajados convertem 3x mais em vendas.
          </p>
          <div className="mt-6 flex items-center gap-3 rounded-xl bg-emerald-100 px-4 py-3 text-xs text-emerald-800">
            <Heart className="h-4 w-4 fill-current" />
            Dê destaque ao que seus clientes mais amam.
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50 p-6">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-xs text-sky-700">
              <Share2 className="h-4 w-4" /> Compartilhamentos
            </p>
            <p className="text-2xl font-semibold text-slate-900">
              {data.metrics.sharesTotal}
            </p>
            <p className="text-xs text-sky-700">
              Mensagens e posts impulsionam o alcance da loja.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
            <p className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Checkouts
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {data.metrics.checkoutTotal}
            </p>
            <p className="mt-2 text-xs text-amber-700">
              {data.metrics.anonymousTotal} looks protegidos com avatar seguro.
            </p>
          </div>


          <p className="text-xs text-sky-700">
            {data.metrics.lastActionLabel}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-7">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between text-sm text-slate-700">
            <h2 className="text-lg font-semibold text-slate-900">
              Produtos mais provados
            </h2>
            <Link
              href="/produtos"
              className="inline-flex items-center gap-1 text-xs text-indigo-600 transition hover:text-indigo-700"
            >
              Ver catálogo
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6">
            <ProductPieChart data={data.productBreakdown} />
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            {data.productBreakdown.map((product) => (
              <div
                key={product.name}
                className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2"
              >
                <span className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: product.color }}
                    aria-hidden
                  />
                  {product.name}
                </span>
                <span className="text-xs text-slate-600">
                  {product.value}% das experimentações
                </span>
              </div>
            ))}
          </div>
        </div>

      </section>

      <section className="grid gap-6 lg:grid-cols-7">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 lg:col-span-4 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Conversões recentes
            </h2>
            <p className="text-xs text-slate-600">
              Monitor de curtidas, compartilhamentos e checkouts.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="flex items-center gap-2 text-xs text-emerald-700">
                <Heart className="h-4 w-4" /> Curtidas
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {data.metrics.likedTotal}
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                Taxa de checkout:{" "}
                {data.metrics.conversionLikeRate.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
              <p className="flex items-center gap-2 text-xs text-sky-700">
                <Share2 className="h-4 w-4" /> Compartilhamentos
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {data.metrics.sharesTotal}
              </p>
              <p className="mt-1 text-xs text-sky-700">
                Taxa de checkout:{" "}
                {data.metrics.conversionCheckoutRate.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-xs text-amber-700">
                <ShoppingCart className="h-4 w-4" /> Checkouts
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {data.metrics.checkoutTotal}
              </p>
              <p className="mt-1 text-xs text-amber-700">
                {data.metrics.anonymousTotal} looks com anonimização ativa.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 lg:col-span-3">
          <div className="flex items-center justify-between text-sm text-slate-700">
            <h2 className="text-lg font-semibold text-slate-900">
              Clientes mais ativos
            </h2>
            <Link
              href="/clientes"
              className="inline-flex items-center gap-1 text-xs text-indigo-600 transition hover:text-indigo-700"
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




