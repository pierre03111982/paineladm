 "use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav-items";

type LojistaNavProps = {
  collapsed?: boolean;
};

export default function LojistaNav({ collapsed = false }: LojistaNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Tentar ler tanto lojistaId quanto lojistald (para compatibilidade com typos)
  const lojistaId = searchParams?.get("lojistaId") || searchParams?.get("lojistald");

  return (
    <nav className={cn(
      "flex flex-col gap-1 relative",
      collapsed ? "px-0 mt-4" : "px-0 mt-8" // Padding removido, controlado pelo SidebarWrapper
    )} style={{ position: 'relative' }}>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        // Preservar lojistaId na URL se estiver presente
        const href = lojistaId 
          ? `${item.href}?lojistaId=${lojistaId}`
          : item.href;

        return (
          <div key={item.href} className="relative" style={{ position: 'relative', width: '100%' }}>
            {/* Fundo Ativo (Liquid Tab Effect) - APENAS quando NÃO collapsed */}
            {active && !collapsed && (
              <motion.div
                layoutId="active-nav-background"
                className="absolute bg-[#f3f4f6]"
                style={{
                  // Modo expandido: aba larga arredondada na esquerda
                  top: '0',
                  bottom: '0',
                  left: '-16px',
                  right: '-16px',
                  width: 'calc(100% + 32px)',
                  borderTopLeftRadius: '12px',
                  borderBottomLeftRadius: '12px',
                  borderTopRightRadius: '0px',
                  borderBottomRightRadius: '0px',
                  zIndex: 1,
                  pointerEvents: 'none' // Não interceptar cliques
                }}
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}

            {/* Link com ícone e texto */}
            <Link
              href={href}
              className={cn(
                "relative flex items-center text-sm font-medium transition-all duration-300 w-full",
                collapsed 
                  ? "justify-center px-0 py-2.5" // Centralizado quando collapsed
                  : "gap-3 px-4 py-2.5", // Normal quando expandido
                active
                  ? collapsed 
                    ? "text-white font-bold" // Branco quando collapsed e ativo
                    : "text-[#113574] font-bold" // Azul escuro quando expandido e ativo
                  : "text-blue-200 hover:text-white hover:translate-x-1"
              )}
              style={{ zIndex: 30, position: 'relative' }}
            >
              {/* Container do ícone com largura fixa para evitar layout shift */}
              <div className={cn(
                "flex items-center justify-center shrink-0 relative",
                collapsed ? "w-10 h-10" : "w-5 h-5"
              )}>
                <div className="relative flex flex-col items-center">
                  <Icon className={cn(
                    "transition-colors relative z-10",
                    collapsed ? "h-5 w-5" : "h-5 w-5",
                    active 
                      ? collapsed 
                        ? "text-white" // Branco quando collapsed e ativo
                        : "text-[#113574]" // Azul escuro quando expandido e ativo
                      : "text-blue-200"
                  )} />
                  {/* Linha abaixo do ícone quando collapsed e ativo */}
                  {active && collapsed && (
                    <motion.div
                      className="absolute bottom-[-8px] w-8 h-0.5 bg-white rounded-full"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </div>
              </div>
              
              {/* Texto - oculto quando collapsed */}
              {!collapsed ? (
                <span className="truncate flex-1 relative z-10">
                  {item.label}
                </span>
              ) : (
                <span className="hidden" aria-hidden="true">
                  {item.label}
                </span>
              )}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}







