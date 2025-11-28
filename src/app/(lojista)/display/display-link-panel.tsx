"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Check, AlertCircle, Download } from "lucide-react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { buildClientAppDisplayUrl } from "@/lib/client-app";

type DisplayLinkPanelProps = {
  lojistaId?: string | null;
  panelBaseUrl: string;
};

function resolveDisplayUrl(
  lojistaId: string | null | undefined,
  panelBaseUrl: string
): URL {
  try {
    // Usar buildClientAppDisplayUrl que já retorna a URL completa correta
    let clientAppUrl = buildClientAppDisplayUrl(lojistaId);
    
    console.log("[resolveDisplayUrl] clientAppUrl gerada:", clientAppUrl);
    
    // Garantir que a URL seja absoluta (com https://)
    if (!clientAppUrl.startsWith("http://") && !clientAppUrl.startsWith("https://")) {
      // Se não for absoluta, construir usando o domínio de display
      const isDev = typeof window !== "undefined" && window.location.hostname === "localhost";
      const displayDomain = process.env.NEXT_PUBLIC_DISPLAY_DOMAIN || "display.experimenteai.com.br";
      const protocol = isDev ? "http" : (process.env.NEXT_PUBLIC_DISPLAY_PROTOCOL || "https");
      const base = isDev 
        ? `http://localhost:${process.env.NEXT_PUBLIC_MODELO_2_PORT || "3005"}`
        : `${protocol}://${displayDomain}`;
      clientAppUrl = `${base}${clientAppUrl.startsWith("/") ? clientAppUrl : `/${clientAppUrl}`}`;
    }
    
    // A função já retorna URL absoluta com o path correto: https://display.experimenteai.com.br/[lojistaId]/experimentar
    const target = new URL(clientAppUrl);
    
    console.log("[resolveDisplayUrl] URL parseada:", {
      hostname: target.hostname,
      pathname: target.pathname,
      search: target.search,
      href: target.href
    });

    // Adicionar parâmetros adicionais se necessário
    // O middleware já adiciona display=1, mas vamos garantir
    if (!target.searchParams.has("display")) {
      target.searchParams.set("display", "1");
    }
    
    // Adicionar backend para comunicação com API
    target.searchParams.set("backend", panelBaseUrl);
    
    const finalUrl = target.toString();
    console.log("[resolveDisplayUrl] URL final:", finalUrl);

    return target;
  } catch (error) {
    console.error("[resolveDisplayUrl] Error:", error);
    // Fallback final - usar domínio de display
    const isDev = typeof window !== "undefined" && window.location.hostname === "localhost";
    const displayDomain = process.env.NEXT_PUBLIC_DISPLAY_DOMAIN || "display.experimenteai.com.br";
    const fallbackBase = isDev 
      ? `http://localhost:${process.env.NEXT_PUBLIC_MODELO_2_PORT || "3005"}`
      : `https://${displayDomain}`;
    const fallbackPath = lojistaId ? `/${lojistaId}/experimentar` : "/experimentar";
    const fallbackUrl = new URL(fallbackPath, fallbackBase);
    if (lojistaId) {
      fallbackUrl.searchParams.set("lojista", lojistaId);
    }
    fallbackUrl.searchParams.set("display", "1");
    fallbackUrl.searchParams.set("backend", panelBaseUrl);
    return fallbackUrl;
  }
}

export function DisplayLinkPanel({ lojistaId, panelBaseUrl }: DisplayLinkPanelProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadState, setDownloadState] = useState<"idle" | "success" | "error">(
    "idle"
  );

  const displayUrl = useMemo(() => {
    const url = resolveDisplayUrl(lojistaId ?? null, panelBaseUrl);
    console.log("[DisplayLinkPanel] URL gerada:", url.toString());
    return url;
  }, [
    lojistaId,
    panelBaseUrl,
  ]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const urlString = displayUrl.toString();
    console.log("[DisplayLinkPanel] Gerando QR code para URL:", urlString);

    QRCode.toDataURL(urlString, {
      errorCorrectionLevel: "L",
      width: 448,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then((dataUrl: string) => {
        if (active) {
          setQrDataUrl(dataUrl);
          setLoading(false);
        }
      })
      .catch((error: unknown) => {
        console.error("[DisplayLinkPanel] QR Code error:", error);
        if (active) {
          setQrDataUrl(null);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [displayUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayUrl.toString());
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch (error) {
      console.error("[DisplayLinkPanel] copy error:", error);
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `display-qrcode-${lojistaId || "loja"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadState("success");
    setTimeout(() => setDownloadState("idle"), 2000);
  };

  const handleDownloadPdf = () => {
    if (!qrDataUrl) return;
    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 18;
      const imageSize = pageHeight - margin * 2;

      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(24);
      pdf.text("Display interativo do provador", pageWidth / 2, margin, {
        align: "center",
      });

      pdf.addImage(
        qrDataUrl,
        "PNG",
        margin,
        margin + 10,
        imageSize,
        imageSize
      );

      pdf.setFontSize(12);
      pdf.setFont("Helvetica", "normal");
      pdf.text(
        [
          "Escaneie este QR Code para abrir o display em outro monitor ou tablet.",
          "Mantenha o navegador em tela cheia e com a guia ativa para exibir as composições geradas.",
        ],
        margin + imageSize + 12,
        margin + 20,
        { maxWidth: pageWidth - margin * 2 - imageSize - 12 }
      );

      pdf.setTextColor("#000000");
      pdf.text(
        displayUrl.toString(),
        margin + imageSize + 12,
        margin + 52,
        { maxWidth: pageWidth - margin * 2 - imageSize - 12 }
      );

      pdf.save(`display-provador-${lojistaId || "loja"}.pdf`);
      setDownloadState("success");
      setTimeout(() => setDownloadState("idle"), 2000);
    } catch (error) {
      console.error("[DisplayLinkPanel] pdf error:", error);
      setDownloadState("error");
      setTimeout(() => setDownloadState("idle"), 2000);
    }
  };

  return (
    <section className="neon-card grid gap-6 rounded-2xl p-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 dark:from-cyan-900/30 dark:to-blue-900/30 border-2 border-cyan-400/60 dark:border-cyan-500/60 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300 shadow-lg shadow-cyan-500/30">
          Display da loja
        </span>
        <h2 className="text-lg font-bold text-[var(--text-main)]">
          Leve o provador para vitrines e monitores
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Copie o link oficial do display ou imprima o QR Code para abrir o painel
          em qualquer monitor. Ideal para vitrines, balcões e totens interativos.
        </p>
        <div className="neon-card rounded-xl border-2 border-cyan-300/50 dark:border-cyan-500/50 bg-gradient-to-br from-cyan-50/50 to-blue-50/50 dark:from-cyan-950/30 dark:to-blue-950/30 p-4 text-xs text-cyan-900 dark:text-cyan-200 shadow-sm">
          Dica: deixe o navegador em tela cheia (F11) e fixe esta página no monitor
          para acompanhar novas composições em tempo real.
        </div>
      </div>

      <div className="grid gap-5 neon-card rounded-xl p-5 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[var(--text-main)]">Link dedicado</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Use este link para abrir o display em outro dispositivo ou para fixar no
            navegador do monitor da loja.
          </p>
          <div className="relative">
            <input
              readOnly
              value={displayUrl.toString()}
              className="w-full rounded-xl border-2 border-gray-300/30 dark:border-purple-500/30 bg-[var(--bg-card)]/60 px-3 py-2 pr-20 text-xs text-[var(--text-main)] font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/60 transition"
              style={{ 
                wordBreak: "break-all",
                overflowWrap: "break-word"
              }}
              title={displayUrl.toString()}
            />
          </div>
          <button
            onClick={handleCopy}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-xs font-semibold transition-all",
              copyState === "copied"
                ? "border-emerald-500/60 dark:border-emerald-400/60 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-700 dark:text-emerald-300 shadow-lg shadow-emerald-500/30"
                : copyState === "error"
                ? "border-rose-500/60 dark:border-rose-400/60 bg-gradient-to-r from-rose-500/20 to-pink-500/20 text-rose-700 dark:text-rose-300 shadow-lg shadow-rose-500/30"
                : "border-gray-300 dark:border-gray-600 bg-[var(--bg-card)]/60 text-[var(--text-secondary)] hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:shadow-lg hover:shadow-cyan-500/30"
            )}
          >
            {copyState === "copied" ? (
              <>
                <Check className="h-4 w-4" />
                Copiado
              </>
            ) : copyState === "error" ? (
              <>
                <AlertCircle className="h-4 w-4" />
                Falhou
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copiar link
              </>
            )}
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[var(--text-main)]">QR Code rápido</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Escaneie para abrir o display no tablet ou no monitor secundário da
            loja. Perfeito para vitrines e eventos.
          </p>
          <div className="flex h-32 w-32 items-center justify-center neon-card rounded-xl border-2 border-gray-300/50 dark:border-emerald-500/50 bg-white dark:bg-white shadow-lg">
            {loading ? (
              <span className="text-[10px] uppercase tracking-[0.24em] text-[var(--text-secondary)] font-semibold">
                Gerando...
              </span>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code do display"
                className="h-32 w-32 rounded-lg p-2"
              />
            ) : (
              <span className="text-[10px] uppercase tracking-[0.24em] text-rose-600 dark:text-rose-400 font-semibold">
                Erro
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownloadPng}
              disabled={!qrDataUrl}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-xs font-semibold transition-all",
                qrDataUrl
                  ? "border-gray-300 dark:border-gray-600 bg-[var(--bg-card)]/60 text-[var(--text-secondary)] hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:shadow-lg hover:shadow-cyan-500/30"
                  : "cursor-not-allowed border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-600 opacity-50"
              )}
            >
              <Download className="h-4 w-4" />
              Baixar PNG
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={!qrDataUrl}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-xs font-semibold transition-all",
                qrDataUrl
                  ? "border-gray-300 dark:border-gray-600 bg-[var(--bg-card)]/60 text-[var(--text-secondary)] hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:shadow-lg hover:shadow-cyan-500/30"
                  : "cursor-not-allowed border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-600 opacity-50"
              )}
            >
              <Download className="h-4 w-4" />
              Baixar PDF
            </button>
          </div>
          {downloadState === "success" ? (
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-400/60 dark:border-emerald-500/60 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 dark:from-emerald-900/30 dark:to-teal-900/30 px-3 py-1 text-[10px] font-semibold text-emerald-800 dark:text-emerald-200 shadow-lg shadow-emerald-500/30">
              <Check className="h-3.5 w-3.5" />
              Arquivo baixado
            </div>
          ) : downloadState === "error" ? (
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-rose-400/60 dark:border-rose-500/60 bg-gradient-to-r from-rose-500/20 to-pink-500/20 dark:from-rose-900/30 dark:to-pink-900/30 px-3 py-1 text-[10px] font-semibold text-rose-800 dark:text-rose-200 shadow-lg shadow-rose-500/30">
              <AlertCircle className="h-3.5 w-3.5" />
              Falha ao gerar arquivo
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}




