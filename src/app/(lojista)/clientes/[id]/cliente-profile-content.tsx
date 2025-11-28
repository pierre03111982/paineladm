"use client";

import { useState } from "react";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Heart, 
  ThumbsDown, 
  Image as ImageIcon,
  Tag,
  TrendingUp,
  Package,
  Share2,
  CheckCircle,
  XCircle,
  Clock,
  Gift,
  Star,
  DollarSign,
  ShoppingCart,
  Receipt
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
// Helper para formatar data relativa
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours} h atrás`;
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return date.toLocaleDateString("pt-BR");
}

type ClienteProfileContentProps = {
  cliente: any;
  lojistaId: string;
};

export function ClienteProfileContent({ cliente, lojistaId }: ClienteProfileContentProps) {
  const searchParams = useSearchParams();
  const lojistaIdFromUrl = searchParams?.get("lojistaId") || searchParams?.get("lojistald");
  
  const backHref = lojistaIdFromUrl 
    ? `/clientes?lojistaId=${lojistaIdFromUrl}`
    : "/clientes";

  // Calcular estatísticas
  const totalComposicoes = cliente.composicoes?.length || 0;
  const totalLikes = cliente.actions?.filter((a: any) => a.type === "like").length || 0;
  const totalDislikes = cliente.actions?.filter((a: any) => a.type === "dislike").length || 0;
  const totalShares = cliente.composicoes?.reduce((sum: number, c: any) => sum + (c.shares || 0), 0) || 0;
  
  // Tags baseadas em comportamento
  const tags: string[] = [];
  if (totalLikes > 5) tags.push("Cliente Fiel");
  if (totalDislikes > 3) tags.push("Exigente");
  if (totalShares > 10) tags.push("Influenciador");
  if (totalComposicoes > 20) tags.push("Ativo");
  if (cliente.privacy_mode === "private") tags.push("Modo Discreto");
  if (cliente.marketing_consent) tags.push("Aceita Marketing");
  
  // Produtos mais curtidos
  const likedProducts = new Map<string, number>();
  cliente.actions?.forEach((action: any) => {
    if (action.type === "like" && action.product_id) {
      likedProducts.set(action.product_id, (likedProducts.get(action.product_id) || 0) + 1);
    }
  });
  
  const topProducts = Array.from(likedProducts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header com botão voltar */}
      <div className="flex items-center gap-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perfil do Cliente</h1>
          <p className="text-sm text-gray-600 mt-1">Visualize informações e histórico completo</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-md">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-100 text-2xl font-semibold text-indigo-600">
              {cliente.nome ? cliente.nome.charAt(0).toUpperCase() : <User className="h-12 w-12" />}
            </div>
          </div>

          {/* Info Principal */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">{cliente.nome || "Cliente Anônimo"}</h2>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                  {cliente.whatsapp && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{cliente.whatsapp}</span>
                    </div>
                  )}
                  {cliente.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{cliente.email}</span>
                    </div>
                  )}
                  {cliente.createdAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Cliente desde {new Date(cliente.createdAt.toDate?.() || cliente.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tags - Flex Wrap para Mobile */}
            {tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sales Stats Cards - Top Priority */}
      {cliente.salesStats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Gasto</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {cliente.salesStats.totalSpent.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Pedidos</p>
                <p className="text-2xl font-bold text-gray-900">{cliente.salesStats.orderCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-50 p-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ticket Médio</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {cliente.salesStats.averageTicket.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Engagement Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <ImageIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Composições</p>
              <p className="text-2xl font-bold text-gray-900">{totalComposicoes}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2">
              <Heart className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Curtidas</p>
              <p className="text-2xl font-bold text-gray-900">{totalLikes}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2">
              <ThumbsDown className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Rejeições</p>
              <p className="text-2xl font-bold text-gray-900">{totalDislikes}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-50 p-2">
              <Share2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Compartilhamentos</p>
              <p className="text-2xl font-bold text-gray-900">{totalShares}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Produtos Favoritos */}
      {topProducts.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Produtos Favoritos
          </h3>
          <div className="space-y-2">
            {topProducts.map(([productId, count]) => (
              <div
                key={productId}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <span className="text-sm font-medium text-gray-900">Produto {productId.slice(0, 8)}</span>
                <span className="text-sm text-gray-600">{count} curtida(s)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Purchase History */}
      {cliente.orders && cliente.orders.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-gray-600" />
            Histórico de Compras
          </h3>
          <div className="space-y-3">
            {cliente.orders.map((order: any) => {
              const createdAt = order.createdAt?.toDate?.() || new Date(order.createdAt);
              const statusBadge = order.status === "paid" 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : order.status === "pending"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-gray-50 text-gray-700 border-gray-200";
              
              return (
                <div
                  key={order.id}
                  className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-semibold text-gray-900">
                        Pedido #{order.id.slice(0, 8)}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${statusBadge}`}>
                        {order.status === "paid" ? "Pago" : order.status === "pending" ? "Pendente" : order.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{order.items?.length || 0} item(s)</p>
                      <p className="text-xs text-gray-500">
                        {createdAt.toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      R$ {order.total?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Composições Recentes */}
      {cliente.composicoes && cliente.composicoes.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Composições Recentes</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cliente.composicoes.slice(0, 6).map((comp: any) => {
              const previewUrl = comp.looks?.[0]?.imagemUrl || comp.imagemUrl || comp.imageUrl;
              const createdAt = comp.createdAt?.toDate?.() || new Date(comp.createdAt);
              
              return (
                <div
                  key={comp.id}
                  className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  {previewUrl && (
                    <div className="aspect-square w-full overflow-hidden bg-gray-100">
                      <img
                        src={previewUrl}
                        alt="Composição"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {formatRelativeTime(createdAt)}
                      </span>
                      {comp.curtido && (
                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

