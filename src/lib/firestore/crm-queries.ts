/**
 * Queries para CRM - Radar de Oportunidades
 * Busca clientes ativos nas últimas 72h
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
 * Busca clientes que tiveram atividade nas últimas 7 dias (168h)
 */
export async function fetchActiveClients(
  lojistaId: string,
  hoursAgo: number = 168
): Promise<ActiveClient[]> {
  try {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

    console.log("[CRM] Buscando clientes ativos desde:", cutoffDate.toISOString());

    // PAINEL DO LOJISTA: Buscar composições criadas nas últimas 72h APENAS da subcoleção
    // Apenas o painel administrativo tem acesso à coleção global
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);
    const allCompositions: any[] = [];
    
    // Buscar APENAS da subcoleção do lojista
    try {
      const subcollectionRef = db
        .collection("lojas")
        .doc(lojistaId)
        .collection("composicoes");
      
      const subcollectionSnapshot = await subcollectionRef.limit(1000).get();
      subcollectionSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data?.createdAt) {
          const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          if (createdAt >= cutoffDate) {
            allCompositions.push({ id: doc.id, data, source: 'subcollection' });
          }
        }
      });
      console.log(`[CRM] ${subcollectionSnapshot.size} composições encontradas na subcoleção`);
    } catch (error) {
      console.warn("[CRM] Erro ao buscar da subcoleção:", error);
    }
    
    // Criar snapshot combinado
    const compositionsSnapshot = {
      docs: allCompositions.map(item => ({
        id: item.id,
        data: () => item.data,
      })),
    };

    // Agrupar por customerId
    const clientMap = new Map<string, ActiveClient>();

    for (const doc of compositionsSnapshot.docs) {
      const data = typeof doc.data === "function" ? doc.data() : doc.data;
      if (!data) continue;
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

      // Filtrar apenas composições das últimas 72h
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

        // Filtrar apenas sessões das últimas 72h (já que removemos o where de data)
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

    // NOVO: Buscar da coleção 'generations' com showInRadar = true
    // Isso garante que apenas composições únicas (não remixes) apareçam no Radar
    try {
      const cutoffTimestamp = Timestamp.fromDate(cutoffDate);
      const generationsRef = db.collection("generations");
      const lojaRef = db.collection("lojas").doc(lojistaId);
      
      // Buscar generations com showInRadar = true das últimas 7 dias
      let generationsSnapshot;
      try {
        generationsSnapshot = await generationsRef
          .where("lojistaId", "==", lojistaId)
          .where("showInRadar", "==", true)
          .where("status", "==", "liked")
          .where("createdAt", ">=", cutoffTimestamp)
          .orderBy("createdAt", "desc")
          .limit(500)
          .get();
      } catch (error: any) {
        // Se não tiver índice, buscar todos e filtrar em memória
        console.log("[CRM] Índice de generations não encontrado, buscando todos:", error.message);
        const allGenerations = await generationsRef
          .where("lojistaId", "==", lojistaId)
          .where("showInRadar", "==", true)
          .where("status", "==", "liked")
          .limit(500)
          .get();
        
        generationsSnapshot = {
          forEach: (callback: any) => {
            allGenerations.forEach((doc) => {
              const data = doc.data();
              const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt || 0);
              if (createdAt >= cutoffDate) {
                callback(doc);
              }
            });
          },
        } as any;
      }
      
      // Cache de dados dos clientes para evitar múltiplas buscas
      const clientesCache = new Map<string, any>();
      
      // Processar cada generation (usar for...of para permitir await)
      // Converter snapshot para array para permitir await dentro do loop
      const docsArray: any[] = [];
      if (generationsSnapshot.forEach) {
        generationsSnapshot.forEach((doc: any) => {
          docsArray.push(doc);
        });
      } else if (Array.isArray(generationsSnapshot)) {
        docsArray.push(...generationsSnapshot);
      } else if (generationsSnapshot.docs) {
        docsArray.push(...Array.from(generationsSnapshot.docs));
      }
      
      for (const doc of docsArray) {
        const data = typeof doc.data === "function" ? doc.data() : doc.data;
        if (!data || !data.userId) continue;
        
        const customerId = data.userId;
        
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
        
        // Filtrar apenas das últimas 7 dias
        if (createdAt < cutoffDate) {
          continue;
        }
        
        // Verificar se tem imagem válida - se não tiver, buscar da composição original
        let imagemUrl = data.imagemUrl || data.imageUrl;
        
        // Se não tiver imagem na generation, buscar da composição original
        if (!imagemUrl || imagemUrl.trim() === "") {
          const compositionId = data.compositionId;
          if (compositionId) {
            try {
              const composicaoRef = lojaRef.collection("composicoes").doc(compositionId);
              const composicaoDoc = await composicaoRef.get();
              if (composicaoDoc.exists) {
                const composicaoData = composicaoDoc.data();
                imagemUrl = composicaoData?.imagemUrl || composicaoData?.imageUrl || 
                           composicaoData?.looks?.[0]?.imagemUrl || 
                           composicaoData?.looks?.[0]?.imageUrl || 
                           composicaoData?.looks?.[0]?.url || null;
              }
            } catch (error) {
              console.warn(`[CRM] Erro ao buscar imagem da composição ${compositionId}:`, error);
            }
          }
        }
        
        // Se ainda não tiver imagem, ignorar esta generation
        if (!imagemUrl || imagemUrl.trim() === "") {
          continue;
        }
        
        // Buscar dados do cliente (com cache)
        let clienteData = clientesCache.get(customerId);
        if (!clienteData) {
          // Buscar do Firestore (será preenchido assincronamente, mas por enquanto usar dados da generation)
          clienteData = {
            nome: data.customerName || "Cliente",
            whatsapp: null,
            avatar: null,
          };
          clientesCache.set(customerId, clienteData);
          
          // Buscar dados completos do cliente em background (não bloqueia)
          lojaRef.collection("clientes").doc(customerId).get().then((clienteDoc) => {
            if (clienteDoc.exists) {
              const fullData = clienteDoc.data();
              clienteData.nome = fullData?.nome || clienteData.nome;
              clienteData.whatsapp = fullData?.whatsapp || null;
              clienteData.avatar = fullData?.avatar || fullData?.fotoUrl || fullData?.photoUrl || null;
            }
          }).catch(() => {
            // Ignorar erros de busca
          });
        }
        
        // Adicionar ou atualizar cliente no mapa
        if (!clientMap.has(customerId)) {
          clientMap.set(customerId, {
            customerId,
            nome: clienteData.nome || data.customerName || "Cliente",
            whatsapp: clienteData.whatsapp || "",
            avatar: clienteData.avatar || null,
            lastActivity: createdAt,
            lastActivityType: "generation",
            lastProductName: data.productName || undefined,
            compositionCount: 0,
            compositions: [],
          });
        }
        
        const client = clientMap.get(customerId)!;
        
        // Adicionar generation como composição
        client.compositionCount++;
        client.compositions.push({
          id: doc.id,
          imagemUrl: imagemUrl,
          createdAt,
          produtoNome: data.productName || undefined,
        });
        
        // Atualizar última atividade se for mais recente
        if (createdAt > client.lastActivity) {
          client.lastActivity = createdAt;
          client.lastActivityType = "generation";
          client.lastProductName = data.productName || undefined;
        }
      }
      
      console.log("[CRM] Generations com showInRadar=true incluídas no radar");
    } catch (error) {
      console.warn("[CRM] Erro ao buscar generations:", error);
      // Continuar mesmo se houver erro ao buscar generations
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

