import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { LojistaNav } from "@/app/components/lojista-nav";
import { MobileNavLinks } from "./components/MobileNavLinks";
import { LojistaLayoutUpdater } from "./components/LojistaLayoutUpdater";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { fetchLojaPerfil } from "@/lib/firestore/server";

// Forçar renderização dinâmica (não estática)
export const dynamic = 'force-dynamic';

type LojistaLayoutProps = {
  children: ReactNode;
};

export default async function LojistaLayout({ children }: LojistaLayoutProps) {
  // Buscar dados do lojista logado (server-side)
  let lojistaId: string | null = null;
  let perfil: any = null;

  try {
    lojistaId = await getCurrentLojistaId();
    if (lojistaId) {
      perfil = await fetchLojaPerfil(lojistaId).catch(() => null);
    }
  } catch (error) {
    console.error("[LojistaLayout] Erro ao buscar perfil:", error);
  }

  const lojaNome = perfil?.nome || "Experimente AI";
  const lojaDescricao = perfil?.descricao || "Provador virtual e automações";
  const lojaLogo = perfil?.logoUrl || null;
  
  // Gerar iniciais para avatar
  const initials = lojaNome
    .split(" ")
    .filter(Boolean)
    .map((word: string) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-2 sm:gap-4 md:gap-6 p-2 sm:p-4 md:p-6 lg:p-10">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-col rounded-3xl border border-zinc-800/60 bg-zinc-900/70 p-6 shadow-[0_25px_80px_-45px_rgba(99,102,241,0.65)] backdrop-blur-xl md:flex">
          <div className="mb-8 space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-lg font-semibold text-indigo-200">
              {lojaLogo ? (
                <Image
                  src={lojaLogo}
                  alt={lojaNome}
                  width={48}
                  height={48}
                  className="h-full w-full rounded-2xl object-contain"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-indigo-300/80">
                EXPERIMENTE AI
              </p>
              <h2 id="sidebar-loja-nome" className="text-lg font-semibold text-white">
                {lojaNome}
              </h2>
              <p className="text-xs text-zinc-500">
                {lojaDescricao}
              </p>
            </div>
          </div>

          <LojistaNav />

          <div className="mt-auto rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
            <p className="text-sm font-medium text-indigo-100">
              Painel do Lojista
            </p>
            <p className="mt-1 text-xs text-indigo-200/80">
              Gerencie produtos, clientes e composições.
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          <header className="mb-3 sm:mb-4 md:mb-6 rounded-2xl md:rounded-3xl border border-zinc-800/70 bg-zinc-900/60 p-3 sm:p-4 md:p-5 backdrop-blur-xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-indigo-300/70">
                  PAINEL DO LOJISTA
                </p>
                <h1 id="header-loja-nome" className="text-xl font-semibold text-white md:text-2xl">
                  {lojaNome}
                </h1>
                <p className="text-sm text-zinc-400">
                  {lojaDescricao}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-200">
                  {lojaLogo ? (
                    <Image
                      src={lojaLogo}
                      alt={lojaNome}
                      width={32}
                      height={32}
                      className="h-full w-full rounded-full object-contain"
                    />
                  ) : (
                    <span className="text-xs font-semibold">{initials}</span>
                  )}
                </span>
                <div>
                  <p className="font-medium text-white">{lojaNome}</p>
                  <p className="text-xs text-zinc-500">
                    {perfil?.email || "lojista@experimente.ai"}
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile Navigation */}
            <div className="mt-4 flex flex-wrap gap-2 md:hidden">
              <MobileNavLinks />
            </div>
          </header>

          <main className="flex-1 rounded-2xl md:rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-2 sm:p-3 md:p-6 shadow-[0_40px_120px_-60px_rgba(99,102,241,0.65)] backdrop-blur-xl lg:p-8">
            {children}
          </main>
        </div>
      </div>
      
      {/* Client-side updater para modo admin (quando lojistaId vem da URL) */}
      <LojistaLayoutUpdater />
    </div>
  );
}

