import { notFound } from "next/navigation";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { ClienteProfileContent } from "./cliente-profile-content";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

type ClienteProfilePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ClienteProfilePage({
  params,
  searchParams,
}: ClienteProfilePageProps) {
  const { id } = await params;
  const queryParams = await searchParams;
  const lojistaIdFromQuery = (queryParams.lojistaId || queryParams.lojistald) as string | undefined;
  
  const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
  const lojistaId =
    lojistaIdFromQuery ||
    lojistaIdFromAuth ||
    process.env.NEXT_PUBLIC_LOJISTA_ID ||
    process.env.LOJISTA_ID ||
    "";

  if (!lojistaId) {
    notFound();
  }

  const db = getAdminDb();
  const clienteRef = db
    .collection("lojas")
    .doc(lojistaId)
    .collection("clientes")
    .doc(id);
  
  const clienteDoc = await clienteRef.get();
  
  if (!clienteDoc.exists) {
    notFound();
  }

  const clienteData = clienteDoc.data();

  // Buscar composições do cliente
  const composicoesRef = db.collection("composicoes");
  const composicoesSnapshot = await composicoesRef
    .where("lojistaId", "==", lojistaId)
    .where("customerId", "==", id)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const composicoes = composicoesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Buscar ações (likes/dislikes) do cliente
  const actionsRef = db.collection("actions");
  const actionsSnapshot = await actionsRef
    .where("user_id", "==", id)
    .where("lojista_id", "==", lojistaId)
    .orderBy("timestamp", "desc")
    .limit(100)
    .get();

  const actions = actionsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Buscar pedidos do cliente (orders)
  // Tentar buscar por customerId ou user_id
  const ordersRef = db
    .collection("lojas")
    .doc(lojistaId)
    .collection("orders");
  
  let ordersSnapshot;
  try {
    // Tentar primeiro com customerId
    ordersSnapshot = await ordersRef
      .where("customerId", "==", id)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
  } catch (error) {
    // Se falhar, tentar sem orderBy (pode não ter índice)
    try {
      ordersSnapshot = await ordersRef
        .where("customerId", "==", id)
        .limit(50)
        .get();
    } catch (error2) {
      // Se ainda falhar, retornar array vazio
      ordersSnapshot = { docs: [] } as any;
    }
  }

  const orders = ordersSnapshot.docs.map((doc: QueryDocumentSnapshot) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Calcular estatísticas de vendas
  const paidOrders = orders.filter((o: any) => o.status === "paid");
  const totalSpent = paidOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
  const orderCount = orders.length;
  const averageTicket = orderCount > 0 ? totalSpent / orderCount : 0;

  const cliente = {
    id: clienteDoc.id,
    ...clienteData,
    composicoes,
    actions,
    orders,
    salesStats: {
      totalSpent,
      orderCount,
      averageTicket,
    },
  };

  return <ClienteProfileContent cliente={cliente} lojistaId={lojistaId} />;
}

