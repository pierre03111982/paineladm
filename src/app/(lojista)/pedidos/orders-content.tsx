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
    const baseClasses = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium";
    
    switch (status) {
      case "paid":
        return (
          <span className={`${baseClasses} bg-emerald-50 text-emerald-700 border border-emerald-200`}>
            <CheckCircle className="h-3 w-3" />
            Pago
          </span>
        );
      case "pending":
        return (
          <span className={`${baseClasses} bg-amber-50 text-amber-700 border border-amber-200`}>
            <Clock className="h-3 w-3" />
            Pendente
          </span>
        );
      case "cancelled":
      case "rejected":
        return (
          <span className={`${baseClasses} bg-red-50 text-red-700 border border-red-200`}>
            <XCircle className="h-3 w-3" />
            Cancelado
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} bg-gray-50 text-gray-700 border border-gray-200`}>
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
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-md transition-colors">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-md transition-colors">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-md transition-colors">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pagos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.paid}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-md transition-colors">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2">
              <DollarSign className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Receita</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {stats.totalRevenue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ID ou produto..."
              className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-md">
            <Package className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-sm text-gray-500">Nenhum pedido encontrado.</p>
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
      <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Itens
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Data
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    <Package className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        #{order.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {order.items.length} item(s)
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.items[0]?.name || "N/A"}
                        {order.items.length > 1 && ` +${order.items.length - 1}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        R$ {order.total.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setViewingOrder(order)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
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
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-md hover:shadow-lg transition">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Pedido #{order.id.slice(0, 8)}</p>
          <p className="text-xs text-gray-500 mt-0.5">{formatDate(order.createdAt)}</p>
        </div>
        <div className="ml-2">{getStatusBadge(order.status)}</div>
      </div>
      
      {/* Order Details */}
      <div className="space-y-2 mb-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Itens:</span>
          <span className="text-gray-900 font-medium">{order.items.length} produto(s)</span>
        </div>
        {order.items.length > 0 && (
          <p className="text-xs text-gray-500 truncate">
            {order.items[0].name}
            {order.items.length > 1 && ` +${order.items.length - 1} mais`}
          </p>
        )}
        {order.shipping > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Frete:</span>
            <span className="text-gray-900">R$ {order.shipping.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Total & Action */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg font-bold text-gray-900">R$ {order.total.toFixed(2)}</p>
        </div>
        <button
          onClick={onView}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Detalhes do Pedido</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Info */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-600">ID do Pedido</p>
              <p className="text-lg font-semibold text-gray-900">#{order.id}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Status</p>
              <div className="mt-1">{getStatusBadge(order.status)}</div>
            </div>
          </div>

          {/* Items */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Itens do Pedido</h3>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex gap-4 rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Quantidade: {item.quantity} × R$ {item.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="text-gray-900">R$ {order.subtotal.toFixed(2)}</span>
            </div>
            {order.shipping > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Frete:</span>
                <span className="text-gray-900">R$ {order.shipping.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-base font-semibold text-gray-900">Total:</span>
              <span className="text-lg font-bold text-gray-900">R$ {order.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-4 border-t border-gray-200">
            <div>
              <p className="text-xs text-gray-500 mb-1">Data de Criação</p>
              <p className="text-sm text-gray-900">{formatDate(order.createdAt)}</p>
            </div>
            {order.updatedAt && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Última Atualização</p>
                <p className="text-sm text-gray-900">{formatDate(order.updatedAt)}</p>
              </div>
            )}
            {order.destinationZip && (
              <div>
                <p className="text-xs text-gray-500 mb-1">CEP de Destino</p>
                <p className="text-sm text-gray-900">{order.destinationZip}</p>
              </div>
            )}
            {order.payment_gateway && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Gateway de Pagamento</p>
                <p className="text-sm text-gray-900 capitalize">{order.payment_gateway}</p>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

