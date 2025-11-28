"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { Sparkles, Plus, RefreshCw, AlertCircle, CheckCircle, XCircle, X } from "lucide-react";

type CreditsManagerProps = {
  lojistaId?: string;
};

export function CreditsManager({ lojistaId: lojistaIdFromProp }: CreditsManagerProps) {
  const searchParams = useSearchParams();
  const lojistaIdFromUrl = searchParams?.get("lojistaId") || searchParams?.get("lojistald");
  const lojistaId = lojistaIdFromUrl || lojistaIdFromProp;
  
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingCredits, setAddingCredits] = useState(false);
  const [amountToAdd, setAmountToAdd] = useState<string>("");
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadBalance = async () => {
    try {
      setLoadingBalance(true);
      const url = lojistaId
        ? `/api/lojista/add-credits?lojistaId=${encodeURIComponent(lojistaId)}`
        : `/api/lojista/add-credits`;
      
      console.log("[CreditsManager] Carregando saldo de:", url);
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Erro ${response.status} ao carregar saldo`;
        console.error("[CreditsManager] Erro da API:", errorMessage, response.status);
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log("[CreditsManager] Saldo carregado:", data);
      setCredits(data.credits || 0);
      setMessage(null); // Limpar mensagens de erro anteriores
    } catch (error: any) {
      console.error("[CreditsManager] Erro ao carregar saldo:", error);
      setMessage({ type: "error", text: error.message || "Erro ao carregar saldo de créditos" });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    loadBalance();
  }, [lojistaId]);

  const handleAddCredits = async () => {
    const amount = parseFloat(amountToAdd);
    
    if (!amount || amount <= 0 || isNaN(amount)) {
      setMessage({ type: "error", text: "Digite um valor válido" });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    try {
      setAddingCredits(true);
      const url = `/api/lojista/add-credits`;
      
      // Preparar body - só incluir lojistaId se existir
      const body: any = { amount };
      if (lojistaId) {
        body.lojistaId = lojistaId;
      }
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || "Erro ao adicionar créditos";
        console.error("[CreditsManager] Erro da API:", errorMessage, response.status);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setCredits(data.newCredits);
      setAmountToAdd("");
      setMessage({ type: "success", text: `${amount} crédito(s) adicionado(s) com sucesso!` });
      setTimeout(() => setMessage(null), 5000);
    } catch (error: any) {
      console.error("[CreditsManager] Erro ao adicionar créditos:", error);
      setMessage({ type: "error", text: error.message || "Erro ao adicionar créditos" });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setAddingCredits(false);
    }
  };

  return (
    <div className="neon-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-2 shadow-lg shadow-indigo-500/50">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-main)]">Créditos de IA</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Gerencie os créditos para geração de imagens com IA
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadBalance}
          disabled={loadingBalance}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-2 border-indigo-400/50 dark:border-purple-400/50 shadow-lg shadow-indigo-500/40 dark:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 font-semibold"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loadingBalance ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="mb-6 neon-card rounded-lg p-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-[var(--text-main)]">
            {loadingBalance ? "..." : credits?.toLocaleString("pt-BR") || "0"}
          </span>
          <span className="text-sm text-[var(--text-secondary)]">créditos disponíveis</span>
        </div>
        {credits !== null && credits < 10 && (
          <div className="mt-2 flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-[var(--text-main)]">Saldo baixo! Adicione mais créditos para continuar gerando imagens.</span>
          </div>
        )}
      </div>

      {message && (
        <div className={`mb-4 flex items-center gap-2 rounded-lg border p-3 neon-card ${
          message.type === "success"
            ? "border-emerald-500/50 dark:border-emerald-400/50 bg-emerald-50/50 dark:bg-emerald-900/20"
            : "border-red-500/50 dark:border-red-400/50 bg-red-50/50 dark:bg-red-900/20"
        }`}>
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          )}
          <span className={`text-sm ${
            message.type === "success"
              ? "text-emerald-800 dark:text-emerald-200"
              : "text-red-800 dark:text-red-200"
          }`}>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text-main)]">
            Adicionar Créditos
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              step="1"
              placeholder="Quantidade de créditos"
              value={amountToAdd}
              onChange={(e) => setAmountToAdd(e.target.value)}
              className="flex-1 bg-white dark:bg-[var(--bg-card)] border-gray-300 dark:border-purple-500/30 text-slate-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-purple-500 focus:border-transparent transition-all duration-300"
              disabled={addingCredits}
            />
            <Button
              onClick={handleAddCredits}
              disabled={addingCredits || !amountToAdd}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-2 border-indigo-400/50 dark:border-purple-400/50 shadow-lg shadow-indigo-500/40 dark:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 font-semibold px-6"
            >
              {addingCredits ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </>
              )}
            </Button>
          </div>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            Cada geração de imagem consome 1 crédito
          </p>
        </div>
      </div>
    </div>
  );
}

