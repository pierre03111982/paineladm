"use client";

import { useState } from "react";
import {
  ActiveCustomer,
  CompositionItem,
  DashboardMock,
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
} from "recharts";

type DashboardContentProps = {
  data: DashboardMock;
};

function GradientComposition({ item }: { item: CompositionItem }) {
  const detailParams = new URLSearchParams();
  if (item.customerKey) {
    detailParams.set("cliente", item.customerKey);
  }
  if (item.productKey) {
    detailParams.set("produto", item.productKey);
  }
  const detailsHref = `/composicoes${detailParams.toString() ? `?${detailParams.toString()}` : ""}`;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/60 transition hover:-translate-y-1 hover:border-indigo-400/50 hover:shadow-[0_25px_60px_-20px_rgba(99,102,241,0.45)]">
      <div
        aria-hidden
        className="h-44 w-full"
        style={{
          backgroundImage: `linear-gradient(135deg, ${item.palette.from}, ${
            item.palette.via ?? item.palette.to
          }, ${item.palette.to})`,
        }}
      />
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {item.productName}
            </p>
            <p className="text-xs text-zinc-400">
              por {item.customerName} · {item.createdAt}
            </p>
            {/* Informações de tempo */}
            {item.processingTime !== null && item.processingTime !== undefined ? (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-zinc-500">
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-indigo-300">
                  {item.processingTime < 1000 
                    ? `${item.processingTime}ms`
                    : item.processingTime < 60000
                    ? `${(item.processingTime / 1000).toFixed(1)}s`
                    : `${(item.processingTime / 60000).toFixed(1)}min`}
                </span>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {item.isAnonymous ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-medium text-sky-200">
                <ShieldCheck className="h-3.5 w-3.5" /> Anônimo
              </span>
            ) : null}
            {item.liked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-200">
                <Heart className="h-3.5 w-3.5 fill-current" />
                Curtida
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">
                <Heart className="h-3.5 w-3.5" />
                Visualização
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <Link
            href={detailsHref}
            className="inline-flex items-center gap-2 text-indigo-200 transition hover:text-indigo-100"
          >
            Ver detalhes
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-2 text-emerald-200 transition hover:text-emerald-100"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {item.shareCount && item.shareCount > 0
              ? `${item.shareCount} envio(s)`
              : "Enviar via WhatsApp"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
          className="flex items-center justify-between rounded-xl border border-zinc-800/70 bg-zinc-900/60 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-semibold text-indigo-200">
              {customer.avatarInitials}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{customer.name}</p>
              <p className="text-xs text-zinc-400">
                {customer.totalCompositions} composições · {customer.lastActivity}
              </p>
            </div>
          </div>
          <Link
            href={`/clientes?focus=${encodeURIComponent(customer.id)}`}
            className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300 transition hover:bg-zinc-700"
          >
            Ver cliente
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ))}
    </div>
  );
}

export function DashboardContent({ data }: DashboardContentProps) {
  const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);


  return (
    <div className="space-y-12 pb-12">
      <header className="flex flex-col gap-8 rounded-3xl border border-zinc-800/80 bg-linear-to-br from-zinc-900/80 via-zinc-900/40 to-zinc-900/80 p-10 shadow-[0_25px_80px_-20px_rgba(67,56,202,0.45)] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20 text-2xl font-semibold text-indigo-200">
            {data.brand.logoUrl ? (
              <img
                src={data.brand.logoUrl}
                alt={`Logo da ${data.brand.name}`}
                className="h-full w-full rounded-2xl object-cover"
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
            <p className="inline-flex items-center gap-2 text-xs text-emerald-200">
              <TrendingUp className="h-4 w-4" /> {data.brand.lastSync}
            </p>
            <h1 className="text-3xl font-semibold text-white lg:text-4xl">
              {data.brand.name}
            </h1>
            <p className="text-sm text-zinc-400">{data.brand.tagline}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-sm text-zinc-300 lg:text-right">
          <p>
            Mostre o valor do seu catálogo com <span className="text-white">promoções personalizadas</span>.
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

      <section className="grid gap-6 lg:grid-cols-4">
        <div className="rounded-2xl border border-indigo-400/40 bg-indigo-500/10 p-6">
          <div className="flex items-center justify-between text-xs text-indigo-200">
            <span>Experimentações hoje</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="mt-4 text-3xl font-semibold text-white">
            {data.metrics.experimentToday}
          </p>
          <p className="mt-2 text-xs text-indigo-200/80">
            +18% vs. média da última semana
          </p>
          <div className="mt-6">
            <ExperimentsLineChart points={data.experimentsTrend} />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/70 p-6">
          <p className="text-xs text-zinc-400">Últimos 7 dias</p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {data.metrics.experimentWeek}
          </p>
          <p className="mt-4 text-xs text-zinc-500">
            Média de {Math.max(1, Math.round(data.metrics.experimentWeek / 7))} looks por dia.
          </p>
          <div className="mt-6 flex items-center gap-3 rounded-xl bg-zinc-800/60 px-4 py-3 text-xs text-zinc-300">
            <Star className="h-4 w-4 text-amber-300" />
            Campanhas personalizadas continuam alavancando resultados.
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-6">
          <p className="text-xs text-emerald-200">Curtidas acumuladas</p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {data.metrics.likedTotal}
          </p>
          <p className="mt-4 text-xs text-emerald-100/80">
            Clientes engajados convertem 3x mais em vendas.
          </p>
          <div className="mt-6 flex items-center gap-3 rounded-xl bg-emerald-500/15 px-4 py-3 text-xs text-emerald-100">
            <Heart className="h-4 w-4 fill-current" />
            Dê destaque ao que seus clientes mais amam.
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-sky-400/40 bg-sky-500/10 p-6">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-xs text-sky-200">
              <Share2 className="h-4 w-4" /> Compartilhamentos
            </p>
            <p className="text-2xl font-semibold text-white">
              {data.metrics.sharesTotal}
            </p>
            <p className="text-xs text-sky-200/80">
              Mensagens e posts impulsionam o alcance da loja.
            </p>
          </div>

          <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-200">
            <p className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Checkouts
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {data.metrics.checkoutTotal}
            </p>
            <p className="mt-2 text-xs text-amber-100/80">
              {data.metrics.anonymousTotal} looks protegidos com avatar seguro.
            </p>
          </div>


          <p className="text-xs text-sky-100/70">
            {data.metrics.lastActionLabel}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-7">
        <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/70 p-6 lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between text-sm text-zinc-300">
            <h2 className="text-lg font-semibold text-white">
              Produtos mais provados
            </h2>
            <Link
              href="/produtos"
              className="inline-flex items-center gap-1 text-xs text-indigo-200 transition hover:text-indigo-100"
            >
              Ver catálogo
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6">
            <ProductPieChart data={data.productBreakdown} />
          </div>
          <div className="mt-4 space-y-2 text-sm text-zinc-300">
            {data.productBreakdown.map((product) => (
              <div
                key={product.name}
                className="flex items-center justify-between rounded-xl bg-zinc-800/60 px-3 py-2"
              >
                <span className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: product.color }}
                    aria-hidden
                  />
                  {product.name}
                </span>
                <span className="text-xs text-zinc-400">
                  {product.value}% das experimentações
                </span>
              </div>
            ))}
          </div>
        </div>

      </section>

      <section className="grid gap-6 lg:grid-cols-7">
        <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/70 p-6 lg:col-span-4 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Conversões recentes
            </h2>
            <p className="text-xs text-zinc-400">
              Monitor de curtidas, compartilhamentos e checkouts.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4">
              <p className="flex items-center gap-2 text-xs text-emerald-200">
                <Heart className="h-4 w-4" /> Curtidas
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {data.metrics.likedTotal}
              </p>
              <p className="mt-1 text-xs text-emerald-100/80">
                Taxa de checkout:{" "}
                {data.metrics.conversionLikeRate.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-xl border border-sky-400/40 bg-sky-500/10 p-4">
              <p className="flex items-center gap-2 text-xs text-sky-200">
                <Share2 className="h-4 w-4" /> Compartilhamentos
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {data.metrics.sharesTotal}
              </p>
              <p className="mt-1 text-xs text-sky-100/80">
                Taxa de checkout:{" "}
                {data.metrics.conversionCheckoutRate.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4">
              <p className="flex items-center gap-2 text-xs text-amber-200">
                <ShoppingCart className="h-4 w-4" /> Checkouts
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {data.metrics.checkoutTotal}
              </p>
              <p className="mt-1 text-xs text-amber-100/80">
                {data.metrics.anonymousTotal} looks com anonimização ativa.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/70 p-6 lg:col-span-3">
          <div className="flex items-center justify-between text-sm text-zinc-300">
            <h2 className="text-lg font-semibold text-white">
              Clientes mais ativos
            </h2>
            <Link
              href="/clientes"
              className="inline-flex items-center gap-1 text-xs text-indigo-200 transition hover:text-indigo-100"
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

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Galeria de composições recentes
            </h2>
            <p className="text-sm text-zinc-400">
              Acompanhe os looks mais recentes criados pelos clientes e compartilhe em segundos.
            </p>
            <p className="text-xs text-zinc-500">
              {data.metrics.anonymousTotal} composições estão protegidas com anonimização ativa.
            </p>
          </div>
          <div className="flex gap-3 text-xs">
            <button
              type="button"
              className="rounded-full border border-zinc-700/70 bg-zinc-900 px-4 py-2 text-zinc-300 transition hover:border-indigo-400/50 hover:text-white"
            >
              Todos
            </button>
            <button
              type="button"
              className="rounded-full border border-zinc-700/70 bg-zinc-900 px-4 py-2 text-zinc-300 transition hover:border-emerald-400/60 hover:text-emerald-200"
            >
              Apenas curtidos
            </button>
            <button
              type="button"
              className="rounded-full border border-zinc-700/70 bg-zinc-900 px-4 py-2 text-zinc-300 transition hover:border-sky-400/60 hover:text-sky-200"
            >
              Exportar coleção
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data.compositions.map((item) => (
            <GradientComposition key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}




