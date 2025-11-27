import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { LojistaNav } from "@/app/components/lojista-nav";
import { MobileNavLinks } from "./components/MobileNavLinks";
import { MobileSidebar } from "./components/MobileSidebar";
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Component */}
      <MobileSidebar
        lojaNome={lojaNome}
        lojaDescricao={lojaDescricao}
        lojaLogo={lojaLogo}
        initials={initials}
      />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        {/* Desktop Sidebar - Hidden on mobile */}
        <aside className="hidden md:flex w-64 flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-8 space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-lg font-semibold text-white">
              {lojaLogo ? (
                <Image
                  src={lojaLogo}
                  alt={lojaNome}
                  width={48}
                  height={48}
                  className="h-full w-full rounded-xl object-contain"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">
                EXPERIMENTE AI
              </p>
              <h2 id="sidebar-loja-nome" className="text-lg font-semibold text-gray-900">
                {lojaNome}
              </h2>
              <p className="text-sm text-gray-600">
                {lojaDescricao}
              </p>
            </div>
          </div>

          <LojistaNav />

          <div className="mt-auto rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-sm font-medium text-indigo-900">
              Painel do Lojista
            </p>
            <p className="mt-1 text-xs text-indigo-700">
              Gerencie produtos, clientes e composições.
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex flex-1 flex-col min-w-0">
          <header className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-1">
                  PAINEL DO LOJISTA
                </p>
                <h1 id="header-loja-nome" className="text-xl font-semibold text-gray-900 sm:text-2xl">
                  {lojaNome}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {lojaDescricao}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
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
                  <p className="font-medium text-gray-900">{lojaNome}</p>
                  <p className="text-xs text-gray-500">
                    {perfil?.email || "lojista@experimente.ai"}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 rounded-xl border border-gray-200 bg-white p-4 sm:rounded-2xl sm:p-6 lg:p-8 shadow-sm">
            {children}
          </main>
        </div>
      </div>
      
      {/* Client-side updater para modo admin (quando lojistaId vem da URL) */}
      <LojistaLayoutUpdater />
    </div>
  );
}

