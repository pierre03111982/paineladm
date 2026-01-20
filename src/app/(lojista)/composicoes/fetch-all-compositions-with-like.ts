/**
 * Busca TODAS as composições que receberam LIKE (dos favoritos)
 * Mesma lógica do Radar - mostra apenas composições que receberam like
 */

import { getAdminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

export type CompositionForVisualHistory = {
  id: string;
  imagemUrl: string;
  createdAt: Date;
  customerName: string;
  customerWhatsapp: string | null;
  produtoNome?: string;
  customerId: string;
  productIds?: string[];
  produtosUtilizados?: Array<{
    id: string;
    nome: string;
    imagemUrl: string;
  }>;
};

export async function fetchAllCompositionsWithLike(
  lojistaId: string
): Promise<CompositionForVisualHistory[]> {
  if (!lojistaId) {
    console.warn("[fetchAllCompositionsWithLike] ⚠️  lojistaId não fornecido");
    return [];
  }

  console.log(`[fetchAllCompositionsWithLike] 🔍 Buscando composições com LIKE para lojistaId: ${lojistaId}`);

  try {
    const db = getAdminDb();
    const allFavoritos: Array<{
      id: string;
      imagemUrl: string;
      createdAt: Date;
      customerName: string;
      customerWhatsapp: string | null;
      produtoNome?: string;
      customerId: string;
      compositionId?: string | null;
    }> = [];
    const clientesCache = new Map<string, { nome: string | null; whatsapp: string | null }>();
    const compositionMap = new Map<string, CompositionForVisualHistory>(); // Para agrupar por compositionId

    // Buscar favoritos com like de TODOS os clientes (mesma lógica do Radar)
    // O Radar busca favoritos com like, então vamos fazer o mesmo
    try {
      const lojaRef = db.collection("lojas").doc(lojistaId);
      const clientesSnapshot = await lojaRef.collection("clientes").get();
      
      console.log(`[fetchAllCompositionsWithLike] 👥 Clientes encontrados: ${clientesSnapshot.size}`);
      
      for (const clienteDoc of clientesSnapshot.docs) {
        const customerId = clienteDoc.id;
        const clienteData = clienteDoc.data();
        
        try {
          // Buscar favoritos com like deste cliente
          const favoritosRef = lojaRef
            .collection("clientes")
            .doc(customerId)
            .collection("favoritos");
          
          // Buscar TODOS os favoritos com like (sem filtro de data para mostrar todas)
          let favoritosSnapshot;
          try {
            // Tentar buscar com orderBy primeiro (mais eficiente)
            favoritosSnapshot = await favoritosRef
              .where("action", "==", "like")
              .orderBy("createdAt", "desc")
              .limit(1000)
              .get();
          } catch (error: any) {
            // Se não tiver índice, buscar todos os favoritos e filtrar em memória
            console.log(`[fetchAllCompositionsWithLike] Índice não encontrado, buscando todos os favoritos do cliente ${customerId}:`, error.message);
            
            // Buscar todos os favoritos com like (sem orderBy)
            const allFavoritosQuery = await favoritosRef
              .where("action", "==", "like")
              .limit(1000)
              .get();
            
            // Ordenar em memória por data
            const sortedDocs = allFavoritosQuery.docs.sort((a, b) => {
              const dateA = a.data().createdAt?.toDate?.() || new Date(a.data().createdAt || 0);
              const dateB = b.data().createdAt?.toDate?.() || new Date(b.data().createdAt || 0);
              return dateB.getTime() - dateA.getTime();
            });
            
            favoritosSnapshot = {
              forEach: (callback: any) => {
                sortedDocs.forEach(callback);
              },
              size: sortedDocs.length,
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
              } else if (data.createdAt instanceof Date) {
                createdAt = data.createdAt;
              } else if (typeof data.createdAt === "string") {
                createdAt = new Date(data.createdAt);
              } else {
                createdAt = new Date();
              }
            } else {
              createdAt = new Date();
            }
            
            // Verificar se tem imagem válida
            const imagemUrl = data.imagemUrl || data.imageUrl;
            if (!imagemUrl || imagemUrl.trim() === "") {
              return; // Ignorar favoritos sem imagem
            }
            
            // Extrair informações
            const customerName = clienteData?.nome || data.customerName || "Cliente Anônimo";
            const customerWhatsapp = clienteData?.whatsapp || data.whatsapp || null;
            const produtoNome = data.produtoNome || data.productName || data.primaryProductName;
            const compositionId = data.compositionId || null;
            
            // Cache do cliente
            if (!clientesCache.has(customerId)) {
              clientesCache.set(customerId, {
                nome: customerName,
                whatsapp: customerWhatsapp,
              });
            }
            
            allFavoritos.push({
              id: doc.id,
              imagemUrl,
              createdAt,
              customerName,
              customerWhatsapp,
              produtoNome,
              customerId,
              compositionId,
            });
          });
        } catch (error) {
          console.warn(`[fetchAllCompositionsWithLike] Erro ao buscar favoritos do cliente ${customerId}:`, error);
          // Continuar com próximo cliente
        }
      }
      
      console.log(`[fetchAllCompositionsWithLike] ✅ Favoritos com like encontrados: ${allFavoritos.length}`);
      
      // AGREGAR: Agrupar favoritos por compositionId para mostrar apenas composições únicas
      // Se não tiver compositionId, agrupar por imagemUrl
      allFavoritos.forEach((favorito) => {
        const key = favorito.compositionId || favorito.imagemUrl; // Usar compositionId ou imagemUrl como chave única
        
        if (!compositionMap.has(key)) {
          // Primeira vez vendo esta composição - adicionar ao mapa
          // IMPORTANTE: Usar compositionId se disponível, caso contrário usar imagemUrl como ID
          // NUNCA usar favorito.id (que é o ID do documento de favorito, não da composição)
          const compositionIdFinal = favorito.compositionId || favorito.imagemUrl;
          
          compositionMap.set(key, {
            id: compositionIdFinal, // Sempre usar compositionId ou imagemUrl, nunca favorito.id
            imagemUrl: favorito.imagemUrl,
            createdAt: favorito.createdAt,
            customerName: favorito.customerName,
            customerWhatsapp: favorito.customerWhatsapp,
            produtoNome: favorito.produtoNome,
            customerId: favorito.customerId,
          });
        } else {
          // Já existe esta composição - manter a data mais recente
          const existing = compositionMap.get(key)!;
          if (favorito.createdAt > existing.createdAt) {
            existing.createdAt = favorito.createdAt; // Atualizar para a data mais recente
          }
        }
      });
      
      // Converter o mapa em array
      const allCompositions = Array.from(compositionMap.values());
      
      console.log(`[fetchAllCompositionsWithLike] 📊 Agrupamento: ${allFavoritos.length} favoritos → ${allCompositions.length} composições únicas`);
      
      // Buscar produtos utilizados em cada composição
      // Buscar composições da coleção para obter productIds
      const productsMap = new Map<string, string[]>(); // compositionId -> productIds
      const produtosCache = new Map<string, { nome: string; imagemUrl: string }>(); // produtoId -> dados
      
      // Buscar composições individualmente (buscar apenas as primeiras 50 para performance)
      const composicoesParaBuscar = allCompositions.slice(0, 50);
      
      for (const comp of composicoesParaBuscar) {
        if (comp.id && !comp.id.startsWith('http')) {
          try {
            const composicaoDoc = await db
              .collection("lojas")
              .doc(lojistaId)
              .collection("composicoes")
              .doc(comp.id)
              .get();
            
            if (composicaoDoc.exists) {
              const composicaoData = typeof composicaoDoc.data === "function" ? composicaoDoc.data() : composicaoDoc.data;
              if (composicaoData && composicaoData.productIds && Array.isArray(composicaoData.productIds)) {
                productsMap.set(comp.id, composicaoData.productIds);
                
                // Buscar produtos desta composição
                const productIds = composicaoData.productIds.slice(0, 4); // Limitar a 4 produtos
                const produtosUtilizados: Array<{ id: string; nome: string; imagemUrl: string }> = [];
                
                // Buscar cada produto (ou usar cache)
                for (const productId of productIds) {
                  if (produtosCache.has(productId)) {
                    const produtoCache = produtosCache.get(productId)!;
                    produtosUtilizados.push({
                      id: productId,
                      ...produtoCache
                    });
                  } else {
                    try {
                      const produtoDoc = await db
                        .collection("lojas")
                        .doc(lojistaId)
                        .collection("produtos")
                        .doc(productId)
                        .get();
                      
                      if (produtoDoc.exists) {
                        const produtoData = typeof produtoDoc.data === "function" ? produtoDoc.data() : produtoDoc.data;
                        if (produtoData) {
                          const produtoInfo = {
                            nome: produtoData.nome || "Produto",
                            imagemUrl: produtoData.imagemUrl || produtoData.imagemUrlOriginal || "",
                          };
                          produtosCache.set(productId, produtoInfo);
                          produtosUtilizados.push({
                            id: productId,
                            ...produtoInfo
                          });
                        }
                      }
                    } catch (error) {
                      console.warn(`[fetchAllCompositionsWithLike] Erro ao buscar produto ${productId}:`, error);
                    }
                  }
                }
                
                (comp as any).productIds = composicaoData.productIds;
                (comp as any).produtosUtilizados = produtosUtilizados;
              }
            }
          } catch (error) {
            console.warn(`[fetchAllCompositionsWithLike] Erro ao buscar composição ${comp.id}:`, error);
          }
        }
      }
      
      // Ordenar por data (mais recente primeiro)
      allCompositions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      console.log(`[fetchAllCompositionsWithLike] ✅ Total final: ${allCompositions.length} composições com like encontradas e ordenadas`);

      // Log detalhado das datas
      if (allCompositions.length > 0) {
        const maisRecente = allCompositions[0];
        const maisAntiga = allCompositions[allCompositions.length - 1];
        console.log(`[fetchAllCompositionsWithLike] 📅 Mais recente: ${maisRecente.createdAt.toLocaleDateString("pt-BR")} ${maisRecente.createdAt.toLocaleTimeString("pt-BR")}`);
        console.log(`[fetchAllCompositionsWithLike] 📅 Mais antiga: ${maisAntiga.createdAt.toLocaleDateString("pt-BR")} ${maisAntiga.createdAt.toLocaleTimeString("pt-BR")}`);
        
        // Log das 10 mais recentes para debug
        console.log(`[fetchAllCompositionsWithLike] 📋 10 composições mais recentes:`);
        allCompositions.slice(0, 10).forEach((comp, idx) => {
          const dateStr = comp.createdAt.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          console.log(`  ${idx + 1}. ${dateStr} | ${comp.customerName}`);
        });
      }

      return allCompositions;
    } catch (error) {
      console.error("[fetchAllCompositionsWithLike] ❌ Erro ao buscar favoritos:", error);
      if (error instanceof Error) {
        console.error("[fetchAllCompositionsWithLike] Mensagem:", error.message);
      }
      return [];
    }
  } catch (error) {
    console.error("[fetchAllCompositionsWithLike] ❌ Erro ao buscar composições:", error);
    if (error instanceof Error) {
      console.error("[fetchAllCompositionsWithLike] Stack:", error.stack);
    }
    return [];
  }
}

