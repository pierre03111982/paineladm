"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  Users,
  Image,
  Settings,
  ArrowLeft,
  Eye,
  ExternalLink,
  Edit,
  Save,
  X,
} from "lucide-react";
import { PageHeader } from "@/app/(lojista)/components/page-header";

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
  descricao: string;
};

type LojistaPanelViewProps = {
  lojista: Lojista;
};

const PANEL_SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "dashboard" },
  { id: "produtos", label: "Produtos", icon: Package, href: "produtos" },
  { id: "clientes", label: "Clientes", icon: Users, href: "clientes" },
  { id: "composicoes", label: "Composições", icon: Image, href: "composicoes" },
  { id: "configuracoes", label: "Configurações", icon: Settings, href: "configuracoes" },
];

export function LojistaPanelView({ lojista }: LojistaPanelViewProps) {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(lojista);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getSectionContent = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    
    switch (activeSection) {
      case "dashboard":
        return (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50 mb-4">
              <p className="text-sm text-zinc-400">
                Visualizando o dashboard do lojista <strong className="text-white">{lojista.nome}</strong>
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                ID: {lojista.id}
              </p>
            </div>
            <iframe
              src={`${baseUrl}/dashboard?lojistaId=${lojista.id}&admin=true`}
              className="w-full h-[800px] border border-zinc-800 rounded-xl bg-white"
              title="Dashboard do Lojista"
            />
          </div>
        );
      case "produtos":
        return (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50 mb-4">
              <p className="text-sm text-zinc-400">
                Visualizando os produtos do lojista <strong className="text-white">{lojista.nome}</strong>
              </p>
            </div>
            <iframe
              src={`${baseUrl}/produtos?lojistaId=${lojista.id}&admin=true`}
              className="w-full h-[800px] border border-zinc-800 rounded-xl bg-white"
              title="Produtos do Lojista"
            />
          </div>
        );
      case "clientes":
        return (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50 mb-4">
              <p className="text-sm text-zinc-400">
                Visualizando os clientes do lojista <strong className="text-white">{lojista.nome}</strong>
              </p>
            </div>
            <iframe
              src={`${baseUrl}/clientes?lojistaId=${lojista.id}&admin=true`}
              className="w-full h-[800px] border border-zinc-800 rounded-xl bg-white"
              title="Clientes do Lojista"
            />
          </div>
        );
      case "composicoes":
        return (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50 mb-4">
              <p className="text-sm text-zinc-400">
                Visualizando as composições do lojista <strong className="text-white">{lojista.nome}</strong>
              </p>
            </div>
            <iframe
              src={`${baseUrl}/composicoes?lojistaId=${lojista.id}&admin=true`}
              className="w-full h-[800px] border border-zinc-800 rounded-xl bg-white"
              title="Composições do Lojista"
            />
          </div>
        );
      case "configuracoes":
        return (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50 mb-4">
              <p className="text-sm text-zinc-400">
                Visualizando as configurações do lojista <strong className="text-white">{lojista.nome}</strong>
              </p>
            </div>
            <iframe
              src={`${baseUrl}/configuracoes?lojistaId=${lojista.id}&admin=true`}
              className="w-full h-[800px] border border-zinc-800 rounded-xl bg-white"
              title="Configurações do Lojista"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/lojistas"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Lojistas
          </Link>
        </div>
        <button
          onClick={() => {
            if (isEditing) {
              setIsEditing(false);
              setEditData(lojista);
            } else {
              setIsEditing(true);
            }
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-purple-400/50 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-200 transition hover:border-purple-300/60 hover:bg-purple-500/20"
        >
          {isEditing ? (
            <>
              <X className="h-4 w-4" />
              Cancelar
            </>
          ) : (
            <>
              <Edit className="h-4 w-4" />
              Editar Loja
            </>
          )}
        </button>
      </div>

      {/* Mensagens */}
      {error && (
        <div className="rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {success}
        </div>
      )}

      {/* Lojista Info */}
      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/60 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/20 text-xl font-semibold text-purple-200">
              {(isEditing ? editData.nome : lojista.nome)
                .split(" ")
                .filter(Boolean)
                .map((word) => word[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "L"}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editData.nome}
                    onChange={(e) => setEditData({ ...editData, nome: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-xl font-bold text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="Nome da Loja"
                  />
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                    placeholder="Email"
                  />
                  <textarea
                    value={editData.descricao || ""}
                    onChange={(e) => setEditData({ ...editData, descricao: e.target.value })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                    placeholder="Descrição"
                    rows={2}
                  />
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-bold text-white">{lojista.nome}</h1>
                  <p className="text-sm text-zinc-400 mt-1">{lojista.email}</p>
                  {lojista.descricao && (
                    <p className="text-sm text-zinc-500 mt-2">{lojista.descricao}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isEditing ? (
              <div className="space-y-2">
                <select
                  value={editData.planoAtual}
                  onChange={(e) => setEditData({ ...editData, planoAtual: e.target.value })}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="free">Free</option>
                  <option value="lite">Lite</option>
                  <option value="pro">Pro</option>
                </select>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="pendente">Pendente</option>
                  <option value="ativo">Ativo</option>
                  <option value="suspenso">Suspenso</option>
                </select>
              </div>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/50 bg-purple-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-purple-200">
                  <Package className="h-3 w-3" />
                  {lojista.planoAtual}
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                    lojista.status === "ativo"
                      ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/50"
                      : lojista.status === "pendente"
                      ? "bg-amber-500/20 text-amber-200 border-amber-400/50"
                      : "bg-rose-500/20 text-rose-200 border-rose-400/50"
                  }`}
                >
                  {lojista.status}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t border-zinc-800">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-[0.12em]">
              Uso de Imagens
            </p>
            {isEditing ? (
              <div className="mt-2 space-y-2">
                <input
                  type="number"
                  value={editData.imagensGeradasMes}
                  onChange={(e) => setEditData({ ...editData, imagensGeradasMes: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  placeholder="Geradas"
                />
                <input
                  type="number"
                  value={editData.limiteImagens}
                  onChange={(e) => setEditData({ ...editData, limiteImagens: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  placeholder="Limite"
                />
              </div>
            ) : (
              <>
                <p className="text-lg font-semibold text-white mt-1">
                  {lojista.imagensGeradasMes} / {lojista.limiteImagens}
                </p>
                <div className="h-1.5 w-full rounded-full bg-zinc-800 mt-2">
                  <div
                    className="h-full rounded-full bg-purple-500"
                    style={{
                      width: `${Math.min(
                        (lojista.imagensGeradasMes / lojista.limiteImagens) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-[0.12em]">
              Status Pagamento
            </p>
            {isEditing ? (
              <select
                value={editData.statusPagamento}
                onChange={(e) => setEditData({ ...editData, statusPagamento: e.target.value })}
                className="w-full mt-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
                <option value="atrasado">Atrasado</option>
              </select>
            ) : (
              <>
                <p className="text-lg font-semibold text-white mt-1 capitalize">
                  {lojista.statusPagamento}
                </p>
                {lojista.dataVencimento && (
                  <p className="text-xs text-zinc-500 mt-1">
                    Venc: {new Intl.DateTimeFormat("pt-BR").format(lojista.dataVencimento)}
                  </p>
                )}
              </>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-[0.12em]">
              {isEditing ? "Plano" : "Cadastrado em"}
            </p>
            {isEditing ? (
              <select
                value={editData.planoAtual}
                onChange={(e) => setEditData({ ...editData, planoAtual: e.target.value })}
                className="w-full mt-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="free">Free</option>
                <option value="lite">Lite</option>
                <option value="pro">Pro</option>
              </select>
            ) : (
              <p className="text-lg font-semibold text-white mt-1">
                {new Intl.DateTimeFormat("pt-BR").format(lojista.createdAt)}
              </p>
            )}
          </div>
        </div>

        {/* Botão Salvar */}
        {isEditing && (
          <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-zinc-800">
            <button
              onClick={async () => {
                try {
                  setSaving(true);
                  setError(null);
                  setSuccess(null);

                  const response = await fetch(`/api/admin/lojistas/${lojista.id}/editar`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(editData),
                  });

                  if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || "Erro ao salvar");
                  }

                  setSuccess("Informações atualizadas com sucesso!");
                  setIsEditing(false);
                  // Recarregar página após 1 segundo
                  setTimeout(() => {
                    window.location.reload();
                  }, 1000);
                } catch (error: any) {
                  setError(error.message || "Erro ao salvar alterações");
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-6 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300/60 hover:bg-emerald-500/20 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {PANEL_SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition whitespace-nowrap ${
              activeSection === section.id
                ? "border-purple-400/50 bg-purple-500/10 text-purple-200"
                : "border-zinc-800/60 bg-zinc-900/40 text-zinc-300 hover:border-purple-400/30 hover:bg-purple-500/5"
            }`}
          >
            <section.icon className="h-4 w-4" />
            {section.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/60 p-6">
        {getSectionContent()}
      </div>
    </div>
  );
}

