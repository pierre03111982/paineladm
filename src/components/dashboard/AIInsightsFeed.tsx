"use client";

import { useState, useEffect } from "react";
import { 
  AlertCircle, 
  TrendingUp, 
  Lightbulb, 
  ArrowRight,
  X,
  CheckCircle2,
  Sparkles,
  Loader2
} from "lucide-react";
import { InsightDoc } from "@/types/insights";
import Link from "next/link";

type AIInsightsFeedProps = {
  lojistaId: string;
};

/**
 * Componente de Feed de Insights da IA (Cérebro da Loja)
 * Exibe insights proativos gerados pela IA no topo do Dashboard
 */
export function AIInsightsFeed({ lojistaId }: AIInsightsFeedProps) {
  const [insights, setInsights] = useState<InsightDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInsights();
  }, [lojistaId]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/ai/insights?lojistaId=${lojistaId}`);
      
      if (!response.ok) {
        throw new Error("Falha ao carregar insights");
      }
      
      const data = await response.json();
      setInsights(data.insights || []);
    } catch (err) {
      console.error("[AIInsightsFeed] Erro:", err);
      setError("Não foi possível carregar insights no momento");
      
      // Mock data para teste visual
      setInsights([
        {
          id: "mock-1",
          lojistaId,
          type: "opportunity",
          title: "Cliente interessado em vestidos",
          message: "Maria Silva visualizou 5 vestidos nas últimas 2 horas. Envie uma oferta personalizada!",
          priority: "high",
          relatedEntity: {
            type: "client",
            id: "client-123",
            name: "Maria Silva",
          },
          actionLabel: "Enviar WhatsApp",
          actionLink: "/clientes/client-123",
          isRead: false,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          id: "mock-2",
          lojistaId,
          type: "risk",
          title: "Produto com alta rejeição",
          message: "Vestido Floral tem 35% de taxa de rejeição. Considere ajustar a foto ou descrição.",
          priority: "medium",
          relatedEntity: {
            type: "product",
            id: "prod-456",
            name: "Vestido Floral",
          },
          actionLabel: "Ver Produto",
          actionLink: "/produtos/prod-456",
          isRead: false,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (insightId: string) => {
    try {
      const response = await fetch(`/api/ai/insights/${insightId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lojistaId, isRead: true }),
      });

      if (response.ok) {
        setInsights((prev) =>
          prev.map((insight) =>
            insight.id === insightId ? { ...insight, isRead: true } : insight
          )
        );
      }
    } catch (err) {
      console.error("[AIInsightsFeed] Erro ao marcar como lido:", err);
    }
  };

  const handleDismiss = (insightId: string) => {
    handleMarkAsRead(insightId);
  };

  const getTypeIcon = (type: InsightDoc["type"]) => {
    switch (type) {
      case "opportunity":
        return <TrendingUp className="h-5 w-5" />;
      case "risk":
        return <AlertCircle className="h-5 w-5" />;
      case "trend":
        return <TrendingUp className="h-5 w-5" />;
      case "action":
        return <Lightbulb className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: InsightDoc["priority"]) => {
    switch (priority) {
      case "high":
        return {
          bg: "bg-red-50 dark:bg-red-900/20",
          border: "border-red-200 dark:border-red-800/50",
          icon: "text-red-600 dark:text-red-400",
          dot: "bg-red-500",
        };
      case "medium":
        return {
          bg: "bg-yellow-50 dark:bg-yellow-900/20",
          border: "border-yellow-200 dark:border-yellow-800/50",
          icon: "text-yellow-600 dark:text-yellow-400",
          dot: "bg-yellow-500",
        };
      case "low":
        return {
          bg: "bg-blue-50 dark:bg-blue-900/20",
          border: "border-blue-200 dark:border-blue-800/50",
          icon: "text-blue-600 dark:text-blue-400",
          dot: "bg-blue-500",
        };
    }
  };

  // Filtrar apenas insights não lidos
  const unreadInsights = insights.filter((insight) => !insight.isRead);

  if (loading) {
    return (
      <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 text-indigo-600 dark:text-purple-400 animate-spin" />
          <span className="ml-2 text-sm font-medium text-slate-700 dark:text-gray-400">
            Carregando insights...
          </span>
        </div>
      </div>
    );
  }

  if (error && unreadInsights.length === 0) {
    return (
      <div className="mb-6 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 p-4">
        <p className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      </div>
    );
  }

  if (unreadInsights.length === 0) {
    return null; // Não exibir se não houver insights
  }

  return (
    <div className="mb-6 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600 dark:text-purple-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Cérebro da Loja
          </h2>
          {unreadInsights.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 dark:bg-purple-900/30 text-indigo-700 dark:text-purple-300">
              {unreadInsights.length}
            </span>
          )}
        </div>
      </div>

      {/* Insights Feed - Carrossel de Cards */}
      <div className="space-y-3">
        {unreadInsights.map((insight) => {
          const colors = getPriorityColor(insight.priority);
          const Icon = getTypeIcon(insight.type);

          return (
            <div
              key={insight.id}
              className={`relative rounded-xl border-2 ${colors.border} ${colors.bg} p-4 shadow-sm transition-all hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                {/* Ícone de Tipo */}
                <div className={`flex-shrink-0 ${colors.icon}`}>
                  {Icon}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {insight.title}
                    </h3>
                    {/* Indicador de Prioridade */}
                    <div
                      className={`h-2 w-2 rounded-full flex-shrink-0 mt-1.5 ${colors.dot}`}
                      title={`Prioridade: ${insight.priority}`}
                    />
                  </div>

                  <p className="text-sm text-slate-700 dark:text-gray-300 mb-3">
                    {insight.message}
                  </p>

                  {/* Botão de Ação */}
                  {insight.actionLabel && insight.actionLink && (
                    <div className="flex items-center gap-2">
                      {insight.actionLink.startsWith("http") ? (
                        <a
                          href={insight.actionLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 dark:bg-purple-600 text-white hover:bg-indigo-700 dark:hover:bg-purple-700 transition-colors"
                        >
                          {insight.actionLabel}
                          <ArrowRight className="h-3 w-3" />
                        </a>
                      ) : (
                        <Link
                          href={insight.actionLink}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 dark:bg-purple-600 text-white hover:bg-indigo-700 dark:hover:bg-purple-700 transition-colors"
                        >
                          {insight.actionLabel}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                {/* Botão de Fechar */}
                <button
                  onClick={() => handleDismiss(insight.id)}
                  className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Marcar como lido"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

