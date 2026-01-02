import { ClientesTable } from "./clientes-table";
import { fetchClientes } from "@/lib/firestore/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { IconPageHeader } from "../components/icon-page-header";
import { getPageHeaderColors } from "../components/page-header-colors";
import { Users } from "lucide-react";

export const dynamic = 'force-dynamic';

type ClientesPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ClientesPage({ searchParams }: ClientesPageProps) {
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

  const includeArchived = params.includeArchived === "true";
  const clientes = await fetchClientes(lojistaId, 1000, includeArchived);

  const colors = getPageHeaderColors('/clientes');

  return (
    <div className="space-y-6">
      <IconPageHeader
        icon={Users}
        title="Clientes"
        description="Gerencie seus clientes e visualize o histórico de composições de cada um."
        gradientFrom={colors.from}
        gradientTo={colors.to}
        shadowColor={colors.shadow}
      />
      <ClientesTable initialClientes={clientes} />
    </div>
  );
}




