"use client";

import { useState } from "react";
import { Copy, Check, Share2, Link2 } from "lucide-react";
import { buildClientAppShareUrl } from "@/lib/client-app";
import { cn } from "@/lib/utils";

type SharePanelProps = {
  lojistaId: string | null;
};

export function SharePanel({ lojistaId }: SharePanelProps) {
  const [copied, setCopied] = useState(false);

  if (!lojistaId) {
    return (
      <div className="neon-card rounded-xl p-6">
        <p className="text-[var(--text-secondary)]">ID da loja não encontrado</p>
      </div>
    );
  }

  const shareUrl = buildClientAppShareUrl(lojistaId);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="neon-card rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 p-3 shadow-lg shadow-purple-500/30 text-white">
            <Share2 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">
              Link de Compartilhamento
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Compartilhe este link com seus clientes para que eles possam acessar o aplicativo.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-3 block text-sm font-semibold text-[var(--text-main)]">
              URL do App
            </label>
            <div className="flex gap-3">
              <div className="flex items-start gap-3 flex-1 neon-card rounded-xl border-2 border-gray-300/50 dark:border-purple-500/50 bg-[var(--bg-card)] p-4">
                <Link2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p
                    className="w-full bg-transparent text-base font-bold text-[var(--text-main)] font-mono break-all leading-relaxed select-text cursor-text"
                    title={shareUrl}
                  >
                    {shareUrl}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCopy}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-4 text-base font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg whitespace-nowrap",
                  copied
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/40"
                    : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/40"
                )}
              >
                {copied ? (
                  <>
                    <Check className="h-5 w-5" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

