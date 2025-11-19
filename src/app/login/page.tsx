import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { Suspense } from "react"
import { LoginForm } from "./components/LoginForm"

export const metadata: Metadata = {
  title: "Entrar no painel | Experimente AI",
  description: "Faça login para acessar o painel do lojista e gerenciar o provador virtual inteligente.",
}

const lojaNome = process.env.NEXT_PUBLIC_LOJA_NOME ?? "Sua Loja"
const lojaSite = process.env.NEXT_PUBLIC_LOJA_SITE ?? "https://experimente.ai"
const lojaInstagram = process.env.NEXT_PUBLIC_LOJA_INSTAGRAM
const lojaFacebook = process.env.NEXT_PUBLIC_LOJA_FACEBOOK
const lojaTikTok = process.env.NEXT_PUBLIC_LOJA_TIKTOK

type LoginPageProps = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams instanceof Promise ? await searchParams : searchParams;
  const redirectPath = params?.redirect as string | undefined;
  
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-6 py-12 lg:flex-row lg:items-center lg:justify-between">
        <section className="flex-1 space-y-6 lg:pr-8">
          {/* Imagem do lado esquerdo */}
          <div className="relative mb-6 lg:mb-8">
            <div className="relative h-[300px] lg:h-[500px] w-full overflow-hidden rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-indigo-950/40 via-purple-950/40 to-pink-950/40">
              <Image
                src="/login-hero.png"
                alt="Provador Virtual IA - Experimente looks com inteligência artificial"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
            </div>
          </div>

          <header className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
              Bem-vindo de volta
            </h1>
            <p className="max-w-lg text-sm text-zinc-400">
              Conecte-se para acessar o painel administrativo ou o painel do lojista. O sistema redirecionará automaticamente baseado nas suas credenciais.
            </p>
          </header>

          <ul className="grid gap-3 text-sm text-zinc-300">
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
              <span>Dashboard completo com métricas de looks gerados, conversões, likes e compartilhamentos em tempo real.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
              <span>Gerenciamento completo de catálogo de produtos, clientes e composições geradas.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
              <span>Análise detalhada de performance por produto, cliente e período com gráficos interativos.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
              <span>Controle de compartilhamentos e rastreamento de clientes referidos através de links compartilhados.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
              <span>Envio em massa de promoções para clientes e filtros avançados para composições de alta conversão.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
              <span>Configurações personalizadas de mensagens de vendas, links de checkout e integrações com e-commerce.</span>
            </li>
          </ul>

          <footer className="space-y-2">
            <p className="text-xs text-zinc-500">Canais oficiais:</p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-indigo-300">
              <Link href={lojaSite} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-100 hover:underline">
                Site institucional
              </Link>
              {lojaInstagram ? (
                <Link href={lojaInstagram} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-100 hover:underline">
                  Instagram
                </Link>
              ) : null}
              {lojaFacebook ? (
                <Link href={lojaFacebook} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-100 hover:underline">
                  Facebook
                </Link>
              ) : null}
              {lojaTikTok ? (
                <Link href={lojaTikTok} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-100 hover:underline">
                  TikTok
                </Link>
              ) : null}
            </div>
          </footer>
        </section>

        <section className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8 shadow-2xl shadow-indigo-500/40 backdrop-blur-md">
          {/* Efeito de brilho atrás da caixa - aumentado */}
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-pink-500/50 blur-2xl opacity-80 -z-10" />
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-400/40 via-purple-400/40 to-pink-400/40 blur-xl opacity-70 -z-10" />
          <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-indigo-300/30 via-purple-300/30 to-pink-300/30 blur-lg opacity-50 -z-10" />
          <div className="relative z-10 space-y-6">
            <div className="space-y-1 text-center">
              <h2 className="text-xl font-semibold text-white">
                Entre no painel
              </h2>
              <p className="text-xs text-zinc-400">
                Use suas credenciais para acessar. O sistema redirecionará automaticamente para o painel correto.
              </p>
            </div>
            <Suspense fallback={<div className="text-center text-zinc-400">Carregando...</div>}>
              <LoginForm redirectPath={redirectPath} />
            </Suspense>
          </div>
        </section>
      </div>
    </main>
  )
}















