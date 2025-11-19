import Link from "next/link";
import { QrCode } from "lucide-react";
import QRCode from "qrcode";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { CopyLinkButton } from "./CopyLinkButton";
import { fetchLojaPerfil } from "@/lib/firestore/server";

export const dynamic = "force-dynamic";

export default async function AppClientePage() {
  const lojistaId = await getCurrentLojistaId();

  // Buscar perfil da loja para verificar appModel
  const perfil = lojistaId ? await fetchLojaPerfil(lojistaId) : null;
  const appModel = perfil?.appModel || "appmelhorado";

  // URL base do appmelhorado em desenvolvimento
  const baseClientUrl =
    process.env.NEXT_PUBLIC_CLIENT_APP_URL ?? "http://localhost:3002";
  
  // URL base do modelo-1
  const baseModelo1Url =
    process.env.NEXT_PUBLIC_MODELO1_URL ?? "http://localhost:3004";

  // Determinar qual URL usar baseado no appModel
  const baseUrl = appModel === "modelo-1" ? baseModelo1Url : baseClientUrl;

  const clientUrl = lojistaId
    ? `${baseUrl}/${encodeURIComponent(lojistaId)}`
    : baseUrl;

  // Gerar QR Code como data URL (PNG)
  const qrCodeDataUrl = await QRCode.toDataURL(clientUrl, {
    margin: 1,
    width: 512,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-indigo-300/70">
            Aplicativo Cliente
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            Link e QR Code para seus clientes
          </h1>
          <p className="mt-2 text-sm text-zinc-400 max-w-xl">
            Este é o link único do seu provador para compartilhar com os
            clientes. Quando o cliente abrir pela primeira vez, o app solicitará
            nome e WhatsApp para continuar.
          </p>
        </div>
      </header>

      <section className="grid gap-8 md:grid-cols-[2fr,1fr]">
        <div className="space-y-6 rounded-3xl border border-zinc-800/70 bg-zinc-900/60 p-6">
          {/* Link do App Melhorado (padrão) */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white">
              Link do Aplicativo Cliente {appModel === "appmelhorado" || !appModel ? "(Padrão)" : ""}
            </h2>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <code className="flex-1 truncate rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-200">
                {clientUrl}
              </code>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <CopyLinkButton url={clientUrl} />
                <Link
                  href={clientUrl}
                  target="_blank"
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 transition hover:bg-indigo-400"
                >
                  Abrir app do cliente
                </Link>
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              Copie este link e compartilhe com seus clientes via WhatsApp,
              Instagram ou outros canais.
            </p>
          </div>

          {/* Link do Modelo 1 (se aplicável) */}
          {appModel === "modelo-1" && (
            <div className="space-y-4 border-t border-zinc-800 pt-6">
              <h2 className="text-sm font-semibold text-white">
                Link do Aplicativo Modelo 1
              </h2>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <code className="flex-1 truncate rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-200">
                  {clientUrl}
                </code>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <CopyLinkButton url={clientUrl} />
                  <Link
                    href={clientUrl}
                    target="_blank"
                    className="inline-flex items-center justify-center rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/40 transition hover:bg-teal-400"
                  >
                    Abrir Modelo 1
                  </Link>
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                Link específico para o aplicativo Modelo 1 (design premium).
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-zinc-800/70 bg-zinc-900/60 p-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20">
            <QrCode className="h-6 w-6 text-indigo-300" />
          </div>
          <h2 className="text-sm font-semibold text-white">QR Code</h2>
          <p className="text-xs text-zinc-400">
            Aponte a câmera do celular para o QR Code abaixo para abrir o
            aplicativo do cliente.
          </p>
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-[0_25px_80px_-40px_rgba(79,70,229,0.75)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeDataUrl}
              alt="QR Code do Aplicativo Cliente"
              className="h-64 w-64 object-contain"
            />
          </div>
          <p className="text-[11px] text-zinc-500">
            Você pode imprimir este QR Code e colocar na loja para os clientes
            acessarem o provador virtual.
          </p>
        </div>
      </section>
    </div>
  );
}

