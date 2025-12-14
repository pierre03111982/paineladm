"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Menu } from "lucide-react";
import LojistaNav from "@/app/components/lojista-nav";
import { usePathname } from "next/navigation";

type MobileSidebarProps = {
  lojaNome: string;
  lojaDescricao: string;
  lojaLogo: string | null;
  initials: string;
};

export function MobileSidebar({
  lojaNome,
  lojaDescricao,
  lojaLogo,
  initials,
}: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Fechar sidebar quando navegar
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevenir scroll do body quando sidebar aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Hamburger Button - Visível apenas em mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-indigo-500 shadow-md transition"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay - Visível quando sidebar aberto */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer - Visível apenas em mobile quando aberto */}
      <aside
        className={`
          md:hidden fixed top-0 left-0 h-full w-80 max-w-[85vw] z-50
          bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 shadow-2xl
          transform transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          overflow-y-auto
        `}
      >
        <div className="flex flex-col h-full p-6">
          {/* Header com botão fechar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[var(--text-main)]">Menu</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card)]/60 transition"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
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
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text-secondary)]">
                  EXPERIMENTE AI
                </p>
                <h2 className="text-xl font-bold leading-tight text-[var(--text-main)]">
                  {lojaNome || "Minha Loja"}
                </h2>
                <p className="text-sm font-medium leading-relaxed text-[var(--text-secondary)]">
                  {lojaDescricao || "Descrição da loja"}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1">
            <LojistaNav />
          </div>

          {/* Footer */}
          <div className="mt-auto rounded-xl border border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950 p-4">
            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
              Painel do Lojista
            </p>
            <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300">
              Gerencie produtos, clientes e composições.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

