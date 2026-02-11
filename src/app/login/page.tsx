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
    <main className="relative h-screen w-screen overflow-hidden bg-black text-white">
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/fundo-login.png"
          alt="Background Login"
          fill
          priority
          quality={100}
          className="object-cover opacity-60"
        />
        {/* Gradient Overlay for better readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent/40" />
      </div>

      {/* Main Grid Layout */}
      <div className="relative z-10 grid h-full w-full grid-cols-1 lg:grid-cols-2 items-end">
        {/* Left Column: Branding & Value Prop */}
        <div className="hidden flex-col justify-center px-12 lg:flex lg:px-16 xl:px-24">
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="relative h-36 w-72">
                <Image
                  src="/LOGO EAI.png"
                  alt="Logo EAI Venda+"
                  fill
                  priority
                  className="object-contain"
                />
              </div>
            </div>

            <div className="space-y-2 text-center">
              <h1 className="bg-gradient-to-r from-cyan-400 via-purple-500 to-fuchsia-600 bg-clip-text text-6xl font-black leading-tight tracking-tighter text-transparent xl:text-7xl">
                EAI Venda+
              </h1>
              <p className="max-w-md mx-auto text-xs font-medium text-zinc-400 leading-tight">
                A Inteligência que impulsiona sua operação.{" "}
                <span className="font-light opacity-60 italic">Powered by Experimente AI.</span>
              </p>
            </div>

            <ul className="grid gap-3 max-w-md mx-auto">
              <li className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/10 p-4 backdrop-blur-md transition hover:bg-black/30 hover:border-indigo-500/30">
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </span>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-0.5">Motor Visual</span>
                  <span className="text-sm text-white font-medium leading-snug">Catálogo e Vídeos IA de alta conversão.</span>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/50 p-4 backdrop-blur-md transition hover:bg-black/70 hover:border-indigo-500/30">
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </span>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-0.5">Núcleo Logístico</span>
                  <span className="text-sm text-white font-medium leading-snug">Gestão nativa do sistema 'Prove em Casa'.</span>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/50 p-4 backdrop-blur-md transition hover:bg-black/70 hover:border-indigo-500/30">
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </span>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-0.5">Inteligência Preditiva</span>
                  <span className="text-sm text-white font-medium leading-snug">Insights e performance em tempo real.</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Login Form */}
        <div className="flex items-center justify-end p-6 lg:pr-24 xl:pr-32">
          <section className="relative w-full max-w-[420px] rounded-2xl border border-white/10 bg-black/10 p-6 shadow-[0_0_80px_-15px_rgba(79,70,229,0.3)] backdrop-blur-3xl">
            {/* Tech LED Glow Effect */}
            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-indigo-500/20 pointer-events-none" />
            
            <div className="relative space-y-5">
              <div className="space-y-1 text-center">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Acesso ao Sistema
                </h2>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Entre com suas credenciais para gerenciar sua operação industrial.
                </p>
              </div>

              <Suspense fallback={<div className="text-center text-xs text-zinc-500">Carregando...</div>}>
                <LoginForm redirectPath={redirectPath} />
              </Suspense>

              <div className="pt-2 text-center border-t border-white/5">
                <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-600">
                  Industrial Dashboard v2.0
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}















