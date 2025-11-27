"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Menu } from "lucide-react";
import { LojistaNav } from "@/app/components/lojista-nav";
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
        className="md:hidden fixed top-3 left-3 z-50 p-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-500 shadow-md transition"
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
          bg-white border-r border-gray-200 shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          overflow-y-auto
        `}
      >
        <div className="flex flex-col h-full p-6">
          {/* Header com botão fechar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white text-lg font-semibold">
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
                <h2 className="text-base font-semibold text-gray-900">
                  {lojaNome}
                </h2>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1">
            <LojistaNav />
          </div>

          {/* Footer */}
          <div className="mt-auto rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-sm font-medium text-indigo-900">
              Painel do Lojista
            </p>
            <p className="mt-1 text-xs text-indigo-700">
              Gerencie produtos, clientes e composições.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

