import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  Package,
  Settings,
  TrendingUp,
  TestTube,
  UserCog,
  DollarSign,
  UserCircle,
  Monitor,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { getAdminDb } from "@/lib/firebaseAdmin";

// Forçar renderização dinâmica (não estática)
export const dynamic = 'force-dynamic';

type AdminLayoutProps = {
  children: ReactNode;
};

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/usuarios", label: "Usuários", icon: UserCog },
  { href: "/admin/lojistas", label: "Lojistas", icon: Users },
  { href: "/admin/clientes", label: "Clientes", icon: UserCircle },
  { href: "/admin/custos", label: "Custos por Loja", icon: DollarSign },
  { href: "/admin/planos", label: "Planos", icon: Package },
  { href: "/admin/simulador", label: "Simulador", icon: Monitor },
  { href: "/admin/testes-api", label: "Testes API", icon: TestTube },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

async function getAdminConfig() {
  try {
    const db = getAdminDb();
    const configDoc = await db.collection("admin").doc("config").get();
    
    if (configDoc.exists) {
      const data = configDoc.data();
      return {
        nome: data?.nome || "Painel Administrativo",
        marca: data?.marca || "EXPERIMENTE AI",
        logoUrl: data?.logoUrl || null,
      };
    }
    
    return {
      nome: "Painel Administrativo",
      marca: "EXPERIMENTE AI",
      logoUrl: null,
    };
  } catch (error) {
    console.error("[AdminLayout] Erro ao buscar config:", error);
    return {
      nome: "Painel Administrativo",
      marca: "EXPERIMENTE AI",
      logoUrl: null,
    };
  }
}

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

  // Buscar configurações do admin
  const adminConfig = await getAdminConfig();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 p-6 lg:p-10">
        <aside className="hidden w-64 flex-col rounded-3xl border border-zinc-800/60 bg-zinc-900/70 p-6 shadow-[0_25px_80px_-45px_rgba(79,70,229,0.65)] backdrop-blur-xl md:flex">
          <div className="mb-8 space-y-2">
            {adminConfig.logoUrl ? (
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border border-purple-500/30 bg-purple-500/10">
                <Image
                  src={adminConfig.logoUrl}
                  alt={adminConfig.nome}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20 text-lg font-semibold text-purple-200">
                ADM
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-purple-300/80">
                {adminConfig.marca}
              </p>
              <h2 className="text-lg font-semibold text-white">
                {adminConfig.nome}
              </h2>
              <p className="text-xs text-zinc-500">
                Controle total da plataforma
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            {ADMIN_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-300 transition hover:border-purple-400/50 hover:bg-purple-500/10 hover:text-purple-200"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">
            <p className="text-sm font-medium text-purple-100">
              Administração
            </p>
            <p className="mt-1 text-xs text-purple-200/80">
              Gerencie lojistas, planos e custos da plataforma.
            </p>
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="mb-6 rounded-3xl border border-zinc-800/70 bg-zinc-900/60 p-5 backdrop-blur-xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-purple-300/70">
                  Painel Administrativo
                </p>
                <h1 className="text-xl font-semibold text-white md:text-2xl">
                  {adminConfig.nome}
                </h1>
                <p className="text-sm text-zinc-400">
                  Controle de custos, receita e lojistas
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-200 overflow-hidden">
                  {adminConfig.logoUrl ? (
                    <Image
                      src={adminConfig.logoUrl}
                      alt={adminConfig.nome}
                      width={32}
                      height={32}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                  <TrendingUp className="h-4 w-4" />
                  )}
                </span>
                <div>
                  <p className="font-medium text-white">Sistema Administrativo</p>
                  <p className="text-xs text-zinc-500">
                    {adminEmail}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 md:hidden">
              {ADMIN_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-purple-400 hover:text-purple-200"
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              ))}
            </div>
          </header>

          <main className="flex-1 rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-6 shadow-[0_40px_120px_-60px_rgba(168,85,247,0.65)] backdrop-blur-xl lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

