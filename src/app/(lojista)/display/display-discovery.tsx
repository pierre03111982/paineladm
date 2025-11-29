"use client";

import { useState, useEffect } from "react";
import { Tv, Wifi, Loader2, CheckCircle, AlertCircle } from "lucide-react";
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
};

export function DisplayDiscovery({ lojistaId }: DisplayDiscoveryProps) {
  const [displays, setDisplays] = useState<DiscoveredDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  const scanDisplays = async () => {
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
  };

  useEffect(() => {
    scanDisplays();
    // Re-escanear a cada 10 segundos
    const interval = setInterval(scanDisplays, 10000);
    return () => clearInterval(interval);
  }, [lojistaId]);

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
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">
            Dispositivos Próximos
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Displays na mesma rede detectados automaticamente
          </p>
        </div>
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
              <Wifi className="h-4 w-4" />
              Buscar Novamente
            </>
          )}
        </button>
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
              className="neon-card flex items-center justify-between rounded-xl border-2 border-cyan-300/50 dark:border-cyan-500/50 bg-gradient-to-br from-cyan-50/50 to-blue-50/50 dark:from-cyan-950/30 dark:to-blue-950/30 p-4 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 p-3 text-white shadow-lg">
                  {getDeviceIcon(display.deviceType)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">
                    {display.deviceType} ({display.deviceBrand})
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Online {formatTimeAgo(display.lastHeartbeat)} • IP: {display.ip}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleConnect(display.displayUuid)}
                disabled={connecting === display.displayUuid}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-xs font-semibold transition-all",
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
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

