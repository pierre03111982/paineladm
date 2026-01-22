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
    <section className="neon-card rounded-2xl p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">Orientação do Display</h3>
        <p className="text-sm text-[var(--text-secondary)]">
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
            "relative neon-card rounded-xl border-2 p-6 transition-all hover:scale-[1.02]",
            orientation === "horizontal"
              ? "border-cyan-400/80 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 shadow-lg shadow-cyan-500/30"
              : "border-gray-300/50 bg-[var(--bg-card)]/60 hover:border-cyan-400/50"
          )}
        >
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              "p-4 rounded-lg transition-all",
              orientation === "horizontal"
                ? "bg-gradient-to-br from-cyan-500/30 to-blue-500/30 shadow-lg shadow-cyan-500/30"
                : "bg-[var(--bg-card)]/40"
            )}>
              <Monitor className={cn(
                "h-8 w-8",
                orientation === "horizontal" ? "text-cyan-600" : "text-[var(--text-secondary)]"
              )} />
            </div>
            <div className="text-center">
              <h4 className={cn(
                "font-bold mb-1",
                orientation === "horizontal" ? "text-cyan-700" : "text-[var(--text-main)]"
              )}>
                Horizontal
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                Paisagem (16:9)
              </p>
            </div>
            {orientation === "horizontal" && (
              <div className="absolute top-2 right-2">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/50">
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
            "relative neon-card rounded-xl border-2 p-6 transition-all hover:scale-[1.02]",
            orientation === "vertical"
              ? "border-cyan-400/80 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 shadow-lg shadow-cyan-500/30"
              : "border-gray-300/50 bg-[var(--bg-card)]/60 hover:border-cyan-400/50"
          )}
        >
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              "p-4 rounded-lg transition-all",
              orientation === "vertical"
                ? "bg-gradient-to-br from-cyan-500/30 to-blue-500/30 shadow-lg shadow-cyan-500/30"
                : "bg-[var(--bg-card)]/40"
            )}>
              <Smartphone className={cn(
                "h-8 w-8",
                orientation === "vertical" ? "text-cyan-600" : "text-[var(--text-secondary)]"
              )} />
            </div>
            <div className="text-center">
              <h4 className={cn(
                "font-bold mb-1",
                orientation === "vertical" ? "text-cyan-700" : "text-[var(--text-main)]"
              )}>
                Vertical
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                Retrato (9:16)
              </p>
            </div>
            {orientation === "vertical" && (
              <div className="absolute top-2 right-2">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/50">
                  <Check className="h-4 w-4 text-white" />
                </div>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Botão Salvar */}
      <div className="flex items-center justify-between">
        <div className="text-xs">
          {saveStatus === "success" && (
            <span className="text-emerald-600 flex items-center gap-2 font-semibold">
              <Check className="h-4 w-4" />
              Configuração salva com sucesso!
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-rose-600 font-semibold">
              Erro ao salvar configuração. Tente novamente.
            </span>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/30 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
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

