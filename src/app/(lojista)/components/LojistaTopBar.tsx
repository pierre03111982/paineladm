"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Search, Zap, Eye, Plus, ChevronRight } from "lucide-react";
import { buildClientAppUrlWithModel } from "@/lib/client-app";
import { cn } from "@/lib/utils";

const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  produtos: "Produtos",
  novo: "Novo",
  editar: "Editar",
  clientes: "Clientes",
  pedidos: "Pedidos",
  crm: "Radar",
  composicoes: "Composições",
  simulador: "Simulador",
  configuracoes: "Configurações",
  assinatura: "Assinatura",
  display: "Display",
  "app-cliente": "App Cliente",
  integracoes: "Integrações",
  monitoramento: "Monitoramento",
  "redes-sociais": "Redes Sociais",
  compartilhamento: "Compartilhamento",
};

function getBreadcrumbs(pathname: string): { href: string; label: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const result: { href: string; label: string }[] = [{ href: "/dashboard", label: "Home" }];
  let acc = "";
  for (const seg of segments) {
    acc += `/${seg}`;
    const label = BREADCRUMB_LABELS[seg] || seg;
    result.push({ href: acc, label });
  }
  return result;
}

type LojistaTopBarProps = {
  isCollapsed: boolean;
  onToggleSidebar: () => void;
  lojistaId: string | null;
  appModel?: "1" | "2" | "3";
};

export function LojistaTopBar({
  isCollapsed: _isCollapsed,
  onToggleSidebar: _onToggleSidebar,
  lojistaId,
  appModel = "1",
}: LojistaTopBarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lojistaIdFromUrl = searchParams?.get("lojistaId") || searchParams?.get("lojistald");
  const effectiveLojistaId = lojistaIdFromUrl || lojistaId;

  const [credits, setCredits] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);

  const breadcrumbs = getBreadcrumbs(pathname || "/dashboard");

  const fetchCredits = useCallback(async () => {
    if (!effectiveLojistaId) return;
    setCreditsLoading(true);
    try {
      const res = await fetch(`/api/lojista/credits?lojistaId=${encodeURIComponent(effectiveLojistaId)}`);
      const data = await res.json().catch(() => ({}));
      setCredits(typeof data.credits === "number" ? data.credits : null);
    } catch {
      setCredits(null);
    } finally {
      setCreditsLoading(false);
    }
  }, [effectiveLojistaId]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const storeUrl = effectiveLojistaId ? buildClientAppUrlWithModel(effectiveLojistaId, appModel) : null;

  return (
    <header className="lojista-topbar shrink-0 h-16 w-full min-w-0 flex items-center z-30 overflow-x-hidden bg-white">
      {/* ESQUERDA: Breadcrumbs — margem esquerda para não ficar embaixo do botão recolher */}
      <div className="flex items-center min-w-0 shrink-0 w-[min(28rem,100%)] pl-10 pr-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 min-w-0">
          {breadcrumbs.map((item, i) => (
            <span key={`${item.href}-${i}`} className="flex items-center gap-1 min-w-0">
              {i > 0 && (
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" aria-hidden />
              )}
              {i === breadcrumbs.length - 1 ? (
                <span className="text-sm font-medium text-gray-900 truncate">{item.label}</span>
              ) : (
                <Link
                  href={item.href}
                  className="text-sm text-gray-500 hover:text-gray-700 truncate"
                >
                  {item.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* CENTRO: Busca global — lupa em coluna à esquerda para nunca sobrepor o texto */}
      <div className="flex-1 flex justify-center min-w-0 px-4">
        <div className="flex items-center w-full max-w-md h-10 rounded-lg bg-gray-100 border border-transparent overflow-hidden focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-0 focus-within:bg-white">
          <span className="pl-3 pr-2 flex items-center justify-center shrink-0 text-gray-400" aria-hidden>
            <Search className="h-4 w-4" />
          </span>
          <input
            type="search"
            placeholder="Buscar produtos, clientes ou pedidos... (Ctrl+K)"
            className="flex-1 min-w-0 h-full pl-2 pr-4 bg-transparent text-sm text-gray-900 placeholder-gray-500 focus:outline-none border-0"
            aria-label="Busca global"
          />
        </div>
      </div>

      {/* DIREITA: Créditos IA, Ver Loja, Ação Rápida — espaçamento uniforme */}
      <div className="flex items-center gap-4 shrink-0 pr-4 pl-2">
        {/* Widget Créditos IA */}
        {effectiveLojistaId && (
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
              "bg-indigo-50 text-indigo-700"
            )}
          >
            <Zap className="h-4 w-4 shrink-0" />
            {creditsLoading ? (
              <span className="text-indigo-600">...</span>
            ) : (
              <span>
                {credits !== null ? credits.toLocaleString("pt-BR") : "—"} Créditos
              </span>
            )}
          </div>
        )}

        {/* Ver Loja */}
        {storeUrl && (
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            title="Abrir Loja Online"
            aria-label="Abrir Loja Online"
          >
            <Eye className="h-5 w-5" />
          </a>
        )}

        {/* Ação Rápida (+) */}
        <Link
          href={effectiveLojistaId ? `/produtos/novo?lojistaId=${effectiveLojistaId}` : "/produtos/novo"}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          title="Criar novo (Produto, Look...)"
          aria-label="Ação rápida: criar novo"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
