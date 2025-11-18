import { requireAdmin } from "@/lib/auth/admin-auth";
import { UsuariosManagement } from "./usuarios-management";

// Forçar renderização dinâmica
export const dynamic = 'force-dynamic';

export default async function UsuariosPage() {
  await requireAdmin();

  return <UsuariosManagement />;
}




