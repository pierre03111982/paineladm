"use client";

import { useState, useEffect } from "react";
import { SimulatorFrame } from "../simulador/simulator-frame";
import { DisplaySettings } from "./display-settings";

type DisplayOrientation = "horizontal" | "vertical";

type DisplayPageClientProps = {
  lojistaId: string | null;
  displayUrl: string;
};

export function DisplayPageClient({ lojistaId, displayUrl }: DisplayPageClientProps) {
  const [orientation, setOrientation] = useState<DisplayOrientation>("horizontal");

  // Carregar orientação inicial
  useEffect(() => {
    if (!lojistaId) return;

    const loadOrientation = async () => {
      try {
        const response = await fetch(`/api/lojista/display-settings?lojistaId=${encodeURIComponent(lojistaId)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.orientation) {
            setOrientation(data.orientation);
          }
        }
      } catch (error) {
        console.error("[DisplayPageClient] Erro ao carregar orientação:", error);
      }
    };

    loadOrientation();
  }, [lojistaId]);

  return (
    <>
      <DisplaySettings 
        lojistaId={lojistaId} 
        onOrientationChange={setOrientation}
      />

      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/40 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white mb-2">Visualização do Display</h3>
          <p className="text-sm text-zinc-400">
            Veja como o display aparecerá na tela com a orientação selecionada.
          </p>
        </div>
        <div className="flex items-center justify-center">
          <SimulatorFrame src={displayUrl} orientation={orientation} />
        </div>
      </div>
    </>
  );
}






