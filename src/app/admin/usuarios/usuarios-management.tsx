"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "../../(lojista)/components/page-header";
import {
  Plus,
  Edit,
  Trash2,
  Shield,
  Store,
  User,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

type User = {
  uid: string;
  email: string;
  displayName?: string;
  emailVerified: boolean;
  disabled: boolean;
  role: "admin" | "lojista" | "cliente";
  createdAt?: string;
  lastSignIn?: string;
  lojaId?: string;
  clienteId?: string;
  nome?: string;
  planoAtual?: string;
  status?: string;
  lojistaId?: string; // Para clientes vinculados a lojas
};

type Loja = {
  id: string;
  nome: string;
  email: string;
  status: string;
  planoAtual: string;
};

type UserFormData = {
  email: string;
  password: string;
  displayName: string;
  role: "admin" | "lojista" | "cliente";
  lojaData?: {
    nome?: string;
    planoAtual?: string;
    status?: string;
    statusPagamento?: string;
    limiteImagens?: number;
  };
  clienteData?: {
    nome?: string;
    lojistaId?: string;
  };
};

export function UsuariosManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLojas, setLoadingLojas] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: "",
    password: "",
    displayName: "",
    role: "cliente",
    clienteData: {
      lojistaId: "",
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    loadLojas();
  }, []);

  const loadLojas = async () => {
    try {
      setLoadingLojas(true);
      const response = await fetch("/api/admin/lojas");
      if (!response.ok) throw new Error("Erro ao carregar lojas");
      const data = await response.json();
      setLojas(data.lojas || []);
    } catch (error) {
      console.error("[UsuariosManagement] Erro ao carregar lojas:", error);
    } finally {
      setLoadingLojas(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Erro ao carregar usuários");
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("[UsuariosManagement] Erro ao carregar:", error);
      setError("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      email: "",
      password: "",
      displayName: "",
      role: "cliente",
    });
    setError(null);
    setSuccess(null);
    setShowModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: "",
      displayName: user.displayName || "",
      role: user.role,
      lojaData: user.lojaId && user.role === "lojista"
        ? {
            nome: user.nome,
            planoAtual: user.planoAtual,
            status: user.status,
          }
        : undefined,
      clienteData: user.clienteId && user.role === "cliente"
        ? {
            nome: user.nome,
            lojistaId: user.lojistaId,
          }
        : undefined,
    });
    setError(null);
    setSuccess(null);
    setShowModal(true);
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${email}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao excluir usuário");
      }

      setSuccess("Usuário excluído com sucesso");
      loadUsers();
    } catch (error: any) {
      setError(error.message || "Erro ao excluir usuário");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validação: se for cliente, lojistaId é obrigatório
    if (formData.role === "cliente" && !formData.clienteData?.lojistaId) {
      setError("Por favor, selecione uma loja para o cliente.");
      return;
    }

    try {
      if (editingUser) {
        // Editar usuário
        const response = await fetch(`/api/admin/users/${editingUser.uid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Erro ao atualizar usuário");
        }

        setSuccess("Usuário atualizado com sucesso");
      } else {
        // Criar usuário
        const response = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Erro ao criar usuário");
        }

        setSuccess("Usuário criado com sucesso");
      }

      setShowModal(false);
      loadUsers();
    } catch (error: any) {
      setError(error.message || "Erro ao salvar usuário");
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nome?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4" />;
      case "lojista":
        return <Store className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-500/20 text-purple-200 border-purple-400/50";
      case "lojista":
        return "bg-indigo-500/20 text-indigo-200 border-indigo-400/50";
      default:
        return "bg-zinc-500/20 text-zinc-200 border-zinc-400/50";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gerenciamento de Usuários"
        description="Crie, edite e gerencie usuários do sistema (admins, lojistas e clientes)"
      />

      {/* Filtros e Busca */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por email ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-10 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">Todos</option>
              <option value="admin">Admin</option>
              <option value="lojista">Lojista</option>
              <option value="cliente">Cliente</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-400/50 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:border-indigo-300/60 hover:bg-indigo-500/20"
        >
          <Plus className="h-4 w-4" />
          Novo Usuário
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

      {/* Tabela de Usuários */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/40">
        {loading ? (
          <div className="p-12 text-center text-zinc-400">Carregando usuários...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            Nenhum usuário encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800 text-sm">
              <thead className="bg-zinc-900/40 text-left uppercase text-xs tracking-[0.18em] text-zinc-500">
                <tr>
                  <th className="px-6 py-3">Usuário</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Verificado</th>
                  <th className="px-6 py-3">Criado em</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/60">
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-zinc-900/40">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-zinc-100">{user.email}</p>
                        {(user.displayName || user.nome) && (
                          <p className="text-xs text-zinc-500">
                            {user.displayName || user.nome}
                          </p>
                        )}
                        {user.role === "cliente" && user.lojistaId && (
                          <p className="text-xs text-indigo-400 mt-1">
                            Loja: {lojas.find(l => l.id === user.lojistaId)?.nome || user.lojistaId}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${getRoleColor(
                          user.role
                        )}`}
                      >
                        {getRoleIcon(user.role)}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.disabled ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-400/50 bg-red-500/20 px-3 py-1 text-xs text-red-200">
                          <XCircle className="h-3 w-3" />
                          Desabilitado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          Ativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.emailVerified ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="inline-flex items-center gap-1 rounded-lg border border-purple-400/40 bg-purple-500/10 px-3 py-1 text-xs text-purple-200 transition hover:border-purple-300/60"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(user.uid, user.email)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-200 transition hover:border-rose-300/60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-6 text-xl font-semibold text-white">
              {editingUser ? "Editar Usuário" : "Novo Usuário"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-zinc-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Senha *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-zinc-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-zinc-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Tipo de Usuário *
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as "admin" | "lojista" | "cliente",
                    })
                  }
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-zinc-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="cliente">Cliente</option>
                  <option value="lojista">Lojista</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {/* Campos específicos para lojista */}
              {formData.role === "lojista" && (
                <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                  <h3 className="text-sm font-semibold text-zinc-300">
                    Dados da Loja
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Nome da Loja
                    </label>
                    <input
                      type="text"
                      value={formData.lojaData?.nome || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lojaData: {
                            ...formData.lojaData,
                            nome: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">
                        Plano
                      </label>
                      <select
                        value={formData.lojaData?.planoAtual || "free"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            lojaData: {
                              ...formData.lojaData,
                              planoAtual: e.target.value,
                            },
                          })
                        }
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
                        value={formData.lojaData?.status || "pendente"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            lojaData: {
                              ...formData.lojaData,
                              status: e.target.value,
                            },
                          })
                        }
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="ativo">Ativo</option>
                        <option value="suspenso">Suspenso</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Limite de Imagens
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.lojaData?.limiteImagens || 10}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lojaData: {
                            ...formData.lojaData,
                            limiteImagens: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Campos específicos para cliente */}
              {formData.role === "cliente" && (
                <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                  <h3 className="text-sm font-semibold text-zinc-300">
                    Selecione a Loja
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Loja * <span className="text-red-400">(obrigatório)</span>
                    </label>
                    <select
                      required
                      value={formData.clienteData?.lojistaId || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          clienteData: {
                            ...formData.clienteData,
                            lojistaId: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">Selecione uma loja</option>
                      {loadingLojas ? (
                        <option disabled>Carregando lojas...</option>
                      ) : lojas.length === 0 ? (
                        <option disabled>Nenhuma loja cadastrada</option>
                      ) : (
                        lojas.map((loja) => (
                          <option key={loja.id} value={loja.id}>
                            {loja.nome} ({loja.email})
                          </option>
                        ))
                      )}
                    </select>
                    <p className="mt-1 text-xs text-zinc-500">
                      Selecione a loja à qual este cliente pertence. Este campo é obrigatório.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
                >
                  {editingUser ? "Atualizar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

