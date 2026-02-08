"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Copy, Check, QrCode, Smartphone, Download, Star } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buildClientAppUrlWithModel } from "@/lib/client-app";

type AppClienteContentProps = {
  lojistaId: string;
  perfil: any;
};

export function AppClienteContent({ lojistaId, perfil }: AppClienteContentProps) {
  // Obter modelo do perfil (padrão: modelo 1)
  // O campo no perfil vem como 'appModel' (definido em fetchLojaPerfil)
  // Normalizar para garantir que seja "1", "2" ou "3"
  const modeloRaw = perfil?.appModel || "1";
  const modeloPadrao = (modeloRaw.replace("modelo-", "") as "1" | "2" | "3") || "1";

  // Array com os 3 modelos - SEMPRE mostrar os 3 modelos
  const modelos: Array<{ id: "1" | "2" | "3"; nome: string }> = [
    { id: "1", nome: "Modelo 1" },
    { id: "2", nome: "Modelo 2" },
    { id: "3", nome: "Modelo 3" },
  ];

  // Forçar renderização dos 3 modelos (não usar modelo único)
  // Versão: 2.0 - Sempre mostrar os 3 modelos

  return (
    <div className="space-y-6">
      {/* Descrição */}
      <div className="neon-card rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-[var(--text-main)] mb-3">
          Links e QR Codes dos Modelos
        </h2>
        <p className="text-base font-medium text-[var(--text-secondary)] leading-relaxed">
          Aqui estão os links e QR codes para os 3 modelos disponíveis. O modelo selecionado como padrão nas configurações está destacado.
        </p>
      </div>

      {/* Grid com os 3 Modelos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {modelos.map((modelo) => {
          const isPadrao = modelo.id === modeloPadrao;
          const appClienteUrl = buildClientAppUrlWithModel(lojistaId, modelo.id);

          return (
            <ModeloCard
              key={modelo.id}
              modelo={modelo}
              appClienteUrl={appClienteUrl}
              isPadrao={isPadrao}
              lojistaId={lojistaId}
            />
          );
        })}
      </div>
    </div>
  );
}

// Componente para cada card de modelo
function ModeloCard({
  modelo,
  appClienteUrl,
  isPadrao,
  lojistaId,
}: {
  modelo: { id: "1" | "2" | "3"; nome: string };
  appClienteUrl: string;
  isPadrao: boolean;
  lojistaId: string;
}) {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // Gerar QR Code para este modelo
  useEffect(() => {
    if (appClienteUrl) {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(appClienteUrl)}`;
      setQrCodeUrl(qrUrl);
    }
  }, [appClienteUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(appClienteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleDownloadQrCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `qrcode-app-cliente-${lojistaId}-modelo-${modelo.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  return (
    <div
      className={cn(
        "relative neon-card rounded-2xl border-2 p-7 transition-all hover:scale-[1.02]",
        isPadrao
          ? "border-emerald-400/80 bg-gradient-to-br from-emerald-50/50 to-green-50/50 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/20"
          : "hover:border-indigo-400/50"
      )}
    >
      {/* Badge de Modelo Padrão */}
      {isPadrao && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-emerald-500/50">
            <Star className="h-4 w-4 fill-white" />
            Modelo Padrão
          </span>
        </div>
      )}

      {/* Header do Card */}
      <div className="mb-5 text-center">
        <h3 className={`text-2xl font-bold ${isPadrao ? "text-emerald-700" : "text-[var(--text-main)]"}`}>
          {modelo.nome}
        </h3>
        {isPadrao && (
          <p className="mt-2 text-sm font-semibold text-emerald-600">
            Selecionado nas configurações
          </p>
        )}
      </div>

      {/* Link Input */}
      <div className="mb-5">
        <div className="flex items-start gap-3 neon-card rounded-xl border-2 border-gray-300/50 bg-[var(--bg-card)] p-4">
          <Smartphone className="h-5 w-5 text-indigo-600 shrink-0 mt-1" />
          <div className="flex-1 min-w-0">
            <p
              className="w-full bg-transparent text-base font-bold text-[var(--text-main)] font-mono break-all leading-relaxed select-text cursor-text"
              title={appClienteUrl}
            >
              {appClienteUrl}
            </p>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className={cn(
            "mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg",
            isPadrao
              ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-emerald-500/40"
              : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/40",
            copied && "bg-gradient-to-r from-emerald-500 to-teal-500"
          )}
        >
          {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          {copied ? "Copiado!" : "Copiar Link"}
        </button>
      </div>

      {/* QR Code */}
      <div className="mb-5 flex flex-col items-center space-y-4 neon-card rounded-xl border-2 border-gray-300/30 bg-[var(--bg-card)]/60 p-5">
        <div className="relative h-44 w-44 neon-card rounded-lg border-2 border-gray-300/50 bg-white p-3 shadow-lg">
          {qrCodeUrl ? (
            <img
              src={qrCodeUrl}
              alt={`QR Code do ${modelo.nome}`}
              width={176}
              height={176}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--text-secondary)]">
              <QrCode className="h-14 w-14 animate-pulse" />
            </div>
          )}
        </div>
        <button
          onClick={handleDownloadQrCode}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg",
            isPadrao
              ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/40"
              : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/40"
          )}
        >
          <Download className="h-4 w-4" />
          Baixar QR Code
        </button>
      </div>

      {/* Link para testar */}
      <div className="text-center pt-2">
        <Link
          href={appClienteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 text-sm font-bold transition-all hover:underline ${
            isPadrao
              ? "text-emerald-600 hover:text-emerald-700"
              : "text-indigo-600 hover:text-indigo-700"
          }`}
        >
          <ExternalLink className="h-4 w-4" />
          Testar no navegador
        </Link>
      </div>
    </div>
  );
}
