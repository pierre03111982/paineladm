import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { MobileNavLinks } from "./components/MobileNavLinks";
import { MobileSidebar } from "./components/MobileSidebar";
import { LojistaLayoutUpdater } from "./components/LojistaLayoutUpdater";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { fetchLojaPerfil } from "@/lib/firestore/server";
import { ChatButtonWrapper } from "./components/ChatButtonWrapper";
import { LojistaScrollLock } from "./components/LojistaScrollLock";
import { LojistaHeaderWithSidebar } from "./components/LojistaHeaderWithSidebar";

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
    } else {
      // Token expirado ou não autenticado - não é um erro crítico
      console.log("[LojistaLayout] LojistaId não encontrado (token pode ter expirado)");
    }
  } catch (error: any) {
    // Apenas logar erros não relacionados a autenticação
    if (!error?.code?.startsWith("auth/")) {
      console.error("[LojistaLayout] Erro ao buscar perfil:", error);
    }
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

  // Gradiente suave e contínuo (mais paradas = menos banding em tela cheia)
  const blueGradient = 'linear-gradient(180deg, #113574 0%, #162f5e 18%, #1e4292 35%, #3560c4 50%, #1e4292 65%, #162f5e 82%, #113574 100%)';

  return (
    <div 
      className="lojista-layout-root h-screen w-full max-w-[100vw] flex flex-col overflow-hidden overflow-x-hidden"
      style={{ background: blueGradient, backgroundAttachment: 'fixed' }}
    >
      <LojistaScrollLock />
      {/* Mobile Sidebar Component */}
      <MobileSidebar
        lojaNome={lojaNome}
        lojaDescricao={lojaDescricao}
        lojaLogo={lojaLogo}
        initials={initials}
      />

      {/* Header + Sidebar + Main (barra superior com breadcrumbs, busca, créditos, Ver Loja, +) */}
      <LojistaHeaderWithSidebar
        blueGradient={blueGradient}
        lojaLogo={lojaLogo}
        lojaNome={lojaNome}
        initials={initials}
        lojistaId={lojistaId}
        appModel={(perfil?.appModel?.replace?.("modelo-", "") || "1") as "1" | "2" | "3"}
      >
        {children}
      </LojistaHeaderWithSidebar>
      
      {/* Client-side updater para modo admin (quando lojistaId vem da URL) */}
      <LojistaLayoutUpdater />
      
      {/* Chat Button - Assistente Virtual Ana */}
      {lojistaId && <ChatButtonWrapper lojistaId={lojistaId} />}
    </div>
  );
}

