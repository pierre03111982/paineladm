"use client";

import { useState, useEffect } from "react";
import { 
  Eye, Edit, Archive, ArchiveRestore, Trash2, Lock, Unlock,
  ThumbsUp, ThumbsDown, ImageIcon, Gift, Share2, Users2, Tag, 
  History, RefreshCw, Phone, Mail, CheckCircle, ShoppingCart,
  MonitorSmartphone, Radar
} from "lucide-react";
import type { ClienteDoc } from "@/lib/firestore/types";

type ClienteCardProps = {
  cliente: ClienteDoc;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onArchive: (archive: boolean) => void;
  onBlock: (block: boolean) => void;
  onDelete: () => void;
  onUpdateHistory: () => void;
  onCalculateSegmentation: () => void;
  onViewReferrals: () => void;
  shareStats?: {
    totalShares: number;
    totalAccesses: number;
    totalSignups: number;
    totalReferrals: number;
  };
  lastLikedImageUrl?: string | null;
  index: number;
  isAdminView: boolean;
  lojistaId?: string;
};

function formatWhatsApp(whatsapp: string): string {
  const cleaned = whatsapp.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  return whatsapp;
}

function formatName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ClienteCard({
  cliente,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onArchive,
  onBlock,
  onDelete,
  onUpdateHistory,
  onCalculateSegmentation,
  onViewReferrals,
  shareStats,
  lastLikedImageUrl,
  index,
  isAdminView,
  lojistaId,
}: ClienteCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Marcar como montado apenas no cliente
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Resetar estados quando a URL mudar
  useEffect(() => {
    if (lastLikedImageUrl) {
      setImageError(false);
      setImageLoaded(false);
      // Pré-carregar a imagem para verificar se está disponível
      const img = new Image();
      img.src = lastLikedImageUrl;
      img.onload = () => {
        setImageLoaded(true);
        setImageError(false);
      };
      img.onerror = () => {
        setImageError(true);
        setImageLoaded(false);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastLikedImageUrl]);

  // Calcular iniciais (usar nome formatado)
  const formattedName = formatName(cliente.nome);
  const initials = formattedName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "C";

  // Calcular status do Radar de Oportunidades
  // Estado inicial sempre igual no servidor e cliente para evitar hydration mismatch
  const [oportunidadeStatus, setOportunidadeStatus] = useState({
    label: "❄️ Frio",
    color: "bg-blue-100 text-blue-700 border-blue-300"
  });

  // Calcular status apenas no cliente após montagem completa
  useEffect(() => {
    if (!isMounted) return;
    
    try {
      const lastActivity = cliente.updatedAt instanceof Date 
        ? cliente.updatedAt 
        : cliente.createdAt instanceof Date 
          ? cliente.createdAt 
          : null;
      
      if (!lastActivity) {
        setOportunidadeStatus({ label: "❄️ Frio", color: "bg-blue-100 text-blue-700 border-blue-300" });
        return;
      }
      
      const now = Date.now();
      const lastActivityTime = lastActivity.getTime();
      const hoursSinceActivity = (now - lastActivityTime) / (1000 * 60 * 60);
      
      if (hoursSinceActivity < 1) {
        setOportunidadeStatus({ label: "🔥 Quente", color: "bg-red-100 text-red-700 border-red-300" });
      } else if (hoursSinceActivity < 6) {
        setOportunidadeStatus({ label: "🟡 Morno", color: "bg-amber-100 text-amber-700 border-amber-300" });
      } else {
        setOportunidadeStatus({ label: "❄️ Frio", color: "bg-blue-100 text-blue-700 border-blue-300" });
      }
    } catch (error) {
      // Em caso de erro, manter o estado padrão
      console.error("Erro ao calcular status de oportunidade:", error);
    }
  }, [isMounted, cliente.updatedAt, cliente.createdAt]);

  // Construir URLs para navegação
  const lojistaIdParam = lojistaId ? `?lojistaId=${encodeURIComponent(lojistaId)}` : '';
  const profileUrl = `/clientes/${cliente.id}${lojistaIdParam}`;
  const cockpitUrl = `/clientes/${cliente.id}${lojistaId ? `?lojistaId=${encodeURIComponent(lojistaId)}&view=cockpit` : '?view=cockpit'}`;
  
  // Função para navegar para o perfil
  const handleViewProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      window.location.href = profileUrl;
    }
  };

  // Calcular delay da animação de forma estável (apenas no cliente)
  const animationDelay = isMounted ? index * 0.08 : 0;

  return (
    <div
      className="group relative bg-white rounded-lg transition-all duration-300 overflow-hidden"
      style={{
        animation: isMounted ? `fadeInUp 0.5s ease-out ${animationDelay}s both` : 'none',
        border: '2px solid rgba(99, 102, 241, 0.5)',
        backgroundColor: '#ffffff'
      }}
      onMouseEnter={(e) => {
        if (isMounted) {
          e.currentTarget.style.borderColor = 'rgba(30, 58, 138, 1)'; // blue-900
        }
      }}
      onMouseLeave={(e) => {
        if (isMounted) {
          e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
        }
      }}
    >
      {/* NÃO HÁ BARRA DE ÍCONES AQUI - Se você está vendo uma barra cinza, é cache do navegador */}
      <div className="relative p-3">
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                onSelect(e.target.checked);
                // Forçar cor da borda após mudança
                const checkbox = e.target as HTMLInputElement;
                if (checkbox) {
                  checkbox.style.borderColor = '#bfdbfe';
                }
              }}
              className="h-4 w-4 rounded border-2 bg-white text-blue-300 focus:ring-2 focus:ring-blue-300 focus:ring-offset-0 icon-animate-once"
              style={{ 
                borderColor: '#bfdbfe !important' as any,
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                const target = e.target as HTMLInputElement;
                if (target && !target.checked) {
                  target.style.borderColor = '#93c5fd';
                }
              }}
              onMouseLeave={(e) => {
                const target = e.target as HTMLInputElement;
                if (target && !target.checked) {
                  target.style.borderColor = '#bfdbfe';
                }
              }}
            />
          </div>

                  {/* Miniatura Quadrada - Última Composição */}
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative">
                      {lastLikedImageUrl && !imageError ? (
                        <>
                          {/* Placeholder com iniciais enquanto carrega */}
                          {!imageLoaded && (
                            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100 z-10">
                              <span className="text-xs font-semibold text-slate-500">
                                {initials}
                              </span>
                            </div>
                          )}
                          <img
                            src={lastLikedImageUrl}
                            alt={`Última composição de ${cliente.nome}`}
                            className={`w-full h-full object-contain transition-opacity duration-300 ${
                              imageLoaded ? 'opacity-100 z-20' : 'opacity-0'
                            }`}
                            loading="eager"
                            onLoad={() => {
                              setImageLoaded(true);
                              setImageError(false);
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target) {
                                setImageError(true);
                                setImageLoaded(false);
                              }
                            }}
                          />
                        </>
                      ) : cliente.totalComposicoes > 0 ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
                          <ShoppingCart className="h-5 w-5 text-emerald-400" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
                          <span className="text-xs font-semibold text-slate-700">
                            {initials}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

          {/* Informações do Cliente */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{formatName(cliente.nome)}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {cliente.whatsapp ? formatWhatsApp(cliente.whatsapp) : "Sem WhatsApp"}
            </p>
          </div>

          {/* Métricas - Ícones com Números - Alinhamento Fixo */}
          <div className="flex items-center gap-4">
            {/* Likes - VERDE - Largura Fixa */}
            <div className="flex items-center" style={{ width: '60px', minWidth: '60px' }}>
              <div className="flex items-center justify-center" style={{ width: '24px', height: '24px', flexShrink: 0 }}>
                <svg 
                  className="h-5 w-5 icon-animate-once" 
                  style={{ 
                    color: '#10b981',
                    fill: 'none',
                    stroke: '#10b981',
                    strokeWidth: 2,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    display: 'block'
                  }}
                  viewBox="0 0 24 24"
                >
                  <path d="M7 10v12" />
                  <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-3.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-700 leading-none ml-3 whitespace-nowrap">{cliente.totalLikes || 0}</span>
            </div>

            {/* Dislikes - VERMELHO - Largura Fixa */}
            <div className="flex items-center" style={{ width: '60px', minWidth: '60px' }}>
              <div className="flex items-center justify-center" style={{ width: '24px', height: '24px', flexShrink: 0 }}>
                <ThumbsDown 
                  className="h-5 w-5 icon-animate-once" 
                  style={{ 
                    color: '#ef4444',
                    fill: 'none',
                    stroke: '#ef4444',
                    strokeWidth: 2,
                    display: 'block'
                  }} 
                />
              </div>
              <span className="text-sm font-semibold text-gray-700 leading-none ml-3 whitespace-nowrap">{cliente.totalDislikes || 0}</span>
            </div>

            {/* Total de Imagens Geradas - AZUL - Largura Fixa */}
            <div className="flex items-center" style={{ width: '60px', minWidth: '60px' }}>
              <div className="flex items-center justify-center" style={{ width: '24px', height: '24px', flexShrink: 0 }}>
                <svg 
                  className="h-5 w-5 icon-animate-once" 
                  style={{ 
                    color: '#3b82f6',
                    fill: 'none',
                    stroke: '#3b82f6',
                    strokeWidth: 2,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    display: 'block'
                  }}
                  viewBox="0 0 24 24"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-700 leading-none ml-3 whitespace-nowrap">{cliente.totalComposicoes || 0}</span>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Botões de Ação Secundários */}
            <button
              onClick={handleViewProfile}
              className="inline-flex items-center justify-center rounded-2xl border-2 border-blue-500 bg-white p-2.5 transition-all duration-200 shadow-sm hover:shadow-md hover:border-blue-600"
              title="Visualizar Perfil"
            >
              <Eye className="h-4 w-4 icon-animate-once text-blue-500 stroke-blue-500" />
            </button>
            <button
              onClick={handleViewProfile}
              className="inline-flex items-center justify-center rounded-2xl border-2 border-purple-500 bg-white p-2.5 transition-all duration-200 shadow-sm hover:shadow-md hover:border-purple-600"
              title="Editar Perfil"
            >
              <Edit className="h-4 w-4 icon-animate-once text-purple-500 stroke-purple-500" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                window.location.href = cockpitUrl;
              }}
              className="inline-flex items-center justify-center rounded-2xl border-2 border-indigo-500 bg-white p-2.5 transition-all duration-200 shadow-sm hover:shadow-md hover:border-indigo-600"
              title="Cockpit de Vendas"
            >
              <MonitorSmartphone className="h-4 w-4 icon-animate-once text-indigo-500 stroke-indigo-500" />
            </button>
            {cliente.acessoBloqueado ? (
              <button
                onClick={() => onBlock(false)}
                className="inline-flex items-center justify-center rounded-2xl border-2 border-emerald-500 bg-white p-2.5 transition-all duration-200 shadow-sm hover:shadow-md hover:border-emerald-600"
                title="Desbloquear"
              >
                <Unlock className="h-4 w-4 icon-animate-once text-emerald-500 stroke-emerald-500" />
              </button>
            ) : (
              <button
                onClick={() => onBlock(true)}
                className="inline-flex items-center justify-center rounded-2xl border-2 border-red-500 bg-white p-2.5 transition-all duration-200 shadow-sm hover:shadow-md hover:border-red-600"
                title="Bloquear"
              >
                <Lock className="h-4 w-4 icon-animate-once text-red-500 stroke-red-500" />
              </button>
            )}
            {isAdminView && (
              <button
                onClick={onDelete}
                className="inline-flex items-center justify-center rounded-2xl border-2 border-red-500 bg-white p-2.5 transition-all duration-200 shadow-sm hover:shadow-md hover:border-red-600"
                title="Excluir"
              >
                <Trash2 className="h-4 w-4 icon-animate-once text-red-500 stroke-red-500" />
              </button>
            )}
          </div>
        </div>

        {/* Compartilhamento - Linha adicional se houver dados */}
        {shareStats && (shareStats.totalShares > 0 || shareStats.totalReferrals > 0) && (
          <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-blue-600">
              <Share2 className="h-3 w-3 icon-animate-once" />
              <span className="font-medium">{shareStats.totalShares} links</span>
            </div>
            <div className="flex items-center gap-1 text-green-600">
              <Users2 className="h-3 w-3 icon-animate-once" />
              <span className="font-medium">{shareStats.totalReferrals} ref.</span>
            </div>
            {shareStats.totalReferrals > 0 && (
              <button
                onClick={onViewReferrals}
                className="text-indigo-600 hover:underline font-medium text-xs"
              >
                Ver →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
