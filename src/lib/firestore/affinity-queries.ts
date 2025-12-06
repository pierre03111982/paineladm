/**
 * Queries para sistema de afinidade e galeria contextual
 * Conta quantas vezes um cliente curtiu looks com um produto específico
 */

import { getAdminDb } from "../firebaseAdmin";

const db = getAdminDb();

/**
 * Conta quantas vezes um cliente curtiu looks com um produto específico
 */
export async function countProductAffinity(
  lojistaId: string,
  userId: string,
  productId: string
): Promise<number> {
  try {
    const generationsRef = db.collection("generations");
    
    const snapshot = await generationsRef
      .where("lojistaId", "==", lojistaId)
      .where("userId", "==", userId)
      .where("status", "==", "liked")
      .get();
    
    let count = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      const productIds = data.productIds || [];
      if (productIds.includes(productId)) {
        count++;
      }
    });
    
    return count;
  } catch (error) {
    console.error("[countProductAffinity] Erro ao contar afinidade:", error);
    return 0;
  }
}

/**
 * Busca todas as composições liked de um cliente com um produto específico
 */
export interface AffinityGalleryItem {
  id: string;
  imagemUrl: string;
  createdAt: Date;
  productName?: string;
  uploadImageHash?: string | null;
}

export async function getProductGallery(
  lojistaId: string,
  userId: string,
  productId: string,
  uploadImageHash?: string | null
): Promise<AffinityGalleryItem[]> {
  try {
    const generationsRef = db.collection("generations");
    
    let snapshot;
    try {
      snapshot = await generationsRef
        .where("lojistaId", "==", lojistaId)
        .where("userId", "==", userId)
        .where("status", "==", "liked")
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();
    } catch (error: any) {
      // Se não tiver índice, buscar todos e filtrar em memória
      console.log("[getProductGallery] Índice não encontrado, buscando todos:", error.message);
      snapshot = await generationsRef
        .where("lojistaId", "==", lojistaId)
        .where("userId", "==", userId)
        .where("status", "==", "liked")
        .limit(200)
        .get();
    }
    
    const gallery: AffinityGalleryItem[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const productIds = data.productIds || [];
      
      // Filtrar apenas generations que contêm o productId
      if (productIds.includes(productId)) {
        // Se uploadImageHash for fornecido, filtrar apenas looks com o mesmo hash (mesma foto de upload)
        if (uploadImageHash && data.uploadImageHash !== uploadImageHash) {
          return;
        }
        
        const imagemUrl = data.imagemUrl || data.imageUrl;
        if (imagemUrl && imagemUrl.trim() !== "") {
          gallery.push({
            id: doc.id,
            imagemUrl,
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || 0),
            productName: data.productName || undefined,
            uploadImageHash: data.uploadImageHash || null,
          });
        }
      }
    });
    
    // Ordenar por data (mais recente primeiro)
    gallery.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return gallery;
  } catch (error) {
    console.error("[getProductGallery] Erro ao buscar galeria:", error);
    return [];
  }
}


