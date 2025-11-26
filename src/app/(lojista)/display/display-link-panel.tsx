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
    <section className="grid gap-6 rounded-2xl border border-zinc-800/60 bg-zinc-950/40 p-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
          Display da loja
        </span>
        <h2 className="text-lg font-semibold text-white">
          Leve o provador para vitrines e monitores
        </h2>
        <p className="text-sm text-zinc-400">
          Copie o link oficial do display ou imprima o QR Code para abrir o painel
          em qualquer monitor. Ideal para vitrines, balcões e totens interativos.
        </p>
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs text-cyan-100">
          Dica: deixe o navegador em tela cheia (F11) e fixe esta página no monitor
          para acompanhar novas composições em tempo real.
        </div>
      </div>

      <div className="grid gap-5 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">Link dedicado</h3>
          <p className="text-xs text-zinc-500">
            Use este link para abrir o display em outro dispositivo ou para fixar no
            navegador do monitor da loja.
          </p>
          <div className="relative">
            <input
              readOnly
              value={displayUrl.toString()}
              className="w-full rounded-lg border border-zinc-700/60 bg-zinc-900 px-3 py-2 pr-20 text-xs text-zinc-300 font-mono overflow-x-auto"
              style={{ 
                textOverflow: "ellipsis",
                overflowX: "auto",
                whiteSpace: "nowrap"
              }}
              title={displayUrl.toString()}
            />
          </div>
          <button
            onClick={handleCopy}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition",
              copyState === "copied"
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                : copyState === "error"
                ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
                : "border-zinc-700 text-zinc-300 hover:border-cyan-400 hover:text-cyan-200"
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
          <h3 className="text-sm font-semibold text-white">QR Code rápido</h3>
          <p className="text-xs text-zinc-500">
            Escaneie para abrir o display no tablet ou no monitor secundário da
            loja. Perfeito para vitrines e eventos.
          </p>
          <div className="flex h-32 w-32 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-900/80">
            {loading ? (
              <span className="text-[10px] uppercase tracking-[0.24em] text-zinc-600">
                Gerando...
              </span>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code do display"
                className="h-32 w-32 rounded-lg border border-zinc-800/60 bg-white p-2"
              />
            ) : (
              <span className="text-[10px] uppercase tracking-[0.24em] text-rose-500">
                Erro
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownloadPng}
              disabled={!qrDataUrl}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition",
                qrDataUrl
                  ? "border-zinc-700 text-zinc-300 hover:border-cyan-400 hover:text-cyan-200"
                  : "cursor-not-allowed border-zinc-800 text-zinc-600"
              )}
            >
              <Download className="h-4 w-4" />
              Baixar PNG
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={!qrDataUrl}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition",
                qrDataUrl
                  ? "border-zinc-700 text-zinc-300 hover:border-cyan-400 hover:text-cyan-200"
                  : "cursor-not-allowed border-zinc-800 text-zinc-600"
              )}
            >
              <Download className="h-4 w-4" />
              Baixar PDF
            </button>
          </div>
          {downloadState === "success" ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[10px] text-emerald-100">
              <Check className="h-3.5 w-3.5" />
              Arquivo baixado
            </div>
          ) : downloadState === "error" ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-[10px] text-rose-100">
              <AlertCircle className="h-3.5 w-3.5" />
              Falha ao gerar arquivo
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}




