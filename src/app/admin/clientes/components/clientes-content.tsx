"use client";

import { useState, useEffect } from "react";
import { Users, UserCheck, UserX, Eye, Search, Filter } from "lucide-react";
import Link from "next/link";

interface ClienteStats {
  clienteId: string;
  lojistaId: string;
  lojistaNome: string;
  nome: string;
  whatsapp: string;
  totalComposicoes: number;
  totalLikes: number;
  primeiraComposicao: Date | null;
  ultimaComposicao: Date | null;
  primeiroAcesso: Date | null;
  ultimoAcesso: Date | null;
  arquivado: boolean;
}

interface Totais {
  total: number;
  ativos: number;
  inativos: number;
}

export function ClientesContent() {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<ClienteStats[]>([]);
  const [totais, setTotais] = useState<Totais>({ total: 0, ativos: 0, inativos: 0 });
  const [selectedLojista, setSelectedLojista] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showInativos, setShowInativos] = useState(false);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedLojista) params.append("lojistaId", selectedLojista);

      const response = await fetch(`/api/admin/clientes?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setClientes(data.data.clientes);
        setTotais(data.data.totais);
      }
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, [selectedLojista]);

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const filteredClientes = clientes.filter((cliente) => {
    if (!showInativos && cliente.arquivado) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        cliente.nome.toLowerCase().includes(query) ||
        cliente.whatsapp.includes(query) ||
        cliente.lojistaNome.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const lojistasUnicos = Array.from(
    new Set(clientes.map((c) => c.lojistaId))
  ).map((id) => {
    const cliente = clientes.find((c) => c.lojistaId === id);
    return { id, nome: cliente?.lojistaNome || id };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Gestão e análise de clientes de todas as lojas
          </p>
        </div>
        <button
          onClick={fetchClientes}
          className="flex items-center gap-2 rounded-lg border border-purple-500/50 bg-purple-500/10 px-4 py-2 text-sm text-purple-200 transition hover:bg-purple-500/20"
        >
          Atualizar
        </button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/20 p-3">
              <Users className="h-5 w-5 text-blue-300" />
            </div>
            <div>
              <p className="text-xs text-zinc-400">Total de Clientes</p>
              <p className="text-xl font-bold text-white">{totais.total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-500/20 p-3">
              <UserCheck className="h-5 w-5 text-green-300" />
            </div>
            <div>
              <p className="text-xs text-zinc-400">Clientes Ativos</p>
              <p className="text-xl font-bold text-white">{totais.ativos}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-500/20 p-3">
              <UserX className="h-5 w-5 text-red-300" />
            </div>
            <div>
              <p className="text-xs text-zinc-400">Clientes Inativos</p>
              <p className="text-xl font-bold text-white">{totais.inativos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-400" />
          <h2 className="text-lg font-semibold text-white">Filtros</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-xs text-zinc-400">Loja</label>
            <select
              value={selectedLojista}
              onChange={(e) => setSelectedLojista(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white"
            >
              <option value="">Todas as lojas</option>
              {lojistasUnicos.map((lojista) => (
                <option key={lojista.id} value={lojista.id}>
                  {lojista.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs text-zinc-400">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nome, WhatsApp ou Loja"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 pl-10 pr-3 py-2 text-sm text-white placeholder-zinc-500"
              />
            </div>
          </div>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={showInativos}
                onChange={(e) => setShowInativos(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-800 text-purple-500"
              />
              <span className="text-sm text-zinc-400">Mostrar inativos</span>
            </label>
          </div>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Lista de Clientes</h2>
        {loading ? (
          <div className="py-8 text-center text-zinc-400">Carregando...</div>
        ) : filteredClientes.length === 0 ? (
          <div className="py-8 text-center text-zinc-400">Nenhum cliente encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                    Loja
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-400">
                    Composições
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-400">
                    Likes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                    Primeiro Acesso
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                    Último Acesso
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-zinc-400">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.map((cliente) => (
                  <tr
                    key={cliente.clienteId}
                    className="border-b border-zinc-800/50 transition hover:bg-zinc-800/30"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-white">{cliente.nome}</p>
                        <p className="text-xs text-zinc-400">{cliente.whatsapp}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-300">{cliente.lojistaNome}</td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-300">
                      {cliente.totalComposicoes}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-300">
                      {cliente.totalLikes}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {formatDate(cliente.primeiroAcesso)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {formatDate(cliente.ultimoAcesso)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/admin/clientes/${cliente.clienteId}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-purple-500/50 bg-purple-500/10 px-3 py-1.5 text-sm text-purple-200 transition hover:bg-purple-500/20"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


