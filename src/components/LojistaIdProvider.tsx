"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Componente que lê lojistaId da URL e armazena em uma variável global
 * para ser acessada por componentes que não podem usar hooks
 */
export function LojistaIdProvider() {
  const searchParams = useSearchParams();
  const lojistaIdFromUrl = searchParams?.get("lojistaId");
  
  useEffect(() => {
    if (lojistaIdFromUrl && typeof window !== "undefined") {
      // Armazenar em uma variável global temporária
      (window as any).__LOJISTA_ID__ = lojistaIdFromUrl;
    }
  }, [lojistaIdFromUrl]);
  
  return null;
}




