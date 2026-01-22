"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Loader2,
  RefreshCw,
} from "lucide-react";

type ClientStyleProfileProps = {
  cliente: any;
  lojistaId: string;
};

type StyleAnalysis = {
  style: string;
  colorPattern?: string;
  description: string;
  salesTip?: string;
  interestScore: number;
  churnRisk: "low" | "medium" | "high";
  daysSinceLastAccess: number;
};

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
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      console.log("[ClientStyleProfile] ✅ Dados recebidos:", {
        success: data.success,
        hasAnalysis: !!data.analysis,
        style: data.analysis?.style,
        interestScore: data.analysis?.interestScore
      });

      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
      } else {
        throw new Error("Análise não disponível");
      }
    } catch (err: any) {
      console.error("[ClientStyleProfile] ❌ Erro:", err);
      setError(err.message || "Erro ao carregar análise");
    } finally {
      setLoading(false);
    }
  };

  // Calcular score de interesse localmente como fallback
  const calculateLocalInterestScore = () => {
    const totalComposicoes = cliente.composicoes?.length || 0;
    const totalLikes = cliente.actions?.filter((a: any) => a.type === "like").length || 0;
    const totalShares = cliente.composicoes?.reduce((sum: number, c: any) => sum + (c.shares || 0), 0) || 0;
    const totalDislikes = cliente.actions?.filter((a: any) => a.type === "dislike").length || 0;
    
    let score = (totalComposicoes * 1) + (totalLikes * 3) + (totalShares * 5) - (totalDislikes * 1);
    return Math.min(100, Math.max(0, score));
  };

  const interestScore = analysis?.interestScore ?? calculateLocalInterestScore();

  const getThermometerColor = (score: number) => {
    if (score <= 30) return "bg-blue-500";
    if (score <= 70) return "bg-amber-500";
    return "bg-rose-600";
  };

  const getThermometerText = (score: number) => {
    if (score <= 30) return "Ainda conhecendo a marca";
    if (score <= 70) return "Demonstra interesse regular";
    return "Alta intenção de compra - Contate agora!";
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
          <span className="ml-2 text-sm font-medium text-gray-700">
            Analisando perfil do cliente...
          </span>
        </div>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-red-600 mb-1">Erro ao carregar análise</p>
            <p className="text-xs text-red-600">{error}</p>
          </div>
          <button
            onClick={fetchAnalysis}
            className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-black">
            Dossiê do Cliente
          </h3>
        </div>
        <button
          onClick={fetchAnalysis}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Atualizar análise"
        >
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Estilo Identificado */}
      {analysis && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-semibold text-black">
              Estilo Identificado
            </h4>
          </div>
          
          {analysis.style && analysis.style !== "Em Análise" ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div>
                <p className="text-base font-bold text-black mb-1">
                  {analysis.style}
                </p>
                {analysis.colorPattern && (
                  <p className="text-sm text-black">
                    <span className="font-medium">Padrão de Cores:</span> {analysis.colorPattern}
                  </p>
                )}
              </div>
              
              {analysis.description && (
                <p className="text-sm text-black leading-relaxed">
                  {analysis.description}
                </p>
              )}
              
              {analysis.salesTip && (
                <div className="mt-3 pt-3 border-t border-amber-300">
                  <p className="text-xs font-semibold text-black mb-1">
                    💡 Dica de Venda:
                  </p>
                  <p className="text-sm text-black leading-relaxed">
                    {analysis.salesTip}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-bold text-black mb-2">
                Em Análise
              </p>
              <p className="text-sm text-black leading-relaxed">
                {analysis?.description || "Ainda coletando dados do comportamento do cliente para gerar insights personalizados."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Termômetro de Interesse */}
      <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <h4 className="text-sm font-semibold text-black">
              Termômetro de Interesse
            </h4>
          </div>
          <span className="text-lg font-bold text-black">
            {interestScore}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getThermometerColor(interestScore)}`}
            style={{ width: `${interestScore}%` }}
          />
        </div>
        
        <p className="text-xs font-medium text-black">
          {getThermometerText(interestScore)}
        </p>
        <p className="text-xs text-black mt-1">
          Baseado na frequência de interações e engajamento
        </p>
      </div>

      {/* Risco de Churn */}
      {analysis && analysis.daysSinceLastAccess > 7 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-semibold text-black">
              Risco de Churn
            </h4>
          </div>
          <div
            className={`rounded-lg border p-3 ${
              analysis.daysSinceLastAccess > 30
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <p className="text-sm text-black">
              {analysis.daysSinceLastAccess > 30
                ? "⚠️ Alto risco: Cliente sem acesso há mais de 30 dias"
                : `⚠️ Atenção: Cliente sem acesso há ${analysis.daysSinceLastAccess} dias`}
            </p>
          </div>
        </div>
      )}

      {/* Mensagem quando não há análise */}
      {!analysis && !loading && !error && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-black">
            Nenhuma análise disponível no momento.
          </p>
        </div>
      )}
    </div>
  );
}
