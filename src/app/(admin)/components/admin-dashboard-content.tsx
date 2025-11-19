"use client";

import {
  DollarSign,
  TrendingUp,
  Users,
  Package,
  AlertCircle,
  ArrowUpRight,
  Coins,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import type { AdminDashboardData } from "@/lib/admin/dashboard-data";
import Link from "next/link";

type AdminDashboardContentProps = {
  data: AdminDashboardData;
};

const COLORS = ["#8b5cf6", "#ec4899", "#06b6d4", "#10b981", "#f59e0b"];

export function AdminDashboardContent({ data }: AdminDashboardContentProps) {
  const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);

  const formatUSD = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);

  const planData = [
    { name: "Pro", value: data.lojistasByPlan.pro, color: COLORS[0] },
    { name: "Lite", value: data.lojistasByPlan.lite, color: COLORS[1] },
    { name: "Free", value: data.lojistasByPlan.free, color: COLORS[2] },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Administrativo</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Visão geral de custos, receita e lojistas da plataforma
          </p>
        </div>
      </div>

      {/* KPIs de Custo */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-purple-400/40 bg-purple-500/10 p-6">
          <div className="flex items-center justify-between text-xs text-purple-200">
            <span>Total de Custos de API</span>
            <Coins className="h-4 w-4" />
          </div>
          <p className="mt-4 text-3xl font-semibold text-white">
            {formatUSD(data.totalAPICost)}
          </p>
          <div className="mt-4 space-y-2 text-xs text-purple-200/80">
            <p>Try-On: {formatUSD(data.totalVTONCost)}</p>
            <p>Imagen: {formatUSD(data.totalImagenCost)}</p>
          </div>
          <Link
            href="/admin/custos"
            className="mt-4 inline-flex items-center gap-2 text-xs text-purple-300 hover:text-purple-200"
          >
            Ver detalhes completos
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-6">
          <div className="flex items-center justify-between text-xs text-emerald-200">
            <span>Receita Mensal (MRR)</span>
            <DollarSign className="h-4 w-4" />
          </div>
          <p className="mt-4 text-3xl font-semibold text-white">
            {formatBRL(data.mrr)}
          </p>
          <p className="mt-2 text-xs text-emerald-200/80">
            {data.totalLojistas} lojistas ativos
          </p>
        </div>

        <div className="rounded-2xl border border-blue-400/40 bg-blue-500/10 p-6">
          <div className="flex items-center justify-between text-xs text-blue-200">
            <span>Total de Lojistas</span>
            <Users className="h-4 w-4" />
          </div>
          <p className="mt-4 text-3xl font-semibold text-white">
            {data.totalLojistas}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-blue-200/80">
            <div>
              <p className="font-semibold">{data.lojistasByPlan.pro}</p>
              <p className="text-[10px]">Pro</p>
            </div>
            <div>
              <p className="font-semibold">{data.lojistasByPlan.lite}</p>
              <p className="text-[10px]">Lite</p>
            </div>
            <div>
              <p className="font-semibold">{data.lojistasByPlan.free}</p>
              <p className="text-[10px]">Free</p>
            </div>
          </div>
        </div>
      </section>

      {/* Gráficos */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Gráfico de Custos */}
        <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/70 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Tendência de Custos (7 dias)
          </h2>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={data.costTrend}>
                <CartesianGrid stroke="rgba(139,92,246,0.1)" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#a78bfa"
                  tickLine={false}
                  axisLine={{ stroke: "rgba(139,92,246,0.4)" }}
                />
                <YAxis
                  stroke="#a78bfa"
                  tickLine={false}
                  axisLine={{ stroke: "rgba(139,92,246,0.4)" }}
                  tickFormatter={(value) => formatUSD(value)}
                />
                <Tooltip
                  formatter={(value: number) => formatUSD(value)}
                  contentStyle={{
                    backgroundColor: "#09090b",
                    borderRadius: 12,
                    border: "1px solid rgba(139,92,246,0.4)",
                    color: "#f9fafb",
                  }}
                />
                <Line
                  type="monotone"
                  name="Custo Total"
                  dataKey="total"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#c4b5fd" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Receita */}
        <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/70 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Tendência de Receita (7 dias)
          </h2>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={data.revenueTrend}>
                <CartesianGrid stroke="rgba(34,197,94,0.1)" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#86efac"
                  tickLine={false}
                  axisLine={{ stroke: "rgba(34,197,94,0.4)" }}
                />
                <YAxis
                  stroke="#86efac"
                  tickLine={false}
                  axisLine={{ stroke: "rgba(34,197,94,0.4)" }}
                  tickFormatter={(value) => formatBRL(value)}
                />
                <Tooltip
                  formatter={(value: number) => formatBRL(value)}
                  contentStyle={{
                    backgroundColor: "#052e16",
                    borderRadius: 12,
                    border: "1px solid rgba(34,197,94,0.4)",
                    color: "#dcfce7",
                  }}
                />
                <Line
                  type="monotone"
                  name="Receita"
                  dataKey="total"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#86efac" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Widgets */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Top Lojistas por Uso */}
        <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/70 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Top Lojistas por Uso
            </h2>
            <Link
              href="/admin/lojistas"
              className="text-xs text-purple-200 hover:text-purple-100 transition"
            >
              Ver todos
              <ArrowUpRight className="h-3 w-3 inline ml-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {data.topLojistasByUsage.length > 0 ? (
              data.topLojistasByUsage.map((lojista, index) => (
                <div
                  key={lojista.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-xs font-semibold text-purple-200">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {lojista.nome}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {lojista.totalComposicoes} composições
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-purple-200">
                    {formatUSD(lojista.totalCost)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500 text-center py-4">
                Nenhum lojista encontrado
              </p>
            )}
          </div>
        </div>

        {/* Lojistas Pendentes */}
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Pendentes de Pagamento
            </h2>
            <AlertCircle className="h-5 w-5 text-amber-300" />
          </div>
          <div className="space-y-3">
            {data.lojistasPendentesPagamento.length > 0 ? (
              data.lojistasPendentesPagamento.map((lojista) => (
                <div
                  key={lojista.id}
                  className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3"
                >
                  <p className="text-sm font-medium text-white">
                    {lojista.nome}
                  </p>
                  <p className="text-xs text-amber-200/80 mt-1">
                    Status: {lojista.statusPagamento}
                  </p>
                  {lojista.dataVencimento && (
                    <p className="text-xs text-amber-200/60 mt-1">
                      Vencimento:{" "}
                      {new Intl.DateTimeFormat("pt-BR").format(
                        lojista.dataVencimento
                      )}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-amber-200/60 text-center py-4">
                Nenhum pendente
              </p>
            )}
          </div>
        </div>

        {/* Novos Cadastros */}
        <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/70 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Novos Cadastros (7 dias)
            </h2>
            <Activity className="h-5 w-5 text-blue-300" />
          </div>
          <div className="space-y-3">
            {data.novosCadastros.length > 0 ? (
              data.novosCadastros.map((lojista) => (
                <div
                  key={lojista.id}
                  className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3"
                >
                  <p className="text-sm font-medium text-white">
                    {lojista.nome}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {lojista.email}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {new Intl.DateTimeFormat("pt-BR").format(lojista.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500 text-center py-4">
                Nenhum novo cadastro
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ROI e Custo por Looks Gerados (por Loja) */}
      <section className="rounded-2xl border border-zinc-800/70 bg-zinc-900/70 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          ROI e Custo por Looks Gerados (por Loja)
        </h2>
        <div className="space-y-4">
          {data.topLojistasByUsage.length > 0 ? (
            data.topLojistasByUsage.map((lojista) => {
              // Calcular métricas simplificadas (na prática, buscaria dados reais)
              const totalLooks = lojista.totalComposicoes;
              const custoTotal = lojista.totalCost;
              const custoMedio = totalLooks > 0 ? custoTotal / totalLooks : 0;
              const receitaEstimada = 0; // TODO: Buscar receita real
              const roi = receitaEstimada > 0 && custoTotal > 0 
                ? ((receitaEstimada - custoTotal) / custoTotal) * 100 
                : -100;
              
              return (
                <div
                  key={lojista.id}
                  className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">{lojista.nome}</h3>
                    <span className="text-xs text-zinc-400">{totalLooks} Looks Gerados</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-zinc-400">Custo Total</p>
                      <p className="text-lg font-semibold text-white mt-1">
                        {formatUSD(custoTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Custo Médio por Look</p>
                      <p className="text-lg font-semibold text-emerald-400 mt-1">
                        {formatBRL(custoMedio * 5)} {/* Aproximação USD->BRL */}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Receita Estimada</p>
                      <p className="text-lg font-semibold text-white mt-1">
                        {formatBRL(receitaEstimada)}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-400">ROI</p>
                      <p className={`text-lg font-semibold mt-1 ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {roi.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-zinc-500 text-center py-4">
              Nenhum lojista encontrado
            </p>
          )}
        </div>
      </section>

      {/* Distribuição de Planos */}
      <section className="rounded-2xl border border-zinc-800/70 bg-zinc-900/70 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Distribuição de Planos
        </h2>
        <div className="h-64">
          <ResponsiveContainer>
            <PieChart>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#09090b",
                  borderRadius: 12,
                  border: "1px solid rgba(139,92,246,0.4)",
                  color: "#f9fafb",
                }}
              />
              <Pie
                data={planData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
              >
                {planData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex justify-center gap-6 text-sm">
          {planData.map((plan) => (
            <div key={plan.name} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: plan.color }}
              />
              <span className="text-zinc-300">
                {plan.name}: {plan.value}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


























































































