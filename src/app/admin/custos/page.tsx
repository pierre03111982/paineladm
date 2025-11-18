import { requireAdmin } from "@/lib/auth/admin-auth";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { CustosContent } from "./components/custos-content";

export const dynamic = 'force-dynamic';

export default async function CustosPage() {
  await requireAdmin();

  return (
    <AdminRouteGuard>
      <CustosContent />
    </AdminRouteGuard>
  );
}

