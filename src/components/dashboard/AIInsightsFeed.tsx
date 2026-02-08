"use client";

import { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  TrendingUp, 
  User,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Lightbulb
} from "lucide-react";
import { motion } from "framer-motion";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { AIIcon } from "@/components/ui/AIIcon";
import type { InsightDoc, InsightType } from "@/types/insights";

type AIInsightsFeedProps = {
  lojistaId: string;
};

type DisplayInsight = {
  id: string;
  type: "alert" | "opportunity" | "trend";
  icon: "alert" | "user" | "trending";
  title: string;
  description: string;
  color: {
    bg: string;
    border: string;
    icon: string;
  };
};

/**
 * FASE 4: Feed de Insights Estratégicos da IA
 * Busca insights reais ou mostra mensagem informativa
 */
export function AIInsightsFeed({ lojistaId }: AIInsightsFeedProps) {
  const [insights, setInsights] = useState<DisplayInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      if (!lojistaId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const response = await fetch(`/api/ai/insights?lojistaId=${encodeURIComponent(lojistaId)}&limit=3`);
        
        if (!response.ok) {
          throw new Error("Erro ao carregar insights");
        }

        const data = await response.json();
        let insightsData: InsightDoc[] = data.insights || [];

        console.log("[AIInsightsFeed] Insights recebidos do Firestore:", {
          count: insightsData.length,
          lojistaId,
        });

        // SEMPRE tentar gerar novos insights primeiro (forçar uso do novo motor)
        // Isso garante que sempre usaremos dados reais atualizados
        console.log("[AIInsightsFeed] 🔄 Forçando regeneração com novo motor de inteligência...");
        
        try {
          const generateResponse = await fetch('/api/ai/generate-insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lojistaId }),
          });
          
          if (generateResponse.ok) {
            const generateData = await generateResponse.json();
            console.log("[AIInsightsFeed] ✅ Novos insights gerados:", {
              insightsCreated: generateData.insightsCreated,
              insightsCount: generateData.insights?.length || 0,
            });
            
            if (generateData.insights && generateData.insights.length > 0) {
              // Usar insights diretamente da resposta (gerados com o novo motor)
              const displayInsights = generateData.insights.map((insight: any) => {
                return convertToDisplayInsight({
                  id: insight.id || `new-${Date.now()}-${Math.random()}`,
                  type: insight.type,
                  title: insight.title,
                  message: insight.message,
                  priority: insight.priority,
                  createdAt: new Date(),
                  expiresAt: new Date(Date.now() + (insight.expiresInDays || 7) * 24 * 60 * 60 * 1000),
                  isRead: false,
                } as InsightDoc);
              });
              
              console.log("[AIInsightsFeed] ✅ Exibindo novos insights gerados:", displayInsights.length);
              setInsights(displayInsights);
              setLoading(false);
              return;
            }
          } else {
            const errorData = await generateResponse.json().catch(() => ({}));
            console.error("[AIInsightsFeed] ❌ Erro ao gerar insights:", errorData);
            
            // Se falhar na geração, buscar insights do Firestore (fallback)
            // Mas filtrar apenas os mais recentes (últimas 2 horas)
            const now = new Date();
            const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
            const recentInsights = insightsData.filter(insight => {
              const createdAt = insight.createdAt instanceof Date ? insight.createdAt : new Date(insight.createdAt);
              return createdAt >= twoHoursAgo;
            });
            
            if (recentInsights.length > 0) {
              console.log("[AIInsightsFeed] ⚠️ Usando insights recentes do Firestore como fallback:", recentInsights.length);
              const displayInsights = recentInsights.map(insight => convertToDisplayInsight(insight));
              setInsights(displayInsights);
              setLoading(false);
              return;
            }
          }
        } catch (generateError) {
          console.error("[AIInsightsFeed] ❌ Erro ao gerar insights:", generateError);
          
          // Fallback: usar insights recentes se houver
          const now = new Date();
          const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
          const recentInsights = insightsData.filter(insight => {
            const createdAt = insight.createdAt instanceof Date ? insight.createdAt : new Date(insight.createdAt);
            return createdAt >= twoHoursAgo;
          });
          
          if (recentInsights.length > 0) {
            console.log("[AIInsightsFeed] ⚠️ Usando insights recentes como fallback:", recentInsights.length);
            const displayInsights = recentInsights.map(insight => convertToDisplayInsight(insight));
            setInsights(displayInsights);
            setLoading(false);
            return;
          }
        }
        
        // Se não houver insights gerados nem recentes, mostrar mensagem informativa
        console.log("[AIInsightsFeed] ⚠️ Nenhum insight disponível, exibindo mensagem informativa");
        setInsights([getInfoMessage()]);
      } catch (err: any) {
        console.error("[AIInsightsFeed] Erro ao carregar insights:", err);
        // Em caso de erro, mostrar mensagem informativa
        setInsights([getInfoMessage()]);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();

    // Recarregar só quando o usuário voltar à aba (abrir a janela), sem loop
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchInsights();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [lojistaId]);

  // Converter InsightDoc para DisplayInsight
  const convertToDisplayInsight = (insight: InsightDoc): DisplayInsight => {
    const typeMap: Record<InsightType, { icon: "alert" | "user" | "trending", color: any }> = {
      risk: {
        icon: "alert",
        color: {
          bg: "bg-amber-50/50",
          border: "border-amber-200/60",
          icon: "text-amber-600",
        }
      },
      opportunity: {
        icon: "user",
        color: {
          bg: "bg-emerald-50/50",
          border: "border-emerald-200/60",
          icon: "text-emerald-600",
        }
      },
      trend: {
        icon: "trending",
        color: {
          bg: "bg-blue-50/50",
          border: "border-blue-200/60",
          icon: "text-blue-600",
        }
      },
      action: {
        icon: "trending",
        color: {
          bg: "bg-indigo-50/50",
          border: "border-indigo-200/60",
          icon: "text-indigo-600",
        }
      }
    };

    const config = typeMap[insight.type] || typeMap.trend;

    // Para trend (top performers): usar ícone de estrela (dourado)
    // Para risk (low performers): usar ícone de alerta (cinza)
    let iconType: "alert" | "user" | "trending" = config.icon;
    if (insight.type === "trend" && insight.title.toLowerCase().includes("destaque") || insight.title.toLowerCase().includes("campeão") || insight.title.toLowerCase().includes("top")) {
      iconType = "trending"; // Será substituído por estrela no getIcon
    }

    return {
      id: insight.id,
      type: insight.type === "risk" ? "alert" : insight.type === "opportunity" ? "opportunity" : "trend",
      icon: iconType,
      title: insight.title,
      description: insight.message,
      color: config.color
    };
  };

  // Mensagem informativa quando não houver insights
  const getInfoMessage = (): DisplayInsight => {
    return {
      id: "info-1",
      type: "trend",
      icon: "trending",
      title: "Gerando insights personalizados...",
      description: "A IA está analisando seus dados para gerar recomendações personalizadas. Isso pode levar alguns minutos.",
      color: {
        bg: "bg-slate-50/50",
        border: "border-slate-200/60",
        icon: "text-slate-500",
      }
    };
  };

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case "alert":
        return <AlertTriangle className="h-5 w-5 icon-animate-once" />;
      case "user":
        return <User className="h-5 w-5 icon-animate-once" />;
      case "trending":
        return <TrendingUp className="h-5 w-5 icon-animate-once" />;
      default:
        return <Sparkles className="h-5 w-5 icon-animate-once" />;
    }
  };

  return (
    <AnimatedCard className="p-5 mb-4 bg-white border border-slate-200/80">
      {/* Header com Ícone de IA */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100/50">
          <AIIcon className="h-7 w-7" pulse={true} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 font-heading">Assistência IA</h2>
          <p className="text-xs text-slate-500">Insights estratégicos</p>
        </div>
      </div>

      {/* Estado de Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 text-slate-400 animate-spin mr-2" />
          <span className="text-sm text-slate-500">Carregando insights...</span>
        </div>
      )}

      {/* Lista de Insights */}
      {!loading && (
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.08,
                ease: "easeOut"
              }}
              whileHover={{ 
                y: -1,
                transition: { duration: 0.2 }
              }}
              className={`${insight.color.bg} ${insight.color.border} border rounded-lg p-4 transition-all hover:shadow-sm backdrop-blur-sm`}
            >
              <div className="flex items-start gap-3">
                {/* Ícone à esquerda */}
                <div className={`flex-shrink-0 ${insight.color.icon} mt-0.5`}>
                  {getIcon(insight.icon)}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 mb-1.5 leading-tight">
                    {insight.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {insight.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Rodapé informativo */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-400 icon-animate-once" />
          <p className="text-xs text-slate-500 text-center">
            A IA analisa sua loja 24/7 e sugere ações para maximizar vendas
          </p>
        </div>
      </div>
    </AnimatedCard>
  );
}
