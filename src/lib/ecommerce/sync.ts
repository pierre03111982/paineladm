/**
 * Sistema de Sincronização de E-commerce
 * Suporta integração com Shopify, Nuvemshop e outras plataformas
 */

import { getAdminDb } from "../firebaseAdmin";
import type { ProdutoDoc } from "../firestore/types";

const db = getAdminDb();

export type EcommercePlatform = "shopify" | "nuvemshop" | "woocommerce" | "other";

export interface EcommerceSyncConfig {
  platform: EcommercePlatform;
  apiKey: string;
  apiSecret?: string;
  storeUrl: string;
  webhookSecret?: string;
  autoSync: boolean;
  syncInterval?: number; // em minutos
}

export interface EcommerceProduct {
  id: string;
  title: string;
  price: number;
  compareAtPrice?: number;
  inventoryQuantity: number;
  variants: Array<{
    id: string;
    title: string;
    price: number;
    inventoryQuantity: number;
    option1?: string; // tamanho
    option2?: string; // cor
  }>;
  images: Array<{
    src: string;
    alt?: string;
  }>;
  tags?: string[];
  vendor?: string;
  productType?: string;
}

/**
 * Salva configuração de sincronização de e-commerce
 */
export async function saveEcommerceSyncConfig(
  lojistaId: string,
  config: EcommerceSyncConfig
): Promise<void> {
  try {
    await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("ecommerce_config")
      .doc("sync")
      .set({
        ...config,
        updatedAt: new Date(),
      });
    console.log("[EcommerceSync] Configuração salva para lojista:", lojistaId);
  } catch (error) {
    console.error("[EcommerceSync] Erro ao salvar configuração:", error);
    throw error;
  }
}

/**
 * Busca configuração de sincronização de e-commerce
 */
export async function getEcommerceSyncConfig(
  lojistaId: string
): Promise<EcommerceSyncConfig | null> {
  try {
    const doc = await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("ecommerce_config")
      .doc("sync")
      .get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as EcommerceSyncConfig;
  } catch (error) {
    console.error("[EcommerceSync] Erro ao buscar configuração:", error);
    return null;
  }
}

/**
 * Sincroniza produtos do Shopify
 */
export async function syncFromShopify(
  lojistaId: string,
  config: EcommerceSyncConfig
): Promise<{ synced: number; errors: number }> {
  // TODO: Implementar integração real com Shopify API
  // Por enquanto, retorna mock
  console.log("[EcommerceSync] Sincronizando do Shopify para lojista:", lojistaId);
  return { synced: 0, errors: 0 };
}

/**
 * Sincroniza produtos do Nuvemshop
 */
export async function syncFromNuvemshop(
  lojistaId: string,
  config: EcommerceSyncConfig
): Promise<{ synced: number; errors: number }> {
  // TODO: Implementar integração real com Nuvemshop API
  // Por enquanto, retorna mock
  console.log("[EcommerceSync] Sincronizando do Nuvemshop para lojista:", lojistaId);
  return { synced: 0, errors: 0 };
}

/**
 * Sincroniza um produto específico
 */
export async function syncProduct(
  lojistaId: string,
  produtoId: string,
  ecommerceProduct: EcommerceProduct
): Promise<void> {
  try {
    const produtoRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("produtos")
      .doc(produtoId);

    const produtoDoc = await produtoRef.get();
    if (!produtoDoc.exists) {
      throw new Error("Produto não encontrado");
    }

    const produtoData = produtoDoc.data() as ProdutoDoc;

    // Atualizar campos sincronizados
    const updates: Partial<ProdutoDoc> = {
      updatedAt: new Date(),
    };

    if (produtoData.ecommerceSync?.syncPrice) {
      updates.preco = ecommerceProduct.price;
    }

    if (produtoData.ecommerceSync?.syncStock) {
      updates.estoque = ecommerceProduct.inventoryQuantity;
    }

    if (produtoData.ecommerceSync?.syncVariations) {
      // Atualizar tamanhos e cores baseado nas variantes
      const tamanhos = new Set<string>();
      const cores = new Set<string>();

      ecommerceProduct.variants.forEach((variant) => {
        if (variant.option1) tamanhos.add(variant.option1);
        if (variant.option2) cores.add(variant.option2);
      });

      updates.tamanhos = Array.from(tamanhos);
      if (cores.size > 0) {
        updates.cores = Array.from(cores);
      }
    }

    // Atualizar timestamp de sincronização
    updates.ecommerceSync = {
      ...produtoData.ecommerceSync,
      lastSyncedAt: new Date(),
    };

    await produtoRef.update(updates);
    console.log("[EcommerceSync] Produto sincronizado:", produtoId);
  } catch (error) {
    console.error("[EcommerceSync] Erro ao sincronizar produto:", error);
    throw error;
  }
}

