"use client";

import {
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Share2, ShieldAlert, Send, CheckSquare, Square, Filter, X, Sparkles, Eye } from "lucide-react";
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
      <div className="relative w-full max-w-3xl rounded-xl border border-indigo-500 dark:border-indigo-500 bg-white dark:bg-slate-800 p-6 shadow-lg">
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

  useEffect(() => {
    setItems(composicoes);
    // Limpar seleção quando composições mudarem
    setSelectedComposicoes(new Set());
  }, [composicoes]);

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

    if (merged.liked) {
      params.set("liked", "true");
    } else {
      params.delete("liked");
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
    <div className="space-y-6">
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
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline transition-colors"
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

      <form className="neon-card grid grid-cols-1 gap-3 p-4 text-xs md:grid-cols-7">
        <label className="flex flex-col gap-1">
          <span className="font-medium text-[var(--text-secondary)]">Cliente</span>
          <select
            className={cn(
              "rounded-xl border border-transparent bg-[var(--bg-card)]/60 px-3 py-2 text-xs text-[var(--text-main)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition",
              isPending && "cursor-wait opacity-70"
            )}
            value={filters.cliente}
            onChange={(event) =>
              handleFilterChange({ cliente: event.target.value })
            }
          >
            <option value="all">Todos</option>
            {filterOptions.clientes.map((cliente) => (
              <option key={cliente.value} value={cliente.value}>
                {cliente.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium text-[var(--text-secondary)]">Produto</span>
          <select
            className={cn(
              "rounded-xl border border-transparent bg-[var(--bg-card)]/60 px-3 py-2 text-xs text-[var(--text-main)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition",
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
        <label className="flex flex-col gap-1">
          <span className="font-medium text-[var(--text-secondary)]">Período</span>
          <select
            className={cn(
              "rounded-xl border border-transparent bg-[var(--bg-card)]/60 px-3 py-2 text-xs text-[var(--text-main)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition",
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
        <label className="mt-5 inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.liked}
            onChange={(event) => handleFilterChange({ liked: event.target.checked })}
            className="h-4 w-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] accent-rose-500"
          />
          <span className="text-[var(--text-secondary)]">Mostrar apenas curtidas</span>
        </label>
        <label className="mt-5 inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.shared}
            onChange={(event) => handleFilterChange({ shared: event.target.checked })}
            className="h-4 w-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] accent-sky-500"
          />
          <span className="text-[var(--text-secondary)]">Apenas enviados</span>
        </label>
        <label className="mt-5 inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.anonymous}
            onChange={(event) =>
              handleFilterChange({ anonymous: event.target.checked })
            }
            className="h-4 w-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] accent-emerald-500"
          />
          <span className="text-[var(--text-secondary)]">Apenas anônimas</span>
        </label>
        <label className="mt-5 inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.highConversion || false}
            onChange={(event) =>
              handleFilterChange({ highConversion: event.target.checked })
            }
            className="h-4 w-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] accent-purple-500"
          />
          <span className="text-[var(--text-secondary)]">Alta conversão</span>
        </label>
      </form>

      <div className="text-xs font-medium text-[var(--text-secondary)]">
        {items.length} {resultsSummaryLabel}
      </div>

      {emptyState ? (
        <div className="neon-card p-10 text-center text-sm text-[var(--text-secondary)]">
          Nenhuma composição encontrada com os filtros selecionados.
        </div>
      ) : (
        <div className="max-h-[900px] overflow-y-auto pr-1">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => {
            const createdAt = new Date(item.createdAtISO);
            return (
              <article
                key={item.id}
                className={cn(
                  "group relative overflow-hidden neon-card rounded-xl border-2 transition-all hover:-translate-y-1",
                  item.liked
                    ? "border-rose-400/60 dark:border-rose-500/60 shadow-rose-500/20 hover:border-rose-500/80 dark:hover:border-rose-400/80"
                    : "hover:border-indigo-400/60 dark:hover:border-indigo-500/60",
                  selectedComposicoes.has(item.id) && "ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-[var(--bg-app)]"
                )}
              >
                {/* Checkbox de seleção */}
                <div className="absolute left-4 top-4 z-20">
                  <button
                    onClick={() => handleToggleSelection(item.id)}
                    className={cn(
                      "rounded-full border-2 bg-white dark:bg-slate-800 p-1.5 shadow-md transition",
                      selectedComposicoes.has(item.id)
                        ? "border-indigo-500 dark:border-indigo-400 bg-indigo-100 dark:bg-indigo-900/50"
                        : "border-gray-300 dark:border-slate-600 hover:border-indigo-400"
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
                    <div className="absolute right-4 bottom-4 inline-flex items-center gap-2 rounded-full border-2 border-emerald-400/80 dark:border-emerald-500/80 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 dark:from-emerald-900/50 dark:to-teal-900/50 backdrop-blur-sm px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-900 dark:text-emerald-100 shadow-lg shadow-emerald-500/40">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Avatar IA
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center rounded-full border-2 border-indigo-400/60 dark:border-indigo-500/60 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 dark:from-indigo-900/30 dark:to-purple-900/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                          #{String(index + 1).padStart(2, "0")}
                        </span>
                        <p className="text-sm font-bold text-[var(--text-main)]">
                          {item.productName}
                        </p>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {item.customerName}
                      </p>
                    </div>
                    <span className="rounded-full border border-gray-300 dark:border-gray-600 bg-[var(--bg-card)]/60 px-3 py-1 text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">
                      {formatRelative(createdAt)}
                    </span>
                  </div>
                  
                  {/* Informações de tempo */}
                  {item.processingTime !== null && item.processingTime !== undefined ? (
                    <div className="neon-card rounded-lg border-2 border-indigo-300/50 dark:border-indigo-500/50 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/30 p-3 shadow-sm">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[var(--text-secondary)]">Tempo:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {item.processingTime < 1000 
                            ? `${item.processingTime}ms`
                            : item.processingTime < 60000
                            ? `${(item.processingTime / 1000).toFixed(1)}s`
                            : `${(item.processingTime / 60000).toFixed(1)}min`}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => handleOpenShareModal(item)}
                      disabled={
                        shareSubmitting && shareModal?.item.id === item.id
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border-2 border-gray-300 dark:border-gray-600 bg-[var(--bg-card)]/60 px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-all w-full justify-center hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-lg hover:shadow-indigo-500/30",
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
                      className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
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
        </div>
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


































