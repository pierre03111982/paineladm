"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Calendar, Phone, Heart, Share2, Image as ImageIcon, Eye } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Composicao {
  id: string;
  createdAt: Date | null;
  liked: boolean;
  shares: number;
  products: Array<{ id: string; nome: string }>;
  imageUrl: string | null;
  titulo: string | null;
}

interface ClienteDetalhes {
  cliente: {
    id: string;
    nome: string;
    whatsapp: string;
    arquivado: boolean;
    primeiroAcesso: Date | null;
    ultimoAcesso: Date | null;
  };
  lojista: {
    id: string;
    nome: string;
  };
  estatisticas: {
    totalComposicoes: number;
    totalLikes: number;
    totalShares: number;
    primeiraComposicao: Date | null;
    ultimaComposicao: Date | null;
  };
  composicoes: Composicao[];
}

export function ClienteDetalhesContent({ clienteId }: { clienteId: string }) {
  const [loading, setLoading] = useState(true);
  const [detalhes, setDetalhes] = useState<ClienteDetalhes | null>(null);

  useEffect(() => {
    fetchDetalhes();
  }, [clienteId]);

  const fetchDetalhes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/clientes/${clienteId}`);
      const data = await response.json();

      if (data.success) {
        setDetalhes(data.data);
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes:", error);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent"></div>
          <p className="text-sm text-zinc-400">Carregando detalhes do cliente...</p>
        </div>
      </div>
    );
  }

  if (!detalhes) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-white">Cliente não encontrado</p>
          <Link
            href="/admin/clientes"
            className="mt-4 inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para lista
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/clientes"
            className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-2 text-zinc-300 transition hover:bg-zinc-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{detalhes.cliente.nome}</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Cliente de {detalhes.lojista.nome}
            </p>
          </div>
        </div>
        {detalhes.cliente.arquivado && (
          <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-300">
            Inativo
          </span>
        )}
      </div>

      {/* Informações do Cliente */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Informações de Contato</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-400">WhatsApp</p>
                <p className="text-sm font-medium text-white">{detalhes.cliente.whatsapp}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-400">Primeiro Acesso</p>
                <p className="text-sm font-medium text-white">
                  {formatDate(detalhes.cliente.primeiroAcesso)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-400">Último Acesso</p>
                <p className="text-sm font-medium text-white">
                  {formatDate(detalhes.cliente.ultimoAcesso)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Estatísticas</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-zinc-400" />
                <p className="text-xs text-zinc-400">Composições</p>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">
                {detalhes.estatisticas.totalComposicoes}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-400" />
                <p className="text-xs text-zinc-400">Likes</p>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">
                {detalhes.estatisticas.totalLikes}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-blue-400" />
                <p className="text-xs text-zinc-400">Compartilhamentos</p>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">
                {detalhes.estatisticas.totalShares}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Taxa de Engajamento</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {detalhes.estatisticas.totalComposicoes > 0
                  ? Math.round(
                      ((detalhes.estatisticas.totalLikes + detalhes.estatisticas.totalShares) /
                        detalhes.estatisticas.totalComposicoes) *
                        100
                    )
                  : 0}
                %
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2 border-t border-zinc-800 pt-4">
            <div>
              <p className="text-xs text-zinc-400">Primeira Composição</p>
              <p className="text-sm text-white">
                {formatDate(detalhes.estatisticas.primeiraComposicao)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Última Composição</p>
              <p className="text-sm text-white">
                {formatDate(detalhes.estatisticas.ultimaComposicao)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Composições Geradas */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Composições Geradas ({detalhes.composicoes.length})
          </h2>
        </div>
        {detalhes.composicoes.length === 0 ? (
          <div className="py-8 text-center text-zinc-400">
            Nenhuma composição encontrada
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {detalhes.composicoes.map((composicao) => (
              <div
                key={composicao.id}
                className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800/30 transition hover:border-purple-500/50"
              >
                {composicao.imageUrl && (
                  <div className="relative aspect-square w-full overflow-hidden">
                    <Image
                      src={composicao.imageUrl}
                      alt={composicao.titulo || "Composição"}
                      fill
                      className="object-cover transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-sm font-medium text-white">
                        {composicao.titulo || "Sem título"}
                      </p>
                      <p className="text-xs text-zinc-300">
                        {formatDate(composicao.createdAt)}
                      </p>
                    </div>
                  </div>
                )}
                <div className="p-4">
                  <div className="mb-2 flex items-center gap-4 text-xs text-zinc-400">
                    {composicao.liked && (
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                        <span>Liked</span>
                      </div>
                    )}
                    {composicao.shares > 0 && (
                      <div className="flex items-center gap-1">
                        <Share2 className="h-3 w-3" />
                        <span>{composicao.shares}</span>
                      </div>
                    )}
                  </div>
                  {composicao.products.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-400">Produtos:</p>
                      <p className="text-sm text-zinc-300">
                        {composicao.products.map((p) => p.nome).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


