"use client";

import { useState, useEffect, useCallback } from "react";
import { Tv, Wifi, Loader2, CheckCircle, AlertCircle, RefreshCw, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

type DisplayDiscoveryProps = {
  lojistaId: string | null;
};

type DiscoveredDisplay = {
  id: string;
  displayUuid: string;
  deviceType: string;
  deviceBrand: string;
  userAgent: string;
  lastHeartbeat: number;
  ip: string;
  status?: string;
  isOnline?: boolean;
  timeSinceHeartbeat?: number;
  createdAt?: number | null;
  lojistaId?: string | null;
};

export function DisplayDiscovery({ lojistaId }: DisplayDiscoveryProps) {
  const [displays, setDisplays] = useState<DiscoveredDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [autoScanEnabled, setAutoScanEnabled] = useState(true);

  const scanDisplays = useCallback(async () => {
    if (!lojistaId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/lojista/scan-displays?lojistaId=${encodeURIComponent(lojistaId)}`
      );

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setDisplays(data.displays || []);
    } catch (err: any) {
      console.error("[DisplayDiscovery] Erro ao escanear displays:", err);
      setError(err.message || "Erro ao buscar dispositivos");
    } finally {
      setLoading(false);
    }
  }, [lojistaId]);

  // Busca inicial ao montar o componente
  useEffect(() => {
    scanDisplays();
  }, [scanDisplays]);

  // Auto-refresh apenas se autoScanEnabled estiver ativo
  useEffect(() => {
    if (!autoScanEnabled || !lojistaId) return;
    
    // Re-escanear a cada 10 segundos apenas se autoScanEnabled estiver ativo
    const interval = setInterval(scanDisplays, 10000);
    return () => clearInterval(interval);
  }, [autoScanEnabled, lojistaId, scanDisplays]);

  const handleConnect = async (displayUuid: string) => {
    if (!lojistaId) return;

    try {
      setConnecting(displayUuid);

      // Conectar o display ao lojista
      const response = await fetch("/api/lojista/connect-display", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lojistaId,
          displayUuid,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao conectar display");
      }

      // Atualizar lista após conectar
      await scanDisplays();
    } catch (err: any) {
      console.error("[DisplayDiscovery] Erro ao conectar:", err);
      setError(err.message || "Erro ao conectar dispositivo");
    } finally {
      setConnecting(null);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    if (deviceType === "Smart TV") {
      return <Tv className="h-6 w-6" />;
    }
    return <Wifi className="h-6 w-6" />;
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "agora";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `há ${hours} h`;
  };

  if (!lojistaId) {
    return null;
  }

  return (
    <section className="neon-card rounded-2xl p-6">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">
            Dispositivos Próximos
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Displays na mesma rede detectados automaticamente
            {autoScanEnabled && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                Busca automática ativa
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScanEnabled(!autoScanEnabled)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-xs font-semibold transition-all",
              autoScanEnabled
                ? "border-amber-500/60 dark:border-amber-400/60 bg-gradient-to-r from-amber-500/20 to-orange-500/20 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-300 hover:shadow-lg hover:shadow-amber-500/30"
                : "border-gray-300 dark:border-gray-600 bg-[var(--bg-card)]/60 text-[var(--text-secondary)] hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400"
            )}
            title={autoScanEnabled ? "Desativar busca automática" : "Ativar busca automática"}
          >
            {autoScanEnabled ? (
              <>
                <Pause className="h-4 w-4" />
                Pausar Busca
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Ativar Busca
              </>
            )}
          </button>
          <button
            onClick={scanDisplays}
            disabled={loading}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-xs font-semibold transition-all",
              loading
                ? "border-gray-300 dark:border-gray-600 bg-[var(--bg-card)]/60 text-[var(--text-secondary)] opacity-50 cursor-not-allowed"
                : "border-cyan-500/60 dark:border-cyan-400/60 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 dark:from-cyan-900/30 dark:to-blue-900/30 text-cyan-700 dark:text-cyan-300 hover:shadow-lg hover:shadow-cyan-500/30"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Buscar Agora
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border-2 border-rose-500/60 dark:border-rose-400/60 bg-gradient-to-r from-rose-500/20 to-pink-500/20 dark:from-rose-900/30 dark:to-pink-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading && displays.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500 mx-auto mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">
              Procurando dispositivos na rede...
            </p>
          </div>
        </div>
      ) : displays.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Wifi className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-[var(--text-main)] mb-1">
              Nenhum dispositivo encontrado
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Certifique-se de que o display está na mesma rede e tente novamente.
              <br />
              Você ainda pode usar o código manual abaixo.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {displays.map((display) => (
            <div
              key={display.id}
              className="neon-card flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border-2 border-cyan-300/50 dark:border-cyan-500/50 bg-gradient-to-br from-cyan-50/50 to-blue-50/50 dark:from-cyan-950/30 dark:to-blue-950/30 p-4 shadow-sm gap-4"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 p-3 text-white shadow-lg">
                  {getDeviceIcon(display.deviceType)}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-[var(--text-main)] mb-1">
                    {display.deviceType} ({display.deviceBrand})
                  </h4>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs text-[var(--text-secondary)]">
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                          Online {formatTimeAgo(display.lastHeartbeat)}
                        </span>
                      </p>
                      {display.isOnline === false && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/50">
                          Offline
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[var(--text-main)]">Endereço IP:</p>
                      <p className="text-xs font-mono text-[var(--text-main)] bg-[var(--bg-card)]/70 px-3 py-1.5 rounded border-2 border-cyan-300/50 dark:border-cyan-500/50 break-all">
                        {display.ip}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-[var(--text-main)] mb-1">ID do Display:</p>
                        <p className="text-xs font-mono text-[var(--text-main)] bg-[var(--bg-card)]/70 px-3 py-1.5 rounded border-2 border-cyan-300/50 dark:border-cyan-500/50 break-all">
                          {display.displayUuid}
                        </p>
                      </div>
                      {display.userAgent && (
                        <details className="text-xs">
                          <summary className="cursor-pointer hover:text-[var(--text-main)] transition-colors font-semibold text-[var(--text-main)]">
                            User-Agent: {display.userAgent.substring(0, 50)}{display.userAgent.length > 50 ? '...' : ''}
                          </summary>
                          <p className="mt-1 font-mono text-[10px] bg-[var(--bg-card)]/70 px-2 py-1.5 rounded border-2 border-cyan-300/30 dark:border-cyan-500/30 break-all text-[var(--text-main)]">
                            {display.userAgent}
                          </p>
                        </details>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {display.status && (
                          <span className={cn(
                            "text-xs px-2 py-1 rounded-full font-semibold",
                            display.status === "paired"
                              ? "bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-400/50"
                              : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400/50"
                          )}>
                            {display.status === "paired" ? "✓ Pareado" : "○ Disponível"}
                          </span>
                        )}
                        {display.createdAt && (
                          <span className="text-xs text-[var(--text-secondary)]">
                            Criado: {new Date(display.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <button
                  onClick={() => handleConnect(display.displayUuid)}
                  disabled={connecting === display.displayUuid}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-xs font-semibold transition-all w-full sm:w-auto justify-center",
                    connecting === display.displayUuid
                      ? "border-gray-300 dark:border-gray-600 bg-[var(--bg-card)]/60 text-[var(--text-secondary)] opacity-50 cursor-not-allowed"
                      : "border-emerald-500/60 dark:border-emerald-400/60 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 dark:from-emerald-900/30 dark:to-teal-900/30 text-emerald-700 dark:text-emerald-300 hover:shadow-lg hover:shadow-emerald-500/30"
                  )}
                >
                  {connecting === display.displayUuid ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Conectar
                    </>
                  )}
                </button>
                <div className="text-xs text-[var(--text-secondary)] text-right">
                  <p className="font-mono text-[10px] opacity-70">
                    Último heartbeat: {new Date(display.lastHeartbeat).toLocaleTimeString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

