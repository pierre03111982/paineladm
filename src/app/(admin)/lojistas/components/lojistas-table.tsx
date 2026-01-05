"use client";

import { useState, useTransition } from "react";
import {
  Users,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Edit3,
  DollarSign,
  Package,
  AlertCircle,
  LogIn,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Lojista = {
  id: string;
  nome: string;
  email: string;
  planoAtual: string;
  statusPagamento: string;
  dataVencimento: Date | null;
  createdAt: Date;
  status: string;
  logoUrl: string | null;
  limiteImagens: number;
  imagensGeradasMes: number;
  // FASE 3: Auditoria de GPU para lojas teste
  totalGenerated?: number; // usageMetrics.totalGenerated
  clientType?: "standard" | "test_unlimited";
};

type LojistasTableProps = {
  initialLojistas: Lojista[];
};

export function LojistasTable({ initialLojistas }: LojistasTableProps) {
  const router = useRouter();
  const [lojistas, setLojistas] = useState(initialLojistas);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = async (
    lojistaId: string,
    action: "approve" | "reject" | "suspend" | "activate"
  ) => {
    setPendingId(lojistaId);
    try {
      const response = await fetch(`/api/admin/lojistas/${lojistaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Não foi possível atualizar o status.");
      }

      const updated = await response.json();
      setLojistas((prev) =>
        prev.map((l) => (l.id === lojistaId ? { ...l, ...updated } : l))
      );
      router.refresh();
    } catch (error) {
      console.error("[LojistasTable] Erro:", error);
      alert(error instanceof Error ? error.message : "Erro ao atualizar status");
    } finally {
      setPendingId(null);
    }
  };

  const handleImpersonate = async (lojistaId: string) => {
    setImpersonatingId(lojistaId);
    try {
      const response = await fetch(`/api/admin/impersonate/${lojistaId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Não foi possível acessar o painel do lojista.");
      }

      const data = await response.json();
      
      if (data.impersonationUrl) {
        // Redirecionar para a URL de impersonificação
        window.location.href = data.impersonationUrl;
      } else {
        throw new Error("URL de impersonificação não retornada");
      }
    } catch (error) {
      console.error("[LojistasTable] Erro ao impersonar:", error);
      alert(error instanceof Error ? error.message : "Erro ao acessar painel do lojista");
      setImpersonatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      ativo: "bg-emerald-500/20 text-emerald-200 border-emerald-400/50",
      pendente: "bg-amber-500/20 text-amber-200 border-amber-400/50",
      suspenso: "bg-rose-500/20 text-rose-200 border-rose-400/50",
      rejeitado: "bg-zinc-500/20 text-zinc-200 border-zinc-400/50",
    };
    return badges[status as keyof typeof badges] || badges.pendente;
  };

  const getPaymentBadge = (status: string) => {
    const badges = {
      pago: "bg-emerald-500/20 text-emerald-200",
      pendente: "bg-amber-500/20 text-amber-200",
      atrasado: "bg-rose-500/20 text-rose-200",
    };
    return badges[status as keyof typeof badges] || badges.pendente;
  };

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/40">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-800 text-sm">
          <thead className="bg-zinc-900/40 text-left uppercase text-xs tracking-[0.18em] text-zinc-500">
            <tr>
              <th className="px-6 py-3">Lojista</th>
              <th className="px-6 py-3">Plano</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Pagamento</th>
              <th className="px-6 py-3">Uso</th>
              <th className="px-6 py-3">GPU (Auditoria)</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/60">
            {lojistas.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-14 text-center text-sm text-zinc-500"
                >
                  <Users className="mx-auto mb-4 h-10 w-10 text-zinc-700" />
                  Nenhum lojista cadastrado
                </td>
              </tr>
            ) : (
              lojistas.map((lojista) => (
                <tr key={lojista.id} className="hover:bg-zinc-900/40">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {lojista.logoUrl ? (
                        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-purple-500/30 bg-purple-500/10">
                          <Image
                            src={lojista.logoUrl}
                            alt={lojista.nome}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-sm font-semibold text-purple-200">
                          {lojista.nome
                            .split(" ")
                            .filter(Boolean)
                            .map((word) => word[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase() || "L"}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-zinc-100">
                          {lojista.nome}
                        </p>
                        <p className="text-xs text-zinc-500">{lojista.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/50 bg-purple-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-purple-200">
                      <Package className="h-3 w-3" />
                      {lojista.planoAtual}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
                        getStatusBadge(lojista.status)
                      )}
                    >
                      {lojista.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                          getPaymentBadge(lojista.statusPagamento)
                        )}
                      >
                        {lojista.statusPagamento}
                      </span>
                      {lojista.dataVencimento && (
                        <p className="text-xs text-zinc-500">
                          {new Intl.DateTimeFormat("pt-BR").format(
                            lojista.dataVencimento
                          )}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-300">
                    <div className="space-y-1">
                      <p className="text-sm">
                        {lojista.imagensGeradasMes} / {lojista.limiteImagens}
                      </p>
                      <div className="h-1.5 w-full rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-purple-500"
                          style={{
                            width: `${Math.min(
                              (lojista.imagensGeradasMes / lojista.limiteImagens) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  {/* FASE 3: Coluna de Auditoria GPU */}
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {lojista.clientType === "test_unlimited" && lojista.totalGenerated !== undefined ? (
                        <>
                          <p className="text-sm font-semibold text-amber-300">
                            {lojista.totalGenerated.toLocaleString("pt-BR")}
                          </p>
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-200">
                            <AlertCircle className="h-3 w-3" />
                            Teste Ilimitado
                          </span>
                        </>
                      ) : (
                        <p className="text-sm text-zinc-500">—</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap justify-end gap-2 text-xs">
                      {lojista.status === "pendente" && (
                        <>
                          <button
                            onClick={() =>
                              handleStatusChange(lojista.id, "approve")
                            }
                            disabled={pendingId === lojista.id}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-emerald-200 transition hover:border-emerald-300/60",
                              pendingId === lojista.id &&
                                "cursor-not-allowed opacity-60"
                            )}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Aprovar
                          </button>
                          <button
                            onClick={() =>
                              handleStatusChange(lojista.id, "reject")
                            }
                            disabled={pendingId === lojista.id}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-rose-200 transition hover:border-rose-300/60",
                              pendingId === lojista.id &&
                                "cursor-not-allowed opacity-60"
                            )}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Rejeitar
                          </button>
                        </>
                      )}
                      {lojista.status === "ativo" && (
                        <button
                          onClick={() =>
                            handleStatusChange(lojista.id, "suspend")
                          }
                          disabled={pendingId === lojista.id}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-amber-200 transition hover:border-amber-300/60",
                            pendingId === lojista.id &&
                              "cursor-not-allowed opacity-60"
                          )}
                        >
                          <Pause className="h-3.5 w-3.5" />
                          Suspender
                        </button>
                      )}
                      {lojista.status === "suspenso" && (
                        <button
                          onClick={() =>
                            handleStatusChange(lojista.id, "activate")
                          }
                          disabled={pendingId === lojista.id}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-emerald-200 transition hover:border-emerald-300/60",
                            pendingId === lojista.id &&
                              "cursor-not-allowed opacity-60"
                          )}
                        >
                          <Play className="h-3.5 w-3.5" />
                          Ativar
                        </button>
                      )}
                      <button
                        onClick={() => handleImpersonate(lojista.id)}
                        disabled={impersonatingId === lojista.id}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-blue-200 transition hover:border-blue-300/60",
                          impersonatingId === lojista.id &&
                            "cursor-not-allowed opacity-60"
                        )}
                        title="Acessar painel do lojista como administrador"
                      >
                        <LogIn className="h-3.5 w-3.5" />
                        {impersonatingId === lojista.id ? "Acessando..." : "Acessar Painel"}
                      </button>
                      <a
                        href={`/dashboard?lojistaId=${lojista.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-purple-400/40 bg-purple-500/10 px-3 py-1 text-purple-200 transition hover:border-purple-300/60"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Ver Painel
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


























