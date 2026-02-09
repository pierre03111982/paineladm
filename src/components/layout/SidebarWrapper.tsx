"use client";

import { useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronLeft, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import LojistaNav from "@/app/components/lojista-nav";
import { useSidebarWallpaper } from "@/hooks/useSidebarWallpaper";

type SidebarWrapperProps = {
  lojaLogo?: string | null;
  lojaNome?: string;
  initials?: string;
  isCollapsed: boolean;
  onToggleSidebar: () => void;
};

export function SidebarWrapper({
  lojaLogo = null,
  lojaNome = "Experimente AI",
  initials = "EA",
  isCollapsed,
  onToggleSidebar,
}: SidebarWrapperProps) {
  // Hook para gerenciar wallpaper (preview ou persistido)
  const { wallpaper } = useSidebarWallpaper();
  
  // Gerar posições fixas para os pontos (estrelas) — não muda a cada render
  const starPositions = useMemo(() => {
    return Array.from({ length: 40 }).map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.6 + 0.2,
      brightness: Math.random() * 0.4 + 0.1,
    }));
  }, []);

  // Se tem wallpaper customizado, usar ele; senão usar o gradiente padrão
  const hasCustomWallpaper = wallpaper && wallpaper.trim() !== "";

  return (
    <motion.aside
      className="lojista-sidebar hidden md:flex flex-col relative z-20 h-full min-h-full overflow-hidden"
      style={{
        background: hasCustomWallpaper 
          ? 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)' // Fallback enquanto carrega
          : 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
      }}
      animate={{ width: isCollapsed ? "96px" : "256px" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Camada de fundo: Wallpaper customizado (se houver) */}
      {hasCustomWallpaper && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src={`/wallpapers/${encodeURIComponent(wallpaper)}`}
            alt="Sidebar wallpaper"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectFit: "cover" }}
          />
          {/* Overlay escuro para garantir legibilidade do texto */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/80 to-black/75" />
        </div>
      )}

      {/* Camada de fundo: Blobs geométricos difusos + pontos espalhados (apenas se não houver wallpaper customizado) */}
      {!hasCustomWallpaper && (
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Blob 1: Topo esquerdo — roxo/indigo difuso */}
        <div 
          className="absolute"
          style={{
            top: '-120px',
            left: '-120px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.5) 0%, rgba(99, 102, 241, 0.3) 30%, rgba(99, 102, 241, 0.1) 50%, transparent 70%)',
            filter: 'blur(100px)',
            WebkitFilter: 'blur(100px)',
          }}
        />
        
        {/* Blob 2: Centro direito — azul ciano difuso */}
        <div 
          className="absolute"
          style={{
            top: '40%',
            right: '-80px',
            width: '350px',
            height: '350px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.45) 0%, rgba(37, 99, 235, 0.25) 35%, rgba(37, 99, 235, 0.08) 55%, transparent 75%)',
            filter: 'blur(90px)',
            WebkitFilter: 'blur(90px)',
          }}
        />
        
        {/* Blob 3: Baixo direito — azul mais intenso */}
        <div 
          className="absolute"
          style={{
            bottom: '-100px',
            right: '-100px',
            width: '380px',
            height: '380px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(96, 165, 250, 0.4) 0%, rgba(59, 130, 246, 0.2) 40%, transparent 70%)',
            filter: 'blur(110px)',
            WebkitFilter: 'blur(110px)',
          }}
        />
        
        {/* Pontos pequenos espalhados (estrelas/partículas) */}
        {starPositions.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              background: `rgba(255, 255, 255, ${star.brightness})`,
              opacity: star.opacity,
            }}
          />
        ))}
      </div>
      )}
      {/* Botão recolher — na borda direita da sidebar, centralizado na barra superior (h-16) */}
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={isCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
        className="absolute -right-[18px] top-[14px] z-50 flex h-9 w-9 items-center justify-center rounded-full border border-blue-800/50 bg-[#1e3a8a] text-white shadow-lg transition-colors hover:bg-[#2563eb] hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-white"
        style={{
          boxShadow:
            "0 0 0 4px #ffffff, 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
        }}
      >
        {isCollapsed ? (
          <Menu className="h-5 w-5 text-white" />
        ) : (
          <ChevronLeft className="h-5 w-5 text-white" />
        )}
      </button>

      {/* Logo acima do Dashboard */}
      <div
        className={cn(
          "shrink-0 flex items-center justify-center border-b border-blue-800/40 relative z-10",
          isCollapsed ? "py-4 px-2" : "py-5 px-4"
        )}
      >
        {lojaLogo ? (
          <div
            className={cn(
              "relative rounded-lg overflow-hidden border-2 border-[#1e3a8a]",
              "shadow-[0_6px_20px_rgba(0,0,0,0.9)]",
              isCollapsed ? "h-10 w-10" : "h-16 w-16"
            )}
          >
            <Image
              src={lojaLogo}
              alt={lojaNome}
              fill
              className="object-cover"
              sizes="(max-width: 256px) 56px, 56px"
            />
          </div>
        ) : (
          <div
            className={cn(
              "rounded-lg flex items-center justify-center font-bold text-white bg-blue-900/60 shadow-inner border-2 border-[#1e3a8a] shadow-[0_6px_20px_rgba(0,0,0,0.9)]",
              isCollapsed ? "h-10 w-10 text-sm" : "h-16 w-16 text-base"
            )}
          >
            {isCollapsed ? initials.slice(0, 1) : initials}
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex-1 pt-3 pb-1 relative z-10",
          isCollapsed ? "px-2" : "px-4"
        )}
        style={{ overflowY: "auto", overflowX: "hidden" }}
      >
        <LojistaNav collapsed={isCollapsed} />
      </div>
    </motion.aside>
  );
}

