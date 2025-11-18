import type { ReactNode } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Package,
  Settings,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin-auth";

// Forçar renderização dinâmica (não estática)
export const dynamic = 'force-dynamic';

type AdminLayoutProps = {
  children: ReactNode;
};

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/lojistas", label: "Lojistas", icon: Users },
  { href: "/admin/custos", label: "Custos por Lojista", icon: DollarSign },
  { href: "/admin/planos", label: "Planos", icon: Package },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Verificar se o usuário é admin (server-side)
  // Se não for admin, requireAdmin() redireciona para login
  let adminEmail: string;
  try {
    adminEmail = await requireAdmin();
  } catch (error) {
    // Se for erro de redirect, relançar (Next.js redirect)
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }
    // Outros erros: usar placeholder
    console.error("[AdminLayout] Erro ao verificar admin:", error);
    adminEmail = "admin@error";
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-3 md:gap-6 p-3 md:p-6 lg:p-10">
        <aside className="hidden w-64 flex-col rounded-2xl md:rounded-3xl border border-zinc-800/60 bg-zinc-900/70 p-4 md:p-6 shadow-[0_25px_80px_-45px_rgba(79,70,229,0.65)] backdrop-blur-xl md:flex">
          <div className="mb-6 md:mb-8 space-y-2">
            <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl md:rounded-2xl bg-purple-500/20 text-base md:text-lg font-semibold text-purple-200 shrink-0">
              ADM
            </div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs uppercase tracking-[0.18em] text-purple-300/80">
                Experimente AI
              </p>
              <h2 className="text-base md:text-lg font-semibold text-white">
                Painel Administrativo
              </h2>
              <p className="text-[10px] md:text-xs text-zinc-500">
                Controle total da plataforma
              </p>
            </div>
          </div>

          <nav className="space-y-1.5 md:space-y-2">
            {ADMIN_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 md:gap-3 rounded-lg md:rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-zinc-300 transition hover:border-purple-400/50 hover:bg-purple-500/10 hover:text-purple-200"
              >
                <item.icon className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-xl md:rounded-2xl border border-purple-500/20 bg-purple-500/10 p-3 md:p-4">
            <p className="text-xs md:text-sm font-medium text-purple-100">
              Administração
            </p>
            <p className="mt-1 text-[10px] md:text-xs text-purple-200/80">
              Gerencie lojistas, planos e custos da plataforma.
            </p>
          </div>
        </aside>

        <div className="flex flex-1 flex-col min-w-0">
          <header className="mb-3 md:mb-6 rounded-2xl md:rounded-3xl border border-zinc-800/70 bg-zinc-900/60 p-3 md:p-5 backdrop-blur-xl">
            <div className="flex flex-col gap-2 md:gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] md:text-xs uppercase tracking-[0.24em] text-purple-300/70">
                  Painel Administrativo
                </p>
                <h1 className="text-base md:text-xl lg:text-2xl font-semibold text-white">
                  Experimente AI - Administração
                </h1>
                <p className="text-xs md:text-sm text-zinc-400">
                  Controle de custos, receita e lojistas
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs md:text-sm text-zinc-400 shrink-0">
                <span className="inline-flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-200 shrink-0">
                  <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">Sistema Administrativo</p>
                  <p className="text-[10px] md:text-xs text-zinc-500 truncate">
                    {adminEmail}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 md:mt-4 flex flex-wrap gap-1.5 md:gap-2 md:hidden">
              {ADMIN_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-1.5 md:gap-2 rounded-full border border-zinc-800 px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs text-zinc-300 transition hover:border-purple-400 hover:text-purple-200"
                >
                  <item.icon className="h-3 w-3 md:h-3.5 md:w-3.5" />
                  {item.label}
                </Link>
              ))}
            </div>
          </header>

          <main className="flex-1 rounded-2xl md:rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-3 md:p-6 lg:p-8 shadow-[0_40px_120px_-60px_rgba(168,85,247,0.65)] backdrop-blur-xl overflow-x-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}











