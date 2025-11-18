"use client";

import { useMemo, useState, useEffect } from "react";
import { Users, Search, Edit, Eye, Archive, ArchiveRestore, Trash2, Filter, X, Plus, Share2, Users2, Tag, History, RefreshCw } from "lucide-react";
import type { ClienteDoc } from "@/lib/firestore/types";
import { useSearchParams } from "next/navigation";

type ClientesTableProps = {
  initialClientes: ClienteDoc[];
};

export function ClientesTable({ initialClientes }: ClientesTableProps) {
  const searchParams = useSearchParams();
  const isAdminView = searchParams?.get("admin") === "true";
  // Tentar ler tanto lojistaId quanto lojistald (para compatibilidade com typos)
  const lojistaIdFromUrl = searchParams?.get("lojistaId") || searchParams?.get("lojistald");
  
  const [clientes, setClientes] = useState(initialClientes);
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingCliente, setEditingCliente] = useState<ClienteDoc | null>(null);
  const [viewingCliente, setViewingCliente] = useState<ClienteDoc | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [shareStats, setShareStats] = useState<Record<string, {
    totalShares: number;
    totalAccesses: number;
    totalSignups: number;
    totalReferrals: number;
  }>>({});
  const [viewingReferrals, setViewingReferrals] = useState<{
    cliente: ClienteDoc;
    referrals: any[];
  } | null>(null);

  // Recarregar clientes quando showArchived mudar
  useEffect(() => {
    const loadClientes = async () => {
      try {
        setLoading(true);
        const url = lojistaIdFromUrl 
          ? `/api/lojista/clientes?lojistaId=${lojistaIdFromUrl}&includeArchived=${showArchived}`
          : `/api/lojista/clientes?includeArchived=${showArchived}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Erro ao carregar clientes");
        const data = await response.json();
        setClientes(data.clientes || []);
        
        // Carregar estatísticas de compartilhamento
        const lojistaId = lojistaIdFromUrl || "";
        if (lojistaId && data.clientes) {
          const stats: Record<string, any> = {};
          for (const cliente of data.clientes) {
            try {
              const url = `/api/lojista/clientes/${cliente.id}/shares?lojistaId=${encodeURIComponent(lojistaId)}`;
              const statsResponse = await fetch(url);
              if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                stats[cliente.id] = statsData.stats;
              } else {
                stats[cliente.id] = { totalShares: 0, totalAccesses: 0, totalSignups: 0, totalReferrals: 0 };
              }
            } catch (err) {
              console.error(`[ClientesTable] Erro ao carregar stats de ${cliente.id}:`, err);
              stats[cliente.id] = { totalShares: 0, totalAccesses: 0, totalSignups: 0, totalReferrals: 0 };
            }
          }
          setShareStats(stats);
        }
      } catch (err) {
        console.error("[ClientesTable] Erro ao carregar:", err);
      } finally {
        setLoading(false);
      }
    };

    loadClientes();
  }, [showArchived, lojistaIdFromUrl]);
  
  const handleViewReferrals = async (cliente: ClienteDoc) => {
    try {
      setLoading(true);
      const lojistaId = lojistaIdFromUrl || "";
      if (!lojistaId) return;
      
      const url = `/api/lojista/clientes/${cliente.id}/referrals?lojistaId=${encodeURIComponent(lojistaId)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("Erro ao carregar referrals");
      }
      
      const data = await response.json();
      setViewingReferrals({ cliente, referrals: data.referrals || [] });
    } catch (err) {
      console.error("[ClientesTable] Erro ao carregar referrals:", err);
      setError("Erro ao carregar clientes referenciados");
    } finally {
      setLoading(false);
    }
  };

  const filteredClientes = useMemo(() => {
    let filtered = clientes;

    // Filtrar por termo de busca
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter((cliente) => {
        const name = cliente.nome.toLowerCase();
        const whatsapp = cliente.whatsapp?.toLowerCase() ?? "";
        const identifier = cliente.id?.toLowerCase() ?? "";
        return (
          name.includes(term) ||
          whatsapp.includes(term) ||
          identifier.includes(term)
        );
      });
    }

    // Filtrar por status
    if (statusFilter !== "all") {
      filtered = filtered.filter((cliente) => {
        if (statusFilter === "arquivado") {
          return cliente.arquivado === true;
        }
        if (statusFilter === "ativo") {
          return !cliente.arquivado;
        }
        if (statusFilter === "inativo") {
          return cliente.arquivado === true;
        }
        return true;
      });
    }

    // Se não mostrar arquivados, filtrar
    if (!showArchived) {
      filtered = filtered.filter((cliente) => !cliente.arquivado);
    }

    return filtered;
  }, [clientes, searchTerm, statusFilter, showArchived]);

  const formatWhatsApp = (whatsapp: string | null) => {
    if (!whatsapp) return "—";
    const cleaned = whatsapp.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return whatsapp;
  };

  const handleArchive = async (cliente: ClienteDoc, archive: boolean) => {
    try {
      setLoading(true);
      setError(null);
      
      const url = lojistaIdFromUrl
        ? `/api/lojista/clientes/${cliente.id}?lojistaId=${lojistaIdFromUrl}`
        : `/api/lojista/clientes/${cliente.id}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: archive ? "archive" : "unarchive" }),
      });

      if (!response.ok) throw new Error("Erro ao arquivar cliente");

      setSuccess(`Cliente ${archive ? "arquivado" : "desarquivado"} com sucesso!`);
      
      // Atualizar lista
      setClientes((prev) =>
        prev.map((c) =>
          c.id === cliente.id ? { ...c, arquivado: archive } : c
        )
      );

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Erro ao arquivar cliente");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cliente: ClienteDoc) => {
    if (!confirm(`Tem certeza que deseja excluir o cliente ${cliente.nome}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const url = `/api/lojista/clientes/${cliente.id}?lojistaId=${lojistaIdFromUrl || ""}`;
      
      const response = await fetch(url, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erro ao excluir cliente");

      setSuccess("Cliente excluído com sucesso!");
      
      // Remover da lista
      setClientes((prev) => prev.filter((c) => c.id !== cliente.id));

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Erro ao excluir cliente");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (clienteData: Partial<ClienteDoc>) => {
    if (!editingCliente) return;

    try {
      setLoading(true);
      setError(null);
      
      const url = lojistaIdFromUrl
        ? `/api/lojista/clientes/${editingCliente.id}?lojistaId=${lojistaIdFromUrl}`
        : `/api/lojista/clientes/${editingCliente.id}`;
      
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clienteData),
      });

      if (!response.ok) throw new Error("Erro ao atualizar cliente");

      setSuccess("Cliente atualizado com sucesso!");
      
      // Atualizar lista
      setClientes((prev) =>
        prev.map((c) =>
          c.id === editingCliente.id ? { ...c, ...clienteData } : c
        )
      );

      setEditingCliente(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar cliente");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/40">
        <div className="flex flex-col gap-3 border-b border-zinc-800/60 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="text-xs text-zinc-500">
              {searchTerm.trim() || statusFilter !== "all"
                ? `${filteredClientes.length} cliente(s) encontrado(s).`
                : `${clientes.length} cliente(s) cadastrado(s).`}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-indigo-500"
                />
                Mostrar arquivados
              </label>
            </div>
          </div>
          <div className="flex w-full gap-2 md:w-auto md:flex-row">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              <Plus className="h-4 w-4" />
              Cadastrar Cliente
            </button>
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nome, WhatsApp, email..."
                className="w-full rounded-lg border border-zinc-700/60 bg-zinc-900/60 pl-10 pr-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none focus:ring-0"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-200 focus:border-indigo-400 focus:outline-none"
              >
                <option value="all">Todos</option>
                <option value="ativo">Ativos</option>
                <option value="inativo">Inativos</option>
                <option value="arquivado">Arquivados</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-900/40 text-left uppercase text-xs tracking-[0.18em] text-zinc-500">
              <tr>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">WhatsApp</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Composições</th>
                <th className="px-6 py-3">Segmentação</th>
                <th className="px-6 py-3">Histórico</th>
                <th className="px-6 py-3">Compartilhamentos</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-14 text-center text-sm text-zinc-500">
                    Carregando...
                  </td>
                </tr>
              ) : filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-14 text-center text-sm text-zinc-500">
                    <Users className="mx-auto mb-4 h-10 w-10 text-zinc-700" />
                    {clientes.length === 0
                      ? "Nenhum cliente cadastrado ainda. Os clientes aparecerão aqui quando começarem a usar o provador virtual."
                      : "Nenhum cliente corresponde aos filtros aplicados."}
                  </td>
                </tr>
              ) : (
                filteredClientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-zinc-900/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-full border border-zinc-800/60 bg-zinc-900/60 flex items-center justify-center">
                          {(cliente as any).avatarUrl ? (
                            <img
                              src={(cliente as any).avatarUrl}
                              alt={cliente.nome}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                              {cliente.nome.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-100">{cliente.nome}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            ID {cliente.id.slice(0, 6)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-300">
                      {cliente.whatsapp ? (
                        <a
                          href={`https://wa.me/${cliente.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 transition"
                        >
                          {formatWhatsApp(cliente.whatsapp)}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-4 text-zinc-300">
                      {(cliente as any).email || "—"}
                    </td>
                    <td className="px-6 py-4 text-zinc-100">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
                        {cliente.totalComposicoes || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {cliente.tags && cliente.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {cliente.tags.slice(0, 2).map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-200"
                            >
                              <Tag className="h-2.5 w-2.5" />
                              {tag}
                            </span>
                          ))}
                          {cliente.tags.length > 2 && (
                            <span className="text-xs text-zinc-500">+{cliente.tags.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              setLoading(true);
                              const response = await fetch("/api/lojista/clientes/segmentation", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ clienteId: cliente.id }),
                              });
                              if (response.ok) {
                                // Recarregar clientes
                                const url = lojistaIdFromUrl 
                                  ? `/api/lojista/clientes?lojistaId=${lojistaIdFromUrl}&includeArchived=${showArchived}`
                                  : `/api/lojista/clientes?includeArchived=${showArchived}`;
                                const res = await fetch(url);
                                if (res.ok) {
                                  const data = await res.json();
                                  setClientes(data.clientes || []);
                                }
                              }
                            } catch (err) {
                              console.error("Erro ao calcular segmentação:", err);
                            } finally {
                              setLoading(false);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700/60 bg-zinc-900/60 px-2 py-1 text-xs text-zinc-400 transition hover:border-purple-400/60 hover:text-purple-200"
                          title="Calcular segmentação"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Calcular
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {cliente.historicoTentativas?.produtosExperimentados &&
                      cliente.historicoTentativas.produtosExperimentados.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-zinc-300">
                            {cliente.historicoTentativas.produtosExperimentados.length} produtos
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {cliente.historicoTentativas.ultimaAtualizacao
                              ? new Date(cliente.historicoTentativas.ultimaAtualizacao).toLocaleDateString("pt-BR")
                              : "—"}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              setLoading(true);
                              const response = await fetch("/api/lojista/clientes/history", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ clienteId: cliente.id }),
                              });
                              if (response.ok) {
                                // Recarregar clientes
                                const url = lojistaIdFromUrl 
                                  ? `/api/lojista/clientes?lojistaId=${lojistaIdFromUrl}&includeArchived=${showArchived}`
                                  : `/api/lojista/clientes?includeArchived=${showArchived}`;
                                const res = await fetch(url);
                                if (res.ok) {
                                  const data = await res.json();
                                  setClientes(data.clientes || []);
                                }
                              }
                            } catch (err) {
                              console.error("Erro ao atualizar histórico:", err);
                            } finally {
                              setLoading(false);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700/60 bg-zinc-900/60 px-2 py-1 text-xs text-zinc-400 transition hover:border-blue-400/60 hover:text-blue-200"
                          title="Atualizar histórico"
                        >
                          <History className="h-3 w-3" />
                          Atualizar
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {shareStats[cliente.id] ? (
                          <>
                            <div className="flex items-center gap-2 text-xs">
                              <Share2 className="h-3 w-3 text-blue-400" />
                              <span className="text-zinc-300">
                                {shareStats[cliente.id].totalShares} links
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Users2 className="h-3 w-3 text-green-400" />
                              <span className="text-zinc-300">
                                {shareStats[cliente.id].totalReferrals} referenciados
                              </span>
                            </div>
                            {shareStats[cliente.id].totalReferrals > 0 && (
                              <button
                                onClick={() => handleViewReferrals(cliente)}
                                className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 underline"
                              >
                                Ver referenciados
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-zinc-500">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          cliente.arquivado
                            ? "bg-zinc-500/10 text-zinc-400"
                            : "bg-emerald-500/10 text-emerald-200"
                        }`}
                      >
                        {cliente.arquivado ? "Arquivado" : "Ativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setViewingCliente(cliente)}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-indigo-200 transition hover:border-indigo-300/60"
                          title="Visualizar"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingCliente(cliente)}
                          className="inline-flex items-center gap-1 rounded-lg border border-purple-400/40 bg-purple-500/10 px-3 py-1 text-purple-200 transition hover:border-purple-300/60"
                          title="Editar"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchive(cliente, !cliente.arquivado)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-amber-200 transition hover:border-amber-300/60"
                          title={cliente.arquivado ? "Desarquivar" : "Arquivar"}
                        >
                          {cliente.arquivado ? (
                            <ArchiveRestore className="h-3.5 w-3.5" />
                          ) : (
                            <Archive className="h-3.5 w-3.5" />
                          )}
                        </button>
                        {isAdminView && (
                          <button
                            onClick={() => handleDelete(cliente)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-1 text-red-200 transition hover:border-red-300/60"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Visualização */}
      {viewingCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Detalhes do Cliente</h2>
              <button
                onClick={() => setViewingCliente(null)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nome</label>
                <p className="text-sm text-zinc-100">{viewingCliente.nome}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">WhatsApp</label>
                <p className="text-sm text-zinc-100">{viewingCliente.whatsapp || "—"}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
                <p className="text-sm text-zinc-100">{(viewingCliente as any).email || "—"}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Total de Composições</label>
                <p className="text-sm text-zinc-100">{viewingCliente.totalComposicoes || 0}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Status</label>
                <p className="text-sm text-zinc-100">
                  {viewingCliente.arquivado ? "Arquivado" : "Ativo"}
                </p>
              </div>
              {(viewingCliente as any).observacoes && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Observações</label>
                  <p className="text-sm text-zinc-100">{(viewingCliente as any).observacoes}</p>
                </div>
              )}
              {viewingCliente.tags && viewingCliente.tags.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Segmentação</label>
                  <div className="flex flex-wrap gap-2">
                    {viewingCliente.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-200"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                  {viewingCliente.segmentacao?.tipo && (
                    <p className="text-xs text-zinc-500 mt-2">
                      Tipo: {viewingCliente.segmentacao.tipo}
                    </p>
                  )}
                </div>
              )}
              {viewingCliente.historicoTentativas?.produtosExperimentados &&
              viewingCliente.historicoTentativas.produtosExperimentados.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Histórico de Tentativas
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {viewingCliente.historicoTentativas.produtosExperimentados.slice(0, 10).map((produto, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2"
                      >
                        <p className="text-xs text-zinc-100">{produto.produtoNome}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-zinc-500">
                            {new Date(produto.dataTentativa).toLocaleDateString("pt-BR")}
                          </span>
                          {produto.liked && (
                            <span className="text-[10px] text-green-400">✓ Curtiu</span>
                          )}
                          {produto.compartilhado && (
                            <span className="text-[10px] text-blue-400">✓ Compartilhou</span>
                          )}
                          {produto.checkout && (
                            <span className="text-[10px] text-emerald-400">✓ Comprou</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {viewingCliente.historicoTentativas.produtosExperimentados.length > 10 && (
                      <p className="text-xs text-zinc-500 text-center">
                        +{viewingCliente.historicoTentativas.produtosExperimentados.length - 10} produtos
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingCliente(null)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editingCliente && (
        <EditClienteModal
          cliente={editingCliente}
          onClose={() => setEditingCliente(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* Modal de Referenciados */}
      {viewingReferrals && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg max-h-[80vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Clientes Referenciados por {viewingReferrals.cliente.nome}
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Clientes que acessaram o app via links compartilhados por este cliente
                </p>
              </div>
              <button
                onClick={() => setViewingReferrals(null)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {viewingReferrals.referrals.length === 0 ? (
              <div className="py-8 text-center text-zinc-500">
                <Users2 className="mx-auto h-12 w-12 text-zinc-700 mb-4" />
                <p>Nenhum cliente referenciado ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {viewingReferrals.referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 hover:bg-zinc-800/60 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-zinc-100">{referral.referredClienteNome}</p>
                        <p className="text-sm text-zinc-400 mt-1">
                          WhatsApp: {referral.referredClienteWhatsapp || "—"}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Acessou em: {new Date(referral.accessedAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          // Buscar cliente e abrir modal de visualização
                          const cliente = clientes.find(c => c.id === referral.referredClienteId);
                          if (cliente) {
                            setViewingCliente(cliente);
                            setViewingReferrals(null);
                          }
                        }}
                        className="ml-4 rounded-lg border border-indigo-400/40 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200 transition hover:border-indigo-300/60"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingReferrals(null)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro */}
      {showCreateModal && (
        <CreateClienteModal
          onClose={() => setShowCreateModal(false)}
              onSave={async (data) => {
            try {
              setLoading(true);
              setError(null);
              
              const url = lojistaIdFromUrl
                ? `/api/lojista/clientes?lojistaId=${lojistaIdFromUrl}`
                : `/api/lojista/clientes`;
              
              // Preparar dados (incluir senha se fornecida)
              const requestData: any = {
                nome: data.nome,
                whatsapp: data.whatsapp,
                email: data.email,
                observacoes: data.observacoes,
              };
              
              // Incluir senha apenas se fornecida
              if (data.password && data.password.trim().length > 0) {
                requestData.password = data.password;
              }
              
              const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Erro ao cadastrar cliente");
              }

              setSuccess("Cliente cadastrado com sucesso!");
              setShowCreateModal(false);
              
              // Recarregar lista
              const reloadResponse = await fetch(
                lojistaIdFromUrl 
                  ? `/api/lojista/clientes?lojistaId=${lojistaIdFromUrl}&includeArchived=${showArchived}`
                  : `/api/lojista/clientes?includeArchived=${showArchived}`
              );
              if (reloadResponse.ok) {
                const reloadData = await reloadResponse.json();
                setClientes(reloadData.clientes || []);
              }

              setTimeout(() => setSuccess(null), 3000);
            } catch (err: any) {
              setError(err.message || "Erro ao cadastrar cliente");
              setTimeout(() => setError(null), 3000);
            } finally {
              setLoading(false);
            }
          }}
        />
      )}
    </>
  );
}

type EditClienteModalProps = {
  cliente: ClienteDoc;
  onClose: () => void;
  onSave: (data: Partial<ClienteDoc>) => void;
};

function EditClienteModal({ cliente, onClose, onSave }: EditClienteModalProps) {
  const [formData, setFormData] = useState({
    nome: cliente.nome,
    whatsapp: cliente.whatsapp || "",
    email: (cliente as any).email || "",
    observacoes: (cliente as any).observacoes || (cliente as any).obs || "",
    status: (cliente as any).status || "ativo",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Editar Cliente</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Nome *</label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">WhatsApp</label>
            <input
              type="text"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Observações</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type CreateClienteModalProps = {
  onClose: () => void;
  onSave: (data: { nome: string; whatsapp?: string; email?: string; observacoes?: string; password?: string }) => Promise<void>;
};

function CreateClienteModal({ onClose, onSave }: CreateClienteModalProps) {
  const [formData, setFormData] = useState({
    nome: "",
    whatsapp: "",
    email: "",
    observacoes: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      return;
    }

    try {
      setLoading(true);
      await onSave({
        nome: formData.nome,
        whatsapp: formData.whatsapp || undefined,
        email: formData.email || undefined,
        observacoes: formData.observacoes || undefined,
        password: formData.password || undefined,
      });
    } catch (error) {
      console.error("[CreateClienteModal] Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-8 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg mt-4 mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Cadastrar Novo Cliente</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Nome *
            </label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
              placeholder="Nome completo do cliente"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              WhatsApp
            </label>
            <input
              type="text"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
              placeholder="cliente@email.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Senha (opcional)
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
              placeholder="Mínimo 6 caracteres (deixe vazio se o cliente vai criar no app)"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Se deixar vazio, o cliente precisará criar a senha no primeiro acesso ao app.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
              placeholder="Observações sobre o cliente..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !formData.nome.trim()}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Cadastrando..." : "Cadastrar Cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
