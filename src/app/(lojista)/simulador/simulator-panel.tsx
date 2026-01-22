"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Smartphone, Download, Copy, Check } from "lucide-react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

interface SimulatorPanelProps {
  simulatorUrl: string;
  initialLojistaId?: string | null;
}

export function SimulatorPanel({ simulatorUrl, initialLojistaId }: SimulatorPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [currentSimulatorUrl, setCurrentSimulatorUrl] = useState(simulatorUrl);

  // Atualizar URL quando simulatorUrl mudar (prop)
  useEffect(() => {
    setCurrentSimulatorUrl(simulatorUrl);
  }, [simulatorUrl]);

  // Gerar QR Code quando URL mudar
  useEffect(() => {
    let active = true;
    setLoading(true);

    QRCode.toDataURL(currentSimulatorUrl, {
      errorCorrectionLevel: "H",
      width: 300,
      margin: 2,
      color: {
        dark: "#22d3ee",
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
        console.error("[SimulatorPanel] QR Code error:", error);
        if (active) {
          setQrDataUrl(null);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentSimulatorUrl]);

  const handleOpenSimulator = () => {
    window.open(currentSimulatorUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `simulador-qrcode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentSimulatorUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Erro ao copiar link:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Coluna Esquerda: Link */}
        <div className="neon-card rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-3 shadow-lg shadow-cyan-500/30">
              <ExternalLink className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">
                Link do Simulador
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Copie o link ou abra em uma nova janela para testar o simulador.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-xl neon-card border-2 border-gray-300/30 bg-[var(--bg-card)]/60">
              <input
                type="text"
                value={currentSimulatorUrl}
                readOnly
                className="flex-1 bg-transparent text-sm text-[var(--text-main)] outline-none font-mono"
              />
              <button
                onClick={handleCopyLink}
                className={cn(
                  "inline-flex items-center gap-2",
                  "rounded-lg border-2 px-4 py-2 text-sm font-semibold",
                  "transition-all",
                  copied
                    ? "border-emerald-500/60 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-700 shadow-lg shadow-emerald-500/30"
                    : "border-gray-300 bg-[var(--bg-card)]/60 text-[var(--text-secondary)] hover:border-cyan-500 hover:text-cyan-600 hover:shadow-lg hover:shadow-cyan-500/30"
                )}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </button>
            </div>

            <button
              onClick={handleOpenSimulator}
              className={cn(
                "w-full flex items-center justify-center gap-3",
                "rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600",
                "px-6 py-4 text-white font-bold",
                "hover:from-cyan-500 hover:to-blue-500",
                "transition-all duration-300",
                "shadow-lg shadow-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/50",
                "transform hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              <ExternalLink className="h-5 w-5" />
              <span>Abrir em Nova Janela</span>
            </button>
          </div>
        </div>

        {/* Coluna Direita: QR Code */}
        <div className="neon-card rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3 shadow-lg shadow-emerald-500/30">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">
                QR Code
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Escaneie o QR Code com a câmera do seu celular para abrir o simulador.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="neon-card rounded-xl border-2 border-gray-300/50 bg-white p-4 shadow-lg">
              {loading ? (
                <div className="w-[300px] h-[300px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-2"></div>
                    <p className="text-xs text-[var(--text-secondary)]">Gerando QR Code...</p>
                  </div>
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code do Simulador"
                  className="w-[300px] h-[300px]"
                />
              ) : (
                <div className="w-[300px] h-[300px] flex items-center justify-center">
                  <p className="text-xs text-red-500 font-semibold">Erro ao gerar QR Code</p>
                </div>
              )}
            </div>

            {qrDataUrl && (
              <button
                onClick={handleDownloadQR}
                className={cn(
                  "inline-flex items-center gap-2",
                  "rounded-lg border-2 border-gray-300 bg-[var(--bg-card)]/60",
                  "px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)]",
                  "hover:border-emerald-500 hover:text-emerald-600",
                  "transition-all hover:shadow-lg hover:shadow-emerald-500/30"
                )}
              >
                <Download className="h-4 w-4" />
                Baixar QR Code
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
