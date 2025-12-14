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

  return (
    <div 
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #113574 0%, #4169E1 50%, #113574 100%)' }}
    >
      {/* Mobile Sidebar Component */}
      <MobileSidebar
        lojaNome={lojaNome}
        lojaDescricao={lojaDescricao}
        lojaLogo={lojaLogo}
        initials={initials}
      />

      {/* Novo Header (Topo - Fixo) */}
      <header className="h-16 w-full flex items-center border-b border-blue-900/50 z-30" style={{ background: 'linear-gradient(180deg, #113574 0%, #4169E1 50%, #113574 100%)' }}>
        {/* Bloco Esquerdo (Logo) */}
        <div className="w-64 h-full flex items-center px-6 border-r border-blue-900/50">
          {lojaLogo ? (
            <Image
              src={lojaLogo}
              alt={lojaNome}
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-contain"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold">
              {initials}
            </div>
          )}
          <h1 className="ml-3 text-lg font-bold text-white font-heading">{lojaNome || "Experimente AI"}</h1>
        </div>
        
        {/* Bloco Direito (Ferramentas) */}
        <div className="flex-1 flex items-center justify-between px-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white">
            <span className="text-xl font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-heading">Gestor Inteligente</span>
          </div>
          
          {/* Search e Avatar */}
          <div className="flex items-center gap-4">
            {/* Barra de Pesquisa Robusta */}
            <div className="hidden md:block relative w-full max-w-xs group ml-4">
              {/* Ícone: Camada de cima, não clicável */}
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                <svg className="h-4 w-4 text-blue-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              {/* Input: Padding forçado na esquerda */}
              <input
                type="text"
                placeholder="Pesquisar..."
                className="block w-full rounded-full border border-blue-700/50 bg-blue-900/30 py-2 !pl-10 pr-4 leading-5 text-white placeholder-blue-300/70 focus:border-blue-500 focus:bg-blue-900 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm transition-all duration-300 indent-0"
              />
            </div>
            
            {/* Avatar do Usuário */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                {lojaLogo ? (
                  <Image
                    src={lojaLogo}
                    alt={lojaNome}
                    width={40}
                    height={40}
                    className="h-full w-full rounded-full object-contain"
                  />
                ) : (
                  <span className="text-sm font-semibold text-white">{initials}</span>
                )}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white">{lojaNome}</p>
                <p className="text-xs text-gray-300">
                  {perfil?.email || "lojista@experimente.ai"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Container Inferior (Flex Row) */}
      <div className="flex flex-1 overflow-hidden" style={{ overflow: 'visible' }}>
        {/* Sidebar Retrátil (Coluna Esquerda) */}
        <SidebarWrapper />

        {/* Main Content (O Cartão Branco) */}
        <main 
          className="flex-1 bg-[#f3f4f6] relative z-10 flex flex-col overflow-hidden"
          style={{
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.7)',
            borderTopLeftRadius: '12px',
            borderBottomLeftRadius: '12px',
            borderTopRightRadius: '0px',
            borderBottomRightRadius: '0px',
            marginLeft: '0px',
            borderLeft: 'none',
            paddingLeft: '0px'
          }}
        >
          {/* Conteúdo Interno */}
          <div className="flex-1 overflow-y-auto p-8">
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

