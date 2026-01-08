import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { ProductEditorLayout } from "@/components/admin/products/ProductEditorLayout";
import { PageWrapper } from "@/components/ui/PageWrapper";
import { Package } from "lucide-react";

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

type NovoProdutoPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function NovoProdutoPage({ searchParams }: NovoProdutoPageProps) {
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

  if (!lojistaId) {
    return (
      <PageWrapper>
        <div className="p-6">
          <p className="text-red-500">Erro: ID da loja não encontrado</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <ProductEditorLayout lojistaId={lojistaId} />
    </PageWrapper>
  );
}

