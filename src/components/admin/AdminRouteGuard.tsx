"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { firebaseAuth } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

type AdminRouteGuardProps = {
  children: React.ReactNode;
};

/**
 * Componente que protege rotas administrativas no cliente
 * Verifica autenticação e permissão de admin antes de renderizar
 */
export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        // Usuário não autenticado, redirecionar para login
        router.push("/login?admin=true&redirect=/admin");
        return;
      }

      // Verificar se o usuário é admin
      try {
        const token = await user.getIdToken();
        
        // Fazer requisição para verificar se é admin
        const response = await fetch("/api/auth/check-admin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.isAdmin) {
            setIsAuthorized(true);
            setIsLoading(false);
          } else {
            // Usuário não é admin, redirecionar
            router.push("/dashboard?error=unauthorized");
          }
        } else {
          // Erro ao verificar, redirecionar
          router.push("/login?admin=true&error=check_failed");
        }
      } catch (error) {
        console.error("[AdminRouteGuard] Erro ao verificar admin:", error);
        router.push("/login?admin=true&error=check_failed");
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent"></div>
          <p className="text-sm text-zinc-400">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}




