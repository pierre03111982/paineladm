"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evitar hidratação mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        aria-label="Toggle theme"
      >
        <Sun className="h-5 w-5" />
      </button>
    );
  }

  const toggleTheme = () => {
    if (!mounted) return;
    const currentTheme = theme || "light";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    console.log("[ThemeToggle] Trocando tema de", currentTheme, "para", newTheme);
    
    // Forçar aplicação da classe no html ANTES de atualizar o estado
    if (typeof document !== "undefined") {
      const html = document.documentElement;
      if (newTheme === "dark") {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
      
      // Forçar reflow para garantir que as mudanças sejam aplicadas
      void html.offsetHeight;
    }
    
    setTheme(newTheme);
    
    // Garantir aplicação após um pequeno delay
    setTimeout(() => {
      if (typeof document !== "undefined") {
        const html = document.documentElement;
        if (newTheme === "dark") {
          html.classList.add("dark");
        } else {
          html.classList.remove("dark");
        }
      }
    }, 0);
  };

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200/50 dark:border-white/5 bg-white dark:bg-[#1C1F2E] text-gray-600 dark:text-gray-300 transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 shadow-lg hover:scale-105"
      aria-label={theme === "dark" ? "Alternar para tema claro" : "Alternar para tema escuro"}
      title={theme === "dark" ? "Tema claro" : "Tema escuro"}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-amber-500" />
      ) : (
        <Moon className="h-5 w-5 text-indigo-600" />
      )}
    </button>
  );
}

