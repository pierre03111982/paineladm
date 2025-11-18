"use client";

import { useState, useTransition } from "react";
import {
  Package,
  PlusCircle,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Plano = {
  id: string;
  nome: string;
  preco: number;
  limiteImagens: number;
  descricao: string;
  ativo: boolean;
};

type PlanosTableProps = {
  initialPlanos: Plano[];
};

export function PlanosTable({ initialPlanos }: PlanosTableProps) {
  const router = useRouter();
  const [planos, setPlanos] = useState(initialPlanos);
  const [modalState, setModalState] = useState<
    | { type: "create" }
    | { type: "edit"; plano: Plano }
    | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);

  const handleToggleActive = async (planoId: string) => {
    try {
      const response = await fetch(`/api/admin/planos/${planoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle" }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível atualizar o plano.");
      }

      const updated = await response.json();
      setPlanos((prev) =>
        prev.map((p) => (p.id === planoId ? { ...p, ...updated } : p))
      );
      router.refresh();
    } catch (error) {
      console.error("[PlanosTable] Erro:", error);
      alert(error instanceof Error ? error.message : "Erro ao atualizar plano");
    }
  };

  return (
    <>
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/40">
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Planos de Assinatura</h2>
            <p className="text-xs text-zinc-500">
              {planos.length} plano(s) cadastrado(s)
            </p>
          </div>
          <button
            onClick={() => setModalState({ type: "create" })}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-400"
          >
            <PlusCircle className="h-4 w-4" />
            Criar Plano
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-900/40 text-left uppercase text-xs tracking-[0.18em] text-zinc-500">
              <tr>
                <th className="px-6 py-3">Plano</th>
                <th className="px-6 py-3">Preço</th>
                <th className="px-6 py-3">Limite de Imagens</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60">
              {planos.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-14 text-center text-sm text-zinc-500"
                  >
                    <Package className="mx-auto mb-4 h-10 w-10 text-zinc-700" />
                    Nenhum plano cadastrado
                  </td>
                </tr>
              ) : (
                planos.map((plano) => (
                  <tr key={plano.id} className="hover:bg-zinc-900/40">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-zinc-100">{plano.nome}</p>
                        <p className="text-xs text-zinc-500">{plano.descricao}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-100">
                      <p className="text-lg font-semibold">
                        {formatBRL(plano.preco)}
                      </p>
                      <p className="text-xs text-zinc-500">/mês</p>
                    </td>
                    <td className="px-6 py-4 text-zinc-100">
                      <p className="font-semibold">{plano.limiteImagens.toLocaleString("pt-BR")}</p>
                      <p className="text-xs text-zinc-500">imagens/mês</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
                          plano.ativo
                            ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                            : "border-zinc-400/50 bg-zinc-500/10 text-zinc-400"
                        )}
                      >
                        {plano.ativo ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            Ativo
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            Inativo
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap justify-end gap-2 text-xs">
                        <button
                          onClick={() => handleToggleActive(plano.id)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg border px-3 py-1 transition",
                            plano.ativo
                              ? "border-amber-400/40 bg-amber-500/10 text-amber-200 hover:border-amber-300/60"
                              : "border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:border-emerald-300/60"
                          )}
                        >
                          {plano.ativo ? "Desativar" : "Ativar"}
                        </button>
                        <button
                          onClick={() => setModalState({ type: "edit", plano })}
                          className="inline-flex items-center gap-1 rounded-lg border border-purple-400/40 bg-purple-500/10 px-3 py-1 text-purple-200 transition hover:border-purple-300/60"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalState && (
        <PlanoDialog
          mode={modalState.type}
          plano={modalState.type === "edit" ? modalState.plano : null}
          onClose={() => setModalState(null)}
          onSaved={() => {
            setModalState(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

type PlanoDialogProps = {
  mode: "create" | "edit";
  plano: Plano | null;
  onClose: () => void;
  onSaved: () => void;
};

function PlanoDialog({ mode, plano, onClose, onSaved }: PlanoDialogProps) {
  const [form, setForm] = useState({
    nome: plano?.nome || "",
    preco: plano?.preco || 0,
    limiteImagens: plano?.limiteImagens || 0,
    descricao: plano?.descricao || "",
    ativo: plano?.ativo !== false,
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const url = mode === "create" 
          ? "/api/admin/planos"
          : `/api/admin/planos/${plano?.id}`;
        
        const method = mode === "create" ? "POST" : "PATCH";

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Não foi possível salvar o plano.");
        }

        onSaved();
      } catch (error) {
        setError(error instanceof Error ? error.message : "Erro ao salvar plano");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 py-10 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-xl border border-purple-500/30 bg-zinc-950/95 p-6 shadow-[0_30px_90px_-45px_rgba(168,85,247,0.65)]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-zinc-700/60 p-1 text-zinc-400 transition hover:border-zinc-500 hover:text-white"
        >
          ✕
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          <header className="space-y-2">
            <h2 className="text-lg font-semibold text-white">
              {mode === "create" ? "Criar Novo Plano" : `Editar Plano - ${plano?.nome}`}
            </h2>
            <p className="text-xs text-zinc-500">
              Defina o preço, limite de imagens e descrição do plano
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                Nome do Plano
              </span>
              <input
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full rounded-lg border border-zinc-700/60 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-purple-400 focus:outline-none"
                placeholder="Ex: Pro"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                Preço Mensal (R$)
              </span>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-zinc-700/60 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-purple-400 focus:outline-none"
                placeholder="0.00"
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">
              Limite de Imagens por Mês
            </span>
            <input
              required
              type="number"
              min="0"
              value={form.limiteImagens}
              onChange={(e) => setForm({ ...form, limiteImagens: parseInt(e.target.value) || 0 })}
              className="w-full rounded-lg border border-zinc-700/60 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-purple-400 focus:outline-none"
              placeholder="0"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">
              Descrição
            </span>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-zinc-700/60 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-purple-400 focus:outline-none"
              placeholder="Descreva os benefícios do plano..."
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
              className="h-4 w-4 rounded border border-zinc-600 bg-zinc-900 accent-purple-500"
            />
            <span className="text-sm text-zinc-300">Plano ativo</span>
          </label>

          {error && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {error}
            </div>
          )}

          <footer className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-700/60 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
              disabled={isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={cn(
                "rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-400",
                isPending && "cursor-not-allowed opacity-60"
              )}
              disabled={isPending}
            >
              {isPending ? "Salvando..." : mode === "create" ? "Criar Plano" : "Salvar Alterações"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}



























































































