"use client";

import { useMemo, useState, useEffect } from "react";
import { Users, Search, Edit, Eye, Archive, ArchiveRestore, Trash2, Filter, X, Plus, Share2, Loader2, User, MessageCircle, Image, Heart, ThumbsUp, ThumbsDown, Star } from "lucide-react";
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
  const [clientesStats, setClientesStats] = useState<Record<string, { likes: number; dislikes: number }>>({});
  const [showFavoritosModal, setShowFavoritosModal] = useState<{ clienteId: string; clienteNome: string } | null>(null);

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
      } catch (err) {
        console.error("[ClientesTable] Erro ao carregar:", err);
      } finally {
        setLoading(false);
      }
    };

    loadClientes();
  }, [showArchived, lojistaIdFromUrl]);

  // Carregar estatísticas de likes/dislikes para todos os clientes
  useEffect(() => {
    const loadStats = async () => {
      const stats: Record<string, { likes: number; dislikes: number }> = {};
      
      for (const cliente of clientes) {
        try {
          const url = lojistaIdFromUrl
            ? `/api/lojista/clientes/${cliente.id}/likes-stats?lojistaId=${lojistaIdFromUrl}`
            : `/api/lojista/clientes/${cliente.id}/likes-stats`;
          
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            stats[cliente.id] = {
              likes: data.totalLikes || 0,
              dislikes: data.totalDislikes || 0,
            };
          }
        } catch (error) {
          console.error(`[ClientesTable] Erro ao carregar stats para ${cliente.id}:`, error);
          stats[cliente.id] = { likes: 0, dislikes: 0 };
        }
      }
      
      setClientesStats(stats);
    };

    if (clientes.length > 0) {
      loadStats();
    }
  }, [clientes, lojistaIdFromUrl]);

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
            <thead className="bg-zinc-900/40 text-left text-xs">
              <tr>
                <th className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-indigo-400" />
                    <span className="text-zinc-400">Cliente</span>
                  </div>
                </th>
                <th className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-emerald-400" />
                    <span className="text-zinc-400">WhatsApp</span>
                  </div>
                </th>
                <th className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-purple-400" />
                    <span className="text-zinc-400">Looks Gerados</span>
                  </div>
                </th>
                <th className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-400" />
                    <span className="text-zinc-400">Favoritos</span>
                  </div>
                </th>
                <th className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-blue-400" />
                    <span className="text-zinc-400">Likes</span>
                  </div>
                </th>
                <th className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ThumbsDown className="h-4 w-4 text-red-400" />
                    <span className="text-zinc-400">Dislikes</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Star className="h-4 w-4 text-amber-400" />
                    <span className="text-zinc-400">Ações</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center text-sm text-zinc-500">
                    Carregando...
                  </td>
                </tr>
              ) : filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center text-sm text-zinc-500">
                    <Users className="mx-auto mb-4 h-10 w-10 text-zinc-700" />
                    {clientes.length === 0
                      ? "Nenhum cliente cadastrado ainda. Os clientes aparecerão aqui quando começarem a usar o provador virtual."
                      : "Nenhum cliente corresponde aos filtros aplicados."}
                  </td>
                </tr>
              ) : (
                filteredClientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-zinc-900/40">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-zinc-800/60 bg-zinc-900/60 flex items-center justify-center">
                          <User className="h-6 w-6 text-zinc-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-zinc-100 truncate">{cliente.nome}</p>
                            <button
                              onClick={() => setViewingCliente(cliente)}
                              className="inline-flex items-center text-indigo-400 hover:text-indigo-300 transition flex-shrink-0"
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 truncate">
                            ID {cliente.id.slice(0, 6)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-zinc-300">
                      <div className="flex items-center gap-2 min-w-0">
                        {cliente.whatsapp ? (
                          <a
                            href={`https://wa.me/${cliente.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 transition truncate"
                          >
                            {formatWhatsApp(cliente.whatsapp)}
                          </a>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                        {cliente.whatsapp && (
                          <button
                            onClick={() => setViewingCliente(cliente)}
                            className="inline-flex items-center text-indigo-400 hover:text-indigo-300 transition flex-shrink-0"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-zinc-100">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-200 whitespace-nowrap">
                        {cliente.totalComposicoes || 0}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => setShowFavoritosModal({ clienteId: cliente.id, clienteNome: cliente.nome })}
                        className="inline-flex items-center gap-1 rounded-lg border border-pink-400/40 bg-pink-500/10 px-2.5 py-1 text-xs font-medium text-pink-200 transition hover:border-pink-300/60 whitespace-nowrap"
                        title="Ver favoritos"
                      >
                        <Heart className="h-3.5 w-3.5" />
                        Ver
                      </button>
                    </td>
                    <td className="px-4 py-4 text-zinc-100">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-200 whitespace-nowrap">
                        <ThumbsUp className="h-3 w-3" />
                        {clientesStats[cliente.id]?.likes || 0}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-zinc-100">
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-200 whitespace-nowrap">
                        <ThumbsDown className="h-3 w-3" />
                        {clientesStats[cliente.id]?.dislikes || 0}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setViewingCliente(cliente)}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-400/40 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-200 transition hover:border-indigo-300/60"
                          title="Visualizar"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingCliente(cliente)}
                          className="inline-flex items-center gap-1 rounded-lg border border-purple-400/40 bg-purple-500/10 px-2.5 py-1 text-xs text-purple-200 transition hover:border-purple-300/60"
                          title="Editar"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchive(cliente, !cliente.arquivado)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200 transition hover:border-amber-300/60"
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
                            className="inline-flex items-center gap-1 rounded-lg border border-red-400/40 bg-red-500/10 px-2.5 py-1 text-xs text-red-200 transition hover:border-red-300/60"
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
        <ClienteDetailsModal
          cliente={viewingCliente}
          lojistaIdFromUrl={lojistaIdFromUrl}
          onClose={() => setViewingCliente(null)}
        />
      )}

      {/* Modal de Edição */}
      {editingCliente && (
        <EditClienteModal
          cliente={editingCliente}
          onClose={() => setEditingCliente(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* Modal de Favoritos */}
      {showFavoritosModal && (
        <FavoritosModal
          clienteId={showFavoritosModal.clienteId}
          clienteNome={showFavoritosModal.clienteNome}
          lojistaIdFromUrl={lojistaIdFromUrl}
          onClose={() => setShowFavoritosModal(null)}
        />
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
              
              const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
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
  onSave: (data: { nome: string; whatsapp?: string; email?: string; observacoes?: string }) => Promise<void>;
};

function CreateClienteModal({ onClose, onSave }: CreateClienteModalProps) {
  const [formData, setFormData] = useState({
    nome: "",
    whatsapp: "",
    email: "",
    observacoes: "",
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

type ClienteDetailsModalProps = {
  cliente: ClienteDoc;
  lojistaIdFromUrl?: string | null;
  onClose: () => void;
};

function ClienteDetailsModal({ cliente, lojistaIdFromUrl, onClose }: ClienteDetailsModalProps) {
  const [clientesReferidos, setClientesReferidos] = useState<ClienteDoc[]>([]);
  const [loadingReferidos, setLoadingReferidos] = useState(false);
  const [viewingReferido, setViewingReferido] = useState<ClienteDoc | null>(null);

  useEffect(() => {
    const loadReferidos = async () => {
      try {
        setLoadingReferidos(true);
        const url = lojistaIdFromUrl
          ? `/api/lojista/clientes/${cliente.id}/referrals?lojistaId=${lojistaIdFromUrl}`
          : `/api/lojista/clientes/${cliente.id}/referrals`;
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setClientesReferidos(data.clientes || []);
        }
      } catch (error) {
        console.error("[ClienteDetailsModal] Erro ao carregar referidos:", error);
      } finally {
        setLoadingReferidos(false);
      }
    };

    loadReferidos();
  }, [cliente.id, lojistaIdFromUrl]);

  const formatWhatsApp = (whatsapp: string | null) => {
    if (!whatsapp) return "—";
    const cleaned = whatsapp.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return whatsapp;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg my-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Detalhes do Cliente</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Nome</label>
              <p className="text-sm text-zinc-100">{cliente.nome}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">WhatsApp</label>
              <p className="text-sm text-zinc-100">{cliente.whatsapp || "—"}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
              <p className="text-sm text-zinc-100">{(cliente as any).email || "—"}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Total de Composições</label>
              <p className="text-sm text-zinc-100">{cliente.totalComposicoes || 0}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Status</label>
              <p className="text-sm text-zinc-100">
                {cliente.arquivado ? "Arquivado" : "Ativo"}
              </p>
            </div>
          </div>
          {(cliente as any).observacoes && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Observações</label>
              <p className="text-sm text-zinc-100">{(cliente as any).observacoes}</p>
            </div>
          )}

          {/* Seção Meus Compartilhamentos */}
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Share2 className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Meus Compartilhamentos</h3>
            </div>
            {loadingReferidos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
              </div>
            ) : clientesReferidos.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">
                Nenhum cliente se cadastrou através dos compartilhamentos deste cliente.
              </p>
            ) : (
              <div className="space-y-2">
                {clientesReferidos.map((referido) => (
                  <div
                    key={referido.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-900/60 px-4 py-3 hover:bg-zinc-900/80 transition"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-10 w-10 overflow-hidden rounded-full border border-zinc-800/60 bg-zinc-900/60 flex items-center justify-center">
                        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                          {referido.nome.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-zinc-100">{referido.nome}</p>
                          <button
                            onClick={() => setViewingReferido(referido)}
                            className="inline-flex items-center text-indigo-400 hover:text-indigo-300 transition"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-xs text-zinc-400">
                          {referido.whatsapp ? formatWhatsApp(referido.whatsapp) : "Sem WhatsApp"}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500">
                      {new Date(referido.createdAt).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            Fechar
          </button>
        </div>
      </div>
      {/* Modal aninhado para cliente referido */}
      {viewingReferido && (
        <ClienteDetailsModal
          cliente={viewingReferido}
          lojistaIdFromUrl={lojistaIdFromUrl}
          onClose={() => setViewingReferido(null)}
        />
      )}
    </div>
  );
}

type FavoritosModalProps = {
  clienteId: string;
  clienteNome: string;
  lojistaIdFromUrl?: string | null;
  onClose: () => void;
};

function FavoritosModal({ clienteId, clienteNome, lojistaIdFromUrl, onClose }: FavoritosModalProps) {
  const [favoritos, setFavoritos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFavoritos = async () => {
      try {
        setLoading(true);
        const url = lojistaIdFromUrl
          ? `/api/lojista/clientes/${clienteId}/favoritos?lojistaId=${lojistaIdFromUrl}&limit=20`
          : `/api/lojista/clientes/${clienteId}/favoritos?limit=20`;
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setFavoritos(data.favoritos || []);
        }
      } catch (error) {
        console.error("[FavoritosModal] Erro ao carregar favoritos:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFavoritos();
  }, [clienteId, lojistaIdFromUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg my-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Favoritos de {clienteNome}</h2>
            <p className="text-sm text-zinc-400 mt-1">Últimos 20 looks curtidos</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
          </div>
        ) : favoritos.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="mx-auto h-12 w-12 text-zinc-700 mb-4" />
            <p className="text-sm text-zinc-500">Nenhum look favoritado ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {favoritos.map((favorito) => (
              <div
                key={favorito.id}
                className="relative group rounded-lg border border-zinc-800/60 bg-zinc-950/40 overflow-hidden aspect-square"
              >
                {favorito.imagemUrl ? (
                  <img
                    src={favorito.imagemUrl}
                    alt="Look favoritado"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-zinc-900/60">
                    <Image className="h-8 w-8 text-zinc-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-xs text-white">
                      {new Date(favorito.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
