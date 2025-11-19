"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

export function ImpersonationBanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [lojistaNome, setLojistaNome] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkImpersonation = async () => {
      try {
        // Verificar se há session ID na URL
        const sessionId = searchParams?.get("impersonation_session");
        const lojistaId = searchParams?.get("lojistaId");

        if (sessionId && lojistaId) {
          // Buscar informações do lojista
          try {
            const response = await fetch(`/api/lojista/perfil?lojistaId=${encodeURIComponent(lojistaId)}`);
            if (response.ok) {
              const perfil = await response.json();
              setLojistaNome(perfil.nome || "Lojista");
            }
          } catch (error) {
            console.error("[ImpersonationBanner] Erro ao buscar nome do lojista:", error);
          }

          setIsImpersonating(true);
          
          // Salvar session ID nos cookies para persistência
          document.cookie = `impersonation_session=${sessionId}; path=/; max-age=1800`; // 30 minutos
          document.cookie = `impersonation_lojistaId=${lojistaId}; path=/; max-age=1800`;
        } else {
          // Verificar se há nos cookies
          const cookies = document.cookie.split(';');
          const sessionCookie = cookies.find(c => c.trim().startsWith('impersonation_session='));
          const lojistaIdCookie = cookies.find(c => c.trim().startsWith('impersonation_lojistaId='));

          if (sessionCookie && lojistaIdCookie) {
            const lojistaId = lojistaIdCookie.split('=')[1].trim();
            
            // Buscar nome do lojista
            try {
              const response = await fetch(`/api/lojista/perfil?lojistaId=${encodeURIComponent(lojistaId)}`);
              if (response.ok) {
                const perfil = await response.json();
                setLojistaNome(perfil.nome || "Lojista");
              }
            } catch (error) {
              console.error("[ImpersonationBanner] Erro ao buscar nome do lojista:", error);
            }

            setIsImpersonating(true);
          }
        }
      } catch (error) {
        console.error("[ImpersonationBanner] Erro ao verificar impersonificação:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkImpersonation();
  }, [searchParams]);

  const handleExit = () => {
    // Limpar cookies de impersonificação
    document.cookie = "impersonation_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "impersonation_lojistaId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    
    // Redirecionar para o painel administrativo
    const adminUrl = process.env.NEXT_PUBLIC_PAINELADM_URL || window.location.origin;
    window.location.href = `${adminUrl}/lojistas`;
  };

  if (isLoading || !isImpersonating) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 w-full border-b border-yellow-500/50 bg-yellow-500/20 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          <p className="text-sm font-semibold text-yellow-200">
            AVISO: Você está visualizando como <span className="font-bold text-yellow-100">{lojistaNome || "Lojista"}</span>
          </p>
        </div>
        <button
          onClick={handleExit}
          className="inline-flex items-center gap-2 rounded-lg border border-yellow-400/50 bg-yellow-500/20 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:bg-yellow-500/30 hover:border-yellow-300/60"
        >
          <X className="h-4 w-4" />
          SAIR
        </button>
      </div>
    </div>
  );
}

