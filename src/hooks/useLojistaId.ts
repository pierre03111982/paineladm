"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

/**
 * Hook para obter o lojistaId
 * Prioriza o parâmetro da URL (para modo admin)
 * Depois usa a variável de ambiente
 */
export function useLojistaId(): string {
  const searchParams = useSearchParams();
  
  const lojistaId = useMemo(() => {
    // Primeiro, tenta pegar da URL (modo admin)
    const lojistaIdFromUrl = searchParams.get("lojistaId");
    if (lojistaIdFromUrl) {
      return lojistaIdFromUrl;
    }
    
    // Se não tiver na URL, usa a variável de ambiente
    return process.env.NEXT_PUBLIC_LOJISTA_ID || process.env.LOJISTA_ID || "";
  }, [searchParams]);
  
  return lojistaId;
}




