"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { AIIcon } from "@/components/ui/AIIcon";

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
    if (!lojistaId) {
      setLoading(false);
      return;
    }

    const fetchInsights = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("[AIAssistantWidget] 🔍 Buscando insights para lojistaId:", lojistaId);
        
        const response = await fetch(`/api/ai/insights?lojistaId=${lojistaId}`);
        
        console.log("[AIAssistantWidget] 📡 Resposta da API:", {
          status: response.status,
          ok: response.ok,
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Falha ao carregar insights");
        }
        
        const data = await response.json();
        console.log("[AIAssistantWidget] ✅ Dados recebidos:", {
          success: data.success,
          count: data.insights?.length || 0,
          insights: data.insights,
        });
        
        // Converter formato da API para o formato esperado pelo widget
        const formattedInsights: Insight[] = (data.insights || []).map((insight: any) => ({
          id: insight.id || `insight-${Date.now()}-${Math.random()}`,
          text: insight.message || insight.title || "Insight sem descrição",
          priority: insight.priority || "medium",
        }));
        
        console.log("[AIAssistantWidget] 📊 Insights formatados:", formattedInsights);
        setInsights(formattedInsights);
      } catch (err: any) {
        console.error("[AIAssistantWidget] ❌ Erro:", err);
        setError("Não foi possível carregar insights no momento");
        setInsights([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [lojistaId]);


  return (
    <AnimatedCard className="ai-assistance-card relative overflow-hidden">
      {/* Inner Content */}
      <div className="relative p-6 h-full">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-white p-2 shadow-lg w-14 h-14 flex items-center justify-center">
            <AIIcon className="h-10 w-10" pulse={true} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-heading">
              Assistência IA
            </h3>
            <p className="text-xs font-medium text-slate-600">
              Insights estratégicos
            </p>
          </div>
          </div>

          {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 text-[#4169E1] animate-spin" />
            <span className="ml-2 text-sm font-medium text-slate-700">
              Analisando dados...
            </span>
          </div>
        ) : error && insights.length === 0 ? (
          <div className="text-sm font-medium text-red-700 py-4 bg-red-50 rounded-lg px-4 border-2 border-red-300">
            {error}
          </div>
        ) : insights.length === 0 ? (
          <div className="text-sm font-medium text-slate-600 py-4 bg-slate-50 rounded-lg px-4 border-2 border-slate-200">
            Nenhum insight disponível no momento. Gere uma análise para receber recomendações.
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <AnimatedCard
                key={insight.id}
                className="p-4"
                style={{ 
                  animationDelay: `${index * 100}ms`
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                    insight.priority === "high" 
                      ? "bg-[#4169E1]"
                      : insight.priority === "medium"
                      ? "bg-[#5B7FE8]"
                      : "bg-slate-400"
                  }`} />
                  <p className="text-sm leading-relaxed font-medium text-slate-800">
                    {insight.text}
                  </p>
                </div>
              </AnimatedCard>
            ))}
          </div>
          )}
        </div>
      </div>
    </AnimatedCard>
  );
}

