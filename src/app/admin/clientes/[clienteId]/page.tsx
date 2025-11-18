import { requireAdmin } from "@/lib/auth/admin-auth";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { ClienteDetalhesContent } from "./components/cliente-detalhes-content";

export const dynamic = 'force-dynamic';

export default async function ClienteDetalhesPage({
  params,
}: {
  params: Promise<{ clienteId: string }>;
}) {
  await requireAdmin();
  const { clienteId } = await params;

  return (
    <AdminRouteGuard>
      <ClienteDetalhesContent clienteId={clienteId} />
    </AdminRouteGuard>
  );
}


