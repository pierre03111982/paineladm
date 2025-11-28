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
    <div className="neon-card ai-credits-card p-6 border-indigo-500/60 dark:border-purple-500/60" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03)' }}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 dark:from-purple-500 dark:to-purple-600 p-2 shadow-lg shadow-indigo-500/50 dark:shadow-purple-500/50">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Créditos de IA</h3>
            <p className="text-sm font-medium text-slate-600 dark:text-gray-400">
              Gerencie os créditos para geração de imagens com IA
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadBalance}
          disabled={loadingBalance}
          className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 dark:from-purple-600 dark:to-purple-700 dark:hover:from-purple-700 dark:hover:to-purple-800 text-white border-none shadow-lg shadow-indigo-500/40 dark:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
        >
          <RefreshCw className={`h-4 w-4 mr-2 text-white ${loadingBalance ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="mb-6 rounded-lg p-4 border-2 border-indigo-500/60 dark:border-indigo-500/70 bg-white dark:credit-display-dark shadow-md neon-credit-card">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-800 dark:text-white">
            {loadingBalance ? "..." : credits?.toLocaleString("pt-BR") || "0"}
          </span>
          <span className="text-sm font-medium text-slate-600 dark:text-gray-300">créditos disponíveis</span>
        </div>
        {credits !== null && credits < 10 && (
          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-slate-800 dark:text-white">Saldo baixo! Adicione mais créditos para continuar gerando imagens.</span>
          </div>
        )}
      </div>

      {message && (
        <div className={`mb-4 flex items-center gap-2 rounded-lg border-2 p-3 ${
          message.type === "success"
            ? "border-emerald-500/60 dark:border-emerald-400/60 bg-white dark:bg-emerald-900/20"
            : "border-red-500/60 dark:border-red-400/60 bg-white dark:bg-red-900/20"
        }`} style={message.type === "success" 
          ? { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 0 20px rgba(16, 185, 129, 0.25)' }
          : { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 0 20px rgba(239, 68, 68, 0.25)' }
        }>
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          )}
          <span className={`text-sm font-medium ${
            message.type === "success"
              ? "text-emerald-700 dark:text-emerald-200"
              : "text-red-700 dark:text-red-200"
          }`}>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-slate-400 hover:text-slate-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-900 dark:text-white">
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
              className="flex-1 bg-white dark:bg-slate-800 border-2 border-indigo-300 dark:border-purple-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-400 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-purple-500 focus:border-indigo-500 dark:focus:border-purple-500 transition-all duration-200"
              disabled={addingCredits}
            />
            <Button
              onClick={handleAddCredits}
              disabled={addingCredits || !amountToAdd}
              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white border-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium px-6"
            >
              {addingCredits ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 text-white animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2 text-white" />
                  Adicionar
                </>
              )}
            </Button>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-600 dark:text-gray-400">
            Cada geração de imagem consome 1 crédito
          </p>
        </div>
      </div>
    </div>
  );
}

