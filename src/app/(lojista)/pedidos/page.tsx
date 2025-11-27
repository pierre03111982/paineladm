import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { OrdersContent } from "./orders-content";
import { PageHeader } from "../components/page-header";

export const dynamic = "force-dynamic";

type PedidosPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PedidosPage({ searchParams }: PedidosPageProps) {
  const params = await searchParams;
  const lojistaIdFromQuery = (params.lojistaId || params.lojistald) as string | undefined;
  
  const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
  const lojistaId =
    lojistaIdFromQuery ||
    lojistaIdFromAuth ||
    process.env.NEXT_PUBLIC_LOJISTA_ID ||
    process.env.LOJISTA_ID ||
    "";

  if (!lojistaId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Pedidos"
          description="Visualize e gerencie todos os pedidos da sua loja."
        />
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500">
          ID da loja não encontrado.
        </div>
      </div>
    );
  }

  const db = getAdminDb();
  const ordersRef = db
    .collection("lojas")
    .doc(lojistaId)
    .collection("orders");

  // Buscar pedidos ordenados por data de criação (mais recentes primeiro)
  const ordersSnapshot = await ordersRef
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const orders = ordersSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as any[];

  // Calcular estatísticas
  const stats = {
    total: orders.length,
    pending: orders.filter((o: any) => o.status === "pending").length,
    paid: orders.filter((o: any) => o.status === "paid").length,
    cancelled: orders.filter((o: any) => o.status === "cancelled" || o.status === "rejected").length,
    totalRevenue: orders
      .filter((o: any) => o.status === "paid")
      .reduce((sum: number, o: any) => sum + (o.total || 0), 0),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        description="Visualize e gerencie todos os pedidos da sua loja."
      />
      <OrdersContent initialOrders={orders} stats={stats} lojistaId={lojistaId} />
    </div>
  );
}


