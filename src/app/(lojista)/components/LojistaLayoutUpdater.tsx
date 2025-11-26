"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Perfil = {
  nome?: string | null;
  descricao?: string | null;
  logoUrl?: string | null;
};

export function LojistaLayoutUpdater() {
  const searchParams = useSearchParams();
  // Tentar ler tanto lojistaId quanto lojistald (para compatibilidade com typos)
  const lojistaIdFromUrl = searchParams?.get("lojistaId") || searchParams?.get("lojistald");
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Garantir que o conteúdo esteja visível imediatamente ao montar
  useEffect(() => {
    // Sempre garantir que o conteúdo esteja visível por padrão
    document.documentElement.style.setProperty('--lojista-content-opacity', '1');
    document.documentElement.classList.remove('lojista-loading');
    
    // Forçar visibilidade também via CSS direto
    const style = document.createElement('style');
    style.textContent = `
      .lojista-content {
        opacity: 1 !important;
      }
      html:not(.lojista-loading) .lojista-content {
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  useEffect(() => {
    // Sempre garantir que o conteúdo esteja visível
    document.documentElement.style.setProperty('--lojista-content-opacity', '1');
    document.documentElement.classList.remove('lojista-loading');

    // Se houver lojistaId na URL, carregar dados imediatamente
    // Isso evita que dados incorretos sejam exibidos primeiro
    if (lojistaIdFromUrl) {
      setIsLoading(true);
      setIsReady(false);
      
      // Não mostrar "Carregando..." para evitar flash - manter o que já está no servidor
      // O servidor já carregou os dados corretos, só vamos atualizar se necessário

      // Timeout de segurança: garantir que o conteúdo esteja visível após 1 segundo
      const timeoutId = setTimeout(() => {
        console.warn("[LojistaLayoutUpdater] Timeout ao carregar perfil, garantindo conteúdo visível");
        document.documentElement.style.setProperty('--lojista-content-opacity', '1');
        document.documentElement.classList.remove('lojista-loading');
      }, 1000);

      // Usar cache: 'no-store' para garantir dados atualizados
      fetch(`/api/lojista/perfil?lojistaId=${lojistaIdFromUrl}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          return res.json();
        })
        .then((p) => {
          clearTimeout(timeoutId);
          if (p && p.nome) {
            setPerfil(p);
          } else {
            // Se não houver perfil, ainda assim mostrar o conteúdo
            setPerfil(null);
          }
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          console.error("[LojistaLayoutUpdater] Erro ao carregar perfil:", err);
          // Mesmo em caso de erro, mostrar o conteúdo
          setPerfil(null);
        })
        .finally(() => {
          setIsLoading(false);
          setIsReady(true);
          // Sempre garantir que o conteúdo esteja visível
          document.documentElement.style.setProperty('--lojista-content-opacity', '1');
          document.documentElement.classList.remove('lojista-loading');
        });

      // Cleanup: limpar timeout se o componente desmontar ou lojistaId mudar
      return () => {
        clearTimeout(timeoutId);
      };
    } else {
      // Se não houver lojistaId na URL, não fazer nada
      // O layout server-side já carregou os dados corretos do usuário logado
      setIsReady(true);
      // Garantir que o conteúdo esteja visível
      document.documentElement.style.setProperty('--lojista-content-opacity', '1');
      document.documentElement.classList.remove('lojista-loading');
    }
  }, [lojistaIdFromUrl]);

  useEffect(() => {
    // Só atualizar se houver lojistaId na URL (modo admin) e perfil carregado
    // Se não houver, não fazer nada para não sobrescrever dados corretos do servidor
    if (!lojistaIdFromUrl || !perfil?.nome || !isReady) {
      return;
    }

    // Verificar se o nome já está correto antes de atualizar (evitar flash)
    const titleElement = document.querySelector("#header-loja-nome") || document.querySelector("header h1");
    if (titleElement && titleElement.textContent !== perfil.nome) {
      titleElement.setAttribute("translate", "no");
      titleElement.textContent = perfil.nome;
    }
    
    // Verificar se o nome já está correto antes de atualizar (evitar flash)
    const sidebarName = document.querySelector("#sidebar-loja-nome") || document.querySelector("aside h2");
    if (sidebarName && sidebarName.textContent !== perfil.nome) {
      sidebarName.setAttribute("translate", "no");
      sidebarName.textContent = perfil.nome;
    }
    
    // Atualizar a logo ou iniciais no avatar da sidebar imediatamente
    const sidebarAvatar = document.querySelector("aside .flex.h-12");
    if (sidebarAvatar) {
      if (perfil.logoUrl) {
        // Se houver logo, substituir por imagem
        sidebarAvatar.innerHTML = `<img src="${perfil.logoUrl}" alt="${perfil.nome || 'Logo'}" class="h-full w-full rounded-full object-cover" />`;
      } else {
        // Se não houver logo, usar iniciais
        const initials = perfil.nome
          .split(" ")
          .filter(Boolean)
          .map((word) => word[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        sidebarAvatar.innerHTML = `<span class="text-lg font-semibold text-indigo-200">${initials}</span>`;
      }
    }

    // Atualizar a logo no header também
    const headerAvatar = document.querySelector("header .flex.h-8");
    if (headerAvatar && perfil.logoUrl) {
      headerAvatar.innerHTML = `<img src="${perfil.logoUrl}" alt="${perfil.nome || 'Logo'}" class="h-full w-full rounded-full object-cover" />`;
    }

    // Atualizar descrição se houver
    if (perfil.descricao) {
      const descElement = document.querySelector("header p.text-sm.text-zinc-400");
      if (descElement) {
        descElement.textContent = perfil.descricao;
      }
    }

    // Atualizar também o card principal do dashboard se existir
    const dashboardCardTitle = document.querySelector('[class*="text-2xl"], [class*="text-xl"]') as HTMLElement;
    if (dashboardCardTitle && dashboardCardTitle.textContent?.includes("Experimente AI")) {
      dashboardCardTitle.textContent = perfil.nome;
    }

    // Mostrar conteúdo após atualizar usando CSS variable
    document.documentElement.style.setProperty('--lojista-content-opacity', '1');
  }, [perfil, lojistaIdFromUrl, isReady]);

  return null;
}

