import { fetchLojaPerfil } from "@/lib/firestore/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { SalesSettingsForm } from "@/components/admin/SalesSettingsForm";
import { IconPageHeader } from "../components/icon-page-header";
import { getPageHeaderColors } from "../components/page-header-colors";
import { Plug } from "lucide-react";
import { EcommerceIntegrationCard } from "./ecommerce-integration-card";

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Sempre buscar dados atualizados

type IntegracoesPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function IntegracoesPage({ searchParams }: IntegracoesPageProps) {
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
  const colors = getPageHeaderColors('/integracoes');

  return (
    <div className="space-y-6">
      <IconPageHeader
        icon={Plug}
        title="Integrações"
        description="Configure as integrações com Mercado Pago, Melhor Envio e outras plataformas de pagamento e envio."
        gradientFrom={colors.from}
        gradientTo={colors.to}
        shadowColor={colors.shadow}
      />
      <EcommerceIntegrationCard />
      <SalesSettingsForm 
        lojistaId={lojistaId} 
        initialConfig={perfil?.salesConfig as any} 
      />
    </div>
  );
}

