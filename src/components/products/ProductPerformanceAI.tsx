"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Lightbulb,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
  TrendingDown,
  CheckCircle,
} from "lucide-react";

type ProductPerformanceAIProps = {
  productId: string;
  lojistaId: string;
  productName?: string;
  complaintRate?: number;
  conversionRate?: number;
};

type PerformanceAnalysis = {
  hasIssue: boolean;
  issueType: "high_rejection" | "low_conversion" | "ai_distortion" | "fit_issue" | null;
  diagnosis: string;
  recommendation: string;
  priority: "high" | "medium" | "low";
};

/**
 * Componente de Diagnóstico de Performance do Produto (IA Consultiva)
 * FASE 4: Explica por que um produto não vende
 */
export function ProductPerformanceAI({
  productId,
  lojistaId,
  productName,
  complaintRate = 0,
  conversionRate = 0,
}: ProductPerformanceAIProps) {
  const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Só buscar análise se houver problema (complaintRate > 20% ou dislikes altos)
    if (complaintRate > 20 || conversionRate < 10) {
      fetchAnalysis();
    } else {
      setLoading(false);
    }
  }, [productId, lojistaId, complaintRate, conversionRate]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/ai/product-performance?productId=${productId}&lojistaId=${lojistaId}`
      );

      if (!response.ok) {
        throw new Error("Falha ao analisar performance do produto");
      }

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err) {
      console.error("[ProductPerformanceAI] Erro:", err);
      setError("Não foi possível analisar a performance do produto no momento");
    } finally {
      setLoading(false);
    }
  };

  // Se não houver problema, não exibir nada
  if (complaintRate <= 20 && conversionRate >= 10) {
    return null;
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
          <span className="ml-2 text-sm font-medium text-slate-700">
            Analisando performance...
          </span>
        </div>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-600">{error}</p>
        <button
          onClick={fetchAnalysis}
          className="mt-2 text-xs text-red-600 hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!analysis || !analysis.hasIssue) {
    return null;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          icon: "text-red-600",
        };
      case "medium":
        return {
          bg: "bg-amber-50",
          border: "border-amber-200",
          icon: "text-amber-600",
        };
      default:
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          icon: "text-blue-600",
        };
    }
  };

  const colors = getPriorityColor(analysis.priority);

  return (
    <div className={`rounded-lg border-2 ${colors.border} ${colors.bg} p-4 shadow-sm`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-5 w-5 ${colors.icon}`} />
          <h4 className="text-sm font-semibold text-gray-900">
            Diagnóstico da IA
          </h4>
        </div>
        <button
          onClick={fetchAnalysis}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          title="Atualizar análise"
        >
          <RefreshCw className="h-4 w-4 text-gray-400 hover:text-gray-600" />
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg border border-gray-200 bg-white p-2">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span className="text-xs font-medium text-gray-600">
              Taxa de Rejeição
            </span>
          </div>
          <p className="text-lg font-bold text-red-600">
            {complaintRate.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-2">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-600">
              Taxa de Conversão
            </span>
          </div>
          <p className="text-lg font-bold text-blue-600">
            {conversionRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Diagnóstico */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <h5 className="text-xs font-semibold text-gray-900">
            Análise
          </h5>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          {analysis.diagnosis}
        </p>
      </div>

      {/* Recomendação */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-start gap-2">
          <ImageIcon className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h5 className="text-xs font-semibold text-amber-900 mb-1">
              Recomendação
            </h5>
            <p className="text-sm text-amber-800 leading-relaxed">
              {analysis.recommendation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}



