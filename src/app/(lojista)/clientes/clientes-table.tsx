"use client";

import { useMemo, useState, useEffect } from "react";
import { Users, Search, Edit, Eye, Archive, ArchiveRestore, Trash2, Filter, X, Plus, Share2, Users2, Tag, History, RefreshCw, Heart, ThumbsDown, ThumbsUp, Phone, Mail, Image as ImageIcon, TrendingUp, Share, CheckCircle, Gift, CheckSquare, Square, Lock, Unlock } from "lucide-react";
import type { ClienteDoc } from "@/lib/firestore/types";
import { useSearchParams } from "next/navigation";
import { ClienteCard } from "./ClienteCard";

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
  const [showBlocked, setShowBlocked] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
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
  const [lastLikedImages, setLastLikedImages] = useState<Record<string, string | null>>({});
  const [viewingReferrals, setViewingReferrals] = useState<{
    cliente: ClienteDoc;
    referrals: any[];
  } | null>(null);
  const [selectedClientes, setSelectedClientes] = useState<Set<string>>(new Set());

  // Recarregar clientes quando showArchived ou showBlocked mudar
  useEffect(() => {
    const loadClientes = async () => {
      try {
        const url = lojistaIdFromUrl 
          ? `/api/lojista/clientes?lojistaId=${lojistaIdFromUrl}&includeArchived=${showArchived}&includeBlocked=${showBlocked}`
          : `/api/lojista/clientes?includeArchived=${showArchived}&includeBlocked=${showBlocked}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Erro ao carregar clientes");
        const data = await response.json();
        setClientes(data.clientes || []);
        
        // Carregar estatísticas de compartilhamento e últimas imagens em background
        // IMPORTANTE: Usa a mesma lógica do dashboard (buildActiveCustomers)
        // Busca todas as composições de uma vez e processa no servidor
        const stats: Record<string, any> = {};
        const images: Record<string, string | null> = {};
        
        if (data.clientes && data.clientes.length > 0) {
          // Buscar todas as imagens de uma vez (API busca lojistaId do auth se não vier na URL)
          try {
            const imagesUrl = lojistaIdFromUrl 
              ? `/api/lojista/clientes/last-composition-images?lojistaId=${encodeURIComponent(lojistaIdFromUrl)}`
              : `/api/lojista/clientes/last-composition-images`;
            
            const imagesResponse = await fetch(imagesUrl);
            
            if (imagesResponse.ok) {
              const imagesData = await imagesResponse.json();
              
              // Preencher o mapa de imagens
              if (imagesData.images) {
                Object.assign(images, imagesData.images);
              }
            }
          } catch (imgErr) {
            console.error("[ClientesTable] Erro ao buscar imagens:", imgErr);
          }
          
          // Buscar stats de compartilhamento em paralelo
          const lojistaId = lojistaIdFromUrl || "";
          if (lojistaId) {
            const statsPromises = data.clientes.map(async (cliente) => {
              try {
                const statsUrl = `/api/lojista/clientes/${cliente.id}/shares?lojistaId=${encodeURIComponent(lojistaId)}`;
                const statsResponse = await fetch(statsUrl);
                if (statsResponse.ok) {
                  const statsData = await statsResponse.json();
                  return { id: cliente.id, stats: statsData.stats };
                }
                return { id: cliente.id, stats: { totalShares: 0, totalAccesses: 0, totalSignups: 0, totalReferrals: 0 } };
              } catch {
                return { id: cliente.id, stats: { totalShares: 0, totalAccesses: 0, totalSignups: 0, totalReferrals: 0 } };
              }
            });
            
            const statsResults = await Promise.all(statsPromises);
            statsResults.forEach((result) => {
              stats[result.id] = result.stats;
            });
          }
          
          setShareStats(stats);
          setLastLikedImages(images);
        }
      } catch (err) {
        console.error("[ClientesTable] Erro ao carregar:", err);
      }
    };

    loadClientes();
  }, [showArchived, showBlocked, lojistaIdFromUrl]);
  
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
    
    // Se não mostrar bloqueados, filtrar (mas quando "Todos" está selecionado, mostrar bloqueados também)
    if (!showBlocked && statusFilter !== "all") {
      filtered = filtered.filter((cliente) => !cliente.acessoBloqueado);
    }

    // Ordenar por nome A-Z
    filtered.sort((a, b) => {
      const nomeA = a.nome.toUpperCase().trim();
      const nomeB = b.nome.toUpperCase().trim();
      if (nomeA < nomeB) return -1;
      if (nomeA > nomeB) return 1;
      return 0;
    });

    return filtered;
  }, [clientes, searchTerm, statusFilter, showArchived, showBlocked]);

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
          c.id === cliente.id ? { 
            ...c, 
            arquivado: archive, 
            acessoBloqueado: archive ? true : false // Ao desarquivar, também desbloquear acesso
          } : c
        )
      );

      // Recarregar clientes
      const reloadUrl = lojistaIdFromUrl 
        ? `/api/lojista/clientes?lojistaId=${lojistaIdFromUrl}&includeArchived=${showArchived}&includeBlocked=${showBlocked}`
        : `/api/lojista/clientes?includeArchived=${showArchived}&includeBlocked=${showBlocked}`;
      const res = await fetch(reloadUrl);
      if (res.ok) {
        const data = await res.json();
        setClientes(data.clientes || []);
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Erro ao arquivar cliente");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (cliente: ClienteDoc, unblock: boolean) => {
    try {
      setLoading(true);
      setError(null);
      
      const url = lojistaIdFromUrl
        ? `/api/lojista/clientes/${cliente.id}?lojistaId=${lojistaIdFromUrl}`
        : `/api/lojista/clientes/${cliente.id}`;
      
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acessoBloqueado: !unblock }),
      });

      if (!response.ok) throw new Error("Erro ao bloquear/desbloquear cliente");

      setSuccess(`Cliente ${unblock ? "desbloqueado" : "bloqueado"} com sucesso!`);
      
      // Atualizar lista
      setClientes((prev) =>
        prev.map((c) =>
          c.id === cliente.id ? { ...c, acessoBloqueado: !unblock } : c
        )
      );

      // Recarregar clientes
      const reloadUrl = lojistaIdFromUrl 
        ? `/api/lojista/clientes?lojistaId=${lojistaIdFromUrl}&includeArchived=${showArchived}&includeBlocked=${showBlocked}`
        : `/api/lojista/clientes?includeArchived=${showArchived}&includeBlocked=${showBlocked}`;
      const res = await fetch(reloadUrl);
      if (res.ok) {
        const data = await res.json();
        setClientes(data.clientes || []);
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Erro ao bloquear/desbloquear cliente");
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


  return (
    <>
      <div className="neon-card rounded-2xl overflow-hidden">
        {/* Título com fundo degradê azul escuro */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 px-6 py-4">
          <h2 className="text-xl font-bold text-white font-heading" style={{ color: '#ffffff' }}>Lista de Clientes</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 dark:border-white/10 px-4 py-3">
          {/* Contador */}
          <div className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
            {searchTerm.trim() || statusFilter !== "all"
              ? `${filteredClientes.length} cliente(s) encontrado(s).`
              : `${clientes.length} cliente(s) cadastrado(s).`}
          </div>
          
          {/* Checkboxes */}
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] whitespace-nowrap">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs">Arquivados</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] whitespace-nowrap">
            <input
              type="checkbox"
              checked={showBlocked}
              onChange={(e) => setShowBlocked(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs">Bloqueados</span>
          </label>
          
          {/* Botões de ação em massa */}
            {selectedClientes.size > 0 && (
              <>
                <button
                  onClick={async () => {
                    if (selectedClientes.size === 0) return;
                    
                    if (!confirm(`Deseja bloquear o acesso de ${selectedClientes.size} cliente(s) selecionado(s)?`)) {
                      return;
                    }

                    try {
                      setLoading(true);
                      const lojistaId = lojistaIdFromUrl || "";
                      if (!lojistaId) {
                        setError("LojistaId não encontrado");
                        return;
                      }

                      const count = selectedClientes.size;
                      const promises = Array.from(selectedClientes).map(async (clienteId) => {
                        const response = await fetch(`/api/lojista/clientes/${clienteId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ 
                            acessoBloqueado: true,
                            lojistaId 
                          }),
                        });
                        if (!response.ok) throw new Error(`Erro ao bloquear cliente ${clienteId}`);
                      });

                      await Promise.all(promises);
                      setSelectedClientes(new Set());
                      setSuccess(`${count} cliente(s) bloqueado(s) com sucesso!`);
                      
                      // Recarregar clientes
                      const url = lojistaIdFromUrl 
                        ? `/api/lojista/clientes?lojistaId=${lojistaIdFromUrl}&includeArchived=${showArchived}&includeBlocked=${showBlocked}`
                        : `/api/lojista/clientes?includeArchived=${showArchived}&includeBlocked=${showBlocked}`;
                      const res = await fetch(url);
                      if (res.ok) {
                        const data = await res.json();
                        setClientes(data.clientes || []);
                      }
                    } catch (err: any) {
                      console.error("Erro ao bloquear clientes:", err);
                      setError(err.message || "Erro ao bloquear clientes selecionados");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-red-600/30 transition hover:from-red-500 hover:to-orange-500 whitespace-nowrap"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Bloquear ({selectedClientes.size})
                </button>
                <button
                  onClick={async () => {
                    if (selectedClientes.size === 0) return;
                    
                    if (!confirm(`Deseja arquivar ${selectedClientes.size} cliente(s) selecionado(s)?`)) {
                      return;
                    }

                    try {
                      setLoading(true);
                      const lojistaId = lojistaIdFromUrl || "";
                      if (!lojistaId) {
                        setError("LojistaId não encontrado");
                        return;
                      }

                      const count = selectedClientes.size;
                      const promises = Array.from(selectedClientes).map(async (clienteId) => {
                        const response = await fetch(`/api/lojista/clientes/${clienteId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ 
                            arquivado: true,
                            acessoBloqueado: true, // Bloquear acesso ao arquivar
                            lojistaId 
                          }),
                        });
                        if (!response.ok) throw new Error(`Erro ao arquivar cliente ${clienteId}`);
                      });

                      await Promise.all(promises);
                      setSelectedClientes(new Set());
                      setSuccess(`${count} cliente(s) arquivado(s) com sucesso!`);
                      
                      // Recarregar clientes
                      const url = lojistaIdFromUrl 
                        ? `/api/lojista/clientes?lojistaId=${lojistaIdFromUrl}&includeArchived=${showArchived}&includeBlocked=${showBlocked}`
                        : `/api/lojista/clientes?includeArchived=${showArchived}&includeBlocked=${showBlocked}`;
                      const res = await fetch(url);
                      if (res.ok) {
                        const data = await res.json();
                        setClientes(data.clientes || []);
                      }
                    } catch (err: any) {
                      console.error("Erro ao arquivar clientes:", err);
                      setError(err.message || "Erro ao arquivar clientes selecionados");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:from-amber-400 hover:to-orange-500 whitespace-nowrap"
                >
                  <Archive className="h-3.5 w-3.5" />
                  Arquivar ({selectedClientes.size})
                </button>
              </>
            )}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nome, WhatsApp..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] pl-9 pr-2.5 py-1.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
              >
                <option value="all">Todos</option>
                <option value="ativo">Ativos</option>
                <option value="inativo">Inativos</option>
                <option value="arquivado">Arquivados</option>
              </select>
            </div>
            
            {/* Botão Cadastrar Cliente - Alinhado à Direita (mesmo padding dos cards) */}
            <div className="flex-1 flex justify-end pr-0">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold shadow-lg shadow-blue-500/30 transition hover:from-blue-500 hover:to-indigo-500 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" style={{ color: 'white', stroke: 'white', fill: 'white' }} />
                <span style={{ color: 'white' }}>Cadastrar Cliente</span>
              </button>
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

        <div className="overflow-y-auto max-h-[600px] rounded-b-xl">
          {/* Cards de Clientes - Layout Moderno */}
          <div className="space-y-3 px-4 pb-4">
            {filteredClientes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Users className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4 icon-animate-once" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {clientes.length === 0
                    ? "Nenhum cliente cadastrado ainda. Os clientes aparecerão aqui quando começarem a usar o provador virtual."
                    : "Nenhum cliente corresponde aos filtros aplicados."}
                </p>
              </div>
            ) : (
              filteredClientes.map((cliente, index) => (
                <ClienteCard
                  key={cliente.id}
                  cliente={cliente}
                  isSelected={selectedClientes.has(cliente.id)}
                  onSelect={(selected) => {
                    const newSelected = new Set(selectedClientes);
                    if (selected) {
                      newSelected.add(cliente.id);
                    } else {
                      newSelected.delete(cliente.id);
                    }
                    setSelectedClientes(newSelected);
                  }}
                  onView={() => {
                    const url = lojistaIdFromUrl 
                      ? `/clientes/${cliente.id}?lojistaId=${encodeURIComponent(lojistaIdFromUrl)}`
                      : `/clientes/${cliente.id}`;
                    window.location.href = url;
                  }}
                  onEdit={() => {
                    const url = lojistaIdFromUrl 
                      ? `/clientes/${cliente.id}?lojistaId=${encodeURIComponent(lojistaIdFromUrl)}`
                      : `/clientes/${cliente.id}`;
                    window.location.href = url;
                  }}
                  lojistaId={lojistaIdFromUrl || undefined}
                  onArchive={(archive) => handleArchive(cliente, archive)}
                  onBlock={(block) => handleUnblock(cliente, !block)}
                  onDelete={() => handleDelete(cliente)}
                  onUpdateHistory={async () => {
                    try {
                      setLoading(true);
                      const response = await fetch("/api/lojista/clientes/history", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ clienteId: cliente.id }),
                      });
                      if (response.ok) {
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
                  onCalculateSegmentation={async () => {
                    try {
                      setLoading(true);
                      const response = await fetch("/api/lojista/clientes/segmentation", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ clienteId: cliente.id }),
                      });
                      if (response.ok) {
                        const url = lojistaIdFromUrl 
                          ? `/api/lojista/clientes?lojistaId=${lojistaIdFromUrl}&includeArchived=${showArchived}&includeBlocked=${showBlocked}`
                          : `/api/lojista/clientes?includeArchived=${showArchived}&includeBlocked=${showBlocked}`;
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
                  onViewReferrals={() => handleViewReferrals(cliente)}
                  shareStats={shareStats[cliente.id]}
                  lastLikedImageUrl={lastLikedImages[cliente.id] || null}
                  index={index}
                  isAdminView={isAdminView}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Visualização */}
      {viewingCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg overflow-hidden">
            {/* Barra de Título com Gradiente Azul */}
            <div className="bg-gradient-to-r from-blue-900 via-blue-600 to-blue-900 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Detalhes do Cliente</h2>
                <button
                  onClick={() => setViewingCliente(null)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
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
        </div>
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
                  ? `/api/lojista/clientes?lojistaId=${lojistaIdFromUrl}&includeArchived=${showArchived}&includeBlocked=${showBlocked}`
                  : `/api/lojista/clientes?includeArchived=${showArchived}&includeBlocked=${showBlocked}`
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
