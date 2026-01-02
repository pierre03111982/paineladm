"use client";

import React, { useState } from "react";
import {
  Package,
  CheckCircle,
  Clock,
  XCircle,
  X,
  DollarSign,
  Eye,
  Filter,
  Search,
  User,
  Phone,
  Trash2,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

type Order = {
  id: string;
  status: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
  }>;
  subtotal: number;
  shipping: number;
  total: number;
  destinationZip?: string;
  payment_gateway?: string;
  customerName?: string;
  customerWhatsapp?: string;
  createdAt: any;
  updatedAt?: any;
};

type OrdersContentProps = {
  initialOrders: Order[];
  stats: {
    total: number;
    pending: number;
    paid: number;
    cancelled: number;
    totalRevenue: number;
  };
  lojistaId: string;
};

export function OrdersContent({ initialOrders, stats, lojistaId }: OrdersContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirmDeleteId || confirmDeleteId !== orderId) {
      // Primeira vez: pedir confirmação
      setConfirmDeleteId(orderId);
      setTimeout(() => setConfirmDeleteId(null), 3000); // Reset após 3s
      return;
    }

    // Segunda vez: deletar
    setDeletingOrderId(orderId);
    
    try {
      const response = await fetch(`/api/lojista/pedidos/${orderId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erro ao excluir pedido");
      }

      // Remover da lista local
      setOrders(orders.filter(o => o.id !== orderId));
      setConfirmDeleteId(null);
      
      // Fechar modal se estiver aberto
      if (viewingOrder?.id === orderId) {
        setViewingOrder(null);
      }

      // Recarregar página para atualizar estatísticas
      router.refresh();
    } catch (error) {
      console.error("Erro ao excluir pedido:", error);
      alert("Erro ao excluir pedido. Tente novamente.");
    } finally {
      setDeletingOrderId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !searchTerm ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const baseClasses =
      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border-2 shadow-sm";
    
    switch (status) {
      case "paid":
        return (
          <span
            className={`${baseClasses} border-emerald-400/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300`}
          >
            <CheckCircle className="h-3 w-3" />
            Pago
          </span>
        );
      case "pending":
        return (
          <span
            className={`${baseClasses} border-amber-400/60 bg-amber-500/10 text-amber-600 dark:text-amber-300`}
          >
            <Clock className="h-3 w-3" />
            Pendente
          </span>
        );
      case "cancelled":
      case "rejected":
        return (
          <span
            className={`${baseClasses} border-red-400/60 bg-red-500/10 text-red-600 dark:text-red-300`}
          >
            <XCircle className="h-3 w-3" />
            Cancelado
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} border-white/30 bg-white/10 text-[var(--text-main)]`}>
            {status}
          </span>
        );
    }
  };

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    
    // Aceitar tanto strings ISO quanto objetos Date ou Timestamps
    let d: Date;
    if (typeof date === 'string') {
      d = new Date(date);
    } else if (date.toDate) {
      d = date.toDate();
    } else if (date instanceof Date) {
      d = date;
    } else {
      return "N/A";
    }
    
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="neon-card p-4 border-blue-500/70 dark:border-indigo-500/70" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03), 0 0 30px rgba(59, 130, 246, 0.4), 0 0 60px rgba(59, 130, 246, 0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shadow-lg shadow-blue-500/30 text-white">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="neon-card p-4 border-amber-500/70 dark:border-orange-500/70" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03), 0 0 30px rgba(245, 158, 11, 0.4), 0 0 60px rgba(245, 158, 11, 0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-2.5 shadow-lg shadow-amber-500/30 text-white">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-gray-400">Pendentes</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="neon-card p-4 border-emerald-500/70 dark:border-emerald-500/70" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03), 0 0 30px rgba(16, 185, 129, 0.4), 0 0 60px rgba(16, 185, 129, 0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 p-2.5 shadow-lg shadow-emerald-500/30 text-white">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-gray-400">Pagos</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.paid}</p>
            </div>
          </div>
        </div>

        <div className="neon-card p-4 border-purple-500/70 dark:border-purple-500/70" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03), 0 0 30px rgba(139, 92, 246, 0.4), 0 0 60px rgba(139, 92, 246, 0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 p-2.5 shadow-lg shadow-purple-500/30 text-white">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-gray-400">Receita</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                R$ {stats.totalRevenue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="neon-card p-4 border-indigo-500/60 dark:border-purple-500/60" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03), 0 0 30px rgba(99, 102, 241, 0.35), 0 0 60px rgba(99, 102, 241, 0.15)' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ID ou produto..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-10 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-400 focus:border-indigo-500 dark:focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500 dark:text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="paid">Pagos</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile: Card View - Stacked Cards */}
      <div className="md:hidden space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="neon-card p-8 text-center border-indigo-500/60 dark:border-purple-500/60" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03), 0 0 30px rgba(99, 102, 241, 0.35), 0 0 60px rgba(99, 102, 241, 0.15)' }}>
            <Package className="mx-auto mb-4 h-12 w-12 text-slate-400 dark:text-gray-500" />
            <p className="text-sm font-medium text-slate-600 dark:text-gray-400">Nenhum pedido encontrado.</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              getStatusBadge={getStatusBadge}
              formatDate={formatDate}
              onView={() => setViewingOrder(order)}
            />
          ))
        )}
      </div>

      {/* Desktop: Table View */}
      <div className="hidden md:block neon-card overflow-hidden border-indigo-500/60 dark:border-purple-500/60" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03), 0 0 30px rgba(99, 102, 241, 0.35), 0 0 60px rgba(99, 102, 241, 0.15)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/60 dark:bg-white/5 border-b border-gray-200/50 dark:border-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-sm uppercase tracking-wider text-slate-700 dark:text-gray-300" style={{ fontWeight: '700' }}>
                  ID
                </th>
                <th className="px-6 py-3 text-left text-sm uppercase tracking-wider text-slate-700 dark:text-gray-300" style={{ fontWeight: '700' }}>
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-sm uppercase tracking-wider text-slate-700 dark:text-gray-300" style={{ fontWeight: '700' }}>
                  Itens
                </th>
                <th className="px-6 py-3 text-left text-sm uppercase tracking-wider text-slate-700 dark:text-gray-300" style={{ fontWeight: '700' }}>
                  Total
                </th>
                <th className="px-6 py-3 text-left text-sm uppercase tracking-wider text-slate-700 dark:text-gray-300" style={{ fontWeight: '700' }}>
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm uppercase tracking-wider text-slate-700 dark:text-gray-300" style={{ fontWeight: '700' }}>
                  Data
                </th>
                <th className="px-6 py-3 text-right text-sm uppercase tracking-wider text-slate-700 dark:text-gray-300" style={{ fontWeight: '700' }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-600 dark:text-gray-400">
                    <Package className="mx-auto mb-4 h-12 w-12 text-slate-400 dark:text-gray-500" />
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-200/50 dark:border-gray-700/50 hover:bg-white/40 dark:hover:bg-white/5 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        #{order.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-slate-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {order.customerName || "Cliente não informado"}
                          </div>
                          {order.customerWhatsapp && (
                            <div className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-gray-400 mt-0.5">
                              <Phone className="h-3 w-3" />
                              {order.customerWhatsapp}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {order.items.length} item(s)
                      </div>
                      <div className="text-xs font-medium text-slate-600 dark:text-gray-400">
                        {order.items[0]?.name || "N/A"}
                        {order.items.length > 1 && ` +${order.items.length - 1}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        R$ {order.total.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600 dark:text-gray-400">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewingOrder(order)}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-purple-600 dark:hover:bg-purple-700 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-all duration-200"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          disabled={deletingOrderId === order.id}
                          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition-all duration-200 ${
                            confirmDeleteId === order.id
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-white dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700'
                          } ${deletingOrderId === order.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={confirmDeleteId === order.id ? "Clique novamente para confirmar" : "Excluir pedido"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deletingOrderId === order.id ? '...' : confirmDeleteId === order.id ? 'Confirmar?' : ''}
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

      {/* Order Detail Modal */}
      {viewingOrder && (
        <OrderDetailModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          getStatusBadge={getStatusBadge}
          formatDate={formatDate}
          onDelete={handleDeleteOrder}
        />
      )}
    </div>
  );
}

// Order Card Component (Mobile) - Clean Enterprise Style
function OrderCard({
  order,
  getStatusBadge,
  formatDate,
  onView,
}: {
  order: Order;
  getStatusBadge: (status: string) => React.ReactElement;
  formatDate: (date: any) => string;
  onView: () => void;
}) {
  return (
    <div className="neon-card p-4 border-indigo-500/60 dark:border-purple-500/60 hover:shadow-lg transition" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03), 0 0 30px rgba(99, 102, 241, 0.35), 0 0 60px rgba(99, 102, 241, 0.15)' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Pedido #{order.id.slice(0, 8)}</p>
          <p className="text-xs font-medium text-slate-600 dark:text-gray-400 mt-0.5">{formatDate(order.createdAt)}</p>
        </div>
        <div className="ml-2">{getStatusBadge(order.status)}</div>
      </div>
      
      {/* Customer Info */}
      {(order.customerName || order.customerWhatsapp) && (
        <div className="mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-indigo-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {order.customerName || "Cliente não informado"}
              </p>
              {order.customerWhatsapp && (
                <div className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-gray-400 mt-1">
                  <Phone className="h-3 w-3" />
                  {order.customerWhatsapp}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Order Details */}
      <div className="space-y-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-gray-400">
          <span>Itens:</span>
          <span className="text-slate-900 dark:text-white font-semibold">{order.items.length} produto(s)</span>
        </div>
        {order.items.length > 0 && (
          <p className="text-xs font-medium text-slate-600 dark:text-gray-400 truncate">
            {order.items[0].name}
            {order.items.length > 1 && ` +${order.items.length - 1} mais`}
          </p>
        )}
        {order.shipping > 0 && (
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-gray-400">
            <span>Frete:</span>
            <span className="text-slate-900 dark:text-white font-semibold">R$ {order.shipping.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Total & Action */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-gray-400">Total</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">R$ {order.total.toFixed(2)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onView}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-purple-600 dark:hover:bg-purple-700 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-all duration-200"
          >
            <Eye className="h-3.5 w-3.5" />
            Ver
          </button>
        </div>
      </div>
    </div>
  );
}

// Order Detail Modal
function OrderDetailModal({
  order,
  onClose,
  getStatusBadge,
  formatDate,
  onDelete,
}: {
  order: Order;
  onClose: () => void;
  getStatusBadge: (status: string) => React.ReactElement;
  formatDate: (date: any) => string;
  onDelete: (orderId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur">
      <div className="w-full max-w-2xl neon-card max-h-[90vh] overflow-y-auto border-indigo-500/60 dark:border-purple-500/60" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03), 0 0 30px rgba(99, 102, 241, 0.4), 0 0 60px rgba(99, 102, 241, 0.2)' }}>
        <div className="sticky top-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Detalhes do Pedido</h2>
            <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Info */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-gray-400">ID do Pedido</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">#{order.id}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-600 dark:text-gray-400">Status</p>
              <div className="mt-1">{getStatusBadge(order.status)}</div>
            </div>
          </div>

          {/* Customer Info */}
          {(order.customerName || order.customerWhatsapp) && (
            <div className="rounded-xl bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/40 dark:via-green-950/40 dark:to-teal-950/40 border-2 border-emerald-400 dark:border-emerald-500 p-5 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-500/20" style={{ boxShadow: '0 4px 6px rgba(16, 185, 129, 0.1), 0 0 20px rgba(16, 185, 129, 0.3), 0 0 40px rgba(16, 185, 129, 0.15)' }}>
              <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-100 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Dados do Cliente
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/60 dark:bg-slate-900/40 rounded-lg p-3 border border-emerald-200/50 dark:border-emerald-700/50">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5 uppercase tracking-wide">Nome</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {order.customerName || "Não informado"}
                  </p>
                </div>
                {order.customerWhatsapp && (
                  <div className="bg-white/60 dark:bg-slate-900/40 rounded-lg p-3 border border-emerald-200/50 dark:border-emerald-700/50">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5 uppercase tracking-wide">WhatsApp</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <a
                        href={`https://wa.me/${order.customerWhatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 hover:underline transition-all"
                      >
                        {order.customerWhatsapp}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Items */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Itens do Pedido</h3>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex gap-4 rounded-xl border-2 border-blue-400 dark:border-blue-500 bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-950/30 dark:to-cyan-950/30 p-4 shadow-md shadow-blue-200/40 dark:shadow-blue-500/20 transition-all hover:shadow-lg hover:shadow-blue-300/50 dark:hover:shadow-blue-400/30"
                  style={{ boxShadow: '0 4px 6px rgba(59, 130, 246, 0.1), 0 0 15px rgba(59, 130, 246, 0.25), 0 0 30px rgba(59, 130, 246, 0.1)' }}
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-16 w-16 rounded-lg object-cover border-2 border-blue-300 dark:border-blue-600"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</p>
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mt-1">
                      Quantidade: {item.quantity} × R$ {item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-blue-700 dark:text-blue-300">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2">
            <div className="flex justify-between text-sm font-medium text-slate-600 dark:text-gray-400">
              <span>Subtotal:</span>
              <span className="text-slate-900 dark:text-white">R$ {order.subtotal.toFixed(2)}</span>
            </div>
            {order.shipping > 0 && (
              <div className="flex justify-between text-sm font-medium text-slate-600 dark:text-gray-400">
                <span>Frete:</span>
                <span className="text-slate-900 dark:text-white">R$ {order.shipping.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-base font-bold text-slate-900 dark:text-white">Total:</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">R$ {order.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">Data de Criação</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{formatDate(order.createdAt)}</p>
            </div>
            {order.updatedAt && (
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">Última Atualização</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{formatDate(order.updatedAt)}</p>
              </div>
            )}
            {order.destinationZip && (
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">CEP de Destino</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{order.destinationZip}</p>
              </div>
            )}
            {order.payment_gateway && (
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">Gateway de Pagamento</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">{order.payment_gateway}</p>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => onDelete(order.id)}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200"
          >
            <Trash2 className="h-4 w-4" />
            Excluir Pedido
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-purple-600 dark:hover:bg-purple-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

