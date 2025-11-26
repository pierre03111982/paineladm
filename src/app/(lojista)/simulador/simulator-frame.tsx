"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils";

type DisplayOrientation = "horizontal" | "vertical";

interface SimulatorFrameProps {
  src: string;
  orientation?: DisplayOrientation;
}

export function SimulatorFrame({ src, orientation = "horizontal" }: SimulatorFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const isVertical = orientation === "vertical";

  // Tamanhos da caixa de visualização
  // Horizontal: proporção 16:9 (TV padrão)
  // Vertical: proporção 9:16 (TV vertical)
  const previewWidth = isVertical ? 540 : 960;  // TV vertical: 540x960 (9:16)
  const previewHeight = isVertical ? 960 : 540;  // TV horizontal: 960x540 (16:9)

  // Tamanhos reais do iframe (tela completa) - ajustar para vertical
  const iframeWidth = isVertical ? 1080 : 1920;  // Para vertical, usar proporção 9:16
  const iframeHeight = isVertical ? 1920 : 1080;  // Para vertical, usar proporção 9:16

  // Calcular escala para caber na caixa
  const calculatedScale = useMemo(() => {
    const widthScale = previewWidth / iframeWidth;
    const heightScale = previewHeight / iframeHeight;
    return Math.min(widthScale, heightScale);
  }, [previewWidth, previewHeight, iframeWidth, iframeHeight]);

  // Atualizar URL do iframe com parâmetro de orientação
  const iframeSrc = (() => {
    try {
      const url = new URL(src);
      url.searchParams.set("displayOrientation", orientation);
      return url.toString();
    } catch {
      return src;
    }
  })();

  // Atualizar escala quando calculada mudar
  useEffect(() => {
    setScale(calculatedScale);
  }, [calculatedScale]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    setIsLoading(true);
    iframe.src = iframeSrc;

    const handleLoad = () => {
      setIsLoading(false);
      setError(null);
      setTimeout(() => {
        setScale(calculatedScale);
      }, 200);
    };

    const handleError = () => {
      setIsLoading(false);
      setError("Erro ao carregar o simulador. Verifique se o app cliente está rodando.");
    };

    iframe.addEventListener("load", handleLoad);
    iframe.addEventListener("error", handleError);

    return () => {
      iframe.removeEventListener("load", handleLoad);
      iframe.removeEventListener("error", handleError);
    };
  }, [iframeSrc, calculatedScale]);

  return (
    <div 
      className="relative w-full flex items-center justify-center"
    >
      <div 
        className={cn(
          "relative border-2 border-zinc-700 rounded-xl overflow-hidden bg-zinc-900 shadow-2xl",
          "flex items-center justify-center"
        )}
        style={{
          width: `${previewWidth}px`,
          height: `${previewHeight}px`,
          maxWidth: `${previewWidth}px`,
          maxHeight: `${previewHeight}px`,
          aspectRatio: isVertical ? "9/16" : "16/9"
        }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 bg-opacity-95 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-4"></div>
              <p className="text-sm text-zinc-400">Carregando visualização...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/20 z-10">
            <div className="text-center p-4">
              <p className="text-red-400 font-medium mb-2">Erro ao carregar</p>
              <p className="text-sm text-red-500">{error}</p>
            </div>
          </div>
        )}

        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              width: `${iframeWidth}px`,
              height: `${iframeHeight}px`,
              transform: `scale(${scale})`,
              transformOrigin: "center center",
            }}
          >
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              className="border-0"
              title="Visualização do Display"
              allow="camera; microphone; geolocation"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
              scrolling="no"
              style={{
                width: `${iframeWidth}px`,
                height: `${iframeHeight}px`,
                overflow: "hidden",
                display: "block",
                border: "none",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}




























































































