"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Copy, Check, QrCode, Smartphone, Download, Star } from "lucide-react";
import Link from "next/link";

type AppClienteContentProps = {
  lojistaId: string;
  perfil: any;
};

// Função para construir URL do app cliente baseado no modelo
function buildClientAppUrlWithModel(lojistaId: string, modelo: "1" | "2" | "3" = "1"): string {
  // Detectar ambiente (client-side e server-side)
  const isDev = 
    (typeof window === "undefined" && process.env.NODE_ENV === "development") ||
    (typeof window !== "undefined" && window.location.hostname === "localhost");
  
  // Mapeamento de subdomínios por modelo (PROFISSIONAL)
  // Prioridade: Variável de ambiente > Subdomínio padrão > Fallback localhost
  const modeloSubdomains: Record<"1" | "2" | "3", string> = {
    "1": process.env.NEXT_PUBLIC_MODELO_1_URL || process.env.NEXT_PUBLIC_MODELO_1_SUBDOMAIN || "app1.experimenteai.com.br",
    "2": process.env.NEXT_PUBLIC_MODELO_2_URL || process.env.NEXT_PUBLIC_MODELO_2_SUBDOMAIN || "app2.experimenteai.com.br",
    "3": process.env.NEXT_PUBLIC_MODELO_3_URL || process.env.NEXT_PUBLIC_MODELO_3_SUBDOMAIN || "app3.experimenteai.com.br",
  };

  // Mapeamento de portas por modelo (apenas para desenvolvimento local)
  const portMap: Record<"1" | "2" | "3", string> = {
    "1": process.env.NEXT_PUBLIC_MODELO_1_PORT || "3004",
    "2": process.env.NEXT_PUBLIC_MODELO_2_PORT || process.env.NEXT_PUBLIC_MODELO_2_PORT || "3005",
    "3": process.env.NEXT_PUBLIC_MODELO_3_PORT || "3010",
  };

  let baseUrl: string;
  
  if (isDev) {
    // Em desenvolvimento, verificar se há variável de ambiente para subdomínio local
    // Se não houver, usar localhost com porta
    const devSubdomain = modeloSubdomains[modelo];
    if (devSubdomain && !devSubdomain.includes("experimenteai.com.br")) {
      // Se a variável apontar para um subdomínio local (ex: modelo1.local)
      baseUrl = `http://${devSubdomain}`;
    } else {
      // Fallback: usar localhost com porta
      baseUrl = `http://localhost:${portMap[modelo]}`;
    }
  } else {
    // Em produção, usar subdomínios profissionais
    const subdomain = modeloSubdomains[modelo];
    // Garantir que tenha protocolo https
    baseUrl = subdomain.startsWith("http") ? subdomain : `https://${subdomain}`;
  }
  
  // Log para debug (apenas em desenvolvimento)
  if (isDev) {
    console.log(`[buildClientAppUrlWithModel] Modelo ${modelo}:`, {
      isDev,
      baseUrl,
      lojistaId,
      finalUrl: `${baseUrl}/${lojistaId}/login`
    });
  }
  
  // A URL padrão já inclui o ID e acessa os dados da loja
  return `${baseUrl}/${lojistaId}/login`;
}

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
      <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-md">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Links e QR Codes dos Modelos
        </h2>
        <p className="text-base text-slate-600 dark:text-slate-300">
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
      className={`relative rounded-2xl border-2 p-6 shadow-md dark:shadow-lg transition-all ${
        isPadrao
          ? "border-green-500 dark:border-green-500 bg-green-50 dark:bg-green-900/30 ring-2 ring-green-500/30"
          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
      }`}
    >
      {/* Badge de Modelo Padrão */}
      {isPadrao && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-lg">
            <Star className="h-3 w-3 fill-white" />
            Modelo Padrão
          </span>
        </div>
      )}

      {/* Header do Card */}
      <div className="mb-4 text-center">
        <h3 className={`text-xl font-bold ${isPadrao ? "text-green-700 dark:text-green-300" : "text-slate-900 dark:text-white"}`}>
          {modelo.nome}
        </h3>
        {isPadrao && (
          <p className="mt-1 text-xs text-green-400">
            Selecionado nas configurações
          </p>
        )}
      </div>

      {/* Link Input */}
      <div className="mb-4">
        <div className="flex items-center gap-2 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 p-3 shadow-inner">
          <Smartphone className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <input
            type="text"
            readOnly
            value={appClienteUrl}
            className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white outline-none font-mono truncate"
          />
        </div>
        <button
          onClick={handleCopy}
          className={`mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all active:scale-95 ${
            isPadrao
              ? "bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20"
              : "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
          }`}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado!" : "Copiar Link"}
        </button>
      </div>

      {/* QR Code */}
      <div className="mb-4 flex flex-col items-center space-y-3 bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl border border-gray-200 dark:border-slate-600">
        <div className="relative h-40 w-40 rounded-lg bg-white p-2 shadow-xl">
          {qrCodeUrl ? (
            <img
              src={qrCodeUrl}
              alt={`QR Code do ${modelo.nome}`}
              width={160}
              height={160}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-500">
              <QrCode className="h-12 w-12 animate-pulse" />
            </div>
          )}
        </div>
        <button
          onClick={handleDownloadQrCode}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-800/80 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          <Download className="h-3 w-3" />
          Baixar QR Code
        </button>
      </div>

      {/* Link para testar */}
      <div className="text-center">
        <Link
          href={appClienteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 text-xs transition-colors hover:underline ${
            isPadrao
              ? "text-green-400 hover:text-green-300"
              : "text-indigo-400 hover:text-indigo-300"
          }`}
        >
          <ExternalLink className="h-3 w-3" />
          Testar no navegador
        </Link>
      </div>
    </div>
  );
}
