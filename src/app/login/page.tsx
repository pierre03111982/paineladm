import type { Metadata } from "next"
import Link from "next/link"
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
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-12 md:flex-row md:items-center md:justify-between">
        <section className="flex-1 space-y-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-700/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-200">
            Experimente AI
          </span>

          <header className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
              Bem-vindo de volta
            </h1>
            <p className="max-w-lg text-sm text-zinc-400">
              Conecte-se para acessar o painel administrativo ou o painel do lojista. O sistema redirecionará automaticamente baseado nas suas credenciais.
            </p>
          </header>

          <ul className="grid gap-3 text-sm text-zinc-300">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              Monitoramento em tempo real das Gerações Try-On e Imagen3.
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              Controle de catálogo e perfis de clientes sincronizados.
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              Indicadores de conversão, likes e compartilhamentos em um só lugar.
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

        <section className="w-full max-w-md space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-2xl shadow-indigo-500/10 backdrop-blur-md">
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
        </section>
      </div>
    </main>
  )
}















