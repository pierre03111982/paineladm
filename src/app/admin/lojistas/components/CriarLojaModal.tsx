"use client";

import { useState, FormEvent } from "react";
import { X, Store, User, Lock, Mail } from "lucide-react";

type CriarLojaModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type FormData = {
  nomeLoja: string;
  planoAtual: string;
  status: string;
  statusPagamento: string;
  limiteImagens: number;
  descricao: string;
  emailAdmin: string;
  senhaAdmin: string;
  nomeAdmin: string;
};

export function CriarLojaModal({ isOpen, onClose, onSuccess }: CriarLojaModalProps) {
  const [formData, setFormData] = useState<FormData>({
    nomeLoja: "",
    planoAtual: "free",
    status: "ativo",
    statusPagamento: "pago",
    limiteImagens: 50,
    descricao: "",
    emailAdmin: "",
    senhaAdmin: "",
    nomeAdmin: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch("/api/admin/lojistas/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar loja");
      }

      setSuccess("Loja e administrador criados com sucesso! Acesso liberado automaticamente.");
      
      // Limpar formulário
      setFormData({
        nomeLoja: "",
        planoAtual: "free",
        status: "ativo",
        statusPagamento: "pago",
        limiteImagens: 50,
        descricao: "",
        emailAdmin: "",
        senhaAdmin: "",
        nomeAdmin: "",
      });

      // Fechar modal após 2 segundos e recarregar lista
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error: any) {
      setError(error.message || "Erro ao criar loja");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Nova Loja</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Cadastre a loja e configure o administrador. O acesso será liberado automaticamente.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados da Loja */}
          <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
              <Store className="h-4 w-4" />
              Dados da Loja
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Nome da Loja *
              </label>
              <input
                type="text"
                required
                value={formData.nomeLoja}
                onChange={(e) => setFormData({ ...formData, nomeLoja: e.target.value })}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                placeholder="Ex: Minha Loja"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Plano
                </label>
                <select
                  value={formData.planoAtual}
                  onChange={(e) => setFormData({ ...formData, planoAtual: e.target.value })}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="free">Free</option>
                  <option value="lite">Lite</option>
                  <option value="pro">Pro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="ativo">Ativo (Acesso Liberado)</option>
                  <option value="pendente">Pendente</option>
                  <option value="suspenso">Suspenso</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Status Pagamento
                </label>
                <select
                  value={formData.statusPagamento}
                  onChange={(e) => setFormData({ ...formData, statusPagamento: e.target.value })}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente</option>
                  <option value="atrasado">Atrasado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Limite de Imagens
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.limiteImagens}
                  onChange={(e) => setFormData({ ...formData, limiteImagens: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Descrição (opcional)
              </label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                rows={2}
                placeholder="Descrição da loja..."
              />
            </div>
          </div>

          {/* Dados do Administrador */}
          <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
              <User className="h-4 w-4" />
              Administrador da Loja
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Email do Administrador *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={formData.emailAdmin}
                  onChange={(e) => setFormData({ ...formData, emailAdmin: e.target.value })}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-10 pr-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                  placeholder="admin@loja.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Senha *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.senhaAdmin}
                  onChange={(e) => setFormData({ ...formData, senhaAdmin: e.target.value })}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-10 pr-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                A senha será usada para o primeiro acesso do administrador
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Nome do Administrador (opcional)
              </label>
              <input
                type="text"
                value={formData.nomeAdmin}
                onChange={(e) => setFormData({ ...formData, nomeAdmin: e.target.value })}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                placeholder="Nome completo"
              />
            </div>
          </div>

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
              disabled={loading}
              className="rounded-lg bg-indigo-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
            >
              {loading ? "Criando..." : "Criar Loja e Administrador"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}




