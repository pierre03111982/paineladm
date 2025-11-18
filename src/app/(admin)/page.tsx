import { AdminDashboardContent } from "./components/admin-dashboard-content";
import { getAdminDashboardData } from "@/lib/admin/dashboard-data";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";

// Forçar renderização dinâmica (não estática)
export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  // Verificar se o usuário é admin (server-side)
  await requireAdmin();
  
  const data = await getAdminDashboardData();

  return (
    <AdminRouteGuard>
      <AdminDashboardContent data={data} />
    </AdminRouteGuard>
  );
}





























