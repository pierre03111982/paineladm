import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { MobileNavLinks } from "./components/MobileNavLinks";
import { MobileSidebar } from "./components/MobileSidebar";
import { LojistaLayoutUpdater } from "./components/LojistaLayoutUpdater";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { fetchLojaPerfil } from "@/lib/firestore/server";
import { ChatButtonWrapper } from "./components/ChatButtonWrapper";
import { AnimatedPageWrapper } from "./components/AnimatedPageWrapper";
import { LojistaScrollLock } from "./components/LojistaScrollLock";
import { SidebarWrapper } from "@/components/layout/SidebarWrapper";

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

      {/* Header fixo no topo — sem scroll horizontal (overflow-x-hidden + min-w-0 nos blocos) */}
      <header 
        className="flex-shrink-0 h-16 w-full min-w-0 flex items-center border-b border-blue-900/50 z-30 sticky top-0 left-0 right-0 overflow-x-hidden"
        style={{ background: blueGradient }}
      >
        {/* Bloco Esquerdo (Logo) — truncar nome longo */}
        <div className="w-64 min-w-0 shrink-0 h-full flex items-center px-4 md:px-6 border-r border-blue-900/50 overflow-hidden">
          {lojaLogo ? (
            <Image
              src={lojaLogo}
              alt={lojaNome}
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-contain shrink-0"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold">
              {initials}
            </div>
          )}
          <h1 className="ml-2 md:ml-3 text-base md:text-lg font-bold text-white font-heading truncate min-w-0">{lojaNome || "Experimente AI"}</h1>
        </div>
        
        {/* Bloco Direito (Ferramentas) — flex min-w-0 para não estourar */}
        <div className="flex-1 min-w-0 flex items-center justify-between px-3 md:px-6 overflow-hidden">
          {/* Breadcrumb */}
          <div className="min-w-0 flex items-center gap-2 text-white shrink-0">
            <span className="text-base md:text-xl font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-heading truncate">Gestor Inteligente</span>
          </div>
          
          {/* Search e Avatar */}
          <div className="flex items-center gap-2 md:gap-4 min-w-0 shrink-0">
            {/* Barra de Pesquisa — max-width para não empurrar */}
            <div className="hidden md:block relative w-32 lg:w-44 xl:max-w-xs shrink min-w-0 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                <svg className="h-4 w-4 text-blue-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Pesquisar..."
                className="block w-full min-w-0 rounded-full border border-blue-700/50 bg-blue-900/30 py-2 pl-10 pr-3 leading-5 text-white placeholder-blue-300/70 focus:border-blue-500 focus:bg-blue-900 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm transition-all duration-300"
              />
            </div>
            
            {/* Avatar do Usuário — truncar email/nome */}
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                {lojaLogo ? (
                  <Image
                    src={lojaLogo}
                    alt={lojaNome}
                    width={40}
                    height={40}
                    className="h-full w-full rounded-full object-contain"
                  />
                ) : (
                  <span className="text-xs md:text-sm font-semibold text-white">{initials}</span>
                )}
              </div>
              <div className="hidden sm:block min-w-0 max-w-[120px] md:max-w-[180px]">
                <p className="text-sm font-medium text-white truncate">{lojaNome}</p>
                <p className="text-xs text-gray-300 truncate">{perfil?.email || "lojista@experimente.ai"}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Container: sidebar fixa à esquerda + área principal com scroll — sem overflow horizontal */}
      <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden overflow-x-hidden">
        {/* Sidebar fixa (coluna esquerda) — não rola */}
        <div className="flex-shrink-0">
          <SidebarWrapper />
        </div>

        {/* Área principal: só esta região rola quando o conteúdo for grande */}
        <main 
          className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#f3f4f6] relative z-10"
          style={{
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.7)',
            borderTopLeftRadius: '12px',
            borderBottomLeftRadius: '12px',
          }}
        >
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-8">
            <AnimatedPageWrapper>
              {children}
            </AnimatedPageWrapper>
          </div>
        </main>
      </div>
      
      {/* Client-side updater para modo admin (quando lojistaId vem da URL) */}
      <LojistaLayoutUpdater />
      
      {/* Chat Button - Assistente Virtual Ana */}
      {lojistaId && <ChatButtonWrapper lojistaId={lojistaId} />}
    </div>
  );
}

