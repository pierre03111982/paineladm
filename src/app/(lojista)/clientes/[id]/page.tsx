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
  // Usar a subcoleção de composições da loja e filtrar em memória para evitar necessidade de índice composto
  const composicoesRef = db
    .collection("lojas")
    .doc(lojistaId)
    .collection("composicoes");
  
  let allComposicoes: any[] = [];
  
  try {
    // Buscar todas as composições recentes (sem where para evitar índice)
    const allSnapshot = await composicoesRef
      .orderBy("createdAt", "desc")
      .limit(500) // Buscar mais para garantir que pegamos todas do cliente
      .get();
    
    allComposicoes = allSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      };
    });
  } catch (error: any) {
    // Se falhar por falta de índice, buscar todas sem orderBy e ordenar em memória
    if (error?.code === "failed-precondition") {
      console.warn("[ClienteProfilePage] Índice não encontrado, buscando todas sem orderBy");
      const allSnapshot = await composicoesRef
        .limit(500)
        .get();
      
      allComposicoes = allSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        };
      });
    } else {
      console.error("[ClienteProfilePage] Erro ao buscar composições:", error);
      allComposicoes = [];
    }
  }

  // Filtrar composições do cliente e ordenar em memória
  const composicoes = allComposicoes
    .filter((comp: any) => {
      const customerId = comp.customer?.id || comp.customerId;
      return customerId === id;
    })
    .sort((a: any, b: any) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 50)
    .map((comp: any) => {
      // Converter Timestamp para Date para serialização
      const serialized = { ...comp };
      if (serialized.createdAt?.toDate) {
        serialized.createdAt = serialized.createdAt.toDate();
      } else if (serialized.createdAt && !(serialized.createdAt instanceof Date)) {
        serialized.createdAt = new Date(serialized.createdAt);
      }
      return serialized;
    });

  // Buscar ações (likes/dislikes) do cliente
  // Buscar todas e filtrar em memória para evitar necessidade de índice composto
  const actionsRef = db.collection("actions");
  
  let allActions: any[] = [];
  
  try {
    // Tentar buscar com orderBy primeiro
    const allSnapshot = await actionsRef
      .orderBy("timestamp", "desc")
      .limit(500) // Buscar mais para garantir que pegamos todas do cliente
      .get();
    
    allActions = allSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error: any) {
    // Se falhar por falta de índice, buscar todas sem orderBy e ordenar em memória
    if (error?.code === "failed-precondition") {
      console.warn("[ClienteProfilePage] Índice não encontrado para actions, buscando todas sem orderBy");
      const allSnapshot = await actionsRef
        .limit(500)
        .get();
      
      allActions = allSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } else {
      console.error("[ClienteProfilePage] Erro ao buscar actions:", error);
      allActions = [];
    }
  }

  // Filtrar actions do cliente e ordenar em memória
  const actions = allActions
    .filter((action: any) => {
      const userId = action.user_id || action.userId;
      const lojistaIdAction = action.lojista_id || action.lojistaId;
      return userId === id && lojistaIdAction === lojistaId;
    })
    .sort((a: any, b: any) => {
      const timestampA = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
      const timestampB = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
      return timestampB.getTime() - timestampA.getTime();
    })
    .slice(0, 100)
    .map((action: any) => {
      // Converter Timestamp para Date para serialização
      const serialized = { ...action };
      if (serialized.timestamp?.toDate) {
        serialized.timestamp = serialized.timestamp.toDate();
      } else if (serialized.timestamp && !(serialized.timestamp instanceof Date)) {
        serialized.timestamp = new Date(serialized.timestamp);
      }
      return serialized;
    });

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

  const orders = ordersSnapshot.docs.map((doc: QueryDocumentSnapshot) => {
    const data = doc.data();
    const serialized: any = {
      id: doc.id,
      ...data,
    };
    // Converter Timestamp para Date para serialização
    if (serialized.createdAt?.toDate) {
      serialized.createdAt = serialized.createdAt.toDate();
    } else if (serialized.createdAt && !(serialized.createdAt instanceof Date)) {
      serialized.createdAt = new Date(serialized.createdAt);
    }
    return serialized;
  });

  // Calcular estatísticas de vendas
  const paidOrders = orders.filter((o: any) => o.status === "paid");
  const totalSpent = paidOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
  const orderCount = orders.length;
  const averageTicket = orderCount > 0 ? totalSpent / orderCount : 0;

  // Converter objetos Timestamp do Firestore para Date para evitar erro de serialização
  // Next.js não permite passar objetos Timestamp diretamente para Client Components
  const serializeValue = (value: any): any => {
    if (!value) return value;
    
    // Se é Date, retorna como está
    if (value instanceof Date) return value;
    
    // Se tem método toDate (Firestore Timestamp)
    if (value.toDate && typeof value.toDate === 'function') {
      return value.toDate();
    }
    
    // Se é objeto Timestamp do Firestore (formato serializado)
    if (typeof value === 'object' && value._seconds !== undefined) {
      return new Date(value._seconds * 1000 + (value._nanoseconds || 0) / 1000000);
    }
    
    // Se é array, mapear cada item
    if (Array.isArray(value)) {
      return value.map(item => serializeValue(item));
    }
    
    // Se é objeto, processar recursivamente
    if (typeof value === 'object' && value !== null) {
      const serialized: any = {};
      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          serialized[key] = serializeValue(value[key]);
        }
      }
      return serialized;
    }
    
    return value;
  };

  const cliente = {
    id: clienteDoc.id,
    ...serializeValue(clienteData), // Serializar recursivamente clienteData
    composicoes: serializeValue(composicoes), // Serializar recursivamente composições
    actions: serializeValue(actions), // Serializar recursivamente actions
    orders: serializeValue(orders), // Serializar recursivamente orders
    salesStats: {
      totalSpent,
      orderCount,
      averageTicket,
    },
  };

  return <ClienteProfileContent cliente={cliente} lojistaId={lojistaId} />;
}

