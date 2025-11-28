"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type { ReactNode } from "react";
import { useEffect } from "react";

// Componente interno para aplicar tema no HTML
function ThemeApplier() {
  const { theme, systemTheme } = useTheme();

  useEffect(() => {
    const html = document.documentElement;
    const currentTheme = theme || systemTheme || "light";
    
    // Forçar aplicação imediata da classe
    if (currentTheme === "dark") {
      html.classList.add("dark");
      html.setAttribute("data-theme", "dark");
    } else {
      html.classList.remove("dark");
      html.setAttribute("data-theme", "light");
    }
    
    // Forçar reflow para garantir que as mudanças sejam aplicadas
    void html.offsetHeight;
    
    // Aplicar novamente após um pequeno delay para garantir
    setTimeout(() => {
      if (currentTheme === "dark") {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
    }, 10);
  }, [theme, systemTheme]);

  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Aplicar tema inicial antes do render
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("paineladm-theme");
      const html = document.documentElement;
      
      if (savedTheme === "dark") {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
    }
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange={false}
      storageKey="paineladm-theme"
    >
      <ThemeApplier />
      {children}
    </NextThemesProvider>
  );
}

