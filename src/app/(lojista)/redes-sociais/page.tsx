import { fetchLojaPerfil } from "@/lib/firestore/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { RedesSociaisForm } from "./redes-sociais-form";
import { IconPageHeader } from "../components/icon-page-header";
import { getPageHeaderColors } from "../components/page-header-colors";
import { Instagram } from "lucide-react";

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Sempre buscar dados atualizados

type RedesSociaisPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function RedesSociaisPage({ searchParams }: RedesSociaisPageProps) {
  const params = await searchParams;
  // Tentar ler tanto lojistaId quanto lojistald (para compatibilidade com typos)
  const lojistaIdFromQuery = (params.lojistaId || params.lojistald) as string | undefined;
  
  // Prioridade: query string (modo admin) > usuário logado > env var
  const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
  const lojistaId =
    lojistaIdFromQuery ||
    lojistaIdFromAuth ||
    process.env.NEXT_PUBLIC_LOJISTA_ID ||
    process.env.LOJISTA_ID ||
    "";

  const perfil = await fetchLojaPerfil(lojistaId);
  const colors = getPageHeaderColors('/redes-sociais');

  return (
    <div className="space-y-6">
      <IconPageHeader
        icon={Instagram}
        title="Redes Sociais"
        description="Configure suas redes sociais e defina descontos para clientes que seguirem sua loja."
        gradientFrom={colors.from}
        gradientTo={colors.to}
        shadowColor={colors.shadow}
      />
      <RedesSociaisForm lojistaId={lojistaId} perfil={perfil} />
    </div>
  );
}

