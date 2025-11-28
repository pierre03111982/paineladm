"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";

type Insight = {
  id: string;
  text: string;
  priority: "high" | "medium" | "low";
};

type AIAssistantWidgetProps = {
  lojistaId?: string;
};

export function AIAssistantWidget({ lojistaId }: AIAssistantWidgetProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/ai/insights");
        if (!response.ok) {
          throw new Error("Falha ao carregar insights");
        }
        const data = await response.json();
        setInsights(data.insights || []);
      } catch (err) {
        console.error("[AIAssistantWidget] Erro:", err);
        setError("Não foi possível carregar insights no momento");
        // Fallback com insights padrão
        setInsights([
          {
            id: "1",
            text: "Analise seus produtos mais visualizados para otimizar o catálogo.",
            priority: "medium",
          },
          {
            id: "2",
            text: "Clientes ativos nas últimas horas - envie ofertas personalizadas!",
            priority: "high",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [lojistaId]);

  const priorityColors = {
    high: "text-cyan-700 dark:text-cyan-300",
    medium: "text-indigo-700 dark:text-indigo-300",
    low: "text-gray-700 dark:text-gray-300",
  };

  return (
    <div className="neon-card relative overflow-hidden rounded-2xl">
      {/* Inner Content */}
      <div className="relative p-6 h-full">
        {/* Neon Glow Effect - Matching other cards */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-indigo-500/10 opacity-60 pointer-events-none rounded-2xl" />
        {/* Additional border glow */}
        <div className="absolute inset-0 rounded-2xl border-2 border-cyan-500/30 dark:border-purple-500/50 pointer-events-none" 
             style={{
               boxShadow: '0 0 20px rgba(6, 182, 212, 0.3), inset 0 0 20px rgba(139, 92, 246, 0.1)'
             }} />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/30 dark:bg-purple-500/30 blur-xl rounded-full animate-pulse" />
            <div className="relative z-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 p-2 shadow-lg shadow-cyan-500/50 dark:shadow-purple-500/50">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-main)] dark:text-white">
              Assistência IA
            </h3>
            <p className="text-xs font-medium text-[var(--text-secondary)] dark:text-gray-300">
              Insights estratégicos
            </p>
          </div>
          </div>

          {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 text-cyan-600 dark:text-purple-400 animate-spin" />
            <span className="ml-2 text-sm font-medium text-[var(--text-secondary)] dark:text-gray-300">
              Analisando dados...
            </span>
          </div>
        ) : error && insights.length === 0 ? (
          <div className="text-sm font-medium text-red-600 dark:text-red-400 py-4 bg-red-50/50 dark:bg-red-900/20 rounded-lg px-4 border border-red-200 dark:border-red-800/50">
            {error}
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={insight.id}
                className="flex items-start gap-3 p-4 rounded-xl neon-card border-2 border-cyan-200/50 dark:border-purple-500/30 bg-white/80 dark:bg-[#1B2559]/50 animate-in fade-in slide-in-from-bottom-2 shadow-sm hover:shadow-md transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`mt-1 h-2.5 w-2.5 rounded-full bg-current flex-shrink-0 ${priorityColors[insight.priority]}`} />
                <p className={`text-sm leading-relaxed font-medium ${priorityColors[insight.priority]} text-[var(--text-main)] dark:text-white`}>
                  {insight.text}
                </p>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

