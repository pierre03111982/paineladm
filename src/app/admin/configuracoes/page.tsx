import { requireAdmin } from "@/lib/auth/admin-auth";
import { AdminConfiguracoesContent } from "./admin-configuracoes-content";

// Forçar renderização dinâmica
export const dynamic = 'force-dynamic';

export default async function AdminConfiguracoesPage() {
  await requireAdmin();

  return <AdminConfiguracoesContent />;
}




