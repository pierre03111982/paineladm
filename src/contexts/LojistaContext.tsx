"use client";

import { createContext, useContext, ReactNode } from "react";

type LojistaContextType = {
  lojistaId: string;
};

const LojistaContext = createContext<LojistaContextType | undefined>(undefined);

export function LojistaProvider({
  children,
  lojistaId,
}: {
  children: ReactNode;
  lojistaId: string;
}) {
  return (
    <LojistaContext.Provider value={{ lojistaId }}>
      {children}
    </LojistaContext.Provider>
  );
}

export function useLojistaId(): string {
  const context = useContext(LojistaContext);
  
  // Se não houver contexto (modo normal), usar env var
  if (!context) {
    return process.env.NEXT_PUBLIC_LOJISTA_ID || process.env.LOJISTA_ID || "";
  }
  
  return context.lojistaId;
}




