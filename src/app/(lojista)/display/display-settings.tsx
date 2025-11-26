"use client";

import { useState, useEffect } from "react";
import { Monitor, Smartphone, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DisplayOrientation = "horizontal" | "vertical";

type DisplaySettingsProps = {
  lojistaId: string | null;
  onOrientationChange?: (orientation: DisplayOrientation) => void;
};

export function DisplaySettings({ lojistaId, onOrientationChange }: DisplaySettingsProps) {
  const [orientation, setOrientation] = useState<DisplayOrientation>("horizontal");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  // Carregar configuração atual
  useEffect(() => {
    if (!lojistaId) {
      setIsLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        const response = await fetch(`/api/lojista/display-settings?lojistaId=${encodeURIComponent(lojistaId)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.orientation) {
            setOrientation(data.orientation);
            onOrientationChange?.(data.orientation);
          }
        }
      } catch (error) {
        console.error("[DisplaySettings] Erro ao carregar configurações:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [lojistaId]);

  // Salvar configuração
  const handleSave = async () => {
    if (!lojistaId || isSaving) return;

    setIsSaving(true);
    setSaveStatus("idle");

    try {
      const response = await fetch("/api/lojista/display-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lojistaId,
          orientation,
        }),
      });

      if (response.ok) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    } catch (error) {
      console.error("[DisplaySettings] Erro ao salvar configurações:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-800/60 bg-zinc-950/40 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Orientação do Display</h3>
        <p className="text-sm text-zinc-400">
          Configure como o display será exibido na tela. Escolha entre modo horizontal (paisagem) ou vertical (retrato).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Opção Horizontal */}
        <button
          onClick={() => {
            setOrientation("horizontal");
            onOrientationChange?.("horizontal");
          }}
          className={cn(
            "relative rounded-xl border-2 p-6 transition-all",
            orientation === "horizontal"
              ? "border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/20"
              : "border-zinc-700 bg-zinc-900/40 hover:border-zinc-600"
          )}
        >
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              "p-4 rounded-lg transition-colors",
              orientation === "horizontal"
                ? "bg-cyan-500/20"
                : "bg-zinc-800"
            )}>
              <Monitor className={cn(
                "h-8 w-8",
                orientation === "horizontal" ? "text-cyan-400" : "text-zinc-400"
              )} />
            </div>
            <div className="text-center">
              <h4 className={cn(
                "font-semibold mb-1",
                orientation === "horizontal" ? "text-cyan-200" : "text-zinc-300"
              )}>
                Horizontal
              </h4>
              <p className="text-xs text-zinc-500">
                Paisagem (16:9)
              </p>
            </div>
            {orientation === "horizontal" && (
              <div className="absolute top-2 right-2">
                <div className="h-6 w-6 rounded-full bg-cyan-500 flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              </div>
            )}
          </div>
        </button>

        {/* Opção Vertical */}
        <button
          onClick={() => {
            setOrientation("vertical");
            onOrientationChange?.("vertical");
          }}
          className={cn(
            "relative rounded-xl border-2 p-6 transition-all",
            orientation === "vertical"
              ? "border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/20"
              : "border-zinc-700 bg-zinc-900/40 hover:border-zinc-600"
          )}
        >
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              "p-4 rounded-lg transition-colors",
              orientation === "vertical"
                ? "bg-cyan-500/20"
                : "bg-zinc-800"
            )}>
              <Smartphone className={cn(
                "h-8 w-8",
                orientation === "vertical" ? "text-cyan-400" : "text-zinc-400"
              )} />
            </div>
            <div className="text-center">
              <h4 className={cn(
                "font-semibold mb-1",
                orientation === "vertical" ? "text-cyan-200" : "text-zinc-300"
              )}>
                Vertical
              </h4>
              <p className="text-xs text-zinc-500">
                Retrato (9:16)
              </p>
            </div>
            {orientation === "vertical" && (
              <div className="absolute top-2 right-2">
                <div className="h-6 w-6 rounded-full bg-cyan-500 flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Botão Salvar */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-500">
          {saveStatus === "success" && (
            <span className="text-emerald-400 flex items-center gap-2">
              <Check className="h-4 w-4" />
              Configuração salva com sucesso!
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-rose-400">
              Erro ao salvar configuração. Tente novamente.
            </span>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-cyan-600 hover:bg-cyan-700 text-white"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Configuração"
          )}
        </Button>
      </div>
    </section>
  );
}

