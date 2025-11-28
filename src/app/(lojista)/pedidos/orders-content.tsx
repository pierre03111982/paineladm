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
} from "lucide-react";
import { useSearchParams } from "next/navigation";

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
  const [orders] = useState(initialOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

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
    const d = date.toDate ? date.toDate() : new Date(date);
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
        <div className="neon-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 shadow-lg shadow-blue-500/30 text-white">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Total</p>
              <p className="text-2xl font-bold text-[var(--text-main)]">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="neon-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-2.5 shadow-lg shadow-amber-500/30 text-white">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Pendentes</p>
              <p className="text-2xl font-bold text-[var(--text-main)]">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="neon-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 p-2.5 shadow-lg shadow-emerald-500/30 text-white">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Pagos</p>
              <p className="text-2xl font-bold text-[var(--text-main)]">{stats.paid}</p>
            </div>
          </div>
        </div>

        <div className="neon-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 p-2.5 shadow-lg shadow-purple-500/30 text-white">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Receita</p>
              <p className="text-2xl font-bold text-[var(--text-main)]">
                R$ {stats.totalRevenue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="neon-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ID ou produto..."
              className="w-full rounded-xl border border-transparent bg-[var(--bg-card)]/60 pl-10 pr-3 py-2 text-sm text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[var(--text-secondary)]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-transparent bg-[var(--bg-card)]/60 px-3 py-2 text-sm text-[var(--text-main)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition"
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
          <div className="neon-card p-8 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-[var(--text-secondary)]" />
            <p className="text-sm text-[var(--text-secondary)]">Nenhum pedido encontrado.</p>
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
      <div className="hidden md:block neon-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-white/10">
            <thead className="bg-white/60 dark:bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Itens
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Data
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-[var(--text-secondary)]">
                    <Package className="mx-auto mb-4 h-12 w-12 text-[var(--text-secondary)]/60" />
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/40 dark:hover:bg-white/5 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-[var(--text-main)]">
                        #{order.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-[var(--text-main)]">
                        {order.items.length} item(s)
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {order.items[0]?.name || "N/A"}
                        {order.items.length > 1 && ` +${order.items.length - 1}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-[var(--text-main)]">
                        R$ {order.total.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setViewingOrder(order)}
                        className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ver
                      </button>
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
    <div className="neon-card p-4 hover:shadow-xl transition">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--text-main)]">Pedido #{order.id.slice(0, 8)}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{formatDate(order.createdAt)}</p>
        </div>
        <div className="ml-2">{getStatusBadge(order.status)}</div>
      </div>
      
      {/* Order Details */}
      <div className="space-y-2 mb-4 pb-3 border-b border-white/20">
        <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
          <span>Itens:</span>
          <span className="text-[var(--text-main)] font-semibold">{order.items.length} produto(s)</span>
        </div>
        {order.items.length > 0 && (
          <p className="text-xs text-[var(--text-secondary)] truncate">
            {order.items[0].name}
            {order.items.length > 1 && ` +${order.items.length - 1} mais`}
          </p>
        )}
        {order.shipping > 0 && (
          <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
            <span>Frete:</span>
            <span className="text-[var(--text-main)] font-semibold">R$ {order.shipping.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Total & Action */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--text-secondary)]">Total</p>
          <p className="text-lg font-bold text-[var(--text-main)]">R$ {order.total.toFixed(2)}</p>
        </div>
        <button
          onClick={onView}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02]"
        >
          <Eye className="h-3.5 w-3.5" />
          Ver
        </button>
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
}: {
  order: Order;
  onClose: () => void;
  getStatusBadge: (status: string) => React.ReactElement;
  formatDate: (date: any) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur">
      <div className="w-full max-w-2xl neon-card max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 border-b border-white/10 bg-[var(--bg-card)]/90 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-main)]">Detalhes do Pedido</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-secondary)] hover:text-white hover:bg-white/10 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Info */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">ID do Pedido</p>
              <p className="text-lg font-semibold text-[var(--text-main)]">#{order.id}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--text-secondary)]">Status</p>
              <div className="mt-1">{getStatusBadge(order.status)}</div>
            </div>
          </div>

          {/* Items */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-main)] mb-3">Itens do Pedido</h3>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex gap-4 rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-main)]">{item.name}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Quantidade: {item.quantity} × R$ {item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--text-main)]">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-white/10 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-[var(--text-secondary)]">
              <span>Subtotal:</span>
              <span className="text-[var(--text-main)] font-medium">R$ {order.subtotal.toFixed(2)}</span>
            </div>
            {order.shipping > 0 && (
              <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                <span>Frete:</span>
                <span className="text-[var(--text-main)] font-medium">R$ {order.shipping.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-white/10">
              <span className="text-base font-semibold text-[var(--text-main)]">Total:</span>
              <span className="text-lg font-bold text-[var(--text-main)]">R$ {order.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-4 border-t border-white/10">
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-1">Data de Criação</p>
              <p className="text-sm text-[var(--text-main)]">{formatDate(order.createdAt)}</p>
            </div>
            {order.updatedAt && (
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">Última Atualização</p>
                <p className="text-sm text-[var(--text-main)]">{formatDate(order.updatedAt)}</p>
              </div>
            )}
            {order.destinationZip && (
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">CEP de Destino</p>
                <p className="text-sm text-[var(--text-main)]">{order.destinationZip}</p>
              </div>
            )}
            {order.payment_gateway && (
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">Gateway de Pagamento</p>
                <p className="text-sm text-[var(--text-main)] capitalize">{order.payment_gateway}</p>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-white/10 bg-[var(--bg-card)]/90 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-full bg-gradient-to-r from-slate-50 to-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 shadow"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

