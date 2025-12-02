"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Loader2,
  RefreshCw,
  Package,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

type ClientStyleProfileProps = {
  cliente: any;
  lojistaId: string;
};

type StyleAnalysis = {
  style: string; // Ex: "Romântico", "Urbano", "Casual"
  description: string; // Moodboard verbal
  interestScore: number; // 0-100
  churnRisk: "low" | "medium" | "high";
  daysSinceLastAccess: number;
  recommendedProduct?: {
    id: string;
    name: string;
    category: string;
    imageUrl?: string;
    link: string;
  };
};

/**
 * Componente de Análise de Estilo do Cliente (Dossiê do Cliente)
 * FASE 3: IA Consultiva - Analisa perfil comportamental do cliente
 */
export function ClientStyleProfile({ cliente, lojistaId }: ClientStyleProfileProps) {
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalysis();
  }, [cliente.id, lojistaId]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/ai/client-style-analysis?clienteId=${cliente.id}&lojistaId=${lojistaId}`
      );

      if (!response.ok) {
        throw new Error("Falha ao analisar perfil do cliente");
      }

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err) {
      console.error("[ClientStyleProfile] Erro:", err);
      setError("Não foi possível analisar o perfil do cliente no momento");
    } finally {
      setLoading(false);
    }
  };

  // Calcular dias sem acesso
  const getDaysSinceLastAccess = () => {
    if (!cliente.actions || cliente.actions.length === 0) {
      return null;
    }
    const lastAction = cliente.actions[0];
    const lastActionDate = lastAction.timestamp?.toDate?.() || new Date(lastAction.timestamp);
    const now = new Date();
    const diffMs = now.getTime() - lastActionDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  const daysSinceLastAccess = getDaysSinceLastAccess();

  // Calcular score de interesse baseado na frequência
  const calculateInterestScore = () => {
    if (!cliente.actions || cliente.actions.length === 0) {
      return 0;
    }

    const last30Days = cliente.actions.filter((action: any) => {
      const actionDate = action.timestamp?.toDate?.() || new Date(action.timestamp);
      const now = new Date();
      const diffMs = now.getTime() - actionDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays <= 30;
    }).length;

    const totalLikes = cliente.actions.filter((a: any) => a.type === "like").length;
    const totalComposicoes = cliente.composicoes?.length || 0;

    // Score baseado em:
    // - Ações nos últimos 30 dias (40%)
    // - Total de likes (30%)
    // - Total de composições (30%)
    const score = Math.min(
      100,
      (last30Days * 2) + (totalLikes * 3) + (totalComposicoes * 2)
    );

    return Math.round(score);
  };

  const interestScore = analysis?.interestScore ?? calculateInterestScore();

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-md">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 text-indigo-600 dark:text-purple-400 animate-spin" />
          <span className="ml-2 text-sm font-medium text-slate-700 dark:text-gray-400">
            Analisando perfil do cliente...
          </span>
        </div>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 p-4">
        <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchAnalysis}
          className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-md transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Dossiê do Cliente
          </h3>
        </div>
        <button
          onClick={fetchAnalysis}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Atualizar análise"
        >
          <RefreshCw className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
        </button>
      </div>

      {/* Moodboard Verbal */}
      {analysis && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Estilo Identificado
            </h4>
          </div>
          <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 p-4">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-2">
              {analysis.style}
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
              {analysis.description}
            </p>
          </div>
        </div>
      )}

      {/* Termômetro de Interesse */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Termômetro de Interesse
            </h4>
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {interestScore}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              interestScore >= 70
                ? "bg-emerald-500"
                : interestScore >= 40
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
            style={{ width: `${interestScore}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Baseado na frequência de interações e engajamento
        </p>
      </div>

      {/* Risco de Churn */}
      {daysSinceLastAccess !== null && daysSinceLastAccess > 7 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Risco de Churn
            </h4>
          </div>
          <div
            className={`rounded-lg border p-3 ${
              daysSinceLastAccess > 30
                ? "border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20"
                : "border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20"
            }`}
          >
            <p className="text-sm text-gray-900 dark:text-white">
              {daysSinceLastAccess > 30
                ? "⚠️ Alto risco: Cliente sem acesso há mais de 30 dias"
                : `⚠️ Atenção: Cliente sem acesso há ${daysSinceLastAccess} dias`}
            </p>
          </div>
        </div>
      )}

      {/* Recomendação de Ouro */}
      {analysis?.recommendedProduct && (
        <div className="rounded-lg border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Recomendação de Ouro
            </h4>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            Produto que combina com o estilo identificado:
          </p>
          <Link
            href={`/produtos/${analysis.recommendedProduct.id}`}
            className="flex items-center justify-between rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              {analysis.recommendedProduct.imageUrl && (
                <img
                  src={analysis.recommendedProduct.imageUrl}
                  alt={analysis.recommendedProduct.name}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              )}
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {analysis.recommendedProduct.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {analysis.recommendedProduct.category}
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </Link>
        </div>
      )}
    </div>
  );
}

