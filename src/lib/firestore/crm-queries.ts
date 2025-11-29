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
    
    // Buscar todas as composições do lojista
    // Usar Timestamp para filtrar por data
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);
    
    try {
      // Tentar buscar com filtro de data (requer índice)
      const allCompositionsQuery = compositionsRef
        .where("lojistaId", "==", lojistaId)
        .where("createdAt", ">=", cutoffTimestamp)
        .orderBy("createdAt", "desc")
        .limit(1000);

      var compositionsSnapshot = await allCompositionsQuery.get();
    } catch (error: any) {
      // Se não tiver índice, buscar todas e filtrar em memória
      console.log("[CRM] Índice não encontrado, buscando todas e filtrando:", error.message);
      const allCompositionsQuery = compositionsRef
        .where("lojistaId", "==", lojistaId)
        .limit(1000);
      
      var compositionsSnapshot = await allCompositionsQuery.get();
    }

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
      
      // REGRA 1: Excluir APENAS remix explícito (flag isRemix = true)
      // NÃO excluir por falta de productImageUrls, pois composições normais podem não ter esse campo
      const isRemix = data.isRemix === true;
      
      if (isRemix) {
        console.log("[CRM] Composição de remix ignorada:", doc.id);
        continue; // Não contar remix explícito
      }
      
      // REGRA 2: Para composições de refinamento, contar normalmente (remover restrição de like)
      // O refinamento é uma interação válida e deve ser contada
      
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

    // Buscar favoritos com like das últimas 24h para incluir no radar
    try {
      const cutoffTimestamp = Timestamp.fromDate(cutoffDate);
      
      // Buscar favoritos de todos os clientes do lojista
      const lojaRef = db.collection("lojas").doc(lojistaId);
      const clientesSnapshot = await lojaRef.collection("clientes").get();
      
      for (const clienteDoc of clientesSnapshot.docs) {
        const customerId = clienteDoc.id;
        const clienteData = clienteDoc.data();
        
        try {
          // Buscar favoritos com like deste cliente
          const favoritosRef = lojaRef
            .collection("clientes")
            .doc(customerId)
            .collection("favoritos");
          
          // Buscar favoritos com like das últimas 24h
          let favoritosSnapshot;
          try {
            favoritosSnapshot = await favoritosRef
              .where("action", "==", "like")
              .where("createdAt", ">=", cutoffTimestamp)
              .orderBy("createdAt", "desc")
              .limit(50)
              .get();
          } catch (error: any) {
            // Se não tiver índice, buscar todos e filtrar
            console.log("[CRM] Índice de favoritos não encontrado, buscando todos:", error.message);
            const allFavoritos = await favoritosRef
              .where("action", "==", "like")
              .limit(200)
              .get();
            
            favoritosSnapshot = {
              forEach: (callback: any) => {
                allFavoritos.forEach((doc) => {
                  const data = doc.data();
                  const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt || 0);
                  if (createdAt >= cutoffDate) {
                    callback(doc);
                  }
                });
              },
            } as any;
          }
          
          favoritosSnapshot.forEach((doc: any) => {
            const data = typeof doc.data === "function" ? doc.data() : doc.data;
            if (!data) return;
            
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
            
            // Filtrar apenas favoritos das últimas 24h
            if (createdAt < cutoffDate) {
              return;
            }
            
            // Verificar se tem imagem válida
            const imagemUrl = data.imagemUrl || data.imageUrl;
            if (!imagemUrl || imagemUrl.trim() === "") {
              return; // Ignorar favoritos sem imagem
            }
            
            // Adicionar ou atualizar cliente no mapa
            if (!clientMap.has(customerId)) {
              clientMap.set(customerId, {
                customerId,
                nome: clienteData?.nome || data.customerName || "Cliente",
                whatsapp: clienteData?.whatsapp || "",
                avatar: clienteData?.avatar || clienteData?.fotoUrl || clienteData?.photoUrl || null,
                lastActivity: createdAt,
                lastActivityType: "generation",
                lastProductName: data.produtoNome || data.productName || undefined,
                compositionCount: 0,
                compositions: [],
              });
            }
            
            const client = clientMap.get(customerId)!;
            
            // Adicionar favorito como composição
            client.compositionCount++;
            client.compositions.push({
              id: doc.id,
              imagemUrl: imagemUrl,
              createdAt,
              produtoNome: data.produtoNome || data.productName || undefined,
            });
            
            // Atualizar última atividade se for mais recente
            if (createdAt > client.lastActivity) {
              client.lastActivity = createdAt;
              client.lastActivityType = "generation";
              client.lastProductName = data.produtoNome || data.productName || undefined;
            }
          });
        } catch (error) {
          console.warn(`[CRM] Erro ao buscar favoritos do cliente ${customerId}:`, error);
          // Continuar com próximo cliente
        }
      }
      
      console.log("[CRM] Favoritos com like incluídos no radar");
    } catch (error) {
      console.warn("[CRM] Erro ao buscar favoritos:", error);
      // Continuar mesmo se houver erro ao buscar favoritos
    }

    // Converter para array e ordenar por mais recente
    const activeClients = Array.from(clientMap.values()).sort(
      (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()
    );

    console.log("[CRM] Clientes ativos encontrados:", activeClients.length, {
      comComposicoes: activeClients.filter(c => c.compositionCount > 0).length,
      totalComposicoes: activeClients.reduce((sum, c) => sum + c.compositionCount, 0),
    });

    return activeClients;
  } catch (error) {
    console.error("[CRM] Erro ao buscar clientes ativos:", error);
    return [];
  }
}

