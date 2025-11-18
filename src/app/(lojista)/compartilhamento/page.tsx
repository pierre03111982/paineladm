import { SharePanel } from "./share-panel";
import { PageHeader } from "../components/page-header";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

export const dynamic = 'force-dynamic';

type CompartilhamentoPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function CompartilhamentoPage({ searchParams }: CompartilhamentoPageProps) {
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

  return (
    <div className="space-y-3">
      <PageHeader
        title="Compartilhamento App"
        description="Crie links e QR Codes personalizados para convidar clientes a experimentar sua vitrine digital. Perfeito para WhatsApp, redes sociais e pontos de venda físicos."
      />
      <SharePanel lojistaId={lojistaId || null} />
    </div>
  );
}


