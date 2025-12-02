# Documentação Técnica - Aba DISPLAY

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura de Arquivos](#estrutura-de-arquivos)
3. [Arquivos Críticos - Código Fonte Completo](#arquivos-críticos---código-fonte-completo)
4. [Análise de Erros e Inconsistências](#análise-de-erros-e-inconsistências)
5. [Fluxo de Funcionamento](#fluxo-de-funcionamento)
6. [Problemas Identificados](#problemas-identificados)
7. [Recomendações](#recomendações)

---

## 🎯 Visão Geral

A aba **Display** permite que lojistas projetem o provador virtual em monitores e tablets na loja física. O display acompanha as últimas composições geradas e destaca chamadas para compra.

**Funcionalidades principais:**
- Geração de link dedicado para o display
- Geração de QR Code para acesso rápido
- Preview em iframe do app cliente
- Download de QR Code em PNG e PDF

---

## 📁 Estrutura de Arquivos

### Árvore de Diretórios Completa do DISPLAY

```
paineladm/
├── src/
│   ├── app/
│   │   ├── (lojista)/
│   │   │   ├── display/
│   │   │   │   ├── page.tsx                    # Página principal do Display
│   │   │   │   └── display-link-panel.tsx      # Componente de link e QR Code
│   │   │   └── simulador/
│   │   │       └── simulator-frame.tsx          # Componente de iframe para preview
│   │   └── api/
│   │       └── display/
│   │           ├── session/
│   │           │   └── route.ts                 # API de gerenciamento de sessões
│   │           ├── photo/
│   │           │   └── route.ts                 # API de busca de fotos
│   │           └── upload-photo/
│   │               └── route.ts                 # API de upload de fotos
│   └── lib/
│       └── client-app.ts                        # Funções de construção de URLs
```

### Arquivos Relacionados (App Cliente Modelo-2)

```
apps-cliente/modelo-2/
├── src/
│   ├── app/
│   │   ├── layout.tsx                          # Layout raiz
│   │   ├── globals.css                         # Estilos globais
│   │   └── [lojistaId]/
│   │       └── experimentar/
│   │           └── page.tsx                    # Página que recebe display=1
│   └── components/
│       └── ui/
│           └── SafeImage.tsx                   # Componente de imagem segura
├── tailwind.config.ts                          # Configuração do Tailwind
├── postcss.config.mjs                          # Configuração do PostCSS
├── next.config.mjs                             # Configuração do Next.js
└── package.json                                # Dependências do projeto
```

---

## 📄 Arquivos Críticos - Código Fonte Completo

### 1. `src/app/layout.tsx` (App Cliente Modelo-2)

```typescript
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "App Cliente | ExperimenteAI",
  description: "Provador virtual inteligente - Desbloqueie seu estilo perfeito",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" translate="no">
      <head>
        <meta name="google" content="notranslate" />
        <meta name="google-translate-customization" content="false" />
        {/* Viewport com suporte para safe areas */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        {/* Barra superior preta - Android */}
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: light)" />
        {/* Barra inferior preta - Android */}
        <meta name="msapplication-navbutton-color" content="#000000" />
        {/* Barra superior preta - iOS/Mac */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body translate="no">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1f2937",
              color: "#fff",
              borderRadius: "12px",
              padding: "16px",
              fontSize: "14px",
              fontWeight: "500",
            },
            success: {
              iconTheme: {
                primary: "#10b981",
                secondary: "#fff",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "#fff",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
```

**Análise:**
- ✅ Importa `globals.css` corretamente
- ✅ Configuração de viewport adequada
- ✅ Fontes do Google Fonts carregadas (Inter e Playfair Display)
- ⚠️ **POTENCIAL PROBLEMA**: Não há verificação se o CSS está carregando corretamente

---

### 2. `src/app/globals.css` (App Cliente Modelo-2)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: light;
}

html {
  background-color: #000000;
  /* Suporte para safe areas - iOS */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

body {
  @apply bg-surface text-slate-900 antialiased;
  background-color: #000000; /* Fallback preto para as barras */
  font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
  min-height: -webkit-fill-available; /* iOS Safari */
  /* Garantir que o body cubra as safe areas */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

/* Barra de navegação inferior preta - Android */
@supports (padding: max(0px)) {
  body {
    padding-bottom: max(env(safe-area-inset-bottom), 0px);
  }
}

@layer base {
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    @apply text-slate-900;
  }

  ::selection {
    @apply bg-accent-1/20 text-slate-900;
  }
}

@layer components {
  .shadow-soft {
    box-shadow: 0 24px 60px -30px rgba(110, 121, 198, 0.45);
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
  }

  @keyframes pulse-glow-strong {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 25px rgba(59, 130, 246, 0.9), 0 0 50px rgba(59, 130, 246, 0.6), 0 0 75px rgba(59, 130, 246, 0.3), 0 4px 6px -1px rgba(0, 0, 0, 0.8);
    }
    50% {
      transform: scale(1.03);
      box-shadow: 0 0 40px rgba(59, 130, 246, 1), 0 0 80px rgba(59, 130, 246, 0.8), 0 0 120px rgba(59, 130, 246, 0.5), 0 4px 6px -1px rgba(0, 0, 0, 0.8);
    }
  }

  @keyframes pulse-glow {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 20px rgba(37, 99, 235, 0.8), 0 0 40px rgba(147, 51, 234, 0.6), 0 0 60px rgba(249, 115, 22, 0.4), 0 0 80px rgba(34, 197, 94, 0.3);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 0 0 30px rgba(37, 99, 235, 1), 0 0 60px rgba(147, 51, 234, 0.8), 0 0 90px rgba(249, 115, 22, 0.6), 0 0 120px rgba(34, 197, 94, 0.4);
    }
  }

  .animate-pulse-glow {
    animation: pulse-glow 2s ease-in-out infinite;
  }

  @keyframes slide-in {
    from {
      transform: translateX(-100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .animate-slide-in {
    animation: slide-in 0.5s ease-out;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.4s ease-out;
  }

  @keyframes scale-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .animate-scale-in {
    animation: scale-in 0.3s ease-out;
  }

  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }

  .animate-shimmer {
    animation: shimmer 2s infinite;
    background: linear-gradient(
      to right,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    background-size: 1000px 100%;
  }
}
```

**Análise:**
- ✅ Diretivas `@tailwind` corretas
- ✅ Uso de `@layer` para organização
- ✅ Classes customizadas definidas
- ⚠️ **POTENCIAL PROBLEMA**: A classe `bg-surface` é usada mas precisa estar definida no Tailwind config

---

### 3. `tailwind.config.ts` (App Cliente Modelo-2)

```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#d8dce8", // Tom médio mais escuro para melhor contraste
        "surface-strong": "#c8ccd8", // Um pouco mais escuro para gradientes
        "accent-1": "#6f5cf1", // Mantém o roxo
        "accent-2": "#3cd2c9", // Mantém o turquesa
        "accent-3": "#ff7c9c", // Mantém o rosa
      },
      boxShadow: {
        soft: "0 24px 60px -30px rgba(110, 121, 198, 0.5)",
      },
      borderRadius: {
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
}
export default config
```

**Análise:**
- ✅ Cores customizadas definidas (`surface`, `accent-1`, `accent-2`, `accent-3`)
- ✅ Plugin `@tailwindcss/forms` instalado
- ✅ Paths de conteúdo corretos
- ✅ **CONSISTÊNCIA**: A cor `surface` está definida e é usada no `globals.css`

---

### 4. `postcss.config.mjs` (App Cliente Modelo-2)

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Análise:**
- ✅ Configuração padrão correta
- ✅ Plugins necessários presentes

---

### 5. `next.config.mjs` (App Cliente Modelo-2)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Otimizações de build
  swcMinify: true, // Usar SWC para minificação (mais rápido)
  compress: true, // Habilitar compressão
  
  // Remover console.log em produção
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Manter apenas erros e avisos
    } : false,
  },
  
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "**.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "*.firebasestorage.googleapis.com",
      },
    ],
    unoptimized: false,
    formats: ['image/avif', 'image/webp'], // Formatos modernos
    minimumCacheTTL: 60, // Cache de 60 segundos
  },
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
}

export default nextConfig
```

**Análise:**
- ✅ Configuração de imagens adequada
- ✅ Remote patterns para Firebase Storage
- ⚠️ **POTENCIAL PROBLEMA**: Não há configuração específica para CSS/Tailwind

---

### 6. `package.json` (App Cliente Modelo-2)

```json
{
  "name": "modelo-2",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3005",
    "dev:3005": "next dev -p 3005",
    "build": "next build",
    "start": "next start -p 3005",
    "start:3005": "next start -p 3005",
    "lint": "next lint",
    "postinstall": "next telemetry disable"
  },
  "dependencies": {
    "@radix-ui/react-checkbox": "^1.0.4",
    "@radix-ui/react-slot": "^1.0.3",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "firebase": "^12.6.0",
    "lucide-react": "^0.553.0",
    "next": "14.2.6",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-hot-toast": "^2.6.0",
    "react-icons": "^5.5.0",
    "tailwind-merge": "^2.5.2"
  },
  "devDependencies": {
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
}
```

**Análise:**
- ✅ Tailwind CSS instalado (v3.4.13)
- ✅ PostCSS instalado (v8.4.38)
- ✅ Autoprefixer instalado
- ✅ Plugin `@tailwindcss/forms` instalado
- ✅ Versões compatíveis

---

### 7. `src/components/ui/SafeImage.tsx` (App Cliente Modelo-2)

```typescript
"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface SafeImageProps {
  src: string
  alt: string
  className?: string
  containerClassName?: string
  style?: React.CSSProperties
  onClick?: () => void
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
  loading?: "lazy" | "eager"
  title?: string
}

/**
 * Componente SafeImage - Blindado contra imagens que estouram o container
 * 
 * Características:
 * - Usa position: relative inline para garantir que nunca ultrapasse o container pai
 * - Placeholder SVG quando a imagem falha
 * - Suporta todas as props padrão de img
 */
export function SafeImage({
  src,
  alt,
  className,
  containerClassName,
  style,
  onClick,
  onError,
  loading = "lazy",
  title,
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error("[SafeImage] Erro ao carregar imagem:", src, e)
    setHasError(true)
    setIsLoading(false)
    if (onError) {
      onError(e)
    }
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  // Placeholder SVG quando há erro
  const placeholderSvg = (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-gray-400", className)}
      style={style}
    >
      <rect width="200" height="200" fill="#f3f4f6" />
      <path
        d="M60 80L100 60L140 80V140H60V80Z"
        stroke="#9ca3af"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="85" cy="95" r="8" fill="#9ca3af" />
      <path
        d="M60 120L75 110L90 120L110 110L140 120V140H60V120Z"
        stroke="#9ca3af"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  )

  if (hasError) {
    return (
      <div
        className={cn("flex items-center justify-center bg-gray-100", className)}
        style={{ position: "relative", ...style }}
        title={title}
      >
        {placeholderSvg}
      </div>
    )
  }

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        maxWidth: "100%",
        width: "100%",
        ...style,
      }}
      className={cn("inline-block", containerClassName)}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          "block max-w-full h-auto transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100 animate-fade-in",
          className
        )}
        style={{
          position: "relative",
          maxWidth: "100%",
          height: "auto",
        }}
        onClick={onClick}
        onError={handleError}
        onLoad={handleLoad}
        loading={loading}
        title={title}
      />
    </div>
  )
}
```

**Análise:**
- ✅ Usa classes Tailwind (`animate-pulse`, `animate-spin`, `animate-fade-in`)
- ✅ Usa função `cn` para merge de classes
- ⚠️ **VERIFICAR**: Se `animate-fade-in` está definida no `globals.css` (✅ está definida)

---

### 8. `src/app/[lojistaId]/experimentar/page.tsx` (App Cliente Modelo-2)

**Arquivo muito extenso (1010 linhas). Principais pontos relevantes para o Display:**

- ✅ Componente client-side (`"use client"`)
- ✅ Usa `ExperimentarView` como componente principal
- ⚠️ **PROBLEMA IDENTIFICADO**: Não há tratamento específico para o parâmetro `display=1` na URL
- ⚠️ **PROBLEMA IDENTIFICADO**: A página não detecta quando está sendo carregada em modo display

**Código relevante para display (linhas 1-18):**

```typescript
"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { fetchLojistaData, fetchProdutos } from "@/lib/firebaseQueries"
import type { Produto, LojistaData, GeneratedLook } from "@/lib/types"
import { ExperimentarView } from "@/components/views/ExperimentarView"
import toast from "react-hot-toast"

// Resolver backend URL
const getBackendUrl = () => {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search)
    return params.get("backend") || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_PAINELADM_URL || "http://localhost:3000"
  }
  return process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_PAINELADM_URL || "http://localhost:3000"
}
```

**⚠️ PROBLEMA CRÍTICO**: Não há leitura do parâmetro `display=1` na URL para ativar modo display.

---

### 9. `src/app/(lojista)/display/page.tsx` (Painel Adm)

```typescript
import { headers } from "next/headers";
import { PageHeader } from "../components/page-header";
import { SimulatorFrame } from "../simulador/simulator-frame";
import { DisplayLinkPanel } from "./display-link-panel";
import { buildClientAppDisplayUrl } from "@/lib/client-app";

function resolveDisplayUrl(
  lojistaId: string | null,
  panelBaseUrl: string
): URL {
  try {
    // Usar a mesma função do DisplayLinkPanel para garantir URL idêntica ao QR code
    const clientAppUrl = buildClientAppDisplayUrl(lojistaId);
    const panelUrl = new URL(panelBaseUrl);
    
    // Construir URL completa
    let target: URL;
    if (clientAppUrl.startsWith("http")) {
      // URL absoluta
      target = new URL(clientAppUrl);
    } else {
      // URL relativa, usar a mesma origem do painel
      target = new URL(clientAppUrl, panelBaseUrl);
    }

    // Adicionar parâmetros do display (mesmos do QR code)
    if (lojistaId) {
      target.searchParams.set("lojista", lojistaId);
    }
    target.searchParams.set("display", "1");
    target.searchParams.set("backend", panelBaseUrl);

    return target;
  } catch (error) {
    console.error("[resolveDisplayUrl] Error:", error);
    // Fallback final - usar rota experimentar (a rota /display não existe)
    const isDev = process.env.NODE_ENV === "development";
    const fallbackBase = isDev 
      ? `http://localhost:${process.env.NEXT_PUBLIC_MODELO_2_PORT || "3005"}`
      : "https://app2.experimenteai.com.br";
    const fallbackPath = lojistaId ? `/${lojistaId}/experimentar` : "/experimentar";
    const fallbackUrl = new URL(fallbackPath, fallbackBase);
    if (lojistaId) {
      fallbackUrl.searchParams.set("lojista", lojistaId);
    }
    fallbackUrl.searchParams.set("display", "1");
    fallbackUrl.searchParams.set("backend", panelBaseUrl);
    return fallbackUrl;
  }
}

type DisplayPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DisplayPage({ searchParams }: DisplayPageProps) {
  const params = await searchParams;
  const lojistaIdFromQuery = params.lojistaId as string | undefined;
  
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ??
    headerList.get("host") ??
    "localhost:3000";
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const panelBaseUrl = `${protocol}://${host}`;

  // Prioridade: query string (modo admin) > usuário logado > env var
  const { getCurrentLojistaId } = await import("@/lib/auth/lojista-auth");
  const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
  const lojistaId =
    lojistaIdFromQuery ||
    lojistaIdFromAuth ||
    process.env.NEXT_PUBLIC_LOJISTA_ID ||
    process.env.LOJISTA_ID ||
    null;

  const displayUrl = resolveDisplayUrl(lojistaId, panelBaseUrl);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Display da Loja"
        description="Projete o provador virtual em monitores e tablets na loja física. O display acompanha as últimas composições e destaca as chamadas para compra."
      />

      <DisplayLinkPanel lojistaId={lojistaId} panelBaseUrl={panelBaseUrl} />

      <SimulatorFrame src={displayUrl.toString()} />
    </div>
  );
}
```

**Análise:**
- ✅ Página server-side (async)
- ✅ Constrói URL corretamente com parâmetro `display=1`
- ✅ Usa fallback para rota `/experimentar` (correto, pois `/display` não existe)

---

### 10. `src/app/(lojista)/display/display-link-panel.tsx` (Painel Adm)

```typescript
"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Check, AlertCircle, Download } from "lucide-react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { buildClientAppDisplayUrl } from "@/lib/client-app";

type DisplayLinkPanelProps = {
  lojistaId?: string | null;
  panelBaseUrl: string;
};

function resolveDisplayUrl(
  lojistaId: string | null | undefined,
  panelBaseUrl: string
): URL {
  try {
    const clientAppUrl = buildClientAppDisplayUrl(lojistaId);
    const panelUrl = new URL(panelBaseUrl);
    
    // Construir URL completa
    let target: URL;
    if (clientAppUrl.startsWith("http")) {
      // URL absoluta
      target = new URL(clientAppUrl);
    } else {
      // URL relativa, usar a mesma origem do painel
      target = new URL(clientAppUrl, panelBaseUrl);
    }

    // Adicionar parâmetros do display
    if (lojistaId) {
      target.searchParams.set("lojista", lojistaId);
    }
    target.searchParams.set("display", "1");
    target.searchParams.set("backend", panelBaseUrl);

    return target;
  } catch (error) {
    console.error("[resolveDisplayUrl] Error:", error);
    // Fallback final - usar rota experimentar (a rota /display não existe)
    const isDev = process.env.NODE_ENV === "development";
    const fallbackBase = isDev 
      ? `http://localhost:${process.env.NEXT_PUBLIC_MODELO_2_PORT || "3005"}`
      : "https://app2.experimenteai.com.br";
    const fallbackPath = lojistaId ? `/${lojistaId}/experimentar` : "/experimentar";
    const fallbackUrl = new URL(fallbackPath, fallbackBase);
    if (lojistaId) {
      fallbackUrl.searchParams.set("lojista", lojistaId);
    }
    fallbackUrl.searchParams.set("display", "1");
    fallbackUrl.searchParams.set("backend", panelBaseUrl);
    return fallbackUrl;
  }
}

export function DisplayLinkPanel({ lojistaId, panelBaseUrl }: DisplayLinkPanelProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadState, setDownloadState] = useState<"idle" | "success" | "error">(
    "idle"
  );

  const displayUrl = useMemo(() => resolveDisplayUrl(lojistaId ?? null, panelBaseUrl), [
    lojistaId,
    panelBaseUrl,
  ]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    QRCode.toDataURL(displayUrl.toString(), {
      errorCorrectionLevel: "H",
      width: 448,
      margin: 2,
      color: {
        dark: "#22d3ee",
        light: "#ffffff",
      },
    })
      .then((dataUrl: string) => {
        if (active) {
          setQrDataUrl(dataUrl);
          setLoading(false);
        }
      })
      .catch((error: unknown) => {
        console.error("[DisplayLinkPanel] QR Code error:", error);
        if (active) {
          setQrDataUrl(null);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [displayUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayUrl.toString());
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch (error) {
      console.error("[DisplayLinkPanel] copy error:", error);
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `display-qrcode-${lojistaId || "loja"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadState("success");
    setTimeout(() => setDownloadState("idle"), 2000);
  };

  const handleDownloadPdf = () => {
    if (!qrDataUrl) return;
    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 18;
      const imageSize = pageHeight - margin * 2;

      pdf.setFont("Helvetica", "bold");
      pdf.setFontSize(24);
      pdf.text("Display interativo do provador", pageWidth / 2, margin, {
        align: "center",
      });

      pdf.addImage(
        qrDataUrl,
        "PNG",
        margin,
        margin + 10,
        imageSize,
        imageSize
      );

      pdf.setFontSize(12);
      pdf.setFont("Helvetica", "normal");
      pdf.text(
        [
          "Escaneie este QR Code para abrir o display em outro monitor ou tablet.",
          "Mantenha o navegador em tela cheia e com a guia ativa para exibir as composições geradas.",
        ],
        margin + imageSize + 12,
        margin + 20,
        { maxWidth: pageWidth - margin * 2 - imageSize - 12 }
      );

      pdf.setTextColor("#22d3ee");
      pdf.text(
        displayUrl.toString(),
        margin + imageSize + 12,
        margin + 52,
        { maxWidth: pageWidth - margin * 2 - imageSize - 12 }
      );

      pdf.save(`display-provador-${lojistaId || "loja"}.pdf`);
      setDownloadState("success");
      setTimeout(() => setDownloadState("idle"), 2000);
    } catch (error) {
      console.error("[DisplayLinkPanel] pdf error:", error);
      setDownloadState("error");
      setTimeout(() => setDownloadState("idle"), 2000);
    }
  };

  return (
    <section className="grid gap-6 rounded-2xl border border-zinc-800/60 bg-zinc-950/40 p-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
          Display da loja
        </span>
        <h2 className="text-lg font-semibold text-white">
          Leve o provador para vitrines e monitores
        </h2>
        <p className="text-sm text-zinc-400">
          Copie o link oficial do display ou imprima o QR Code para abrir o painel
          em qualquer monitor. Ideal para vitrines, balcões e totens interativos.
        </p>
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs text-cyan-100">
          Dica: deixe o navegador em tela cheia (F11) e fixe esta página no monitor
          para acompanhar novas composições em tempo real.
        </div>
      </div>

      <div className="grid gap-5 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">Link dedicado</h3>
          <p className="text-xs text-zinc-500">
            Use este link para abrir o display em outro dispositivo ou para fixar no
            navegador do monitor da loja.
          </p>
          <input
            readOnly
            value={displayUrl.toString()}
            className="w-full truncate rounded-lg border border-zinc-700/60 bg-zinc-900 px-3 py-2 text-xs text-zinc-300"
          />
          <button
            onClick={handleCopy}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition",
              copyState === "copied"
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                : copyState === "error"
                ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
                : "border-zinc-700 text-zinc-300 hover:border-cyan-400 hover:text-cyan-200"
            )}
          >
            {copyState === "copied" ? (
              <>
                <Check className="h-4 w-4" />
                Copiado
              </>
            ) : copyState === "error" ? (
              <>
                <AlertCircle className="h-4 w-4" />
                Falhou
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copiar link
              </>
            )}
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">QR Code rápido</h3>
          <p className="text-xs text-zinc-500">
            Escaneie para abrir o display no tablet ou no monitor secundário da
            loja. Perfeito para vitrines e eventos.
          </p>
          <div className="flex h-32 w-32 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-900/80">
            {loading ? (
              <span className="text-[10px] uppercase tracking-[0.24em] text-zinc-600">
                Gerando...
              </span>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code do display"
                className="h-32 w-32 rounded-lg border border-zinc-800/60 bg-white p-2"
              />
            ) : (
              <span className="text-[10px] uppercase tracking-[0.24em] text-rose-500">
                Erro
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownloadPng}
              disabled={!qrDataUrl}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition",
                qrDataUrl
                  ? "border-zinc-700 text-zinc-300 hover:border-cyan-400 hover:text-cyan-200"
                  : "cursor-not-allowed border-zinc-800 text-zinc-600"
              )}
            >
              <Download className="h-4 w-4" />
              Baixar PNG
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={!qrDataUrl}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition",
                qrDataUrl
                  ? "border-zinc-700 text-zinc-300 hover:border-cyan-400 hover:text-cyan-200"
                  : "cursor-not-allowed border-zinc-800 text-zinc-600"
              )}
            >
              <Download className="h-4 w-4" />
              Baixar PDF
            </button>
          </div>
          {downloadState === "success" ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[10px] text-emerald-100">
              <Check className="h-3.5 w-3.5" />
              Arquivo baixado
            </div>
          ) : downloadState === "error" ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-[10px] text-rose-100">
              <AlertCircle className="h-3.5 w-3.5" />
              Falha ao gerar arquivo
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
```

**Análise:**
- ✅ Componente client-side funcional
- ✅ Gera QR Code corretamente
- ✅ Usa classes Tailwind do paineladm (não do app cliente)
- ✅ Funcionalidades de download implementadas

---

### 11. `src/lib/client-app.ts` (Painel Adm)

```typescript
export function buildClientAppUrl(path: string = ""): string {
  const isDev = process.env.NODE_ENV === "development";
  let baseUrl: string;
  
  // Prioridade 1: Variável de ambiente explícita
  if (process.env.NEXT_PUBLIC_CLIENT_APP_URL) {
    baseUrl = process.env.NEXT_PUBLIC_CLIENT_APP_URL.replace(/\/$/, "");
  } 
  // Prioridade 2: Subdomínio em produção
  else if (!isDev && process.env.NEXT_PUBLIC_APP_SUBDOMAIN) {
    const subdomain = process.env.NEXT_PUBLIC_APP_SUBDOMAIN;
    const protocol = process.env.NEXT_PUBLIC_APP_PROTOCOL || "https";
    baseUrl = `${protocol}://${subdomain}`;
  }
  // Prioridade 3: Subdomínio padrão em produção
  else if (!isDev) {
    baseUrl = "https://app.experimenteai.com.br";
  }
  // Desenvolvimento: usar porta local
  else {
    const port = process.env.NEXT_PUBLIC_APPMELHORADO_PORT || "3001";
    baseUrl = `http://localhost:${port}`;
  }
  
  if (!path) {
    return baseUrl;
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildClientAppShareUrl(lojistaId?: string | null): string {
  const base = buildClientAppUrl();
  if (!lojistaId) {
    return `${base}/lojista-demo`;
  }
  
  // Se base é relativa, construir URL relativa
  if (base.startsWith("/")) {
    return `${base}/${lojistaId}`;
  }
  
  // Se base é absoluta, usar URL completa
  try {
    const url = new URL(base);
    url.pathname = `/${lojistaId}`;
    return url.toString();
  } catch {
    return `${base}/${lojistaId}`;
  }
}

export function buildClientAppDisplayUrl(lojistaId?: string | null): string {
  // Usar a rota /experimentar com parâmetro display=1 (a rota /display não existe)
  const path = lojistaId ? `/${lojistaId}/experimentar` : "/experimentar";
  const base = buildClientAppUrl(path);
  
  // Se base é relativa, retornar como está (parâmetros serão adicionados depois)
  if (base.startsWith("/")) {
    return base;
  }
  
  // Se base é absoluta, adicionar parâmetros
  try {
    const url = new URL(base);
    if (lojistaId) {
      url.searchParams.set("lojista", lojistaId);
    }
    url.searchParams.set("display", "1");
    return url.toString();
  } catch (error) {
    console.error("[buildClientAppDisplayUrl] Error creating URL:", error);
    // Fallback: usar rota experimentar
    return lojistaId ? `/${lojistaId}/experimentar?display=1` : "/experimentar?display=1";
  }
}
```

**Análise:**
- ✅ Função corrigida recentemente para usar `/experimentar` em vez de `/display`
- ✅ Adiciona parâmetro `display=1` corretamente
- ⚠️ **PROBLEMA**: A função usa `NEXT_PUBLIC_APPMELHORADO_PORT` mas deveria usar `NEXT_PUBLIC_MODELO_2_PORT` para o modelo 2

---

### 12. `src/app/(lojista)/simulador/simulator-frame.tsx` (Painel Adm)

```typescript
"use client";

import { useEffect, useRef, useState } from "react";

interface SimulatorFrameProps {
  src: string;
}

export function SimulatorFrame({ src }: SimulatorFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setIsLoading(false);
      setError(null);
    };

    const handleError = () => {
      setIsLoading(false);
      setError("Erro ao carregar o simulador. Verifique se o app cliente está rodando.");
    };

    iframe.addEventListener("load", handleLoad);
    iframe.addEventListener("error", handleError);

    return () => {
      iframe.removeEventListener("load", handleLoad);
      iframe.removeEventListener("error", handleError);
    };
  }, [src]);

  return (
    <div className="relative w-full h-[calc(100vh-200px)] border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Carregando simulador...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
          <div className="text-center p-4">
            <p className="text-red-600 font-medium mb-2">Erro ao carregar</p>
            <p className="text-sm text-red-500">{error}</p>
            <p className="text-xs text-gray-500 mt-2">URL: {src}</p>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={src}
        className="w-full h-full border-0"
        title="Simulador do App Cliente"
        allow="camera; microphone; geolocation"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
      />
    </div>
  );
}
```

**Análise:**
- ✅ Tratamento de loading e erro implementado
- ✅ Sandbox configurado para segurança
- ⚠️ **PROBLEMA**: O iframe pode ter problemas de CORS ou X-Frame-Options

---

## 🔍 Análise de Erros e Inconsistências

### 1. **PROBLEMA CRÍTICO: Modo Display Não Implementado**

**Localização:** `apps-cliente/modelo-2/src/app/[lojistaId]/experimentar/page.tsx`

**Problema:**
- A página `/experimentar` recebe o parâmetro `display=1` na URL, mas **não há código que leia ou processe esse parâmetro**
- Não há lógica para ativar um "modo display" quando `display=1` está presente
- A página funciona normalmente mesmo com o parâmetro, sem adaptações para display

**Evidência:**
```typescript
// ❌ Não há leitura de searchParams para display
// ❌ Não há verificação de display mode
// ❌ Não há UI adaptada para display
```

**Impacto:**
- O display não funciona como esperado
- A página pode não estar otimizada para exibição em monitores
- Pode não ter funcionalidades específicas de display (auto-refresh, fullscreen, etc.)

---

### 2. **INCONSISTÊNCIA: Variável de Ambiente Incorreta**

**Localização:** `paineladm/src/lib/client-app.ts` (linha 21)

**Problema:**
- A função `buildClientAppUrl` usa `NEXT_PUBLIC_APPMELHORADO_PORT` (porta 3001)
- Mas o app modelo-2 roda na porta **3005** (conforme `package.json`)
- O fallback deveria usar `NEXT_PUBLIC_MODELO_2_PORT` ou porta 3005

**Código problemático:**
```typescript
// ❌ Linha 21: Usa porta errada
const port = process.env.NEXT_PUBLIC_APPMELHORADO_PORT || "3001";
baseUrl = `http://localhost:${port}`;
```

**Correção necessária:**
```typescript
// ✅ Deveria ser:
const port = process.env.NEXT_PUBLIC_MODELO_2_PORT || "3005";
baseUrl = `http://localhost:${port}`;
```

---

### 3. **PROBLEMA: Rota `/display` Não Existe**

**Status:** ✅ **CORRIGIDO RECENTEMENTE**

**Localização:** `paineladm/src/lib/client-app.ts` e `paineladm/src/app/(lojista)/display/page.tsx`

**Situação:**
- Anteriormente, o código tentava acessar `/display` que não existe
- **Correção aplicada:** Agora usa `/experimentar?display=1`
- Fallbacks também foram corrigidos

**Código corrigido:**
```typescript
// ✅ Agora usa /experimentar
const path = lojistaId ? `/${lojistaId}/experimentar` : "/experimentar";
```

---

### 4. **VERIFICAÇÃO: Classes Tailwind vs CSS**

**Análise de Consistência:**

| Classe Usada | Definida no Tailwind? | Definida no globals.css? | Status |
|--------------|----------------------|--------------------------|--------|
| `bg-surface` | ✅ Sim (cor: `#d8dce8`) | ✅ Sim (`@apply bg-surface`) | ✅ OK |
| `text-slate-900` | ✅ Sim (Tailwind padrão) | ✅ Sim (`@apply text-slate-900`) | ✅ OK |
| `animate-fade-in` | ❌ Não | ✅ Sim (`@keyframes fade-in`) | ✅ OK |
| `animate-pulse` | ✅ Sim (Tailwind padrão) | ❌ Não | ✅ OK |
| `animate-spin` | ✅ Sim (Tailwind padrão) | ❌ Não | ✅ OK |
| `animate-pulse-glow` | ❌ Não | ✅ Sim (`@keyframes pulse-glow`) | ✅ OK |
| `animate-scale-in` | ❌ Não | ✅ Sim (`@keyframes scale-in`) | ✅ OK |

**Conclusão:** ✅ **Sem inconsistências críticas encontradas**

---

### 5. **PROBLEMA: Iframe Pode Ter Restrições CORS/X-Frame-Options**

**Localização:** `paineladm/src/app/(lojista)/simulador/simulator-frame.tsx`

**Problema Potencial:**
- O iframe carrega conteúdo de outro domínio (`app2.experimenteai.com.br`)
- Pode haver restrições de `X-Frame-Options: DENY` ou `Content-Security-Policy`
- O erro 404/484 pode ser causado por essas restrições

**Evidência do Erro:**
```
Failed to load display?lojista=hOQL.Flocalhost%3A3000:1 resource: 
the server responded with a status of 484 ()
```

**Solução Necessária:**
- Verificar headers HTTP do app cliente modelo-2
- Adicionar header `X-Frame-Options: SAMEORIGIN` ou `ALLOW-FROM`
- Configurar CSP adequadamente

---

### 6. **PROBLEMA: Erro 404 no Iframe**

**Erro Observado:**
```
404: NOT_FOUND
Code: `DEPLOYMENT_NOT_FOUND`
ID: `gru1::vtqhw-1764043953613-1b0a26775ffd`
```

**Possíveis Causas:**
1. URL malformada sendo gerada
2. Rota não existe no app cliente
3. Problema de deploy/versão no Vercel
4. Cache do navegador

**Análise da URL:**
- A URL gerada deve ser: `https://app2.experimenteai.com.br/{lojistaId}/experimentar?display=1&backend=...`
- Verificar se a URL está sendo construída corretamente

---

## 🔄 Fluxo de Funcionamento

### Fluxo Atual (Como Está Implementado)

```
1. Lojista acessa /display no paineladm
   ↓
2. DisplayPage carrega e resolve lojistaId
   ↓
3. resolveDisplayUrl() constrói URL:
   - buildClientAppDisplayUrl() → /{lojistaId}/experimentar
   - Adiciona ?display=1&backend=...
   ↓
4. DisplayLinkPanel gera QR Code e link
   ↓
5. SimulatorFrame carrega iframe com a URL
   ↓
6. ❌ PROBLEMA: App cliente recebe display=1 mas não processa
   ↓
7. Página experimentar carrega normalmente (sem modo display)
```

### Fluxo Esperado (Como Deveria Ser)

```
1. Lojista acessa /display no paineladm
   ↓
2. DisplayPage carrega e resolve lojistaId
   ↓
3. resolveDisplayUrl() constrói URL correta
   ↓
4. DisplayLinkPanel gera QR Code e link
   ↓
5. SimulatorFrame carrega iframe
   ↓
6. ✅ App cliente detecta display=1 na URL
   ↓
7. ✅ Ativa modo display:
   - UI simplificada
   - Auto-refresh de composições
   - Fullscreen otimizado
   - Sem interações do usuário
```

---

## 🐛 Problemas Identificados

### 🔴 CRÍTICO

1. **Modo Display Não Implementado no App Cliente**
   - **Arquivo:** `apps-cliente/modelo-2/src/app/[lojistaId]/experimentar/page.tsx`
   - **Problema:** Não lê nem processa o parâmetro `display=1`
   - **Impacto:** Display não funciona como esperado
   - **Solução:** Implementar leitura de `searchParams` e lógica de modo display

2. **Variável de Ambiente Incorreta**
   - **Arquivo:** `paineladm/src/lib/client-app.ts`
   - **Problema:** Usa `NEXT_PUBLIC_APPMELHORADO_PORT` em vez de `NEXT_PUBLIC_MODELO_2_PORT`
   - **Impacto:** Em desenvolvimento, pode apontar para porta errada
   - **Solução:** Corrigir para usar porta 3005 ou variável correta

3. **Erro 404/484 no Iframe**
   - **Causa:** URL malformada ou restrições de CORS/X-Frame-Options
   - **Impacto:** Preview não carrega
   - **Solução:** Verificar URL gerada e headers HTTP

### 🟡 MÉDIO

4. **Falta de Tratamento de Erro Específico**
   - Não há tratamento diferenciado para erros de display
   - Mensagens genéricas não ajudam no diagnóstico

5. **Falta de Validação de URL**
   - Não há validação se a URL gerada é válida antes de usar no iframe

### 🟢 BAIXO

6. **Documentação Incompleta**
   - Não há documentação sobre como o modo display deveria funcionar
   - Falta especificação de requisitos

---

## 💡 Recomendações

### 1. Implementar Modo Display no App Cliente

**Arquivo:** `apps-cliente/modelo-2/src/app/[lojistaId]/experimentar/page.tsx`

**Código a adicionar:**

```typescript
// No início do componente, após useParams
const searchParams = useSearchParams()
const isDisplayMode = searchParams.get("display") === "1"

// Adaptar UI para modo display
if (isDisplayMode) {
  // Renderizar versão simplificada para display
  // - Sem botões de interação
  // - Auto-refresh de composições
  // - Fullscreen otimizado
}
```

### 2. Corrigir Variável de Ambiente

**Arquivo:** `paineladm/src/lib/client-app.ts`

```typescript
// Linha 20-22: Corrigir
else {
  const port = process.env.NEXT_PUBLIC_MODELO_2_PORT || "3005";
  baseUrl = `http://localhost:${port}`;
}
```

### 3. Adicionar Validação de URL

**Arquivo:** `paineladm/src/app/(lojista)/display/page.tsx`

```typescript
// Validar URL antes de passar para SimulatorFrame
const displayUrl = resolveDisplayUrl(lojistaId, panelBaseUrl);
try {
  new URL(displayUrl.toString()); // Validar se é URL válida
} catch (error) {
  console.error("[DisplayPage] URL inválida:", displayUrl.toString());
  // Mostrar erro ao usuário
}
```

### 4. Verificar Headers HTTP do App Cliente

**Verificar se há:**
- `X-Frame-Options: DENY` (deve ser `SAMEORIGIN` ou removido)
- `Content-Security-Policy` com `frame-ancestors` restritivo

**Solução:**
- Adicionar header no `next.config.mjs`:
```javascript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN',
        },
      ],
    },
  ];
}
```

### 5. Adicionar Logging para Diagnóstico

**Adicionar logs em pontos críticos:**
- URL gerada
- Status do iframe
- Erros de CORS
- Parâmetros recebidos

---

## 📊 Resumo Executivo

### Estado Atual

- ✅ **Estrutura de arquivos:** Organizada e correta
- ✅ **Configuração Tailwind:** Consistente e funcional
- ✅ **Geração de URL:** Corrigida recentemente (usa `/experimentar`)
- ❌ **Modo Display:** **NÃO IMPLEMENTADO** no app cliente
- ⚠️ **Variável de ambiente:** Usa porta incorreta em desenvolvimento
- ❌ **Preview iframe:** Não carrega (erro 404/484)

### Prioridades de Correção

1. **URGENTE:** Implementar modo display no app cliente
2. **ALTA:** Corrigir variável de ambiente
3. **ALTA:** Resolver erro 404/484 do iframe
4. **MÉDIA:** Adicionar validações e tratamento de erros
5. **BAIXA:** Melhorar documentação

---

## 📝 Notas Finais

Este documento fornece um "Raio-X" completo do estado atual da aba DISPLAY. Os principais problemas identificados são:

1. **Falta de implementação do modo display** no app cliente (crítico)
2. **Inconsistência na variável de ambiente** (fácil de corrigir)
3. **Erro 404/484 no iframe** (pode ser CORS/X-Frame-Options)

A estrutura de arquivos está correta, as configurações do Tailwind estão consistentes, mas a funcionalidade principal (modo display) não está implementada no app cliente que recebe o parâmetro `display=1`.

---

**Documento gerado em:** 2025-01-24  
**Versão:** 1.0  
**Autor:** Análise Automatizada do Codebase

















