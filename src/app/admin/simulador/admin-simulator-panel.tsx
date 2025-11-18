"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Smartphone, Monitor, Download, Store, ChevronDown } from "lucide-react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";

interface AdminSimulatorPanelProps {
  simulatorUrl: string;
  initialLojistaId?: string | null;
}

interface Lojista {
  id: string;
  nome: string;
  logoUrl?: string | null;
}

export function AdminSimulatorPanel({ simulatorUrl, initialLojistaId }: AdminSimulatorPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lojas, setLojas] = useState<Lojista[]>([]);
  const [selectedLojistaId, setSelectedLojistaId] = useState<string | null>(initialLojistaId || null);
  const [loadingLojas, setLoadingLojas] = useState(false);
  const [currentSimulatorUrl, setCurrentSimulatorUrl] = useState(simulatorUrl);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Carregar lista de lojas (admin sempre vê todas)
  useEffect(() => {
    async function fetchLojas() {
      try {
        setLoadingLojas(true);
        const response = await fetch("/api/admin/lojistas/list");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.lojas) {
            setLojas(data.data.lojas);
          }
        }
      } catch (error) {
        console.error("[AdminSimulatorPanel] Erro ao carregar lojas:", error);
      } finally {
        setLoadingLojas(false);
      }
    }

    fetchLojas();
  }, []);

  // Atualizar URL quando lojista for selecionado
  useEffect(() => {
    if (!selectedLojistaId) {
      if (currentSimulatorUrl !== simulatorUrl) {
        setCurrentSimulatorUrl(simulatorUrl);
      }
      return;
    }

    try {
      const url = new URL(simulatorUrl);
      // Extrair o pathname base (antes do lojistaId)
      const pathParts = url.pathname.split("/").filter(Boolean);
      // Remover o último segmento (lojistaId atual) se existir
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart !== "display" && lastPart !== "simulador" && lastPart !== "appmelhorado") {
          pathParts.pop();
        }
      }
      // Adicionar o novo lojistaId
      pathParts.push(selectedLojistaId);
      url.pathname = "/" + pathParts.join("/");
      
      // Manter os parâmetros de query existentes
      url.searchParams.set("simulator", "1");
      const backend = url.searchParams.get("backend");
      if (backend) {
        url.searchParams.set("backend", backend);
      }
      
      const newUrl = url.toString();
      setCurrentSimulatorUrl(newUrl);
      
      // Atualizar URL na página apenas se o lojistaId na query for diferente
      const currentLojistaId = searchParams.get("lojistaId");
      if (currentLojistaId !== selectedLojistaId) {
        const params = new URLSearchParams();
        params.set("lojistaId", selectedLojistaId);
        router.replace(`/admin/simulador?${params.toString()}`, { scroll: false });
      }
    } catch (error) {
      console.error("[AdminSimulatorPanel] Erro ao atualizar URL:", error);
    }
    // Removido searchParams e router das dependências para evitar loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLojistaId, simulatorUrl]);

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
        console.error("[AdminSimulatorPanel] QR Code error:", error);
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

  const selectedLojista = lojas.find((l) => l.id === selectedLojistaId);

  return (
    <div className="space-y-6">
      {/* Seletor de Loja - SEMPRE VISÍVEL NO ADMIN */}
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/40 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="rounded-xl bg-purple-500/10 p-3">
            <Store className="h-6 w-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-1">
              Selecionar Loja
            </h3>
            <p className="text-sm text-zinc-400">
              Escolha a loja para visualizar seus produtos no simulador
            </p>
          </div>
        </div>

        <div className="relative">
          <select
            value={selectedLojistaId || ""}
            onChange={(e) => setSelectedLojistaId(e.target.value || null)}
            disabled={loadingLojas}
            className={cn(
              "w-full appearance-none",
              "rounded-xl border border-zinc-700/60 bg-zinc-900/60",
              "px-4 py-3 pr-10",
              "text-white text-sm",
              "focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-all"
            )}
          >
            <option value="">Selecione uma loja...</option>
            {lojas.map((loja) => (
              <option key={loja.id} value={loja.id}>
                {loja.nome}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none" />
        </div>

        {selectedLojista && (
          <div className="mt-4 p-4 rounded-lg bg-zinc-900/40 border border-zinc-700/40">
            <div className="flex items-center gap-3">
              {selectedLojista.logoUrl && (
                <img
                  src={selectedLojista.logoUrl}
                  alt={selectedLojista.nome}
                  className="w-10 h-10 rounded-lg object-cover border border-zinc-700/60"
                />
              )}
              <div>
                <p className="text-sm font-medium text-white">
                  {selectedLojista.nome}
                </p>
                <p className="text-xs text-zinc-400">
                  ID: {selectedLojista.id}
                </p>
              </div>
            </div>
          </div>
        )}

        {loadingLojas && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-zinc-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
              <span>Carregando lojas...</span>
            </div>
          </div>
        )}
      </div>

      {selectedLojistaId && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Coluna Esquerda: Informações e Botão */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/40 p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="rounded-xl bg-cyan-500/10 p-3">
                    <Monitor className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Acesse a Vitrine Virtual
                    </h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Visualize como o provador virtual aparece para os clientes da loja selecionada. 
                      Teste o fluxo completo de upload de foto, seleção de produtos e geração de looks.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleOpenSimulator}
                  className={cn(
                    "mt-6 w-full flex items-center justify-center gap-3",
                    "rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600",
                    "px-6 py-4 text-white font-semibold",
                    "hover:from-cyan-400 hover:to-blue-500",
                    "transition-all duration-200",
                    "shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/40",
                    "transform hover:scale-[1.02] active:scale-[0.98]"
                  )}
                >
                  <ExternalLink className="h-5 w-5" />
                  <span>Abrir Simulador em Nova Janela</span>
                </button>
              </div>
            </div>

            {/* Coluna Direita: QR Code */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/40 p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="rounded-xl bg-emerald-500/10 p-3">
                    <Smartphone className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Acesse pelo Celular
                    </h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Escaneie o QR Code com a câmera do seu celular para abrir o simulador 
                      diretamente no dispositivo móvel.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-xl border-2 border-zinc-700/60 bg-white p-4">
                    {loading ? (
                      <div className="w-[300px] h-[300px] flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-2"></div>
                          <p className="text-xs text-zinc-500">Gerando QR Code...</p>
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
                        <p className="text-xs text-red-400">Erro ao gerar QR Code</p>
                      </div>
                    )}
                  </div>

                  {qrDataUrl && (
                    <button
                      onClick={handleDownloadQR}
                      className={cn(
                        "inline-flex items-center gap-2",
                        "rounded-lg border border-zinc-700 text-zinc-300",
                        "px-4 py-2 text-sm",
                        "hover:border-emerald-400 hover:text-emerald-200",
                        "transition-colors"
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
        </>
      )}

      {!selectedLojistaId && (
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/40 p-6 text-center">
          <p className="text-zinc-400">
            Selecione uma loja acima para visualizar o simulador
          </p>
        </div>
      )}
    </div>
  );
}

