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
  Receipt,
  Edit,
  Save,
  X,
  KeyRound
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
  
  // Estado para edição - sempre habilitado por padrão
  const [isEditing, setIsEditing] = useState(true);
  const [editData, setEditData] = useState({
    nome: cliente.nome || "",
    status: cliente.arquivado ? "inativo" : "ativo",
    observacoes: (cliente as any).observacoes || (cliente as any).obs || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = lojistaIdFromUrl
        ? `/api/lojista/clientes/${cliente.id}?lojistaId=${lojistaIdFromUrl}`
        : `/api/lojista/clientes/${cliente.id}`;
      
      const updateData: any = {
        nome: editData.nome,
        arquivado: editData.status === "inativo",
      };
      
      if (editData.observacoes) {
        updateData.observacoes = editData.observacoes;
      }
      
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) throw new Error("Erro ao atualizar cliente");

      setSuccess("Cliente atualizado com sucesso!");
      setIsEditing(false);
      // Atualizar dados locais
      cliente.nome = editData.nome;
      cliente.arquivado = editData.status === "inativo";
      (cliente as any).observacoes = editData.observacoes;
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar cliente");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!confirm("Tem certeza que deseja resetar a senha deste cliente? Uma nova senha será gerada e enviada.")) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const url = lojistaIdFromUrl
        ? `/api/lojista/clientes/${cliente.id}/reset-password?lojistaId=${lojistaIdFromUrl}`
        : `/api/lojista/clientes/${cliente.id}/reset-password`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Erro ao resetar senha");

      setSuccess("Senha resetada com sucesso! Nova senha foi gerada.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Erro ao resetar senha");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
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

  // Buscar todas as imagens disponíveis das composições - verificar todos os campos possíveis
  const allImages: string[] = [];
  
  if (cliente.composicoes && Array.isArray(cliente.composicoes)) {
    cliente.composicoes.forEach((comp: any) => {
      // Verificar todos os campos possíveis de imagem
      const imageUrl = comp.imagemUrl || comp.imageUrl || comp.final_image_url || 
                       comp.looks?.[0]?.imagemUrl || comp.image_url || 
                       comp.url || comp.photoUrl || comp.photo_url;
      
      if (imageUrl && typeof imageUrl === 'string' && imageUrl.length > 0 && imageUrl.startsWith('http')) {
        allImages.push(imageUrl);
      }
    });
  }

  // Ordenar por data (mais recente primeiro) se tiver createdAt
  const sortedImages = allImages.length > 0 ? [...allImages] : [];
  if (cliente.composicoes && Array.isArray(cliente.composicoes)) {
    const imagesWithDates = cliente.composicoes
      .map((comp: any) => {
        const imageUrl = comp.imagemUrl || comp.imageUrl || comp.final_image_url || 
                         comp.looks?.[0]?.imagemUrl || comp.image_url || 
                         comp.url || comp.photoUrl || comp.photo_url;
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.length > 0 && imageUrl.startsWith('http')) {
          const date = comp.createdAt?.toDate?.() || new Date(comp.createdAt || 0);
          return { imageUrl, date };
        }
        return null;
      })
      .filter((item: any) => item !== null)
      .sort((a: any, b: any) => b.date.getTime() - a.date.getTime());
    
    if (imagesWithDates.length > 0) {
      sortedImages.length = 0;
      sortedImages.push(...imagesWithDates.map((item: any) => item.imageUrl));
    }
  }

  // Última imagem (mais recente) para miniatura
  const thumbnailImage = sortedImages[0] || allImages[0] || null;

  // Últimas 10 imagens geradas pelo cliente para colagem de fundo
  const recentImages = sortedImages.slice(0, 10);

  // Log quando não há imagem disponível
  useEffect(() => {
    if (!thumbnailImage) {
      console.warn('[ClienteProfile] ⚠️ Nenhuma imagem disponível para miniatura', {
        totalComposicoes: cliente.composicoes?.length || 0,
        allImagesCount: allImages.length,
        sortedImagesCount: sortedImages.length
      });
    } else {
      console.log('[ClienteProfile] 🖼️ Imagem selecionada para miniatura:', {
        url: thumbnailImage.substring(0, 80) + '...',
        totalComposicoes: cliente.composicoes?.length || 0
      });
    }
  }, [thumbnailImage]);

  // Debug detalhado
  console.log('[ClienteProfile] 🔍 Busca de Imagens:', {
    totalComposicoes: cliente.composicoes?.length || 0,
    allImagesCount: allImages.length,
    sortedImagesCount: sortedImages.length,
    thumbnailImage: thumbnailImage ? `${thumbnailImage.substring(0, 50)}...` : 'NENHUMA',
    recentImagesCount: recentImages.length,
    primeiraImagem: allImages[0] ? `${allImages[0].substring(0, 50)}...` : 'NENHUMA',
    ultimaImagem: sortedImages[0] ? `${sortedImages[0].substring(0, 50)}...` : 'NENHUMA',
    composicoesSample: cliente.composicoes?.slice(0, 2).map((c: any) => ({
      hasImagemUrl: !!c.imagemUrl,
      hasImageUrl: !!c.imageUrl,
      hasFinalImageUrl: !!c.final_image_url,
      keys: Object.keys(c).slice(0, 5)
    }))
  });

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
          <h1 className="text-2xl font-bold text-blue-600 font-heading">Perfil do Cliente</h1>
          <p className="text-sm text-slate-600 mt-1 font-medium">Visualize informações e histórico completo</p>
        </div>
      </div>

      {/* Profile Card Compacto - Estilo similar às Composições */}
      <div className="group relative overflow-hidden neon-card rounded-xl border-2 border-indigo-400/60 transition-all hover:-translate-y-1 hover:border-indigo-500/80" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.03), 0 0 30px rgba(99, 102, 241, 0.35), 0 0 60px rgba(99, 102, 241, 0.15)' }}>
        {/* Colagem de Fundo com últimas 10 imagens - Nítida e Vertical 9:16 */}
        <div className="relative h-64 w-full overflow-hidden">
          {recentImages.length > 0 ? (
            <>
              {/* Grid de colagem - Imagens verticais 9:16 em linha horizontal */}
              <div className="absolute inset-0 flex gap-0.5">
                {recentImages.slice(0, 10).map((imageUrl, index) => (
                  <div
                    key={index}
                    className="relative flex-1 overflow-hidden bg-slate-300"
                    style={{ aspectRatio: '9/16' }}
                  >
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt={`Composição ${index + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                ))}
              </div>
              {/* Overlay escuro apenas na parte inferior para legibilidade - abaixo da miniatura */}
              <div 
                className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/60 to-transparent" 
                style={{ 
                  zIndex: 2,
                  pointerEvents: 'none' // Permitir cliques através do overlay
                }} 
              />
            </>
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <div className="text-5xl font-bold text-white opacity-80">
                {cliente.nome ? cliente.nome.charAt(0).toUpperCase() : <User className="h-20 w-20 text-white" />}
              </div>
            </div>
          )}
          
          {/* Layout com Miniatura à Esquerda e Dados Verticais */}
          <div className="absolute inset-0 flex items-start gap-4 p-4 z-30">
            {/* NOVA MINIATURA - Abordagem Simples e Direta */}
            <div className="flex-shrink-0">
              <div className="w-28 h-44 sm:w-32 sm:h-52 rounded-xl overflow-hidden border-4 border-white shadow-2xl" style={{ boxShadow: '0 0 0 2px rgba(255, 255, 255, 1), 0 0 30px rgba(99, 102, 241, 0.8)' }}>
                {thumbnailImage ? (
                  <img
                    src={thumbnailImage}
                    alt={cliente.nome || "Cliente"}
                    className="w-full h-full object-cover"
                    onLoad={() => console.log('[ClienteProfile] ✅ Imagem carregada:', thumbnailImage)}
                    onError={(e) => {
                      console.error('[ClienteProfile] ❌ Erro ao carregar:', thumbnailImage);
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {cliente.nome ? cliente.nome.charAt(0).toUpperCase() : <User className="h-12 w-12 text-white" />}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Info Principal - Alinhado Verticalmente à Esquerda */}
            <div className="flex-1 flex flex-col justify-start min-w-0 pt-2 z-30">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 font-heading" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.9), 0 0 10px rgba(0, 0, 0, 0.6)' }}>
                {cliente.nome || "Cliente Anônimo"}
              </h2>
              
              <div className="flex flex-col gap-2" style={{ zIndex: 35 }}>
                {cliente.whatsapp && (
                  <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-full px-3 py-1.5 w-fit border border-gray-300 shadow-lg">
                    <Phone className="h-4 w-4 text-gray-700" />
                    <span className="font-semibold text-gray-900 text-sm">{cliente.whatsapp}</span>
                  </div>
                )}
                {cliente.email && (
                  <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-full px-3 py-1.5 w-fit border border-gray-300 shadow-lg">
                    <Mail className="h-4 w-4 text-gray-700" />
                    <span className="font-semibold text-gray-900 text-sm truncate max-w-[200px]">{cliente.email}</span>
                  </div>
                )}
                {cliente.createdAt && (
                  <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-full px-3 py-1.5 w-fit border border-gray-300 shadow-lg">
                    <Calendar className="h-4 w-4 text-gray-700" />
                    <span className="font-semibold text-gray-900 text-sm">
                      Cliente desde {new Date(cliente.createdAt.toDate?.() || cliente.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                )}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {tags.slice(0, 2).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white/90 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-lg"
                      >
                        <Tag className="h-3.5 w-3.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards - Dentro do mesmo card */}
        <div className="p-4 bg-white">
          {/* Sales Stats - Se existir */}
          {cliente.salesStats && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-400/60 bg-emerald-50/50">
                <div className="rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 p-1.5 shadow-md text-white">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-emerald-700 truncate">Total Gasto</p>
                  <p className="text-lg font-bold text-slate-900 truncate">
                    R$ {cliente.salesStats.totalSpent.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-blue-400/60 bg-blue-50/50">
                <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-1.5 shadow-md text-white">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-blue-700 truncate">Pedidos</p>
                  <p className="text-lg font-bold text-slate-900">{cliente.salesStats.orderCount}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-purple-400/60 bg-purple-50/50">
                <div className="rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 p-1.5 shadow-md text-white">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-purple-700 truncate">Ticket Médio</p>
                  <p className="text-lg font-bold text-slate-900 truncate">
                    R$ {cliente.salesStats.averageTicket.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Engagement Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-blue-400/60 bg-blue-50/50">
              <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-1.5 shadow-md text-white">
                <ImageIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-blue-700 truncate">Composições</p>
                <p className="text-lg font-bold text-slate-900">{totalComposicoes}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-400/60 bg-emerald-50/50">
              <div className="rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 p-1.5 shadow-md text-white">
                <Heart className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-emerald-700 truncate">Curtidas</p>
                <p className="text-lg font-bold text-slate-900">{totalLikes}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-400/60 bg-amber-50/50">
              <div className="rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 p-1.5 shadow-md text-white">
                <ThumbsDown className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-amber-700 truncate">Rejeições</p>
                <p className="text-lg font-bold text-slate-900">{totalDislikes}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-purple-400/60 bg-purple-50/50">
              <div className="rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 p-1.5 shadow-md text-white">
                <Share2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-purple-700 truncate">Compartilhamentos</p>
                <p className="text-lg font-bold text-slate-900">{totalShares}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PHASE 29: Seção de DNA de Estilo */}
      {cliente.dnaEstilo && (
        <div className="neon-card rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-indigo-500" />
            DNA de Estilo (IA)
          </h3>
          
          <div className="space-y-6">
            {/* Top Cores */}
            {cliente.dnaEstilo.coresPreferidas && Object.keys(cliente.dnaEstilo.coresPreferidas).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Cores Preferidas</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(cliente.dnaEstilo.coresPreferidas)
                    .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
                    .slice(0, 5)
                    .map(([cor, score]) => (
                      <div
                        key={cor}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
                      >
                        <div
                          className="h-4 w-4 rounded-full border border-gray-300"
                          style={{
                            backgroundColor: cor.toLowerCase() === "preto" ? "#000000" :
                                           cor.toLowerCase() === "branco" ? "#ffffff" :
                                           cor.toLowerCase() === "azul" ? "#3b82f6" :
                                           cor.toLowerCase() === "vermelho" ? "#ef4444" :
                                           cor.toLowerCase() === "verde" ? "#10b981" :
                                           cor.toLowerCase() === "amarelo" ? "#fbbf24" :
                                           cor.toLowerCase() === "rosa" ? "#ec4899" :
                                           cor.toLowerCase() === "roxo" ? "#a855f7" :
                                           cor.toLowerCase() === "bege" ? "#f5f5dc" :
                                           cor.toLowerCase() === "marrom" ? "#8b4513" :
                                           cor.toLowerCase() === "cinza" ? "#6b7280" :
                                           cor.toLowerCase() === "laranja" ? "#f97316" :
                                           "#9ca3af",
                          }}
                        />
                        <span className="text-sm font-medium text-gray-900 capitalize">{cor}</span>
                        <span className="text-xs text-gray-500">({String(score)})</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Tecidos Favoritos */}
            {cliente.dnaEstilo.tecidosPreferidos && Object.keys(cliente.dnaEstilo.tecidosPreferidos).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Tecidos Favoritos</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(cliente.dnaEstilo.tecidosPreferidos)
                    .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
                    .slice(0, 5)
                    .map(([tecido, score]) => (
                      <div
                        key={tecido}
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5"
                      >
                        <span className="text-sm font-medium text-indigo-700 capitalize">{tecido}</span>
                        <span className="text-xs text-indigo-500 ml-2">({String(score)})</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Nuvem de Interesse (Tags) */}
            {cliente.dnaEstilo.tagsInteresse && Object.keys(cliente.dnaEstilo.tagsInteresse).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Nuvem de Interesse</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(cliente.dnaEstilo.tagsInteresse)
                    .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
                    .slice(0, 10)
                    .map(([tag, score]) => (
                      <div
                        key={tag}
                        className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5"
                      >
                        <span className="text-sm font-medium text-purple-700 capitalize">{tag}</span>
                        <span className="text-xs text-purple-500 ml-2">({String(score)})</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Faixa de Preço Média */}
            {cliente.dnaEstilo.faixaPrecoMedia > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Faixa de Preço Média</h4>
                <p className="text-lg font-bold text-indigo-600">
                  R$ {cliente.dnaEstilo.faixaPrecoMedia.toFixed(2)}
                </p>
              </div>
            )}

            {/* Tamanhos Provados */}
            {cliente.dnaEstilo.tamanhosProvados && Object.keys(cliente.dnaEstilo.tamanhosProvados).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Tamanhos Mais Provados</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(cliente.dnaEstilo.tamanhosProvados)
                    .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
                    .map(([tamanho, score]) => (
                      <div
                        key={tamanho}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5"
                      >
                        <span className="text-sm font-medium text-gray-900">{tamanho}</span>
                        <span className="text-xs text-gray-500 ml-2">({String(score)})</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Sugestão de Abordagem (IA Gerada) */}
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
              <h4 className="text-sm font-semibold text-indigo-700 mb-2">💡 Sugestão de Abordagem</h4>
              <p className="text-sm text-indigo-800">
                {(() => {
                  const cores = Object.entries(cliente.dnaEstilo.coresPreferidas || {})
                    .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
                    .slice(0, 2)
                    .map(([cor]) => String(cor));
                  const tecidos = Object.entries(cliente.dnaEstilo.tecidosPreferidos || {})
                    .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
                    .slice(0, 2)
                    .map(([tecido]) => String(tecido));
                  const tags = Object.entries(cliente.dnaEstilo.tagsInteresse || {})
                    .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
                    .slice(0, 3)
                    .map(([tag]) => String(tag));
                  
                  let sugestao = "Este cliente ";
                  if (cores.length > 0) {
                    sugestao += `prefere tons de ${cores.join(" e ")}. `;
                  }
                  if (tecidos.length > 0) {
                    sugestao += `Gosta de tecidos como ${tecidos.join(" e ")}. `;
                  }
                  if (tags.length > 0) {
                    sugestao += `Interesse em looks de ${tags.join(", ")}. `;
                  }
                  if (cliente.dnaEstilo.faixaPrecoMedia > 0) {
                    sugestao += `Faixa de preço média: R$ ${cliente.dnaEstilo.faixaPrecoMedia.toFixed(2)}. `;
                  }
                  sugestao += "Ofereça produtos alinhados a essas preferências.";
                  
                  return sugestao;
                })()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Seção de Edição */}
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <Edit className="h-3.5 w-3.5 text-indigo-500" />
            Editar Informações
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setEditData({
                  nome: cliente.nome || "",
                  status: cliente.arquivado ? "inativo" : "ativo",
                  observacoes: (cliente as any).observacoes || (cliente as any).obs || "",
                });
              }}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <X className="h-3 w-3" />
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-500 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-3 w-3" />
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-2 rounded border border-red-500/60 bg-red-500/10 px-2 py-1 text-[11px] text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-2 rounded border border-emerald-500/60 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200">
            {success}
          </div>
        )}

        <div className="space-y-2">
          {/* Primeira linha: ID e Nome lado a lado */}
          <div className="grid grid-cols-2 gap-2">
            {/* ID do Cliente (somente leitura) */}
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                ID (não alterável)
              </label>
              <input
                type="text"
                value={cliente.id}
                disabled
                className="w-full rounded border border-gray-300 bg-gray-100 px-2 py-1 text-[11px] text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Nome */}
            <div>
              <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                Nome *
              </label>
              <input
                type="text"
                required
                value={editData.nome}
                onChange={(e) => setEditData({ ...editData, nome: e.target.value })}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Segunda linha: Status e Resetar Senha lado a lado */}
          <div className="grid grid-cols-2 gap-2">
            {/* Status */}
            <div>
              <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                Status
              </label>
              <select
                value={editData.status}
                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-900 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>

            {/* Resetar Senha */}
            <div>
              <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
                Senha
              </label>
              <button
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded border-2 border-red-500 bg-white px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <KeyRound className="h-3 w-3 text-red-600" />
                Resetar Senha
              </button>
            </div>
          </div>

          {/* Terceira linha: Observações (largura total) */}
          <div>
            <label className="block text-[10px] font-medium text-gray-700 mb-0.5">
              Observações
            </label>
            <textarea
              value={editData.observacoes}
              onChange={(e) => setEditData({ ...editData, observacoes: e.target.value })}
              rows={2}
              className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-900 focus:border-indigo-500 focus:outline-none"
              placeholder="Adicione observações sobre o cliente..."
            />
          </div>
        </div>
      </div>

      <ClientStyleProfile
        cliente={cliente}
        lojistaId={lojistaId}
      />

      {/* Produtos Favoritos */}
      {topProducts.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md transition-colors">
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
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md transition-colors">
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
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md transition-colors">
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

