import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { fetchLojaPerfil } from "@/lib/firestore/server";
import { AppClienteContent } from "./app-cliente-content";
import { IconPageHeader } from "../components/icon-page-header";
import { getPageHeaderColors } from "../components/page-header-colors";
import { QrCode } from "lucide-react";

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

  const colors = getPageHeaderColors('/app-cliente');

  return (
    <div className="space-y-8">
      <IconPageHeader
        icon={QrCode}
        title="Aplicativo Cliente"
        description="Aqui estão os links e QR codes para os 3 modelos disponíveis do seu provador virtual. Quando o cliente abrir pela primeira vez, o app solicitará nome e WhatsApp para continuar."
        gradientFrom={colors.from}
        gradientTo={colors.to}
        shadowColor={colors.shadow}
      />

      {/* Componente Client-Side com a lógica nova */}
      <AppClienteContent lojistaId={lojistaId} perfil={perfil} />
    </div>
  );
}
