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
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-gray-500 shadow-md">
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

  const orders = ordersSnapshot.docs.map((doc) => {
    const data = doc.data();
    
    // Tentar extrair nome do cliente de múltiplas fontes possíveis
    const customerName = 
      data.customerName ||
      data.customer?.name ||
      data.user?.name ||
      data.buyer?.name ||
      data.client?.name ||
      data.payer?.name ||
      data.payer?.first_name ||
      data.additional_info?.payer?.first_name ||
      data.additionalInfo?.payer?.first_name ||
      data.destinationName ||
      data.shippingName ||
      data.userName ||
      data.name ||
      null;
    
    // Tentar extrair telefone/WhatsApp de múltiplas fontes possíveis
    const customerWhatsapp = 
      data.customerWhatsapp ||
      data.customer?.whatsapp ||
      data.customer?.phone ||
      data.customer?.phoneNumber ||
      data.user?.whatsapp ||
      data.user?.phone ||
      data.buyer?.phone ||
      data.client?.phone ||
      data.payer?.phone?.number ||
      data.additional_info?.payer?.phone?.number ||
      data.additionalInfo?.payer?.phone?.number ||
      data.whatsapp ||
      data.phone ||
      data.phoneNumber ||
      data.contact ||
      data.destinationPhone ||
      data.shippingPhone ||
      null;
    
    // Converter Timestamps do Firestore para strings ISO para permitir serialização
    return {
      id: doc.id,
      ...data,
      customerName,
      customerWhatsapp,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || null,
    };
  }) as any[];

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


