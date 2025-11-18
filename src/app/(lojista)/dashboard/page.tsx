import { DashboardContent } from "../../dashboard/components/DashboardContent";
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
  }

  const data = await getDashboardData(lojistaId);

  return <DashboardContent data={data} />;
}
