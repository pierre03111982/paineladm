import { DashboardWrapper } from "./DashboardWrapper";
import { getDashboardData } from "@/lib/dashboard/build";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

export const dynamic = 'force-dynamic';

type DashboardPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
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

  console.log("[DashboardPage] lojistaIdFromQuery:", lojistaIdFromQuery);
  console.log("[DashboardPage] lojistaId final:", lojistaId);

  if (!lojistaId) {
    console.error("[DashboardPage] ERRO: lojistaId está vazio!");
    // Retornar página de erro ao invés de quebrar
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Erro: ID da loja não encontrado</h1>
        <p className="text-gray-600">Por favor, faça login novamente ou forneça o lojistaId na URL.</p>
      </div>
    );
  }

  try {
    const data = await getDashboardData(lojistaId);
    return <DashboardWrapper data={data} lojistaId={lojistaId} />;
  } catch (error: any) {
    console.error("[DashboardPage] Erro ao carregar dados:", error);
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Erro ao carregar dashboard</h1>
        <p className="text-gray-600">{error.message || "Erro desconhecido"}</p>
      </div>
    );
  }
}
