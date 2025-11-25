/**
 * Queries para CRM - Radar de Oportunidades
 * Busca clientes ativos nas últimas 24h
 */

import { getAdminDb } from "../firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

const db = getAdminDb();

export interface ActiveClient {
  customerId: string;
  nome: string;
  whatsapp: string;
  avatar?: string;
  lastActivity: Date;
  lastActivityType: "login" | "generation";
  lastProductName?: string;
  compositionCount: number;
  compositions: Array<{
    id: string;
    imagemUrl: string;
    createdAt: Date;
    produtoNome?: string;
  }>;
}

/**
 * Busca clientes que tiveram atividade nas últimas 24h
 */
export async function fetchActiveClients(
  lojistaId: string,
  hoursAgo: number = 24
): Promise<ActiveClient[]> {
  try {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

    console.log("[CRM] Buscando clientes ativos desde:", cutoffDate.toISOString());

    // Buscar composições criadas nas últimas 24h
    const compositionsRef = db.collection("composicoes");
    
    // Buscar todas as composições do lojista sem orderBy para evitar necessidade de índice
    // Vamos ordenar em memória depois
    const allCompositionsQuery = compositionsRef
      .where("lojistaId", "==", lojistaId)
      .limit(500); // Aumentar limite para garantir que pegamos todas as recentes

    const compositionsSnapshot = await allCompositionsQuery.get();

    // Agrupar por customerId
    const clientMap = new Map<string, ActiveClient>();

    for (const doc of compositionsSnapshot.docs) {
      const data = doc.data();
      const customerId = data.customerId || "anonymous";
      
      // Converter Timestamp do Firestore para Date
      let createdAt: Date;
      if (data.createdAt) {
        if (data.createdAt.toDate) {
          createdAt = data.createdAt.toDate();
        } else if (typeof data.createdAt === "string") {
          createdAt = new Date(data.createdAt);
        } else {
          createdAt = new Date();
        }
      } else {
        createdAt = new Date();
      }

      // Filtrar apenas composições das últimas 24h
      if (createdAt < cutoffDate) {
        continue;
      }

      if (!clientMap.has(customerId)) {
        // Buscar dados do cliente - tentar múltiplas estruturas
        let clienteData: any = null;
        
        // Tentar 1: lojas/{lojistaId}/clientes/{customerId}
        try {
          const clienteRef1 = db
            .collection("lojas")
            .doc(lojistaId)
            .collection("clientes")
            .doc(customerId);
          const clienteDoc1 = await clienteRef1.get();
          if (clienteDoc1.exists) {
            clienteData = clienteDoc1.data();
          }
        } catch (e) {
          // Ignorar erro
        }
        
        // Tentar 2: clientes/{customerId} (coleção global)
        if (!clienteData) {
          try {
            const clienteRef2 = db.collection("clientes").doc(customerId);
            const clienteDoc2 = await clienteRef2.get();
            if (clienteDoc2.exists) {
              clienteData = clienteDoc2.data();
            }
          } catch (e) {
            // Ignorar erro
          }
        }

        clientMap.set(customerId, {
          customerId,
          nome: clienteData?.nome || data.nome || data.customerName || "Cliente",
          whatsapp: clienteData?.whatsapp || data.whatsapp || "",
          avatar: clienteData?.avatar || clienteData?.fotoUrl || clienteData?.photoUrl || null,
          lastActivity: createdAt,
          lastActivityType: "generation",
          lastProductName: data.produtoNome || data.productName || data.produto?.nome || undefined,
          compositionCount: 0,
          compositions: [],
        });
      }

      const client = clientMap.get(customerId)!;
      client.compositionCount++;
      
      // Buscar nome do produto se não estiver na composição
      let produtoNome = data.produtoNome || data.productName || data.produto?.nome;
      if (!produtoNome && data.productImageUrls && Array.isArray(data.productImageUrls) && data.productImageUrls.length > 0) {
        // Tentar buscar nome do produto pela URL da imagem
        produtoNome = "Produto";
      }
      
      client.compositions.push({
        id: doc.id,
        imagemUrl: data.imagemUrl || data.imageUrl || "",
        createdAt,
        produtoNome,
      });

      // Atualizar última atividade se for mais recente
      if (createdAt > client.lastActivity) {
        client.lastActivity = createdAt;
        client.lastActivityType = "generation";
        client.lastProductName = data.produtoNome || data.productName || undefined;
      }
    }

    // Buscar logins recentes também (se houver coleção de sessões)
    try {
      const sessionsRef = db.collection("sessoes");
      // Buscar sem orderBy e where de data para evitar necessidade de índice
      // Filtrar por data em memória depois
      const recentSessionsQuery = sessionsRef
        .where("lojistaId", "==", lojistaId)
        .limit(200); // Aumentar limite para pegar mais sessões

      const sessionsSnapshot = await recentSessionsQuery.get();

      for (const doc of sessionsSnapshot.docs) {
        const data = doc.data();
        const customerId = data.customerId || "anonymous";
        
        // Converter Timestamp do Firestore para Date
        let createdAt: Date;
        if (data.createdAt) {
          if (data.createdAt.toDate) {
            createdAt = data.createdAt.toDate();
          } else if (typeof data.createdAt === "string") {
            createdAt = new Date(data.createdAt);
          } else {
            createdAt = new Date();
          }
        } else {
          createdAt = new Date();
        }

        // Filtrar apenas sessões das últimas 24h (já que removemos o where de data)
        if (createdAt < cutoffDate) {
          continue;
        }

        if (!clientMap.has(customerId)) {
          // Buscar dados do cliente - tentar múltiplas estruturas
          let clienteData: any = null;
          
          // Tentar 1: lojas/{lojistaId}/clientes/{customerId}
          try {
            const clienteRef1 = db
              .collection("lojas")
              .doc(lojistaId)
              .collection("clientes")
              .doc(customerId);
            const clienteDoc1 = await clienteRef1.get();
            if (clienteDoc1.exists) {
              clienteData = clienteDoc1.data();
            }
          } catch (e) {
            // Ignorar erro
          }
          
          // Tentar 2: clientes/{customerId} (coleção global)
          if (!clienteData) {
            try {
              const clienteRef2 = db.collection("clientes").doc(customerId);
              const clienteDoc2 = await clienteRef2.get();
              if (clienteDoc2.exists) {
                clienteData = clienteDoc2.data();
              }
            } catch (e) {
              // Ignorar erro
            }
          }

          clientMap.set(customerId, {
            customerId,
            nome: clienteData?.nome || data.nome || data.customerName || "Cliente",
            whatsapp: clienteData?.whatsapp || data.whatsapp || "",
            avatar: clienteData?.avatar || clienteData?.fotoUrl || clienteData?.photoUrl || null,
            lastActivity: createdAt,
            lastActivityType: "login",
            compositionCount: 0,
            compositions: [],
          });
        } else {
          const client = clientMap.get(customerId)!;
          // Atualizar última atividade se login for mais recente
          if (createdAt > client.lastActivity) {
            client.lastActivity = createdAt;
            client.lastActivityType = "login";
          }
        }
      }
    } catch (error) {
      // Coleção de sessões pode não existir, ignorar erro
      console.log("[CRM] Coleção de sessões não encontrada ou erro ao buscar:", error);
    }

    // Converter para array e ordenar por mais recente
    const activeClients = Array.from(clientMap.values()).sort(
      (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()
    );

    console.log("[CRM] Clientes ativos encontrados:", activeClients.length);

    return activeClients;
  } catch (error) {
    console.error("[CRM] Erro ao buscar clientes ativos:", error);
    return [];
  }
}

