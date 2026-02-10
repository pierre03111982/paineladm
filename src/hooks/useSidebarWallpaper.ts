"use client";

import React, { useState, useEffect, createContext, useContext } from "react";

type WallpaperOption = {
  id: string;
  filename: string;
  thumbnail: string;
};

// Hook para carregar wallpapers dinamicamente da pasta
export function useWallpaperOptions() {
  const [wallpapers, setWallpapers] = useState<WallpaperOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWallpapers() {
      try {
        const res = await fetch("/api/lojista/wallpapers-list");
        if (res.ok) {
          const data = await res.json();
          // Adicionar opção "Padrão" no início
          const options: WallpaperOption[] = [
            { id: "default", filename: "", thumbnail: "" },
            ...data.wallpapers.map((w: { id: string; filename: string; thumbnail: string }) => ({
              id: w.id,
              filename: w.filename,
              thumbnail: w.thumbnail,
            })),
          ];
          setWallpapers(options);
        }
      } catch (error) {
        console.error("[useWallpaperOptions] Erro ao carregar wallpapers:", error);
        // Fallback para lista vazia
        setWallpapers([{ id: "default", filename: "", thumbnail: "" }]);
      } finally {
        setLoading(false);
      }
    }

    loadWallpapers();
  }, []);

  return { wallpapers, loading };
}

type SidebarWallpaperContextType = {
  wallpaper: string | null; // filename ou null para padrão
  previewWallpaper: string | null | undefined; // preview temporário (undefined = sem preview, null = padrão, string = wallpaper customizado)
  setPreviewWallpaper: (filename: string | null) => void;
  saveWallpaper: (lojistaId: string) => Promise<void>;
  loadWallpaper: (lojistaId: string) => Promise<void>;
};

const SidebarWallpaperContext = createContext<SidebarWallpaperContextType | null>(null);

export function SidebarWallpaperProvider({ children, lojistaId }: { children: React.ReactNode; lojistaId?: string | null }) {
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const [previewWallpaper, setPreviewWallpaper] = useState<string | null | undefined>(undefined);

  // Pré-carregar imagem do wallpaper
  const preloadWallpaperImage = (filename: string) => {
    if (typeof window !== 'undefined' && filename) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = `/wallpapers/${encodeURIComponent(filename)}`;
      document.head.appendChild(link);
      
      // Também criar uma imagem para forçar o cache do navegador
      const img = new Image();
      img.src = `/wallpapers/${encodeURIComponent(filename)}`;
    }
  };

  // Carregar wallpaper salvo do Firestore
  const loadWallpaper = async (lojistaId: string) => {
    try {
      const res = await fetch(`/api/lojista/sidebar-wallpaper?lojistaId=${encodeURIComponent(lojistaId)}`);
      if (res.ok) {
        const data = await res.json();
        const wallpaperFilename = data.wallpaper || null;
        setWallpaper(wallpaperFilename);
        
        // Pré-carregar a imagem imediatamente após obter o filename
        if (wallpaperFilename) {
          preloadWallpaperImage(wallpaperFilename);
        }
      }
    } catch (error) {
      console.error("[useSidebarWallpaper] Erro ao carregar wallpaper:", error);
    }
  };

  // Salvar wallpaper no Firestore
  const saveWallpaper = async (lojistaId: string) => {
    const wallpaperToSave = previewWallpaper !== undefined ? previewWallpaper : wallpaper;
    try {
      const res = await fetch("/api/lojista/sidebar-wallpaper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lojistaId, wallpaper: wallpaperToSave }),
      });
      if (res.ok) {
        setWallpaper(wallpaperToSave);
        setPreviewWallpaper(undefined); // Limpar preview após salvar (voltar para undefined = sem preview)
      } else {
        throw new Error("Erro ao salvar wallpaper");
      }
    } catch (error) {
      console.error("[useSidebarWallpaper] Erro ao salvar wallpaper:", error);
      throw error;
    }
  };

  useEffect(() => {
    if (lojistaId) {
      loadWallpaper(lojistaId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojistaId]);

  // Usar preview se existir (mesmo que seja null para padrão), senão usar o wallpaper salvo
  // Se previewWallpaper foi definido (undefined = sem preview, null = padrão, string = customizado), usar ele; caso contrário usar wallpaper salvo
  const activeWallpaper = previewWallpaper !== undefined ? previewWallpaper : wallpaper;
  
  // Pré-carregar imagem quando preview mudar
  useEffect(() => {
    if (previewWallpaper && previewWallpaper.trim() !== "") {
      preloadWallpaperImage(previewWallpaper);
    }
  }, [previewWallpaper]);

  const contextValue: SidebarWallpaperContextType = {
    wallpaper: activeWallpaper,
    previewWallpaper,
    setPreviewWallpaper,
    saveWallpaper,
    loadWallpaper,
  };

  return React.createElement(
    SidebarWallpaperContext.Provider,
    { value: contextValue },
    children
  );
}

export function useSidebarWallpaper() {
  const context = useContext(SidebarWallpaperContext);
  if (!context) {
    throw new Error("useSidebarWallpaper deve ser usado dentro de SidebarWallpaperProvider");
  }
  return context;
}
