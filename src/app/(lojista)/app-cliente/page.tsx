import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { fetchLojaPerfil } from "@/lib/firestore/server";
import { AppClienteContent } from "./app-cliente-content";

export const dynamic = "force-dynamic";

export default async function AppClientePage() {
  const lojistaId = await getCurrentLojistaId();

  // Buscar perfil da loja para verificar appModel
  const perfil = lojistaId ? await fetchLojaPerfil(lojistaId) : null;

  if (!lojistaId) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400">
        Lojista não identificado.
      </div>
    );
  }

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

      {/* Componente Client-Side com a lógica nova */}
      <AppClienteContent lojistaId={lojistaId} perfil={perfil} />
    </div>
  );
}
