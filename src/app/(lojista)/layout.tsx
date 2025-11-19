import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { LojistaNav } from "../components/lojista-nav";
import { fetchLojaPerfil } from "@/lib/firestore/server";
import { NAV_ITEMS } from "@/lib/nav-items";
import { LojistaLayoutUpdater } from "./components/LojistaLayoutUpdater";
import { MobileNavLinks } from "./components/MobileNavLinks";
import { ImpersonationBanner } from "./components/ImpersonationBanner";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

type LojistaLayoutProps = {
  children: ReactNode;
};

export default async function LojistaLayout({ children }: LojistaLayoutProps) {
  // Carrega o perfil do lojista logado no servidor.
  // Se o admin estiver simulando um lojista (lojistaId na URL),
  // o LojistaLayoutUpdater sobrescreve esses dados no client-side.
  type PerfilType = {
    nome?: string | null;
    logoUrl?: string | null;
    descricao?: string | null;
  };

  let perfil: PerfilType | null = null;
  try {
    const lojistaId = await getCurrentLojistaId();
    if (lojistaId) {
      const perfilData = await fetchLojaPerfil(lojistaId);
      if (perfilData) {
        perfil = {
          nome: perfilData.nome ?? null,
          logoUrl: perfilData.logoUrl ?? null,
          descricao: perfilData.descricao ?? null,
        };
      }
    }
  } catch (error) {
    console.error("[LojistaLayout] Erro ao carregar perfil do lojista:", error);
    perfil = null;
  }

    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        {/* Banner de Impersonificação */}
        <Suspense fallback={null}>
          <ImpersonationBanner />
        </Suspense>
        <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-3 md:gap-6 p-3 md:p-6 lg:p-10">
        <aside className="hidden w-64 flex-col rounded-2xl md:rounded-3xl border border-zinc-800/60 bg-zinc-900/70 p-4 md:p-6 shadow-[0_25px_80px_-45px_rgba(79,70,229,0.65)] backdrop-blur-xl md:flex lojista-content">
          <div className="mb-6 md:mb-8 space-y-2">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center overflow-hidden rounded-xl md:rounded-2xl bg-indigo-500/20 shrink-0">
              {perfil?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={String(perfil.logoUrl)}
                  alt={perfil.nome || "Logo da loja"}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-base md:text-lg font-semibold text-indigo-200">
                  {perfil?.nome
                    ?.split(" ")
                    .filter(Boolean)
                    .map((word) => word[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "AI"}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs uppercase tracking-[0.18em] text-indigo-300/80" translate="no">
                Experimente AI
              </p>
              <h2 className="text-base md:text-lg font-semibold text-white truncate" id="sidebar-loja-nome" translate="no">
                {perfil?.nome || ""}
              </h2>
              <p className="text-[10px] md:text-xs text-zinc-500">
                Provador virtual e automações
              </p>
            </div>
          </div>

          <Suspense fallback={null}>
            <LojistaNav />
          </Suspense>

          <div className="mt-auto rounded-xl md:rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-3 md:p-4">
            <p className="text-xs md:text-sm font-medium text-indigo-100">
              Provador Virtual
            </p>
            <p className="mt-1 text-[10px] md:text-xs text-indigo-200/80">
              Gere o link do provador ou compartilhe via QR Code.
            </p>
            <Link
              href="/configuracoes#compartilhamento"
              className="mt-2 md:mt-3 inline-flex items-center justify-center rounded-lg bg-indigo-500 px-2.5 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-semibold text-white transition hover:bg-indigo-400 w-full"
            >
              Compartilhar provador
            </Link>
          </div>
        </aside>

        <div className="flex flex-1 flex-col min-w-0">
          <header className="mb-3 md:mb-6 rounded-2xl md:rounded-3xl border border-zinc-800/70 bg-zinc-900/60 p-3 md:p-5 backdrop-blur-xl lojista-content">
            <div className="flex flex-col gap-2 md:gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] md:text-xs uppercase tracking-[0.24em] text-indigo-300/70">
                  Painel do lojista
                </p>
                <h1 className="text-base md:text-xl lg:text-2xl font-semibold text-white truncate" id="header-loja-nome" translate="no">
                  {perfil?.nome || ""}
                </h1>
                {perfil?.descricao ? (
                  <p className="text-xs md:text-sm text-zinc-400 line-clamp-2">{perfil.descricao}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2 text-xs md:text-sm text-zinc-400 shrink-0">
                {perfil?.logoUrl ? (
                  <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center overflow-hidden rounded-full bg-indigo-500/20 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={String(perfil.logoUrl)}
                      alt={perfil.nome || "Logo da loja"}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <span className="inline-flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-200 shrink-0">
                    AI
                  </span>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-white truncate" translate="no">
                    {perfil?.nome || "Equipe Experimente AI"}
                  </p>
                  <p className="text-[10px] md:text-xs text-zinc-500">
                    suporte@experimente.ai
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 md:mt-4 flex flex-wrap gap-1.5 md:gap-2 md:hidden">
              <Suspense fallback={null}>
                <MobileNavLinks />
              </Suspense>
            </div>
          </header>

          <main className="flex-1 rounded-2xl md:rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-3 md:p-6 lg:p-8 shadow-[0_40px_120px_-60px_rgba(99,102,241,0.65)] backdrop-blur-xl lojista-content overflow-x-auto">
            <Suspense fallback={null}>
              <LojistaLayoutUpdater />
            </Suspense>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
