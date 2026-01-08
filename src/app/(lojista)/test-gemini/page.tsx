"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { Loader2 } from "lucide-react";

export default function TestGeminiPage() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testProductAnalyzer = async () => {
    setTesting(true);
    setError(null);
    setResults(null);

    try {
      const lojistaId = new URLSearchParams(window.location.search).get("lojistaId") || "";
      
      const response = await fetch(
        `/api/lojista/products/analyze?lojistaId=${lojistaId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400",
          }),
        }
      );

      const data = await response.json();
      
      if (response.ok && data.success) {
        setResults({
          test: "Análise de Produto (gemini-2.5-flash)",
          success: true,
          data: data.data,
          processingTime: data.processingTime,
        });
      } else {
        setError(data.error || "Erro desconhecido");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao testar");
    } finally {
      setTesting(false);
    }
  };

  const testChatAgent = async () => {
    setTesting(true);
    setError(null);
    setResults(null);

    try {
      const lojistaId = new URLSearchParams(window.location.search).get("lojistaId") || "";
      
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Olá! Você está funcionando corretamente? Responda apenas 'Sim, estou funcionando!'",
          lojistaId: lojistaId,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.text) {
        setResults({
          test: "Chat do Agente Ana (gemini-2.5-flash)",
          success: true,
          data: { text: data.text },
          groundingMetadata: data.groundingMetadata,
        });
      } else {
        setError(data.error || "Erro desconhecido");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao testar");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">🧪 Teste do Gemini 2.5 Flash</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Teste se a migração do modelo foi bem-sucedida
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <AnimatedCard className="p-6">
          <h2 className="text-xl font-semibold mb-4">Teste 1: Análise de Produto</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Testa o modelo <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">gemini-2.5-flash</code>
          </p>
          <Button
            onClick={testProductAnalyzer}
            disabled={testing}
            className="w-full sm:w-auto"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testando...
              </>
            ) : (
              "Testar Análise de Produto"
            )}
          </Button>
        </AnimatedCard>

        <AnimatedCard className="p-6">
          <h2 className="text-xl font-semibold mb-4">Teste 2: Chat do Agente Ana</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Testa o modelo <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">gemini-2.5-flash</code>
          </p>
          <Button
            onClick={testChatAgent}
            disabled={testing}
            className="w-full sm:w-auto"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testando...
              </>
            ) : (
              "Testar Chat"
            )}
          </Button>
        </AnimatedCard>
      </div>

      {error && (
        <AnimatedCard className="p-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
            ❌ Erro
          </h3>
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </AnimatedCard>
      )}

      {results && (
        <AnimatedCard className="p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-4">
            ✅ {results.test} - Sucesso!
          </h3>
          
          {results.processingTime && (
            <p className="text-sm text-green-700 dark:text-green-400 mb-4">
              Tempo de processamento: <strong>{results.processingTime}ms</strong>
            </p>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-xs text-gray-800 dark:text-gray-200">
              {JSON.stringify(results.data, null, 2)}
            </pre>
          </div>

          {results.groundingMetadata?.webSearchQueries?.length > 0 && (
            <div className="mt-4 text-sm text-green-700 dark:text-green-400">
              <strong>Google Search usado:</strong> {results.groundingMetadata.webSearchQueries.length} queries
            </div>
          )}
        </AnimatedCard>
      )}

      <AnimatedCard className="p-6 mt-6 bg-blue-50 dark:bg-blue-900/20">
        <h3 className="text-lg font-semibold mb-2">ℹ️ Informações</h3>
        <ul className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
          <li>• Certifique-se de estar logado como lojista</li>
          <li>• Adicione <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">?lojistaId=SEU_ID</code> na URL se necessário</li>
          <li>• Verifique os logs do servidor para mais detalhes</li>
          <li>• Consulte <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">docs/COMO_TESTAR_GEMINI_2.5_FLASH.md</code> para mais opções</li>
        </ul>
      </AnimatedCard>
    </div>
  );
}
