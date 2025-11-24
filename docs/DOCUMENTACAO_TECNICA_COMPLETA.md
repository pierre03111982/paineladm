# Documentação Técnica Completa - Experimente AI

## Visão Geral

O **Experimente AI** é uma plataforma completa de provador virtual inteligente que permite lojistas gerenciarem produtos, clientes e composições geradas por IA, enquanto clientes finais experimentam looks personalizados através de um aplicativo web.

A plataforma é composta por três aplicações principais:

1. **Painel Administrativo**: Sistema de gerenciamento global da plataforma (custos, lojistas, planos)
2. **Painel do Lojista**: Interface para lojistas gerenciarem produtos, clientes e visualizarem composições
3. **App Cliente (Modelo 2)**: Aplicativo web para clientes experimentarem looks e visualizarem favoritos

### Tecnologias Principais

- **Next.js 16.0.1** (Painel) / **Next.js 14.2.6** (App Cliente): Framework React com App Router
- **React 19.2.0** (Painel) / **React 18.3.1** (App Cliente): Biblioteca de interface de usuário
- **Firebase 12.5.0** (Painel) / **Firebase 12.6.0** (App Cliente): Autenticação, Firestore e Storage
- **Firebase Admin SDK 13.6.0**: Operações administrativas no servidor
- **Tailwind CSS 4** (Painel) / **Tailwind CSS 3.4.13** (App Cliente): Framework de estilização
- **TypeScript 5**: Tipagem estática
- **Vertex AI**: Geração de imagens com Try-On
- **Stability AI**: Geração e refinamento de imagens
- **Google Imagen 3.0**: Geração de cenários
- **Gemini 2.5 Flash Image**: Geração de looks criativos

---

## Estrutura de Arquivos

### Painel Administrativo e do Lojista (`paineladm/`)

```
paineladm/
├── src/
│   ├── app/
│   │   ├── (admin)/              # Rotas do painel administrativo
│   │   │   ├── layout.tsx        # Layout do admin
│   │   │   ├── page.tsx         # Dashboard admin
│   │   │   ├── lojistas/        # Gerenciamento de lojistas
│   │   │   ├── custos/          # Visualização de custos
│   │   │   └── planos/          # Gerenciamento de planos
│   │   ├── (lojista)/           # Rotas do painel do lojista
│   │   │   ├── layout.tsx       # Layout do lojista
│   │   │   ├── dashboard/       # Dashboard do lojista
│   │   │   ├── produtos/        # Gerenciamento de produtos
│   │   │   ├── clientes/        # Gerenciamento de clientes
│   │   │   ├── composicoes/     # Visualização de composições
│   │   │   ├── configuracoes/   # Configurações da loja
│   │   │   └── app-cliente/     # Link do app cliente
│   │   ├── api/                 # Rotas de API
│   │   │   ├── admin/           # APIs administrativas
│   │   │   ├── lojista/         # APIs do lojista
│   │   │   ├── cliente/         # APIs do cliente
│   │   │   ├── actions/         # Registro de ações (like, dislike)
│   │   │   └── anonimize/       # Anonimização de imagens
│   │   ├── login/               # Página de login
│   │   ├── layout.tsx            # Layout raiz
│   │   └── page.tsx             # Página inicial
│   ├── lib/
│   │   ├── firebaseAdmin.ts     # Configuração Firebase Admin
│   │   ├── firebaseConfig.ts    # Configuração Firebase Client
│   │   ├── firestore/
│   │   │   ├── server.ts        # Funções server-side Firestore
│   │   │   └── types.ts         # Tipos TypeScript
│   │   ├── auth/
│   │   │   ├── admin-auth.ts    # Autenticação admin
│   │   │   └── lojista-auth.ts  # Autenticação lojista
│   │   └── ai-services/        # Serviços de IA
│   │       ├── composition-orchestrator.ts
│   │       ├── vertex-tryon.ts
│   │       ├── stability-ai.ts
│   │       └── nano-banana.ts
│   └── components/              # Componentes React
├── package.json
└── next.config.mjs
```

### App Cliente Modelo 2 (`apps-cliente/modelo-2/`)

```
modelo-2/
├── src/
│   ├── app/
│   │   ├── [lojistaId]/         # Rotas dinâmicas por lojista
│   │   │   ├── layout.tsx       # Layout específico do lojista
│   │   │   ├── login/           # Login/cadastro
│   │   │   ├── experimentar/    # Página de experimentação
│   │   │   └── resultado/       # Resultados dos looks
│   │   ├── api/                 # Rotas de API (proxies)
│   │   │   ├── actions/         # Ações do cliente
│   │   │   ├── cliente/         # Autenticação e favoritos
│   │   │   ├── generate-looks/  # Geração de looks
│   │   │   └── upload-photo/    # Upload de fotos
│   │   ├── layout.tsx           # Layout raiz
│   │   └── page.tsx             # Página inicial
│   ├── components/
│   │   ├── client-app/          # Componentes do app
│   │   ├── views/               # Views principais
│   │   └── ui/                  # Componentes UI
│   └── lib/
│       ├── firebase.ts          # Configuração Firebase
│       ├── firebaseQueries.ts   # Queries Firestore
│       └── types.ts             # Tipos TypeScript
├── package.json
└── next.config.mjs
```

---

## Dependências

### Painel Administrativo (`paineladm/package.json`)

#### Dependencies

```json
{
  "@types/bcryptjs": "^2.4.6",
  "@types/uuid": "^10.0.0",
  "axios": "^1.13.2",
  "bcryptjs": "^3.0.3",
  "firebase": "^12.5.0",
  "firebase-admin": "^13.6.0",
  "form-data": "^4.0.4",
  "google-auth-library": "^10.5.0",
  "jspdf": "^3.0.3",
  "lucide-react": "^0.553.0",
  "next": "16.0.1",
  "qrcode": "^1.5.4",
  "react": "19.2.0",
  "react-dom": "19.2.0",
  "recharts": "^3.3.0",
  "sharp": "^0.34.5",
  "tailwind-merge": "^3.4.0",
  "uuid": "^13.0.0"
}
```

#### DevDependencies

```json
{
  "@tailwindcss/postcss": "^4",
  "@types/node": "^20",
  "@types/qrcode": "^1.5.6",
  "@types/react": "^19",
  "@types/react-dom": "^19",
  "dotenv": "^17.2.3",
  "eslint": "^9",
  "eslint-config-next": "16.0.1",
  "tailwindcss": "^4",
  "typescript": "^5"
}
```

### App Cliente Modelo 2 (`apps-cliente/modelo-2/package.json`)

#### Dependencies

```json
{
  "@radix-ui/react-checkbox": "^1.0.4",
  "@radix-ui/react-slot": "^1.0.3",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.1.1",
  "firebase": "^12.6.0",
  "lucide-react": "^0.553.0",
  "next": "14.2.6",
  "react": "18.3.1",
  "react-dom": "18.3.1",
  "react-icons": "^5.5.0",
  "tailwind-merge": "^2.5.2"
}
```

#### DevDependencies

```json
{
  "@tailwindcss/forms": "^0.5.7",
  "@types/node": "20.11.17",
  "@types/react": "18.2.47",
  "@types/react-dom": "18.2.18",
  "autoprefixer": "^10.4.19",
  "eslint": "8.56.0",
  "eslint-config-next": "14.1.0",
  "postcss": "^8.4.38",
  "tailwindcss": "^3.4.13",
  "typescript": "5.3.3"
}
```

---

## Arquivos Críticos

### 1. Configuração Firebase Admin (`paineladm/src/lib/firebaseAdmin.ts`)

```typescript
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

let adminApp: App | null = null;
let adminDb: Firestore | null = null;
let adminStorage: Storage | null = null;

function initializeAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    const missing = [];
    if (!projectId) missing.push("FIREBASE_PROJECT_ID ou NEXT_PUBLIC_FIREBASE_PROJECT_ID");
    if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
    if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY");
    
    const errorMsg = `Firebase Admin SDK não configurado. Variáveis faltando: ${missing.join(", ")}`;
    console.error("[FirebaseAdmin]", errorMsg);
    throw new Error(errorMsg);
  }

  try {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
    console.log("[FirebaseAdmin] ✅ Firebase Admin inicializado com sucesso");
    return adminApp;
  } catch (error: any) {
    console.error("[FirebaseAdmin] ❌ Erro ao inicializar Firebase Admin:", {
      message: error?.message,
      stack: error?.stack?.substring(0, 500),
    });
    throw error;
  }
}

export function getAdminDb(): Firestore {
  if (adminDb) {
    return adminDb;
  }

  const app = initializeAdminApp();
  adminDb = getFirestore(app);
  return adminDb;
}

export function getAdminStorage(): Storage {
  if (adminStorage) {
    return adminStorage;
  }

  const app = initializeAdminApp();
  adminStorage = getStorage(app);
  return adminStorage;
}

export function getAdminApp(): App {
  return initializeAdminApp();
}
```

### 2. Tipos Principais (`paineladm/src/lib/firestore/types.ts`)

```typescript
export type ProdutoDoc = {
  id: string;
  nome: string;
  preco: number;
  imagemUrl: string;
  categoria: string;
  tamanhos: string[];
  cores?: string[];
  medidas?: string;
  obs?: string;
  estoque?: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  arquivado?: boolean;
  ecommerceSync?: {
    platform: "shopify" | "nuvemshop" | "woocommerce" | "other";
    productId?: string;
    variantId?: string;
    lastSyncedAt?: Date;
    autoSync?: boolean;
    syncPrice?: boolean;
    syncStock?: boolean;
    syncVariations?: boolean;
  };
  qualityMetrics?: {
    compatibilityScore?: number;
    conversionRate?: number;
    complaintRate?: number;
    lastCalculatedAt?: Date;
  };
};

export type ClienteDoc = {
  id: string;
  nome: string;
  whatsapp: string;
  email?: string;
  totalComposicoes: number;
  totalLikes?: number;
  totalDislikes?: number;
  createdAt: Date;
  updatedAt: Date;
  arquivado?: boolean;
  acessoBloqueado?: boolean;
  tags?: string[];
  segmentacao?: {
    tipo?: "abandonou-carrinho" | "fa-vestidos" | "high-spender" | "somente-tryon" | "comprador-frequente" | "novo-cliente";
    ultimaAtualizacao?: Date;
  };
  historicoTentativas?: {
    produtosExperimentados: Array<{
      produtoId: string;
      produtoNome: string;
      categoria: string;
      dataTentativa: Date;
      liked?: boolean;
      compartilhado?: boolean;
      checkout?: boolean;
    }>;
    ultimaAtualizacao?: Date;
  };
};

export type ComposicaoDoc = {
  id: string;
  customer: {
    id: string;
    nome: string;
  } | null;
  products: Array<{
    id: string;
    nome: string;
  }>;
  createdAt: Date;
  liked: boolean;
  shares: number;
  isAnonymous: boolean;
  metrics?: {
    totalCostBRL?: number;
  } | null;
  totalCostBRL?: number;
  processingTime?: number;
};

export type LojaMetrics = {
  totalComposicoes: number;
  likedTotal: number;
  sharesTotal: number;
  checkoutTotal: number;
  anonymousTotal: number;
  lastAction: {
    action: string;
    createdAt: Date;
    customerName?: string;
  } | null;
  atualizadoEm: Date;
};
```

### 3. Layout Raiz (`paineladm/src/app/layout.tsx`)

```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Painel Experimente AI",
  description: "Gerencie sua loja, clientes e resultados do Provador Virtual.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" translate="no">
      <head>
        <meta name="google" content="notranslate" />
        <meta name="google-translate-customization" content="false" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        translate="no"
      >
        {children}
      </body>
    </html>
  );
}
```

### 4. Layout do Lojista (`paineladm/src/app/(lojista)/layout.tsx`)

```typescript
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { LojistaNav } from "@/app/components/lojista-nav";
import { MobileNavLinks } from "./components/MobileNavLinks";
import { LojistaLayoutUpdater } from "./components/LojistaLayoutUpdater";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { fetchLojaPerfil } from "@/lib/firestore/server";

export const dynamic = 'force-dynamic';

type LojistaLayoutProps = {
  children: ReactNode;
};

export default async function LojistaLayout({ children }: LojistaLayoutProps) {
  let lojistaId: string | null = null;
  let perfil: any = null;

  try {
    lojistaId = await getCurrentLojistaId();
    if (lojistaId) {
      perfil = await fetchLojaPerfil(lojistaId).catch(() => null);
    }
  } catch (error) {
    console.error("[LojistaLayout] Erro ao buscar perfil:", error);
  }

  const lojaNome = perfil?.nome || "Experimente AI";
  const lojaDescricao = perfil?.descricao || "Provador virtual e automações";
  const lojaLogo = perfil?.logoUrl || null;
  
  const initials = lojaNome
    .split(" ")
    .filter(Boolean)
    .map((word: string) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 p-6 lg:p-10">
        <aside className="hidden w-64 flex-col rounded-3xl border border-zinc-800/60 bg-zinc-900/70 p-6 shadow-[0_25px_80px_-45px_rgba(99,102,241,0.65)] backdrop-blur-xl md:flex">
          <div className="mb-8 space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-lg font-semibold text-indigo-200">
              {lojaLogo ? (
                <Image
                  src={lojaLogo}
                  alt={lojaNome}
                  width={48}
                  height={48}
                  className="h-full w-full rounded-2xl object-contain"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-indigo-300/80">
                EXPERIMENTE AI
              </p>
              <h2 id="sidebar-loja-nome" className="text-lg font-semibold text-white">
                {lojaNome}
              </h2>
              <p className="text-xs text-zinc-500">
                {lojaDescricao}
              </p>
            </div>
          </div>

          <LojistaNav />

          <div className="mt-auto rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
            <p className="text-sm font-medium text-indigo-100">
              Painel do Lojista
            </p>
            <p className="mt-1 text-xs text-indigo-200/80">
              Gerencie produtos, clientes e composições.
            </p>
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="mb-6 rounded-3xl border border-zinc-800/70 bg-zinc-900/60 p-5 backdrop-blur-xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-indigo-300/70">
                  PAINEL DO LOJISTA
                </p>
                <h1 id="header-loja-nome" className="text-xl font-semibold text-white md:text-2xl">
                  {lojaNome}
                </h1>
                <p className="text-sm text-zinc-400">
                  {lojaDescricao}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-200">
                  {lojaLogo ? (
                    <Image
                      src={lojaLogo}
                      alt={lojaNome}
                      width={32}
                      height={32}
                      className="h-full w-full rounded-full object-contain"
                    />
                  ) : (
                    <span className="text-xs font-semibold">{initials}</span>
                  )}
                </span>
                <div>
                  <p className="font-medium text-white">{lojaNome}</p>
                  <p className="text-xs text-zinc-500">
                    {perfil?.email || "lojista@experimente.ai"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 md:hidden">
              <MobileNavLinks />
            </div>
          </header>

          <main className="flex-1 rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-6 shadow-[0_40px_120px_-60px_rgba(99,102,241,0.65)] backdrop-blur-xl lg:p-8">
            {children}
          </main>
        </div>
      </div>
      
      <LojistaLayoutUpdater />
    </div>
  );
}
```

### 5. Layout do Admin (`paineladm/src/app/(admin)/layout.tsx`)

```typescript
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
  let adminEmail: string;
  try {
    adminEmail = await requireAdmin();
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }
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
```

### 6. API de Ações (Like/Dislike) (`paineladm/src/app/api/actions/route.ts`)

```typescript
import { NextResponse } from "next/server";
import { registerFavoriteLook, updateClienteComposicoesStats } from "@/lib/firestore/server";

const ALLOWED_METHODS = ["POST", "OPTIONS"];

function buildCorsHeaders() {
  const origin =
    process.env.NEXT_PUBLIC_CLIENT_APP_URL ?? "http://localhost:3000";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": ALLOWED_METHODS.join(", "),
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}

export async function POST(request: Request) {
  try {
    const {
      action,
      compositionId,
      jobId,
      lojistaId,
      customerId,
      customerName,
      productName,
      productPrice,
      imagemUrl,
    } =
      (await request.json()) as {
        action?: "like" | "dislike" | "share" | "checkout";
        compositionId?: string | null;
        jobId?: string | null;
        lojistaId?: string | null;
        customerId?: string | null;
        customerName?: string | null;
        productName?: string | null;
        productPrice?: number | null;
        imagemUrl?: string | null;
      };

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Ação obrigatória." },
        { status: 400, headers: buildCorsHeaders() }
      );
    }

    if (!lojistaId) {
      return NextResponse.json(
        { success: false, error: "lojistaId obrigatório." },
        { status: 400, headers: buildCorsHeaders() }
      );
    }

    // Registrar favorito para likes e dislikes (para contabilização)
    if ((action === "like" || action === "dislike") && customerId) {
      if (action === "like") {
        // Registrar like como favorito
        try {
          console.log("[api/actions] Registrando favorito para like:", {
            lojistaId,
            customerId,
            hasImagemUrl: !!imagemUrl,
            imagemUrl: imagemUrl?.substring(0, 100),
            compositionId,
            jobId,
          });
          
          await registerFavoriteLook({
            lojistaId,
            customerId,
            customerName,
            compositionId: compositionId ?? null,
            jobId: jobId ?? null,
            imagemUrl: imagemUrl ?? null,
            productName: productName ?? null,
            productPrice: typeof productPrice === "number" ? productPrice : null,
          });
          
          console.log("[api/actions] Favorito registrado com sucesso");
        } catch (favoriteError: any) {
          console.error("[api/actions] Erro ao registrar favorito:", favoriteError);
          // Não falhar a requisição se o favorito falhar
        }
      } else if (action === "dislike") {
        // Registrar dislike APENAS para contabilização (SEM salvar imagemUrl)
        const { getAdminDb } = await import("@/lib/firebaseAdmin");
        const db = getAdminDb();
        const favoritosRef = db
          .collection("lojas")
          .doc(lojistaId)
          .collection("clientes")
          .doc(customerId)
          .collection("favoritos");
        
        await favoritosRef.add({
          lojistaId,
          customerId,
          customerName: customerName ?? null,
          compositionId: compositionId ?? null,
          jobId: jobId ?? null,
          // NÃO salvar imagemUrl para dislikes - apenas contabilizar
          imagemUrl: null,
          productName: productName ?? null,
          productPrice: typeof productPrice === "number" ? productPrice : null,
          lookType: "criativo",
          action: "dislike",
          tipo: "dislike",
          votedType: "dislike",
          createdAt: new Date(),
        });
        
        console.log("[api/actions] Dislike registrado para contabilização (sem imagemUrl)");
      }

      // Atualizar estatísticas do cliente
      try {
        await updateClienteComposicoesStats(lojistaId, customerId);
      } catch (updateError) {
        console.error("[api/actions] Erro ao atualizar estatísticas:", updateError);
      }
    }

    // Atualizar composição como curtida ou não curtida
    if (compositionId && (action === "like" || action === "dislike")) {
      try {
        const { getAdminDb } = await import("@/lib/firebaseAdmin");
        const db = getAdminDb();
        const composicaoRef = db
          .collection("lojas")
          .doc(lojistaId)
          .collection("composicoes")
          .doc(compositionId);

        await composicaoRef.update({
          curtido: action === "like",
          liked: action === "like",
          disliked: action === "dislike",
          updatedAt: new Date(),
        });
      } catch (updateError) {
        console.error("[api/actions] Erro ao atualizar composição:", updateError);
      }
    }

    console.log("[api/actions] Ação registrada:", {
      action,
      lojistaId,
      compositionId,
      customerId,
    });

    return NextResponse.json(
      { success: true, message: "Ação registrada." },
      { status: 200, headers: buildCorsHeaders() }
    );
  } catch (error) {
    console.error("[api/actions] erro ao registrar ação", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao registrar ação.",
      },
      { status: 500, headers: buildCorsHeaders() }
    );
  }
}
```

### 7. API de Favoritos (`paineladm/src/app/api/cliente/favoritos/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { fetchFavoriteLooks } from "@/lib/firestore/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const lojistaId = request.nextUrl.searchParams.get("lojistaId");
    const customerId = request.nextUrl.searchParams.get("customerId");
    const timestamp = request.nextUrl.searchParams.get("_t");

    console.log("[api/cliente/favoritos] Buscando favoritos:", { lojistaId, customerId, timestamp });

    if (!lojistaId || !customerId) {
      console.error("[api/cliente/favoritos] Parâmetros faltando:", { lojistaId: !!lojistaId, customerId: !!customerId });
      return NextResponse.json(
        { error: "lojistaId e customerId são obrigatórios" },
        { status: 400 }
      );
    }

    // Adicionar headers para evitar cache
    const favorites = await fetchFavoriteLooks({ lojistaId, customerId });
    
    console.log(`[api/cliente/favoritos] Favoritos encontrados: ${favorites.length}`);
    if (favorites.length > 0) {
      console.log(`[api/cliente/favoritos] Primeiro favorito (mais recente):`, {
        id: favorites[0].id,
        imagemUrl: favorites[0].imagemUrl?.substring(0, 50),
        createdAt: favorites[0].createdAt,
        action: favorites[0].action
      });
    }

    return NextResponse.json(
      { favorites },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error: any) {
    console.error("[api/cliente/favoritos] Erro ao buscar favoritos:", error);
    console.error("[api/cliente/favoritos] Stack:", error?.stack);
    return NextResponse.json(
      { 
        error: "Erro interno ao buscar favoritos",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}
```

### 8. API de Autenticação do Cliente (`paineladm/src/app/api/cliente/auth/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { fetchClienteByWhatsapp } from "@/lib/firestore/server";
import bcrypt from "bcryptjs";

/**
 * POST /api/cliente/auth
 * Autentica cliente com WhatsApp e senha
 * Body: { lojistaId: string, whatsapp: string, password: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lojistaId, whatsapp, password } = body;

    if (!lojistaId || !whatsapp || !password) {
      return NextResponse.json(
        { error: "lojistaId, whatsapp e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const cleanWhatsapp = whatsapp.replace(/\D/g, "");
    const cliente = await fetchClienteByWhatsapp(lojistaId, cleanWhatsapp);

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    // Buscar dados completos do cliente para verificar senha
    const { getAdminDb } = await import("@/lib/firebaseAdmin");
    const db = getAdminDb();
    const clienteRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes")
      .doc(cliente.id);

    const clienteSnapshot = await clienteRef.get();
    if (!clienteSnapshot.exists) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    const clienteData = clienteSnapshot.data();
    const hashedPassword = clienteData?.passwordHash;

    if (!hashedPassword) {
      return NextResponse.json(
        { error: "Cliente não possui senha cadastrada. Faça o cadastro primeiro." },
        { status: 400 }
      );
    }

    // Verificar se o acesso está bloqueado
    if (clienteData?.acessoBloqueado === true || clienteData?.arquivado === true) {
      return NextResponse.json(
        { error: "Seu acesso ao aplicativo foi bloqueado. Entre em contato com a loja." },
        { status: 403 }
      );
    }

    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, hashedPassword);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Senha incorreta" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        whatsapp: cliente.whatsapp,
        email: cliente.email,
      },
    });
  } catch (error: any) {
    console.error("[API Cliente Auth] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao autenticar cliente" },
      { status: 500 }
    );
  }
}
```

### 9. API de Verificação de Sessão (`paineladm/src/app/api/cliente/check-session/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

/**
 * POST /api/cliente/check-session
 * Verifica se o cliente já está logado em outro dispositivo POR WHATSAPP
 * Body: { lojistaId: string, whatsapp: string, deviceId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lojistaId, whatsapp, deviceId } = body;

    if (!lojistaId || !whatsapp) {
      return NextResponse.json(
        { error: "lojistaId e whatsapp são obrigatórios" },
        { status: 400 }
      );
    }

    const cleanWhatsapp = whatsapp.replace(/\D/g, "");
    const db = getAdminDb();

    // Buscar cliente por WhatsApp
    const clientesRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes");

    const clientesSnapshot = await clientesRef
      .where("whatsapp", "==", cleanWhatsapp)
      .limit(1)
      .get();

    if (clientesSnapshot.empty) {
      // Cliente não existe, permitir login (será criado no cadastro)
      return NextResponse.json({
        alreadyLoggedIn: false,
        message: "Cliente não encontrado",
      });
    }

    const clienteDoc = clientesSnapshot.docs[0];
    const clienteData = clienteDoc.data();

    // Verificar se há sessão ativa em outro dispositivo
    const activeSession = clienteData?.activeSession;
    const activeDeviceId = clienteData?.activeDeviceId;
    const lastLoginAt = clienteData?.lastLoginAt;

    // Se não há sessão ativa, permitir login
    if (!activeSession || !activeDeviceId) {
      // Atualizar sessão atual
      await clienteDoc.ref.update({
        activeSession: true,
        activeDeviceId: deviceId || "unknown",
        lastLoginAt: new Date(),
      });

      return NextResponse.json({
        alreadyLoggedIn: false,
        message: "Sessão iniciada",
      });
    }

    // Se o deviceId é o mesmo, permitir login (mesmo dispositivo)
    if (activeDeviceId === deviceId) {
      // Atualizar última atividade
      await clienteDoc.ref.update({
        lastLoginAt: new Date(),
      });

      return NextResponse.json({
        alreadyLoggedIn: false,
        message: "Sessão renovada",
      });
    }

    // NOVA LÓGICA: "Último a logar ganha"
    // Se há sessão ativa em outro dispositivo, desconectar o anterior e permitir o novo login
    console.log(`[API Cliente Check Session] Sessão ativa em outro dispositivo (${activeDeviceId}). Desconectando e permitindo novo login.`);
    
    // Desconectar dispositivo anterior e permitir novo login
    await clienteDoc.ref.update({
      activeSession: true,
      activeDeviceId: deviceId || "unknown",
      lastLoginAt: new Date(),
      lastLogoutAt: new Date(), // Marcar logout do dispositivo anterior
    });

    return NextResponse.json({
      alreadyLoggedIn: false,
      message: "Sessão anterior desconectada, nova sessão iniciada",
      previousDeviceDisconnected: true,
    });
  } catch (error: any) {
    console.error("[API Cliente Check Session] Erro:", error);
    // Em caso de erro, permitir login (não bloquear)
    return NextResponse.json(
      {
        alreadyLoggedIn: false,
        error: error.message || "Erro ao verificar sessão",
      },
      { status: 200 }
    );
  }
}
```

### 10. Função de Registro de Favoritos (`paineladm/src/lib/firestore/server.ts` - `registerFavoriteLook`)

```typescript
export async function registerFavoriteLook(params: {
  lojistaId: string;
  customerId: string;
  customerName?: string | null;
  compositionId?: string | null;
  jobId?: string | null;
  imagemUrl?: string | null;
  productName?: string | null;
  productPrice?: number | null;
}) {
  const {
    lojistaId,
    customerId,
    customerName,
    compositionId,
    jobId,
    imagemUrl,
    productName,
    productPrice,
  } = params;

  console.log("[registerFavoriteLook] Iniciando registro de favorito:", {
    lojistaId,
    customerId,
    hasImagemUrl: !!imagemUrl,
    imagemUrl: imagemUrl?.substring(0, 100), // Log parcial da URL
    compositionId,
    jobId,
  });

  if (!lojistaId || !customerId) {
    const error = new Error("lojistaId e customerId são obrigatórios para favoritos");
    console.error("[registerFavoriteLook] Erro de validação:", error);
    throw error;
  }

  // Validar se imagemUrl está presente (obrigatório para favoritos)
  if (!imagemUrl || imagemUrl.trim() === "") {
    console.warn("[registerFavoriteLook] AVISO: imagemUrl vazio ou ausente. Favorito será salvo mesmo assim para contabilização.");
    // Não bloquear, mas avisar
  }

  try {
    const ref = clienteFavoritosRef(lojistaId, customerId);
    
    // Verificar se já existe um favorito com a mesma imagemUrl ou compositionId
    // Isso evita duplicatas quando o usuário atualiza a página e dá like novamente
    let existingFavorite = null;
    
    if (imagemUrl && imagemUrl.trim() !== "") {
      // Buscar por imagemUrl
      const byImageQuery = ref
        .where("imagemUrl", "==", imagemUrl)
        .where("action", "==", "like")
        .limit(1);
      
      const byImageSnapshot = await byImageQuery.get();
      if (!byImageSnapshot.empty) {
        existingFavorite = byImageSnapshot.docs[0];
        console.log("[registerFavoriteLook] Favorito já existe com mesma imagemUrl. ID:", existingFavorite.id);
      }
    }
    
    // Se não encontrou por imagemUrl e tem compositionId, buscar por compositionId
    if (!existingFavorite && compositionId) {
      const byCompositionQuery = ref
        .where("compositionId", "==", compositionId)
        .where("action", "==", "like")
        .limit(1);
      
      const byCompositionSnapshot = await byCompositionQuery.get();
      if (!byCompositionSnapshot.empty) {
        existingFavorite = byCompositionSnapshot.docs[0];
        console.log("[registerFavoriteLook] Favorito já existe com mesmo compositionId. ID:", existingFavorite.id);
      }
    }
    
    // Se já existe, atualizar a data de criação e retornar o ID existente
    if (existingFavorite) {
      await existingFavorite.ref.update({
        createdAt: new Date(), // Atualizar data para manter como mais recente
        updatedAt: new Date(),
      });
      console.log("[registerFavoriteLook] Favorito existente atualizado. ID:", existingFavorite.id);
      return existingFavorite.id;
    }
    
    // Se não existe, criar novo favorito
    const favoriteData = {
      lojistaId,
      customerId,
      customerName: customerName ?? null,
      compositionId: compositionId ?? null,
      jobId: jobId ?? null,
      imagemUrl: imagemUrl ?? null,
      productName: productName ?? null,
      productPrice: typeof productPrice === "number" ? productPrice : null,
      lookType: "criativo",
      action: "like",
      tipo: "like",
      votedType: "like",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await ref.add(favoriteData);
    console.log("[registerFavoriteLook] Novo favorito criado. ID:", docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error("[registerFavoriteLook] Erro ao registrar favorito:", error);
    console.error("[registerFavoriteLook] Stack:", error?.stack);
    throw error;
  }
}
```

### 11. Função de Busca de Favoritos (`paineladm/src/lib/firestore/server.ts` - `fetchFavoriteLooks`)

```typescript
export async function fetchFavoriteLooks(params: {
  lojistaId: string;
  customerId: string;
  limit?: number;
}): Promise<Array<{
  id: string;
  imagemUrl: string | null;
  productName: string | null;
  productPrice: number | null;
  createdAt: Date;
  action: string;
}>> {
  const { lojistaId, customerId, limit = 10 } = params;

  if (!lojistaId || !customerId) {
    console.warn("[fetchFavoriteLooks] lojistaId ou customerId ausente");
    return [];
  }

  try {
    const ref = clienteFavoritosRef(lojistaId, customerId);
    
    // Buscar favoritos com action="like" diretamente na query
    // Isso evita que dislikes consumam o limite da query
    let snapshot;
    try {
      snapshot = await ref
        .where("action", "==", "like")
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();
    } catch (error: any) {
      // Se não houver índice composto, fazer fallback
      if (error?.code === "failed-precondition") {
        console.warn("[fetchFavoriteLooks] Índice composto não encontrado, usando fallback");
        // Buscar mais documentos e filtrar no código
        const fallbackSnapshot = await ref
          .orderBy("createdAt", "desc")
          .limit(limit * 20) // Buscar mais para garantir que temos likes suficientes
          .get();
        
        const favorites: any[] = [];
        fallbackSnapshot.forEach((doc) => {
          const data = doc.data();
          const action = data.action || data.tipo || data.votedType;
          
          // Filtrar apenas likes
          if (action === "like" && data.imagemUrl) {
            const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date();
            favorites.push({
              id: doc.id,
              imagemUrl: data.imagemUrl,
              productName: data.productName || null,
              productPrice: data.productPrice || null,
              createdAt,
              action: "like",
            });
          }
        });
        
        // Ordenar por data e limitar
        favorites.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return favorites.slice(0, limit);
      } else {
        throw error;
      }
    }

    const favorites: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // Garantir que é um like e tem imagemUrl
      const action = data.action || data.tipo || data.votedType;
      if (action !== "like") {
        return; // Pular se não for like
      }
      
      if (!data.imagemUrl) {
        return; // Pular se não tiver imagemUrl
      }
      
      // Normalizar createdAt
      const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date();
      
      favorites.push({
        id: doc.id,
        imagemUrl: data.imagemUrl,
        productName: data.productName || null,
        productPrice: data.productPrice || null,
        createdAt,
        action: "like",
      });
    });

    console.log(`[fetchFavoriteLooks] Total de favoritos encontrados: ${favorites.length}`);
    if (favorites.length > 0) {
      console.log(`[fetchFavoriteLooks] Primeiro favorito:`, {
        id: favorites[0].id,
        createdAt: favorites[0].createdAt,
        hasImagemUrl: !!favorites[0].imagemUrl,
      });
      console.log(`[fetchFavoriteLooks] Último favorito:`, {
        id: favorites[favorites.length - 1].id,
        createdAt: favorites[favorites.length - 1].createdAt,
        hasImagemUrl: !!favorites[favorites.length - 1].imagemUrl,
      });
    }

    return favorites;
  } catch (error: any) {
    console.error("[fetchFavoriteLooks] Erro ao buscar favoritos:", error);
    console.error("[fetchFavoriteLooks] Stack:", error?.stack);
    return [];
  }
}
```

### 12. Autenticação do Lojista (`paineladm/src/lib/auth/lojista-auth.ts`)

```typescript
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp, getAdminDb } from "../firebaseAdmin";

/**
 * Verifica se há um session ID de impersonificação na URL ou cookies
 * Retorna o lojistaId se encontrado, null caso contrário
 */
async function getImpersonationTokenFromUrl(): Promise<string | null> {
  try {
    // Primeiro, verificar se há session ID nos cookies (após login)
    const cookieStore = await cookies();
    const impersonationSessionId = cookieStore.get("impersonation_session")?.value;
    const impersonationLojistaId = cookieStore.get("impersonation_lojistaId")?.value;

    if (impersonationSessionId && impersonationLojistaId) {
      // Verificar se a sessão ainda é válida
      const sessionDoc = await getAdminDb()
        .collection("impersonation_sessions")
        .doc(impersonationSessionId)
        .get();

      if (sessionDoc.exists) {
        const sessionData = sessionDoc.data();
        const expiresAt = sessionData?.expiresAt?.toDate?.() || new Date(sessionData?.expiresAt);
        
        if (expiresAt > new Date() && sessionData?.lojistaId === impersonationLojistaId) {
          console.log("[LojistaAuth] Sessão de impersonificação válida encontrada nos cookies:", impersonationLojistaId);
          return impersonationLojistaId;
        }
      }
    }

    // Se não encontrou nos cookies, verificar na URL (primeira vez)
    const headersList = await headers();
    const referer = headersList.get("referer") || "";
    
    if (referer) {
      try {
        const url = new URL(referer);
        const sessionId = url.searchParams.get("impersonation_session");
        const lojistaId = url.searchParams.get("lojistaId");

        if (sessionId && lojistaId) {
          // Verificar se a sessão existe e não expirou
          const sessionDoc = await getAdminDb()
            .collection("impersonation_sessions")
            .doc(sessionId)
            .get();

          if (sessionDoc.exists) {
            const sessionData = sessionDoc.data();
            const expiresAt = sessionData?.expiresAt?.toDate?.() || new Date(sessionData?.expiresAt);
            
            if (expiresAt > new Date() && sessionData?.lojistaId === lojistaId) {
              console.log("[LojistaAuth] Session ID de impersonificação válido encontrado na URL:", lojistaId);
              return lojistaId;
            }
          }
        }
      } catch (error) {
        // URL inválida, continuar
      }
    }

    return null;
  } catch (error) {
    console.error("[LojistaAuth] Erro ao verificar token de impersonificação:", error);
    return null;
  }
}

/**
 * Obtém o lojistaId do usuário logado
 * Busca na coleção lojas pelo email do usuário autenticado
 * Também verifica tokens de impersonificação
 */
export async function getCurrentLojistaId(): Promise<string | null> {
  try {
    // Durante o build, não há cookies, então retornar null
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return null;
    }

    // Primeiro, verificar se há token de impersonificação na URL
    const impersonationLojistaId = await getImpersonationTokenFromUrl();
    if (impersonationLojistaId) {
      console.log("[LojistaAuth] Usando lojistaId de impersonificação:", impersonationLojistaId);
      return impersonationLojistaId;
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      console.log("[LojistaAuth] Token não encontrado nos cookies");
      return null;
    }

    // Verificar token no Firebase Admin
    const auth = getAuth(getAdminApp());
    const decodedToken = await auth.verifyIdToken(token);

    const email = decodedToken.email;
    if (!email) {
      console.log("[LojistaAuth] Email não encontrado no token");
      return null;
    }

    // Buscar loja pelo email na coleção lojas
    const db = getAdminDb();
    const lojaSnapshot = await db
      .collection("lojas")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (lojaSnapshot.empty) {
      console.log("[LojistaAuth] Nenhuma loja encontrada para o email:", email);
      return null;
    }

    const lojistaId = lojaSnapshot.docs[0].id;
    console.log("[LojistaAuth] LojistaId encontrado:", lojistaId, "para email:", email);
    return lojistaId;
  } catch (error) {
    console.error("[LojistaAuth] Erro ao obter lojistaId:", error);
    return null;
  }
}
```

### 13. Autenticação do Admin (`paineladm/src/lib/auth/admin-auth.ts`)

```typescript
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "../firebaseAdmin";

/**
 * Lista de emails autorizados como admin
 * Em produção, isso deve vir do Firestore ou de variáveis de ambiente
 */
function getAdminEmails(): string[] {
  const envEmails = process.env.ADMIN_EMAILS;
  
  if (envEmails) {
    const emails = envEmails.split(",").map((e) => e.trim()).filter(Boolean);
    console.log("[AdminAuth] Emails admin carregados da variável de ambiente:", emails);
    return emails;
  }
  
  // Fallback para desenvolvimento
  const fallback = [
    "admin@experimenteai.com",
    "pierre03111982@gmail.com",
  ];
  console.warn("[AdminAuth] ADMIN_EMAILS não configurada, usando fallback:", fallback);
  return fallback;
}

const ADMIN_EMAILS = getAdminEmails();

/**
 * Verifica se um email tem permissão de admin
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.some((adminEmail) => 
    email.toLowerCase() === adminEmail.toLowerCase()
  );
}

/**
 * Verifica se o usuário atual é admin
 * Retorna o email do usuário se for admin, null caso contrário
 */
export async function getCurrentAdmin(): Promise<string | null> {
  try {
    // Durante o build, não há cookies, então retornar null
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.log("[AdminAuth] Build em andamento, pulando verificação");
      return null;
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      console.log("[AdminAuth] Token não encontrado nos cookies");
      return null;
    }

    console.log("[AdminAuth] Token encontrado, verificando...");

    // Verificar token no Firebase Admin
    const auth = getAuth(getAdminApp());
    const decodedToken = await auth.verifyIdToken(token);

    const email = decodedToken.email;
    if (!email) {
      console.log("[AdminAuth] Email não encontrado no token");
      return null;
    }

    console.log("[AdminAuth] Email do token:", email);
    console.log("[AdminAuth] Lista de admins:", ADMIN_EMAILS);

    // Verificar se o email está na lista de admins
    const isAdmin = isAdminEmail(email);
    console.log("[AdminAuth] É admin?", isAdmin);

    if (isAdmin) {
      return email;
    }

    console.log("[AdminAuth] Email não está na lista de admins");
    return null;
  } catch (error) {
    console.error("[AdminAuth] Erro ao verificar admin:", error);
    if (error instanceof Error) {
      console.error("[AdminAuth] Mensagem de erro:", error.message);
      if (process.env.NEXT_PHASE !== 'phase-production-build') {
        console.error("[AdminAuth] Stack:", error.stack);
      }
    }
    return null;
  }
}

/**
 * Requer que o usuário seja admin
 * Redireciona para login se não for admin
 */
export async function requireAdmin(): Promise<string> {
  try {
    // Durante o build, não fazer redirect, apenas retornar um email placeholder
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.log("[requireAdmin] Build em andamento, retornando placeholder");
      return "admin@build";
    }

    const adminEmail = await getCurrentAdmin();

    if (!adminEmail) {
      console.log("[requireAdmin] Usuário não é admin, redirecionando para login");
      redirect("/login?admin=true&error=unauthorized");
    }

    return adminEmail;
  } catch (error) {
    console.error("[requireAdmin] Erro ao verificar admin:", error);
    // Se for erro de redirect, relançar
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }
    // Durante build, não fazer redirect
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return "admin@build";
    }
    // Caso contrário, redirecionar
    redirect("/login?admin=true&error=check_failed");
  }
}
```

### 14. Configuração Firebase Client (`apps-cliente/modelo-2/src/lib/firebase.ts`)

```typescript
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const REQUIRED_KEYS = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.storageBucket,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId,
]

export const isFirebaseConfigured = REQUIRED_KEYS.every(
  (value) => typeof value === "string" && value.length > 0
)

let firebaseApp: FirebaseApp | null = null
let cachedAuth: Auth | null = null
let cachedDb: Firestore | null = null
let cachedStorage: FirebaseStorage | null = null

function initializeFirebase() {
  if (!isFirebaseConfigured) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Firebase não configurado: usando dados mock/fallback.")
    }
    return null
  }

  if (!firebaseApp) {
    firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp()
  }

  return firebaseApp
}

export function getFirebaseApp() {
  return initializeFirebase()
}

export function getFirebaseAuth() {
  const app = initializeFirebase()
  if (!app) return null
  if (!cachedAuth) {
    cachedAuth = getAuth(app)
  }
  return cachedAuth
}

export function getFirestoreClient() {
  const app = initializeFirebase()
  if (!app) return null
  if (!cachedDb) {
    cachedDb = getFirestore(app)
  }
  return cachedDb
}

export function getStorageClient() {
  const app = initializeFirebase()
  if (!app) return null
  if (!cachedStorage) {
    cachedStorage = getStorage(app)
  }
  return cachedStorage
}
```

---

## Regras de Negócio

### 1. Fluxo de Autenticação

#### Autenticação do Lojista (Painel)

1. **Login**: O lojista faz login com email e senha através do Firebase Auth
2. **Verificação**: O sistema busca o `lojistaId` na coleção `lojas` usando o email do token
3. **Impersonificação**: Admins podem impersonar lojistas através de uma sessão temporária
4. **Autorização**: O layout do lojista verifica o `lojistaId` e carrega o perfil da loja

#### Autenticação do Cliente (App)

1. **Cadastro/Login**: O cliente se cadastra ou faz login com WhatsApp e senha
2. **Verificação de Sessão**: O sistema verifica se há sessão ativa em outro dispositivo
3. **Último a Logar Ganha**: Se um cliente logar em um novo dispositivo, a sessão anterior é automaticamente desconectada
4. **Bloqueio**: Clientes com `acessoBloqueado: true` ou `arquivado: true` não podem fazer login

### 2. Fluxo Principal: Upload de Foto → Processamento → Salvamento

#### Passo 1: Upload de Foto

1. Cliente faz upload da foto através do app
2. Foto é enviada para `/api/cliente/upload-photo` ou `/api/lojista/composicoes/upload-photo`
3. Foto é salva no Firebase Storage em `lojas/{lojistaId}/clientes/uploads/{timestamp}-{uuid}.{ext}`
4. URL pública da foto é retornada ao cliente

#### Passo 2: Seleção de Produtos

1. Cliente seleciona produtos do catálogo
2. Produtos são enviados junto com a foto para geração de looks

#### Passo 3: Geração de Composições

1. Requisição é enviada para `/api/lojista/composicoes/generate`
2. O `CompositionOrchestrator` gerencia o fluxo:
   - **Try-On** (Vertex AI): Para roupas, aplica o produto na foto da pessoa
   - **Look Natural**: Geração de cenários com Google Imagen 3.0 ou Stability AI
   - **Look Criativo**: Geração com Gemini 2.5 Flash Image usando múltiplos produtos
   - **Refinamento**: Opcional com Stability AI
   - **Watermark**: Aplicação de marca d'água com logo da loja
3. Custos são registrados em `lojas/{lojistaId}/custos`
4. Composição é salva em `lojas/{lojistaId}/composicoes/{compositionId}`

#### Passo 4: Interação do Cliente

1. Cliente visualiza os looks gerados
2. Cliente pode dar **Like**, **Dislike**, **Compartilhar** ou **Checkout**
3. Ações são registradas em `/api/actions`:
   - **Like**: Salva favorito com `imagemUrl` e `action: "like"`
   - **Dislike**: Salva apenas para contabilização, `imagemUrl: null`, `action: "dislike"`
   - **Share**: Incrementa contador de compartilhamentos
   - **Checkout**: Registra intenção de compra

#### Passo 5: Salvamento de Favoritos

1. Likes são salvos em `lojas/{lojistaId}/clientes/{customerId}/favoritos`
2. Sistema verifica duplicatas por `imagemUrl` ou `compositionId`
3. Se já existe, atualiza `createdAt` em vez de criar duplicata
4. Favoritos são ordenados por `createdAt` descendente
5. Apenas os últimos 10 favoritos com `action: "like"` e `imagemUrl` não nulo são exibidos

### 3. Regras de Favoritos

- **Like = Favorito**: Apenas likes são salvos como favoritos com imagem
- **Dislike = Não Salva Imagem**: Dislikes apenas contabilizam, não salvam `imagemUrl`
- **Sem Duplicatas**: Sistema previne duplicatas verificando `imagemUrl` e `compositionId`
- **Últimos 10**: Apenas os 10 favoritos mais recentes são exibidos
- **Filtro no Banco**: Query usa `.where("action", "==", "like")` para filtrar no Firestore

### 4. Regras de Sessão do Cliente

- **Último a Logar Ganha**: Se um cliente logar em um novo dispositivo, a sessão anterior é desconectada automaticamente
- **Verificação por WhatsApp**: Sessões são verificadas por número de WhatsApp, não por deviceId
- **Sem Bloqueio**: Sistema não bloqueia login, apenas desconecta sessão anterior

### 5. Regras de Composições

- **Filtro Padrão**: Painel do lojista mostra apenas composições com `liked: true` ou `curtido: true` por padrão
- **Custos Registrados**: Todas as composições têm custos registrados em BRL
- **Tempo de Processamento**: Tempo de processamento é registrado para análise

### 6. Regras de Produtos

- **Conversão de Imagens**: URLs de imagens que não são do Firebase Storage são convertidas para PNG e fazem upload
- **Categorização**: Produtos são categorizados para facilitar busca
- **Arquivamento**: Produtos podem ser arquivados sem serem excluídos

### 7. Regras de Clientes

- **Segmentação Automática**: Clientes são automaticamente segmentados baseado em comportamento
- **Histórico de Tentativas**: Sistema registra produtos experimentados pelo cliente
- **Estatísticas**: `totalComposicoes`, `totalLikes` e `totalDislikes` são atualizados automaticamente

---

## Conclusão

Esta documentação técnica cobre os três principais componentes da plataforma Experimente AI:

1. **Painel Administrativo**: Gerenciamento global da plataforma
2. **Painel do Lojista**: Interface para lojistas gerenciarem seus negócios
3. **App Cliente (Modelo 2)**: Aplicativo web para clientes experimentarem looks

A arquitetura utiliza Next.js com App Router, Firebase para backend e storage, e integra múltiplos serviços de IA para geração de imagens. O sistema é projetado para escalabilidade, segurança e experiência do usuário otimizada.

