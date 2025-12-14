"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

/**
 * ThemeProvider simplificado - Apenas tema claro
 * Garante que o tema escuro seja removido e o tema claro seja aplicado
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const html = document.documentElement;
      // Remover classe dark e garantir tema claro
      html.classList.remove("dark");
      html.setAttribute("data-theme", "light");
      // Limpar localStorage do tema antigo
      localStorage.removeItem("paineladm-theme");
    }
  }, []);

  return <>{children}</>;
}

