import { requireAdmin } from "@/lib/auth/admin-auth";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { ClientesContent } from "./components/clientes-content";

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  await requireAdmin();

  return (
    <AdminRouteGuard>
      <ClientesContent />
    </AdminRouteGuard>
  );
}


