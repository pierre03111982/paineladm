"use client";

import { useState, useEffect } from "react";
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
import { ClientStyleProfile } from "@/components/clients/ClientStyleProfile";
import { ClientSalesCockpitModal } from "@/app/(lojista)/composicoes/ClientSalesCockpitModal";
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
  const viewParam = searchParams?.get("view");
  
  const backHref = lojistaIdFromUrl 
    ? `/clientes?lojistaId=${lojistaIdFromUrl}`
    : "/clientes";

  // Estado para controlar o cockpit modal
  const [selectedComposition, setSelectedComposition] = useState<any | null>(null);
  const [isCockpitOpen, setIsCockpitOpen] = useState(false);

  // Calcular estatísticas
  const totalComposicoes = cliente.composicoes?.length || 0;
  const totalLikes = cliente.actions?.filter((a: any) => a.type === "like").length || 0;
  const totalDislikes = cliente.actions?.filter((a: any) => a.type === "dislike").length || 0;
  const totalShares = cliente.composicoes?.reduce((sum: number, c: any) => sum + (c.shares || 0), 0) || 0;

  // Abrir cockpit automaticamente se view=cockpit
  useEffect(() => {
    if (viewParam === "cockpit" && cliente.composicoes && cliente.composicoes.length > 0) {
      // Buscar a última composição do cliente
      const lastComposition = cliente.composicoes
        .filter((c: any) => c.imagemUrl || c.imageUrl)
        .sort((a: any, b: any) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        })[0];

      if (lastComposition) {
        // Converter para o formato esperado pelo ClientSalesCockpitModal
        const compositionForModal = {
          id: lastComposition.id,
          imagemUrl: lastComposition.imagemUrl || lastComposition.imageUrl || lastComposition.final_image_url || null,
          createdAt: lastComposition.createdAt?.toDate?.() || new Date(lastComposition.createdAt || Date.now()),
          customerName: cliente.nome || "Cliente",
          customerWhatsapp: cliente.whatsapp || null,
          produtoNome: lastComposition.produtoNome || lastComposition.primaryProductName || "Produto",
          customerId: cliente.id,
        };

        setSelectedComposition(compositionForModal);
        setIsCockpitOpen(true);
      }
    }
  }, [viewParam, cliente.composicoes, cliente.nome, cliente.whatsapp, cliente.id]);

  const closeCockpit = () => {
    setIsCockpitOpen(false);
    setSelectedComposition(null);
    // Remover o parâmetro view da URL sem recarregar a página
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('view');
      window.history.replaceState({}, '', url.toString());
    }
  };
  
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

  // Primeira imagem curtida pelo cliente (para avatar)
  const firstLikedImage = cliente.composicoes?.find((comp: any) => 
    comp.imagemUrl || comp.imageUrl || comp.final_image_url
  )?.imagemUrl || cliente.composicoes?.find((comp: any) => 
    comp.imagemUrl || comp.imageUrl || comp.final_image_url
  )?.imageUrl || cliente.composicoes?.find((comp: any) => 
    comp.imagemUrl || comp.imageUrl || comp.final_image_url
  )?.final_image_url || null;

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-heading">Perfil do Cliente</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Visualize informações e histórico completo</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-md transition-colors">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Avatar - Formato 9:16 */}
          <div className="flex-shrink-0">
            {firstLikedImage ? (
              <div className="relative w-32 h-56 rounded-2xl overflow-hidden border-4 border-indigo-300 dark:border-indigo-500 shadow-xl" style={{ aspectRatio: '9/16' }}>
                <img
                  src={firstLikedImage}
                  alt={cliente.nome || "Cliente"}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="flex w-32 h-56 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 text-4xl font-bold text-indigo-600 dark:text-indigo-300 border-4 border-indigo-300 dark:border-indigo-500 shadow-xl" style={{ aspectRatio: '9/16' }}>
                {cliente.nome ? cliente.nome.charAt(0).toUpperCase() : <User className="h-20 w-20" />}
              </div>
            )}
          </div>

          {/* Info Principal */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white font-heading">{cliente.nome || "Cliente Anônimo"}</h2>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
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
          <div className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-6 shadow-xl hover:shadow-2xl transition-all">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-white dark:bg-emerald-900/40 p-3 shadow-md">
                <DollarSign className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Total Gasto</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                  R$ {cliente.salesStats.totalSpent.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-blue-300 dark:border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 p-6 shadow-xl hover:shadow-2xl transition-all">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-white dark:bg-blue-900/40 p-3 shadow-md">
                <ShoppingCart className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Total Pedidos</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{cliente.salesStats.orderCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-indigo-300 dark:border-indigo-400 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-6 shadow-xl hover:shadow-2xl transition-all">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-white dark:bg-indigo-900/40 p-3 shadow-md">
                <TrendingUp className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">Ticket Médio</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                  R$ {cliente.salesStats.averageTicket.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Engagement Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border-2 border-blue-300 dark:border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 p-6 shadow-xl hover:shadow-2xl transition-all">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white dark:bg-blue-900/40 p-3 shadow-md">
              <ImageIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Composições</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{totalComposicoes}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-6 shadow-xl hover:shadow-2xl transition-all">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white dark:bg-emerald-900/40 p-3 shadow-md">
              <Heart className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Curtidas</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{totalLikes}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-6 shadow-xl hover:shadow-2xl transition-all">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white dark:bg-amber-900/40 p-3 shadow-md">
              <ThumbsDown className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Rejeições</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{totalDislikes}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-purple-300 dark:border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 p-6 shadow-xl hover:shadow-2xl transition-all">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white dark:bg-purple-900/40 p-3 shadow-md">
              <Share2 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Compartilhamentos</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{totalShares}</p>
            </div>
          </div>
        </div>
      </div>

      {/* FASE 3: Dossiê do Cliente - Análise de Estilo pela IA */}
      <ClientStyleProfile cliente={cliente} lojistaId={lojistaId} />

      {/* Produtos Favoritos */}
      {topProducts.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-md transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Produtos Favoritos
          </h3>
          <div className="space-y-2">
            {topProducts.map(([productId, count]) => (
              <div
                key={productId}
                className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 px-4 py-3"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">Produto {productId.slice(0, 8)}</span>
                <span className="text-sm text-gray-600 dark:text-gray-300">{count} curtida(s)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Purchase History */}
      {cliente.orders && cliente.orders.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-md transition-colors">
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
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
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
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
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
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-md transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Composições Recentes</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cliente.composicoes.slice(0, 6).map((comp: any) => {
              const previewUrl = comp.looks?.[0]?.imagemUrl || comp.imagemUrl || comp.imageUrl;
              const createdAt = comp.createdAt?.toDate?.() || new Date(comp.createdAt);
              
              return (
                <div
                  key={comp.id}
                  className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm dark:shadow-md transition hover:shadow-md dark:hover:shadow-lg"
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

      {/* Modal Cockpit de Vendas */}
      {selectedComposition && (
        <ClientSalesCockpitModal
          composition={selectedComposition}
          lojistaId={lojistaId}
          isOpen={isCockpitOpen}
          onClose={closeCockpit}
        />
      )}
    </div>
  );
}

