"use client";

import { useState } from "react";
import { 
  AlertTriangle, 
  TrendingUp, 
  User,
  ArrowRight,
  Package,
  Gift,
  Eye
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { AIIcon } from "@/components/ui/AIIcon";

type AIInsightsFeedProps = {
  lojistaId: string;
};

type MockInsight = {
  id: string;
  type: "alert" | "opportunity" | "trend";
  icon: "alert" | "user" | "trending";
  title: string;
  description: string;
  actionLabel: string;
  actionLink: string;
  color: {
    bg: string;
    border: string;
    icon: string;
    button: string;
    buttonHover: string;
  };
};

/**
 * Feed de Insights Estratégicos da IA
 * Mostra 3 insights acionáveis para guiar o lojista
 */
export function AIInsightsFeed({ lojistaId }: AIInsightsFeedProps) {
  // Mock de insights inteligentes (substituir por API real depois)
  const mockInsights: MockInsight[] = [
    {
      id: "1",
      type: "alert",
      icon: "alert",
      title: "Estoque Crítico: Tênis Nike Air",
      description: "Apenas 2 unidades restantes e alta procura. Reponha agora para não perder vendas.",
      actionLabel: "Repor Estoque",
      actionLink: "/produtos?filter=low-stock",
      color: {
        bg: "bg-red-50",
        border: "border-red-200",
        icon: "text-red-600",
        button: "border border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400",
        buttonHover: "hover:bg-red-50"
      }
    },
    {
      id: "2",
      type: "opportunity",
      icon: "user",
      title: "Cliente em Potencial: Ana Silva",
      description: "Gerou 5 looks com a Blusa de Seda mas não comprou. Envie um cupom de 5% para fechar a venda.",
      actionLabel: "Enviar Cupom",
      actionLink: "/clientes",
      color: {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        icon: "text-emerald-600",
        button: "border border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400",
        buttonHover: "hover:bg-emerald-50"
      }
    },
    {
      id: "3",
      type: "trend",
      icon: "trending",
      title: "Em Alta: Peças Azul Royal",
      description: "Peças da cor Azul Royal estão sendo muito provadas hoje. Destaque-as na vitrine.",
      actionLabel: "Ver Produtos",
      actionLink: "/produtos?color=azul-royal",
      color: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        icon: "text-blue-600",
        button: "border border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400",
        buttonHover: "hover:bg-blue-50"
      }
    }
  ];

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case "alert":
        return <AlertTriangle className="h-5 w-5" />;
      case "user":
        return <User className="h-5 w-5" />;
      case "trending":
        return <TrendingUp className="h-5 w-5" />;
      default:
        return <AIIcon className="h-5 w-5" />;
    }
  };

  return (
    <AnimatedCard className="p-5 mb-4">
      {/* Header com Ícone de IA Pulsante */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-white shadow-lg p-2">
          <AIIcon className="h-10 w-10" pulse={true} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 font-heading">Assistência IA</h2>
          <p className="text-xs text-slate-600">Insights estratégicos</p>
        </div>
      </div>

      {/* Lista de Insights */}
      <div className="space-y-3">
        {mockInsights.map((insight, index) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              duration: 0.4, 
              delay: index * 0.1,
              ease: "easeOut"
            }}
            whileHover={{ 
              y: -2, 
              scale: 1.02,
              transition: { duration: 0.2 }
            }}
            className={`${insight.color.bg} border ${insight.color.border} rounded-lg p-3 transition-all hover:shadow-md`}
          >
            <div className="flex items-start gap-3">
              {/* Ícone à esquerda */}
              <div className={`flex-shrink-0 ${insight.color.icon} mt-0.5`}>
                {getIcon(insight.icon)}
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  {insight.title}
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {insight.description}
                </p>
              </div>

              {/* Botão de Ação à direita */}
              <div className="flex-shrink-0">
                <Link
                  href={insight.actionLink}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg ${insight.color.button} text-xs font-semibold transition-all bg-white`}
                >
                  {insight.actionLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Rodapé informativo */}
      <div className="mt-4 pt-3 border-t border-slate-200">
        <p className="text-xs text-slate-500 text-center">
          💡 A IA analisa sua loja 24/7 e sugere ações para maximizar vendas
        </p>
      </div>
    </AnimatedCard>
  );
}
