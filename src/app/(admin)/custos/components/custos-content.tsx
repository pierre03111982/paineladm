"use client";

import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Filter, Download, RefreshCw } from "lucide-react";
import type { AIProvider } from "@/lib/ai-services/types";

interface LojistaCost {
  lojistaId: string;
  lojistaNome: string;
  totalCost: number;
  totalCostBRL: number;
  totalRequests: number;
  byProvider: Record<AIProvider, { requests: number; cost: number; costBRL: number }>;
  byOperation: Record<string, { requests: number; cost: number; costBRL: number }>;
}

interface CostSummary {
  totalCost: number;
  totalCostBRL: number;
  totalRequests: number;
  totalLojistas: number;
  byProvider: Record<AIProvider, { requests: number; cost: number; costBRL: number }>;
  byOperation: Record<string, { requests: number; cost: number; costBRL: number }>;
}

const PROVIDER_LABELS: Record<AIProvider, string> = {
  "vertex-tryon": "Try-On (Vertex AI)",
  imagen: "Imagen 3.0",
  "nano-banana": "Nano Banana",
  "stability-ai": "Stability AI",
  "gemini-flash-image": "Gemini Flash Image 2.5 (Vertex AI)",
};

// Apenas os providers que devem ser exibidos no detalhamento
const ALLOWED_PROVIDERS: AIProvider[] = ["vertex-tryon", "gemini-flash-image"];

export function CustosContent() {
  const [loading, setLoading] = useState(true);
  const [lojistas, setLojistas] = useState<LojistaCost[]>([]);
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [selectedLojista, setSelectedLojista] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchCosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedLojista) params.append("lojistaId", selectedLojista);
      if (selectedProvider) params.append("provider", selectedProvider);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/admin/custos?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        console.log("[CustosContent] Dados recebidos:", {
          lojistas: data.data.lojistas.length,
          summary: data.data.summary,
          providers: Object.keys(data.data.summary?.byProvider || {}),
        });
        setLojistas(data.data.lojistas);
        setSummary(data.data.summary);
      } else {
        console.error("[CustosContent] Erro na resposta:", data.error);
      }
    } catch (error) {
      console.error("Erro ao buscar custos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCosts();
  }, []);

  const formatCurrency = (value: number, currency: "USD" | "BRL" = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("pt-BR").format(value);
  };

  const exportToCSV = () => {
    const headers = [
      "Lojista",
      "Custo Total (USD)",
      "Custo Total (BRL)",
      "Total de Requisições",
      "Try-On (Vertex AI) - USD",
      "Try-On (Vertex AI) - BRL",
      "Try-On (Vertex AI) - Requisições",
      "Gemini Flash Image 2.5 (Vertex AI) - USD",
      "Gemini Flash Image 2.5 (Vertex AI) - BRL",
      "Gemini Flash Image 2.5 (Vertex AI) - Requisições",
    ];

    const rows = lojistas.map((lojista) => [
      lojista.lojistaNome,
      lojista.totalCost.toFixed(4),
      lojista.totalCostBRL.toFixed(2),
      lojista.totalRequests.toString(),
      lojista.byProvider["vertex-tryon"].cost.toFixed(4),
      lojista.byProvider["vertex-tryon"].costBRL.toFixed(2),
      lojista.byProvider["vertex-tryon"].requests.toString(),
      lojista.byProvider["gemini-flash-image"].cost.toFixed(4),
      lojista.byProvider["gemini-flash-image"].costBRL.toFixed(2),
      lojista.byProvider["gemini-flash-image"].requests.toString(),
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `custos-ia-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Custos por Lojista</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Controle detalhado de custos de IA por lojista e tipo de serviço
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-700"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
          <button
            onClick={fetchCosts}
            className="flex items-center gap-2 rounded-lg border border-purple-500/50 bg-purple-500/10 px-4 py-2 text-sm text-purple-200 transition hover:bg-purple-500/20"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Resumo Geral */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-500/20 p-3">
                <DollarSign className="h-5 w-5 text-purple-300" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Custo Total (USD)</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(summary.totalCost, "USD")}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/20 p-3">
                <DollarSign className="h-5 w-5 text-blue-300" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Custo Total (BRL)</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(summary.totalCostBRL, "BRL")}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-green-500/20 p-3">
                <TrendingUp className="h-5 w-5 text-green-300" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Total de Requisições</p>
                <p className="text-xl font-bold text-white">
                  {formatNumber(summary.totalRequests)}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-yellow-500/20 p-3">
                <TrendingUp className="h-5 w-5 text-yellow-300" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Total de Lojistas</p>
                <p className="text-xl font-bold text-white">
                  {formatNumber(summary.totalLojistas)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-400" />
          <h2 className="text-lg font-semibold text-white">Filtros</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-xs text-zinc-400">Lojista</label>
            <input
              type="text"
              value={selectedLojista}
              onChange={(e) => setSelectedLojista(e.target.value)}
              placeholder="ID do lojista"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder-zinc-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs text-zinc-400">Tipo de IA</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white"
            >
              <option value="">Todos</option>
              {ALLOWED_PROVIDERS.map((key) => (
                <option key={key} value={key}>
                  {PROVIDER_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs text-zinc-400">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs text-zinc-400">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>
        <button
          onClick={fetchCosts}
          className="mt-4 w-full rounded-lg bg-purple-500/20 px-4 py-2 text-sm font-medium text-purple-200 transition hover:bg-purple-500/30"
        >
          Aplicar Filtros
        </button>
      </div>

      {/* Detalhamento por Tipo de IA */}
      {summary && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Detalhamento por Tipo de IA</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {ALLOWED_PROVIDERS.map((provider) => {
              const info = summary.byProvider[provider];
              if (!info) return null;
              return (
                <div
                  key={provider}
                  className="rounded-xl border border-zinc-700 bg-zinc-800/30 p-4"
                >
                  <h3 className="mb-2 text-sm font-medium text-zinc-300">
                    {PROVIDER_LABELS[provider]}
                  </h3>
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-400">
                      Custo: {formatCurrency(info.costBRL, "BRL")} ({formatCurrency(info.cost, "USD")})
                    </p>
                    <p className="text-xs text-zinc-400">
                      Requisições: {formatNumber(info.requests)}
                    </p>
                    <p className="text-xs text-zinc-400">
                      Média: {info.requests > 0 ? formatCurrency(info.costBRL / info.requests, "BRL") : "R$ 0,00"} por requisição
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabela de Lojistas */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Detalhamento por Lojista</h2>
        {loading ? (
          <div className="py-8 text-center text-zinc-400">Carregando...</div>
        ) : lojistas.length === 0 ? (
          <div className="py-8 text-center text-zinc-400">Nenhum custo encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                    Lojista
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-400">
                    Total (BRL)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-400">
                    Total (USD)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-400">
                    Requisições
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-400">
                    Try-On (Vertex AI)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-400">
                    Gemini Flash Image 2.5
                  </th>
                </tr>
              </thead>
              <tbody>
                {lojistas
                  .sort((a, b) => b.totalCostBRL - a.totalCostBRL)
                  .map((lojista) => (
                    <tr
                      key={lojista.lojistaId}
                      className="border-b border-zinc-800/50 transition hover:bg-zinc-800/30"
                    >
                      <td className="px-4 py-3 text-sm text-white">{lojista.lojistaNome}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-white">
                        {formatCurrency(lojista.totalCostBRL, "BRL")}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-zinc-400">
                        {formatCurrency(lojista.totalCost, "USD")}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-zinc-400">
                        {formatNumber(lojista.totalRequests)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-zinc-400">
                        {formatCurrency(lojista.byProvider["vertex-tryon"].costBRL, "BRL")} ({formatNumber(lojista.byProvider["vertex-tryon"].requests)})
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-zinc-400">
                        {formatCurrency(lojista.byProvider["gemini-flash-image"].costBRL, "BRL")} ({formatNumber(lojista.byProvider["gemini-flash-image"].requests)})
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

