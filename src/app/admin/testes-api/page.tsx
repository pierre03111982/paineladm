/**
 * Página de Testes de API - Painel Administrativo
 * Permite testar as integrações com Vertex AI e outras APIs
 */

"use client";

import { useState } from "react";
import { PageHeader } from "../../(lojista)/components/page-header";
import { requireAdmin } from "@/lib/auth/admin-auth";

export default function TestesAPIPage() {
  const [personImageUrl, setPersonImageUrl] = useState(
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=512&auto=format"
  );
  const [garmentImageUrl, setGarmentImageUrl] = useState(
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=512&auto=format"
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/lojista/composicoes/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personImageUrl,
          garmentImageUrl,
          productId: "test_product_001",
          lojistaId: process.env.NEXT_PUBLIC_LOJISTA_ID || "test_loja",
          scenePrompts: [
            "Uma praia paradisíaca ao pôr do sol",
            "Um café moderno e elegante",
          ],
          options: {
            quality: "high",
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao gerar composição");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const handleEstimateCost = async () => {
    try {
      const response = await fetch(
        "/api/lojista/composicoes/generate?sceneCount=2&quality=high"
      );
      const data = await response.json();
      alert(`Custo estimado: $${data.estimatedCost.toFixed(4)} USD`);
    } catch (err) {
      alert("Erro ao estimar custo");
    }
  };

  return (
    <div className="space-y-3">
      <PageHeader
        title="Testes de API"
        description="Teste as integrações com Vertex AI Try-On e outras APIs de IA"
      />

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">
          🧪 Teste Vertex AI Try-On
        </h2>

        <div className="space-y-4">
          {/* URL Imagem Pessoa */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              URL da Imagem da Pessoa
            </label>
            <input
              type="text"
              value={personImageUrl}
              onChange={(e) => setPersonImageUrl(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="https://..."
            />
            {personImageUrl && (
              <img
                src={personImageUrl}
                alt="Pessoa"
                className="mt-2 w-32 h-32 object-cover rounded-lg border border-zinc-700"
              />
            )}
          </div>

          {/* URL Imagem Produto */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              URL da Imagem do Produto (será usado temporariamente)
            </label>
            <input
              type="text"
              value={garmentImageUrl}
              onChange={(e) => setGarmentImageUrl(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="https://..."
            />
            {garmentImageUrl && (
              <img
                src={garmentImageUrl}
                alt="Produto"
                className="mt-2 w-32 h-32 object-cover rounded-lg border border-zinc-700"
              />
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <button
              onClick={handleTest}
              disabled={loading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? "Gerando..." : "🚀 Testar Try-On"}
            </button>

            <button
              onClick={handleEstimateCost}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              💰 Estimar Custo
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-blue-400 text-sm">
                ⏳ Processando... Isso pode levar de 2 a 10 segundos.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm font-medium">❌ Erro:</p>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-400 text-sm font-medium">
                  ✅ Composição gerada com sucesso!
                </p>
                <div className="mt-2 text-zinc-300 text-xs space-y-1">
                  <p>
                    <strong>ID:</strong> {result.compositionId}
                  </p>
                  <p>
                    <strong>Custo:</strong> ${result.totalCost?.toFixed(4)} USD
                  </p>
                  <p>
                    <strong>Tempo:</strong> {result.processingTime}ms
                  </p>
                  <p>
                    <strong>Modo:</strong>{" "}
                    {result.status?.steps?.tryon?.provider === "vertex-tryon"
                      ? "Produção (Vertex AI)"
                      : "Mock (Desenvolvimento)"}
                  </p>
                </div>
              </div>

              {/* Imagens */}
              <div>
                <h3 className="text-sm font-medium text-zinc-300 mb-2">
                  Resultado Try-On:
                </h3>
                {result.tryonImageUrl && (
                  <img
                    src={result.tryonImageUrl}
                    alt="Try-On Result"
                    className="w-full max-w-md rounded-lg border border-zinc-700"
                  />
                )}
              </div>

              {result.sceneImageUrls && result.sceneImageUrls.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-300 mb-2">
                    Cenários Gerados:
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {result.sceneImageUrls.map((url: string, i: number) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Scene ${i + 1}`}
                        className="w-full rounded-lg border border-zinc-700"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* JSON completo */}
              <details className="mt-3">
                <summary className="text-sm text-zinc-400 cursor-pointer hover:text-zinc-300">
                  Ver JSON completo
                </summary>
                <pre className="mt-2 p-3 bg-zinc-950 rounded-lg text-xs text-zinc-400 overflow-auto max-h-64">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* Informações */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-zinc-100 mb-2">
          ℹ️ Informações
        </h3>
        <ul className="text-xs text-zinc-400 space-y-1">
          <li>
            • <strong>Modo Mock:</strong> Se as credenciais não estiverem
            configuradas, usa imagens de exemplo
          </li>
          <li>
            • <strong>Modo Produção:</strong> Com credenciais configuradas, usa
            Vertex AI real ($0.04/requisição)
          </li>
          <li>
            • <strong>Tempo estimado:</strong> 2-10 segundos por composição
          </li>
          <li>
            • <strong>Configuração:</strong> Veja o arquivo
            CONFIGURAR_VERTEX_AI.md
          </li>
        </ul>
      </div>
    </div>
  );
}




