"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Copy, Check, QrCode, Smartphone, Download } from "lucide-react";
import Link from "next/link";

type AppClienteContentProps = {
  lojistaId: string;
  perfil: any;
};

// Função para construir URL do app cliente baseado no modelo
function buildClientAppUrlWithModel(lojistaId: string, modelo: "1" | "2" | "3" = "1"): string {
  const isDev = process.env.NODE_ENV === "development";
  
  // Mapeamento de portas por modelo (ATUALIZADO PARA PORTAS CORRETAS)
  const portMap: Record<"1" | "2" | "3", string> = {
    "1": process.env.NEXT_PUBLIC_MODELO_1_PORT || "3004",
    "2": process.env.NEXT_PUBLIC_MODELO_2_PORT || "3005",
    "3": process.env.NEXT_PUBLIC_MODELO_3_PORT || "3010",
  };

  let baseUrl: string;
  
  if (isDev) {
    // Em desenvolvimento, usar localhost com porta específica do modelo
    baseUrl = `http://localhost:${portMap[modelo]}`;
  } else {
    // Em produção, usar URLs oficiais
    const modeloUrls: Record<"1" | "2" | "3", string> = {
      "1": "https://app.experimenteai.com.br",
      "2": "https://app2.experimenteai.com.br",
      "3": "https://app3.experimenteai.com.br",
    };
    baseUrl = modeloUrls[modelo] || modeloUrls["1"];
  }
  
  // A URL padrão já inclui o ID e acessa os dados da loja
  return `${baseUrl}/${lojistaId}/login`;
}

export function AppClienteContent({ lojistaId, perfil }: AppClienteContentProps) {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // Obter modelo do perfil (padrão: modelo 1)
  // O campo no perfil vem como 'appModel' (definido em fetchLojaPerfil)
  // Normalizar para garantir que seja "1", "2" ou "3"
  const modeloRaw = perfil?.appModel || "1";
  const modeloSelecionado = (modeloRaw.replace("modelo-", "") as "1" | "2" | "3") || "1";

  // Construir URL do app cliente usando o modelo selecionado
  const appClienteUrl = buildClientAppUrlWithModel(lojistaId, modeloSelecionado);

  // Gerar QR Code
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
      link.download = `qrcode-app-cliente-${lojistaId}-modelo-${modeloSelecionado}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Card Principal */}
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/40 p-8 shadow-lg backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
          
          {/* Lado Esquerdo: Link e Informações */}
          <div className="flex-1 space-y-6 w-full">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-200 mb-3">
                Modelo {modeloSelecionado} Selecionado
              </span>
              <h2 className="text-2xl font-bold text-white">
                Seu Link Exclusivo
              </h2>
              <p className="text-base text-zinc-400 mt-2">
                Este link carrega automaticamente o <strong>Modelo {modeloSelecionado}</strong> com o nome, logotipo e produtos da sua loja.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900/70 p-4 shadow-inner">
                <Smartphone className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                <input
                  type="text"
                  readOnly
                  value={appClienteUrl}
                  className="flex-1 bg-transparent text-sm text-white outline-none font-mono"
                />
              </div>
              <button
                onClick={handleCopy}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 text-sm font-medium text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 active:scale-95"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado!" : "Copiar Link"}
              </button>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <Link
                href={appClienteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Testar link no navegador
              </Link>
            </div>
          </div>

          {/* Lado Direito: QR Code em destaque */}
          <div className="flex flex-col items-center space-y-4 bg-white/5 p-6 rounded-2xl border border-white/10">
            <div className="relative h-56 w-56 rounded-xl bg-white p-3 shadow-2xl">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="QR Code do Aplicativo Cliente"
                  width={224}
                  height={224}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-500">
                  <QrCode className="h-16 w-16 animate-pulse" />
                </div>
              )}
            </div>
            <button
              onClick={handleDownloadQrCode}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-800/80 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Baixar QR Code PNG
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
