"use client";

import {
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Heart, Share2, ShieldAlert } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 py-10 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl rounded-xl border border-indigo-500/30 bg-zinc-950/95 p-6 shadow-[0_45px_120px_-60px_rgba(99,102,241,0.75)]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-zinc-700/60 px-2 py-1 text-sm leading-none text-zinc-400 transition hover:border-zinc-500 hover:text-white"
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

  useEffect(() => {
    setItems(composicoes);
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

  const emptyState = items.length === 0;
  const resultsSummaryLabel =
    filters.liked || filters.shared || filters.anonymous
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
      <form className="grid gap-3 rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-4 text-xs text-zinc-400 md:grid-cols-6">
        <label className="flex flex-col gap-1">
          <span>Cliente</span>
          <select
            className={cn(
              "rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-indigo-400 focus:outline-none focus:ring-0",
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
          <span>Produto</span>
          <select
            className={cn(
              "rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-indigo-400 focus:outline-none focus:ring-0",
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
          <span>Período</span>
          <select
            className={cn(
              "rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-indigo-400 focus:outline-none focus:ring-0",
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
            className="h-4 w-4 rounded border border-zinc-600 bg-zinc-900 accent-rose-500"
          />
          Mostrar apenas curtidas
        </label>
        <label className="mt-5 inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.shared}
            onChange={(event) => handleFilterChange({ shared: event.target.checked })}
            className="h-4 w-4 rounded border border-zinc-600 bg-zinc-900 accent-sky-500"
          />
          Apenas enviados
        </label>
        <label className="mt-5 inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.anonymous}
            onChange={(event) =>
              handleFilterChange({ anonymous: event.target.checked })
            }
            className="h-4 w-4 rounded border border-zinc-600 bg-zinc-900 accent-emerald-500"
          />
          Apenas anônimas
        </label>
      </form>

      <div className="text-xs text-zinc-500">
        {items.length} {resultsSummaryLabel}
      </div>

      {emptyState ? (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-10 text-center text-sm text-zinc-400">
          Nenhuma composição encontrada com os filtros selecionados.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => {
            const createdAt = new Date(item.createdAtISO);
            return (
              <article
                key={item.id}
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-zinc-900/50 shadow-[0_25px_60px_-35px_rgba(79,70,229,0.65)] transition hover:-translate-y-1",
                  item.liked
                    ? "border-rose-500/40 shadow-[0_25px_60px_-35px_rgba(244,63,94,0.65)] hover:border-rose-400/60"
                    : "border-zinc-800/60 hover:border-indigo-400/60"
                )}
              >
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
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent opacity-70" />
                  <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-indigo-500/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100">
                    #{String(index + 1).padStart(2, "0")}
                  </div>
                  {item.liked ? (
                    <div className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-full border-2 border-rose-400/80 bg-rose-500/30 backdrop-blur-sm px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-rose-100 shadow-lg shadow-rose-500/50">
                      <Heart className="h-3.5 w-3.5 fill-current animate-pulse" />
                      Favorito
                    </div>
                  ) : null}
                  <div className="absolute left-4 bottom-4 inline-flex items-center gap-2 rounded-full border border-zinc-100/20 bg-zinc-950/60 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-zinc-100">
                    <Share2 className="h-3.5 w-3.5" />
                    {item.shares > 0 ? `${item.shares} envio(s)` : "Sem envios"}
                  </div>
                  {item.isAnonymous ? (
                    <div className="absolute right-4 bottom-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-100">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Avatar IA
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">
                        {item.productName}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {item.customerName}
                      </p>
                    </div>
                    <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                      {formatRelative(createdAt)}
                    </span>
                  </div>
                  
                  {/* Informações de custo e tempo */}
                  {(item.totalCostBRL !== null && item.totalCostBRL !== undefined) || 
                   (item.processingTime !== null && item.processingTime !== undefined) ? (
                    <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-3 space-y-2">
                      {item.totalCostBRL !== null && item.totalCostBRL !== undefined ? (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400">Custo:</span>
                          <span className="font-semibold text-emerald-400">
                            R$ {item.totalCostBRL.toFixed(2)}
                          </span>
                        </div>
                      ) : null}
                      {item.processingTime !== null && item.processingTime !== undefined ? (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400">Tempo:</span>
                          <span className="font-semibold text-indigo-400">
                            {item.processingTime < 1000 
                              ? `${item.processingTime}ms`
                              : item.processingTime < 60000
                              ? `${(item.processingTime / 1000).toFixed(1)}s`
                              : `${(item.processingTime / 60000).toFixed(1)}min`}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleLike(item)}
                        disabled={likePendingId === item.id}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-1 transition",
                          item.liked
                            ? "border-rose-400/60 bg-rose-500/10 text-rose-100 hover:border-rose-300/80"
                            : "border-zinc-700 text-rose-300 hover:border-rose-400 hover:text-rose-200",
                          likePendingId === item.id && "cursor-not-allowed opacity-60"
                        )}
                      >
                        <Heart
                          className={cn(
                            "h-3.5 w-3.5",
                            item.liked ? "fill-current text-rose-300" : undefined
                          )}
                        />
                        {item.liked ? "Curtido" : "Curtir"}
                      </button>
                      <button
                        onClick={() => handleOpenShareModal(item)}
                        disabled={
                          shareSubmitting && shareModal?.item.id === item.id
                        }
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border border-zinc-700 px-2 py-1 text-zinc-300 transition hover:border-indigo-400 hover:text-indigo-200",
                          shareSubmitting &&
                            shareModal?.item.id === item.id &&
                            "cursor-wait opacity-60"
                        )}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        {item.shares > 0 ? `${item.shares} envios` : "Enviar"}
                      </button>
                    </div>
                    <button
                      onClick={() => handleOpenDetails(item)}
                      className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition hover:border-indigo-400 hover:text-indigo-200"
                    >
                      Ver detalhes
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}












