"use client";

import { buildClientAppShareUrl } from "@/lib/client-app";

type SharePanelProps = {
  lojistaId: string | null;
};

export function SharePanel({ lojistaId }: SharePanelProps) {
  if (!lojistaId) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <p className="text-zinc-400">ID da loja não encontrado</p>
      </div>
    );
  }

  const shareUrl = buildClientAppShareUrl(lojistaId);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Link de Compartilhamento</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-zinc-400">URL do App</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  alert("Link copiado!");
                }}
                className="rounded-lg border border-purple-500/50 bg-purple-500/10 px-4 py-2 text-sm text-purple-200 transition hover:bg-purple-500/20"
              >
                Copiar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

