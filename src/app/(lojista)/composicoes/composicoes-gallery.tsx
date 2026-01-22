"use client";

import {
  useEffect,
  useState,
  useTransition,
  useRef,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Share2, ShieldAlert, Send, CheckSquare, Square, Filter, X, Sparkles, Eye, Search, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMPOSICOES_TIMEFRAMES } from "./constants";

export type ComposicaoItem = {
  id: string;
  productKey: string;
  productName: string;
  customerKey: string;
  customerName: string;
  customerWhatsapp: string | null;
  createdAtISO: string;
  liked: boolean;
  shares: number;
  isAnonymous: boolean;
  status: string;
  palette: {
    from: string;
    via?: string;
    to: string;
  };
  previewUrl: string | null;
  images: Array<{
    url: string | null;
    storagePath?: string;
  }>;
  basePrompt: string | null;
  enhancedPrompt: string | null;
  totalCostBRL?: number | null; // Custo em BRL
  processingTime?: number | null; // Tempo de processamento em milissegundos
};

export type FilterOption = {
  value: string;
  label: string;
};

export type FilterOptions = {
  clientes: FilterOption[];
  produtos: FilterOption[];
};

type WhatsappIntegrationConfig = {
  mode: "link" | "api";
  defaultPhone?: string | null;
  templateName?: string | undefined;
  messageTemplate?: string | undefined;
};

type ActiveFilters = {
  cliente: string;
  produto: string;
  timeframe: string;
  liked: boolean;
  shared: boolean;
  anonymous: boolean;
  highConversion?: boolean;
  minLikes?: number;
  minShares?: number;
};

function formatRelative(date: Date) {
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `há ${days} dia${days > 1 ? "s" : ""}`;
  const weeks = Math.round(days / 7);
  return `há ${weeks} semana${weeks > 1 ? "s" : ""}`;
}

function formatWhatsApp(whatsapp: string | null): string {
  if (!whatsapp) return "";
  const cleaned = whatsapp.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return whatsapp;
}

function formatFullDate(date: Date) {
  return Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function buildShareMessage(
  composition: ComposicaoItem,
  template?: string | null
) {
  if (template && template.trim().length > 0) {
    const placeholders: Record<string, string> = {
      "{{produto}}": composition.productName ?? "",
      "{{cliente}}": composition.customerName ?? "",
      "{{link}}": composition.previewUrl ?? "",
    };
    let output = template;
    Object.entries(placeholders).forEach(([placeholder, value]) => {
      output = output.replace(new RegExp(placeholder, "gi"), value ?? "");
    });
    return output;
  }
  const baseLine = `Olha só esse look "${composition.productName}" criado por IA!`;
  const linkLine = composition.previewUrl
    ? `Veja a imagem: ${composition.previewUrl}`
    : undefined;
  const customerLine = composition.customerName
    ? `Cliente: ${composition.customerName}`
    : undefined;
  return [baseLine, customerLine, linkLine]
    .filter(Boolean)
    .join("\n");
}

function sanitizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 py-10">
      <div className="relative w-full max-w-3xl rounded-xl border border-indigo-500 bg-white p-6 shadow-lg">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-gray-300 px-2 py-1 text-sm leading-none text-slate-600 transition hover:border-gray-400 hover:text-slate-900 hover:bg-gray-50"
          aria-label="Fechar modal"
        >
          ✕
        </button>
        <header className="mb-5 space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-indigo-300/80">
            Galeria de Composições
          </p>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </header>
        {children}
      </div>
    </div>
  );
}

export function ComposicoesGallery({
  composicoes,
  filterOptions,
  filters,
  whatsappIntegration,
  lojistaId,
}: {
  composicoes: ComposicaoItem[];
  filterOptions: FilterOptions;
  filters: ActiveFilters;
  whatsappIntegration?: WhatsappIntegrationConfig;
  lojistaId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(composicoes);
  const [likePendingId, setLikePendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [detailComposition, setDetailComposition] = useState<ComposicaoItem | null>(
    null
  );
  const [shareModal, setShareModal] = useState<{
    item: ComposicaoItem;
    phone: string;
    message: string;
  } | null>(null);
  const [shareSubmitting, setShareSubmitting] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareHelperMessage, setShareHelperMessage] = useState<string | null>(
    null
  );
  const [selectedComposicoes, setSelectedComposicoes] = useState<Set<string>>(
    new Set()
  );
  const [bulkPromotionModal, setBulkPromotionModal] = useState<{
    composicaoIds: string[];
    mensagemTemplate: string;
  } | null>(null);
  const [bulkPromotionSubmitting, setBulkPromotionSubmitting] = useState(false);
  const [bulkPromotionError, setBulkPromotionError] = useState<string | null>(null);
  const [generatingVariations, setGeneratingVariations] = useState<string | null>(null);
  const [variationsModal, setVariationsModal] = useState<{
    composition: ComposicaoItem;
    variations: Array<{ id: string; imageUrl: string; style: string; background: string }>;
  } | null>(null);

  // Estado para paginação
  const [displayedCount, setDisplayedCount] = useState(6); // Mostrar 6 inicialmente (3 colunas x 2 linhas)
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Estado para busca de cliente
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteSuggestions, setClienteSuggestions] = useState<Array<{ id: string; nome: string; whatsapp?: string; label: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para atualização
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Função para atualizar composições
  const refreshComposicoes = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      // Recarregar a página com cache bypass
      startTransition(() => {
        router.refresh();
      });
      // Aguardar um pouco para o refresh processar
      await new Promise(resolve => setTimeout(resolve, 500));
      setLastRefresh(new Date());
    } catch (error) {
      console.error("[ComposicoesGallery] Erro ao atualizar:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Atualização automática a cada 1 minuto
  useEffect(() => {
    const interval = setInterval(() => {
      refreshComposicoes();
    }, 60000); // 60 segundos = 1 minuto

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Ordenar composições do mais recente para o mais antigo (por data de criação)
    const sortedComposicoes = [...composicoes].sort((a, b) => {
      const dateA = new Date(a.createdAtISO).getTime();
      const dateB = new Date(b.createdAtISO).getTime();
      return dateB - dateA; // Mais recente primeiro
    });
    // Limitar às 100 mais recentes apenas se não houver filtros ativos E período não for "all"
    // Se período for "all", mostrar todas (permitir scroll infinito para ver mais antigas)
    const hasActiveFilters = filters.liked || filters.shared || filters.anonymous || filters.highConversion || 
                             filters.cliente !== "all" || filters.produto !== "all";
    const isAllPeriod = filters.timeframe === "all";
    const limitedComposicoes = (hasActiveFilters || isAllPeriod) ? sortedComposicoes : sortedComposicoes.slice(0, 100);
    setItems(limitedComposicoes);
    // Limpar seleção quando composições mudarem
    setSelectedComposicoes(new Set());
    // Resetar paginação quando composições mudarem
    setDisplayedCount(6);
  }, [composicoes]);

  // Scroll infinito - carregar mais quando chegar perto do final
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Quando estiver a 200px do final, carregar mais 6
      if (scrollHeight - scrollTop - clientHeight < 200) {
        setDisplayedCount((prev) => {
          const newCount = prev + 6;
          // Não exceder o total de itens
          return Math.min(newCount, items.length);
        });
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [items.length]);

  const handleFilterChange = (next: Partial<ActiveFilters>) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const merged: ActiveFilters = {
      ...filters,
      ...next,
    };

    if (merged.cliente === "all") {
      params.delete("cliente");
    } else {
      params.set("cliente", merged.cliente);
    }

    if (merged.produto === "all") {
      params.delete("produto");
    } else {
      params.set("produto", merged.produto);
    }

    if (merged.timeframe === "7d") {
      params.delete("periodo");
    } else {
      params.set("periodo", merged.timeframe);
    }

    // Se liked for false, passar explicitamente "liked=false" na URL
    // Se liked for true ou undefined (padrão), não passar parâmetro (será true por padrão)
    if (merged.liked === false) {
      params.set("liked", "false");
    } else {
      params.delete("liked"); // Se true ou undefined, remover parâmetro para usar padrão
    }

    if (merged.shared) {
      params.set("shared", "true");
    } else {
      params.delete("shared");
    }

    if (merged.anonymous) {
      params.set("anonymous", "true");
    } else {
      params.delete("anonymous");
    }

    if (merged.highConversion) {
      params.set("highConversion", "true");
    } else {
      params.delete("highConversion");
    }

    if (merged.minLikes && merged.minLikes > 0) {
      params.set("minLikes", merged.minLikes.toString());
    } else {
      params.delete("minLikes");
    }

    if (merged.minShares && merged.minShares > 0) {
      params.set("minShares", merged.minShares.toString());
    } else {
      params.delete("minShares");
    }

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  const handleOpenDetails = (composition: ComposicaoItem) => {
    setDetailComposition(composition);
  };

  const handleCloseDetails = () => {
    setDetailComposition(null);
  };

  const handleOpenShareModal = (composition: ComposicaoItem) => {
    setShareModal({
      item: composition,
      phone:
        composition.customerWhatsapp ??
        whatsappIntegration?.defaultPhone ??
        "",
      message: buildShareMessage(
        composition,
        whatsappIntegration?.messageTemplate
      ),
    });
    setShareError(null);
    setShareHelperMessage(null);
  };

  const handleShareFieldChange = (field: "phone" | "message", value: string) => {
    setShareModal((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  const handleCopyShareMessage = async () => {
    if (!shareModal) return;
    try {
      await navigator.clipboard.writeText(shareModal.message);
      setShareHelperMessage("Mensagem copiada para a área de transferência.");
      setShareError(null);
    } catch (error) {
      console.error("[ComposicoesGallery] erro ao copiar mensagem:", error);
      setShareError(
        "Não foi possível copiar a mensagem. Copie manualmente antes de enviar."
      );
    }
  };

  const handleCloseShareModal = () => {
    setShareModal(null);
    setShareError(null);
    setShareHelperMessage(null);
  };

  const handleToggleLike = async (composition: ComposicaoItem) => {
    setLikePendingId(composition.id);
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/lojista/composicoes/${composition.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ liked: !composition.liked }),
        }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Não foi possível atualizar a curtida.");
      }
      const data = await response.json();
      setItems((prev) =>
        prev.map((item) =>
          item.id === composition.id ? { ...item, liked: data.liked } : item
        )
      );
      setDetailComposition((prev) =>
        prev && prev.id === composition.id ? { ...prev, liked: data.liked } : prev
      );
      setShareModal((prev) =>
        prev && prev.item.id === composition.id
          ? { ...prev, item: { ...prev.item, liked: data.liked } }
          : prev
      );
      setFeedback({
        type: "success",
        message: data.liked
          ? "Composição marcada como curtida."
          : "Curtida removida.",
      });
    } catch (error) {
      console.error("[ComposicoesGallery] erro ao curtir:", error);
      setFeedback({
        type: "error",
        message: "Falha ao atualizar curtida. Tente novamente.",
      });
    } finally {
      setLikePendingId(null);
    }
  };

  const handleShareConfirm = async () => {
    if (!shareModal) return;
    setShareSubmitting(true);
    setShareError(null);
    setShareHelperMessage(null);

    try {
      const response = await fetch(`/api/lojista/composicoes/${shareModal.item.id}`, {
        method: "POST",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.error || "Não foi possível registrar o compartilhamento."
        );
      }

      setItems((prev) =>
        prev.map((composition) =>
          composition.id === shareModal.item.id
            ? { ...composition, shares: (composition.shares ?? 0) + 1 }
            : composition
        )
      );
      setDetailComposition((prev) =>
        prev && prev.id === shareModal.item.id
          ? { ...prev, shares: (prev.shares ?? 0) + 1 }
          : prev
      );

      const sanitized = sanitizePhone(shareModal.phone);
      const hasApiSupport =
        whatsappIntegration?.mode === "api" && sanitized.length > 0;

      let sentViaApi = false;
      if (hasApiSupport) {
        try {
          // Tentar usar a API de send-whatsapp que já criamos
          const finalLojistaId = lojistaId || "";
          if (!finalLojistaId) {
            throw new Error("LojistaId não disponível");
          }
          const apiResponse = await fetch(
            `/api/lojista/composicoes/send-whatsapp`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                lojistaId: finalLojistaId,
                composicaoId: shareModal.item.id,
                customerWhatsapp: sanitized,
              }),
            }
          );
          if (!apiResponse.ok) {
            const body = await apiResponse.json().catch(() => ({}));
            throw new Error(
              body?.error ||
                "Falha ao enviar mensagem pelo WhatsApp Business."
            );
          }
          sentViaApi = true;
        } catch (error) {
          console.error(
            "[ComposicoesGallery] erro ao enviar mensagem via API:",
            error
          );
          setShareHelperMessage(
            "Não foi possível enviar automaticamente. Abrimos o WhatsApp para você finalizar o envio."
          );
        }
      }

      if (sentViaApi) {
        setFeedback({
          type: "success",
          message: "Mensagem enviada via WhatsApp Business e compartilhamento registrado.",
        });
        setShareHelperMessage(
          "Mensagem disparada automaticamente pelo WhatsApp Business."
        );
        setShareModal(null);
        return;
      }

      const waUrl =
        sanitized.length > 0
          ? `https://wa.me/${sanitized}?text=${encodeURIComponent(
              shareModal.message
            )}`
          : `https://api.whatsapp.com/send?text=${encodeURIComponent(
              shareModal.message
            )}`;

      window.open(waUrl, "_blank", "noopener,noreferrer");

      setFeedback({
        type: "success",
        message: "Compartilhamento aberto no WhatsApp e registrado no painel.",
      });
      setShareHelperMessage(
        "Abrimos o WhatsApp em uma nova aba. Finalize o envio e confirme com o cliente."
      );
      setShareModal(null);
    } catch (error) {
      console.error(
        "[ComposicoesGallery] erro ao registrar compartilhamento:",
        error
      );
      setShareError(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao registrar o compartilhamento."
      );
    } finally {
      setShareSubmitting(false);
    }
  };

  const handleToggleSelection = (composicaoId: string) => {
    setSelectedComposicoes((prev) => {
      const next = new Set(prev);
      if (next.has(composicaoId)) {
        next.delete(composicaoId);
      } else {
        next.add(composicaoId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedComposicoes.size === items.length) {
      setSelectedComposicoes(new Set());
    } else {
      setSelectedComposicoes(new Set(items.map((item) => item.id)));
    }
  };

  const handleOpenBulkPromotion = () => {
    if (selectedComposicoes.size === 0) {
      setFeedback({
        type: "error",
        message: "Selecione pelo menos uma composição para enviar promoção.",
      });
      return;
    }

    const mensagemTemplate =
      whatsappIntegration?.messageTemplate ||
      "Olá {{cliente}}! Temos uma promoção especial para você! Confira o look {{produto}} que criamos para você.";

    setBulkPromotionModal({
      composicaoIds: Array.from(selectedComposicoes),
      mensagemTemplate,
    });
    setBulkPromotionError(null);
  };

  const handleBulkPromotionSubmit = async () => {
    if (!bulkPromotionModal) return;

    setBulkPromotionSubmitting(true);
    setBulkPromotionError(null);

    try {
      const response = await fetch("/api/lojista/composicoes/bulk-promotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          composicaoIds: bulkPromotionModal.composicaoIds,
          mensagemTemplate: bulkPromotionModal.mensagemTemplate,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Erro ao preparar envio massivo");
      }

      const data = await response.json();
      setFeedback({
        type: "success",
        message: `${data.totalClientes} mensagens preparadas para envio!`,
      });
      setBulkPromotionModal(null);
      setSelectedComposicoes(new Set());
    } catch (error) {
      console.error("[ComposicoesGallery] erro ao enviar promoção massiva:", error);
      setBulkPromotionError(
        error instanceof Error ? error.message : "Erro ao enviar promoção massiva"
      );
    } finally {
      setBulkPromotionSubmitting(false);
    }
  };

  const handleGenerateVariations = async (composition: ComposicaoItem) => {
    setGeneratingVariations(composition.id);
    setFeedback(null);

    try {
      // Buscar dados da composição para obter productUrls
      const response = await fetch(`/api/lojista/composicoes/${composition.id}`);
      if (!response.ok) {
        throw new Error("Erro ao buscar dados da composição");
      }

      const compData = await response.json();
      const baseImageUrl = composition.previewUrl || compData.previewUrl;
      const productUrls = compData.productImageUrls || [compData.productImageUrl].filter(Boolean);

      if (!baseImageUrl || productUrls.length === 0) {
        throw new Error("Dados insuficientes para gerar variações");
      }

      const variationsResponse = await fetch("/api/lojista/composicoes/generate-variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageUrl,
          productUrls,
          compositionId: composition.id,
          variationCount: 5,
        }),
      });

      if (!variationsResponse.ok) {
        const body = await variationsResponse.json().catch(() => ({}));
        throw new Error(body.error || "Erro ao gerar variações");
      }

      const variationsData = await variationsResponse.json();
      setVariationsModal({
        composition,
        variations: variationsData.variations || [],
      });

      setFeedback({
        type: "success",
        message: `${variationsData.variations?.length || 0} variações geradas com sucesso!`,
      });
    } catch (error) {
      console.error("[ComposicoesGallery] erro ao gerar variações:", error);
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Erro ao gerar variações",
      });
    } finally {
      setGeneratingVariations(null);
    }
  };

  const emptyState = items.length === 0;
  const resultsSummaryLabel =
    filters.liked || filters.shared || filters.anonymous || filters.highConversion
      ? "resultado(s) filtrado(s)"
      : "composição(ões) recente(s)";

  return (
    <div className="space-y-4">
      {feedback ? (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
            feedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
              : "border-rose-500/40 bg-rose-500/10 text-rose-100"
          )}
        >
          {feedback.message}
        </div>
      ) : null}
      {/* Barra de ações para seleção múltipla */}
      {selectedComposicoes.size > 0 && (
        <div className="neon-card flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[var(--text-main)]">
              {selectedComposicoes.size} composição(ões) selecionada(s)
            </span>
            <button
              onClick={handleSelectAll}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 underline transition-colors"
            >
              {selectedComposicoes.size === items.length ? "Desmarcar todas" : "Selecionar todas"}
            </button>
          </div>
          <button
            onClick={handleOpenBulkPromotion}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02]"
          >
            <Send className="h-4 w-4" />
            Enviar Promoção Massiva
          </button>
        </div>
      )}

      {/* Caixa de Filtros - Layout Compacto */}
      <div className="neon-card -mt-2">
        {/* Título dentro da caixa */}
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-bold text-[var(--text-main)] font-heading">Composições</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Visualize e gerencie todas as composições geradas
          </p>
        </div>
        
        {/* Filtros Compactos */}
        <form className="p-4">
          {/* Primeira linha: Busca de Cliente e Filtros principais */}
          <div className="grid grid-cols-1 gap-3 mb-3 md:grid-cols-4">
            {/* Busca de Cliente com Autocomplete */}
            <div className="relative flex flex-col gap-1.5">
              <span className="font-medium text-xs text-gray-700 mb-0.5">Buscar Cliente</span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={clienteSearch}
                  onChange={async (e) => {
                    const searchTerm = e.target.value;
                    setClienteSearch(searchTerm);
                    
                    // Buscar sugestões via API se tiver 2+ caracteres
                    if (searchTerm.length >= 2 && lojistaId) {
                      try {
                        const response = await fetch(`/api/lojista/clientes/search?q=${encodeURIComponent(searchTerm)}&lojistaId=${lojistaId}`);
                        const data = await response.json();
                        
                        if (data.success && data.clientes) {
                          setClienteSuggestions(data.clientes);
                          setShowSuggestions(data.clientes.length > 0);
                        }
                      } catch (error) {
                        console.error("[ComposicoesGallery] Erro ao buscar clientes:", error);
                        // Fallback: buscar na lista local
                        const suggestions = filterOptions.clientes.filter((cliente) => {
                          const nome = cliente.label.toLowerCase();
                          const search = searchTerm.toLowerCase();
                          return nome.includes(search);
                        }).slice(0, 5);
                        setClienteSuggestions(suggestions.map(c => ({
                          id: c.value,
                          nome: c.label,
                          label: c.label,
                        })));
                        setShowSuggestions(suggestions.length > 0);
                      }
                    } else {
                      setClienteSuggestions([]);
                      setShowSuggestions(false);
                    }
                  }}
                  onFocus={() => {
                    if (clienteSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay para permitir clique nas sugestões
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  placeholder="Nome ou WhatsApp..."
                  className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition"
                />
                
                {/* Sugestões */}
                {showSuggestions && clienteSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {clienteSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => {
                          setClienteSearch(suggestion.label || suggestion.nome);
                          handleFilterChange({ cliente: suggestion.id });
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
                      >
                        {suggestion.label || suggestion.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Produto */}
            <label className="flex flex-col gap-1">
              <span className="font-medium text-xs text-gray-700">Produto</span>
              <select
                className={cn(
                  "rounded-lg border border-transparent bg-[var(--bg-card)]/60 px-3 py-2 text-xs text-[var(--text-main)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition",
                  isPending && "cursor-wait opacity-70"
                )}
                value={filters.produto}
                onChange={(event) =>
                  handleFilterChange({ produto: event.target.value })
                }
              >
                <option value="all">Todos</option>
                {filterOptions.produtos.map((produto) => (
                  <option key={produto.value} value={produto.value}>
                    {produto.label}
                  </option>
                ))}
              </select>
            </label>
            
            {/* Período */}
            <label className="flex flex-col gap-1">
              <span className="font-medium text-xs text-gray-700">Período</span>
              <select
                className={cn(
                  "rounded-lg border border-transparent bg-[var(--bg-card)]/60 px-3 py-2 text-xs text-[var(--text-main)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition",
                  isPending && "cursor-wait opacity-70"
                )}
                value={filters.timeframe}
                onChange={(event) =>
                  handleFilterChange({ timeframe: event.target.value })
                }
              >
                {COMPOSICOES_TIMEFRAMES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            
            {/* Cliente (Select) - para seleção direta */}
            <label className="flex flex-col gap-1">
              <span className="font-medium text-xs text-gray-700">Cliente</span>
              <select
                className={cn(
                  "rounded-lg border border-transparent bg-[var(--bg-card)]/60 px-3 py-2 text-xs text-[var(--text-main)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition",
                  isPending && "cursor-wait opacity-70"
                )}
                value={filters.cliente}
                onChange={(event) => {
                  handleFilterChange({ cliente: event.target.value });
                  if (event.target.value === "all") {
                    setClienteSearch("");
                  }
                }}
              >
                <option value="all">Todos</option>
                {filterOptions.clientes.map((cliente) => (
                  <option key={cliente.value} value={cliente.value}>
                    {cliente.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          
          {/* Segunda linha: Checkboxes compactos */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.shared}
                onChange={(event) => handleFilterChange({ shared: event.target.checked })}
                className="h-4 w-4 rounded border border-gray-300 bg-white accent-sky-500"
              />
              <span className="text-xs font-medium text-gray-700">Compartilhados</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.anonymous}
                onChange={(event) =>
                  handleFilterChange({ anonymous: event.target.checked })
                }
                className="h-4 w-4 rounded border border-gray-300 bg-white accent-emerald-500"
              />
              <span className="text-xs font-medium text-gray-700">Apenas anônimas</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.highConversion || false}
                onChange={(event) =>
                  handleFilterChange({ highConversion: event.target.checked })
                }
                className="h-4 w-4 rounded border border-gray-300 bg-white accent-purple-500"
              />
              <span className="text-xs font-medium text-gray-700">Alta conversão</span>
            </label>
          </div>
        </form>
      </div>

      {emptyState ? (
        <div className="neon-card p-10 text-center text-sm text-[var(--text-secondary)]">
          Nenhuma composição encontrada com os filtros selecionados.
        </div>
      ) : (
        <>
          {/* Header com contador e botão de atualizar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[var(--text-secondary)]">
              {items.length} {resultsSummaryLabel}
              {lastRefresh && (
                <span className="ml-2 text-xs opacity-70">
                  (Atualizado {formatRelative(lastRefresh)})
                </span>
              )}
            </p>
            <button
              onClick={refreshComposicoes}
              disabled={isRefreshing}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-[var(--bg-card)]/60 px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-all hover:border-indigo-500 hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30",
                isRefreshing && "cursor-wait opacity-60"
              )}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
          
          <div 
            ref={scrollContainerRef}
            className="max-h-[900px] overflow-y-auto pr-1"
          >
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {items.slice(0, displayedCount).map((item, index) => {
            const createdAt = new Date(item.createdAtISO);
            return (
              <article
                key={item.id}
                className={cn(
                  "group relative overflow-hidden neon-card rounded-xl border-2 transition-all hover:-translate-y-1",
                  item.liked
                    ? "border-rose-400/60 shadow-rose-500/20 hover:border-rose-500/80"
                    : "hover:border-indigo-400/60",
                  selectedComposicoes.has(item.id) && "ring-2 ring-indigo-500 ring-offset-2 ring-offset-white"
                )}
              >
                {/* Checkbox de seleção */}
                <div className="absolute left-4 top-4 z-20">
                  <button
                    onClick={() => handleToggleSelection(item.id)}
                    className={cn(
                      "rounded-full border-2 bg-white p-1.5 shadow-md transition",
                      selectedComposicoes.has(item.id)
                        ? "border-indigo-500 bg-indigo-100"
                        : "border-gray-300 hover:border-indigo-400"
                    )}
                  >
                    {selectedComposicoes.has(item.id) ? (
                      <CheckSquare className="h-4 w-4 text-indigo-200" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                </div>
                <div
                  className="relative h-56 w-full overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${item.palette.from}, ${
                      item.palette.via ?? item.palette.to
                    }, ${item.palette.to})`,
                  }}
                >
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt={`Composição ${item.id}`}
                      className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        console.warn(`[ComposicoesGallery] Erro ao carregar imagem: ${item.previewUrl}`, e);
                        const target = e.target as HTMLImageElement;
                        // Tentar usar primeira imagem do array se previewUrl falhar
                        if (item.images && item.images.length > 0 && item.images[0]?.url) {
                          target.src = item.images[0].url;
                        } else {
                          // Se não houver fallback, ocultar a imagem
                          target.style.display = 'none';
                        }
                      }}
                    />
                  ) : item.images && item.images.length > 0 && item.images[0]?.url ? (
                    <img
                      src={item.images[0].url}
                      alt={`Composição ${item.id}`}
                      className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        console.warn(`[ComposicoesGallery] Erro ao carregar imagem alternativa: ${item.images[0]?.url}`, e);
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-500">
                      <span className="text-xs">Sem imagem disponível</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent opacity-70" />
                  {item.isAnonymous ? (
                    <div className="absolute right-4 bottom-4 inline-flex items-center gap-2 rounded-full border-2 border-emerald-400/80 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 backdrop-blur-sm px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-900 shadow-lg shadow-emerald-500/40">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Avatar IA
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4 p-5">
                  {/* Informações do Cliente - Layout melhorado */}
                  <div className="space-y-2">
                    {/* Nome do Cliente */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {item.customerName || "Cliente Anônimo"}
                      </p>
                      <span className="inline-flex items-center rounded-full border-2 border-indigo-400/60/60 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                        #{String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    
                    {/* WhatsApp */}
                    {item.customerWhatsapp && (
                      <p className="text-xs font-medium text-gray-700">
                        {formatWhatsApp(item.customerWhatsapp)}
                      </p>
                    )}
                    
                    {/* Data de criação */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-300/50">
                      <p className="text-xs font-medium text-gray-600">
                        {formatFullDate(createdAt)}
                      </p>
                      <span className="text-xs text-gray-500 opacity-80">
                        {formatRelative(createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => handleOpenShareModal(item)}
                      disabled={
                        shareSubmitting && shareModal?.item.id === item.id
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border-2 border-gray-300 bg-[var(--bg-card)]/60 px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-all w-full justify-center hover:border-indigo-500 hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30",
                        shareSubmitting &&
                          shareModal?.item.id === item.id &&
                          "cursor-wait opacity-60"
                      )}
                    >
                      <Share2 className="h-4 w-4" />
                      {item.shares > 0 ? `${item.shares} envios` : "Enviar"}
                    </button>
                    <button
                      onClick={() => handleOpenDetails(item)}
                      className="w-full rounded-lg border-2 border-gray-300 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Ver detalhes
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          </div>
          
          {/* Indicador de mais itens para carregar */}
          {displayedCount < items.length && (
            <div className="col-span-full flex justify-center py-6">
              <div className="text-sm text-[var(--text-secondary)]">
                Carregando mais composições... ({displayedCount} de {items.length})
              </div>
            </div>
          )}
          
          {/* Indicador de fim da lista */}
          {displayedCount >= items.length && items.length > 6 && (
            <div className="col-span-full flex justify-center py-4">
              <div className="text-xs text-[var(--text-secondary)]">
                Todas as {items.length} composições foram carregadas
              </div>
            </div>
          )}
          </div>
      </>
      )}

      {/* Modal de Envio Massivo */}
      {bulkPromotionModal && (
        <Modal
          open={true}
          onClose={() => {
            setBulkPromotionModal(null);
            setBulkPromotionError(null);
          }}
          title="Envio Massivo de Promoções"
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-zinc-300">
                {bulkPromotionModal.composicaoIds.length} composição(ões) selecionada(s)
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                As mensagens serão enviadas para os clientes associados a essas composições.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">
                Template da Mensagem
              </label>
              <textarea
                value={bulkPromotionModal.mensagemTemplate}
                onChange={(e) =>
                  setBulkPromotionModal({
                    ...bulkPromotionModal,
                    mensagemTemplate: e.target.value,
                  })
                }
                rows={6}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none"
                placeholder="Olá {{cliente}}! Temos uma promoção especial para você!"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Use <code className="bg-zinc-800 px-1 rounded">{"{{cliente}}"}</code> para o nome do cliente e{" "}
                <code className="bg-zinc-800 px-1 rounded">{"{{produto}}"}</code> para o nome do produto.
              </p>
            </div>

            {bulkPromotionError && (
              <div className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {bulkPromotionError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => {
                  setBulkPromotionModal(null);
                  setBulkPromotionError(null);
                }}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkPromotionSubmit}
                disabled={bulkPromotionSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                {bulkPromotionSubmitting ? "Enviando..." : "Enviar Promoções"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


































