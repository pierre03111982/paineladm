import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { LojistaNav } from "@/app/components/lojista-nav";
import { MobileNavLinks } from "./components/MobileNavLinks";
import { MobileSidebar } from "./components/MobileSidebar";
import { LojistaLayoutUpdater } from "./components/LojistaLayoutUpdater";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
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
    <div 
      className="min-h-screen transition-colors duration-300 bg-[var(--bg-app)]"
    >
      {/* Mobile Sidebar Component */}
      <MobileSidebar
        lojaNome={lojaNome}
        lojaDescricao={lojaDescricao}
        lojaLogo={lojaLogo}
        initials={initials}
      />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        {/* Desktop Sidebar - Hidden on mobile */}
        <aside 
          className="hidden md:flex w-64 flex-col neon-card p-6"
        >
          <div className="mb-8 flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-amber-400 dark:border-amber-500 bg-gradient-to-br from-amber-50/50 to-yellow-50/50 dark:from-amber-950/30 dark:to-yellow-950/30 shadow-lg shadow-amber-500/40 ring-2 ring-amber-300/30 dark:ring-amber-500/30 p-2">
                {lojaLogo ? (
                  <Image
                    src={lojaLogo}
                    alt={lojaNome}
                    width={72}
                    height={72}
                    className="h-full w-full rounded-xl object-contain"
                  />
                ) : (
                  <span className="text-2xl font-bold text-[var(--text-main)]">{initials}</span>
                )}
              </div>
            </div>
            <div className="w-full space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: 'var(--text-secondary)' }}>
                EXPERIMENTE AI
              </p>
              <h2 id="sidebar-loja-nome" className="text-xl font-bold leading-tight" style={{ color: 'var(--text-main)' }}>
                {lojaNome || "Minha Loja"}
              </h2>
              <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {lojaDescricao || "Descrição da loja"}
              </p>
            </div>
          </div>

          <LojistaNav />

          <div className="mt-auto rounded-xl border border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950 p-4">
            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
              Painel do Lojista
            </p>
            <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300">
              Gerencie produtos, clientes e composições.
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex flex-1 flex-col min-w-0">
          <header 
            className="mb-6 neon-card p-4 sm:p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h1 
                className="text-2xl sm:text-3xl font-normal uppercase text-[var(--text-main)]"
                style={{
                  fontFamily: 'var(--font-poppins), "Poppins", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                  letterSpacing: '0.12em',
                  fontWeight: 400,
                  fontStyle: 'normal'
                }}
              >
                Painel do Lojista Pro
              </h1>
              <div className="flex items-center gap-3 text-sm">
                <ThemeToggle />
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  {lojaLogo ? (
                    <Image
                      src={lojaLogo}
                      alt={lojaNome}
                      width={40}
                      height={40}
                      className="h-full w-full rounded-full object-contain"
                    />
                  ) : (
                    <span className="text-sm font-semibold">{initials}</span>
                  )}
                </span>
                <div className="hidden sm:block">
                  <p className="font-medium text-gray-900 dark:text-white">{lojaNome}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {perfil?.email || "lojista@experimente.ai"}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <main 
            className="flex-1 neon-card p-4 sm:p-6 lg:p-8"
          >
            {children}
          </main>
        </div>
      </div>
      
      {/* Client-side updater para modo admin (quando lojistaId vem da URL) */}
      <LojistaLayoutUpdater />
    </div>
  );
}

