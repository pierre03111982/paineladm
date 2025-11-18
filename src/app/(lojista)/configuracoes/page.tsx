import { ConfiguracoesForm } from "./settings-form";
import { PageHeader } from "../components/page-header";
import { fetchLojaPerfil } from "@/lib/firestore/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Sempre buscar dados atualizados

type ConfiguracoesPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ConfiguracoesPage({ searchParams }: ConfiguracoesPageProps) {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Configure o perfil da sua loja, redes sociais e opções de venda."
      />
      <ConfiguracoesForm lojistaId={lojistaId} perfil={perfil} />
    </div>
  );
}


