/**
 * Product Registry - Sistema de registro e busca de produtos por ID
 * 
 * Este módulo cria uma estrutura robusta para:
 * 1. Registrar produtos com IDs únicos
 * 2. Buscar produtos por ID de forma confiável
 * 3. Manter referências entre composições e produtos
 */

import { getAdminDb } from "@/lib/firebaseAdmin";

export interface ProductRegistryEntry {
  id: string; // ID único do produto
  lojistaId: string;
  compositionId: string;
  produto: {
    id: string;
    nome: string;
    preco: number;
    imagemUrl: string | null;
    categoria: string | null;
    tamanhos: string[];
    cores: string[];
    medidas: string | null;
    desconto: number;
    descricao: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Gera um ID único para um produto
 */
export function generateProductId(compositionId: string, productIndex: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `prod_${compositionId}_${productIndex}_${timestamp}_${random}`;
}

/**
 * Registra produtos de uma composição no Product Registry
 * Isso cria uma referência permanente entre compositionId e produtos
 */
export async function registerCompositionProducts(
  lojistaId: string,
  compositionId: string,
  produtos: any[]
): Promise<string[]> {
  if (!lojistaId || !compositionId || !Array.isArray(produtos) || produtos.length === 0) {
    console.warn("[ProductRegistry] ⚠️ Dados inválidos para registro:", {
      temLojistaId: !!lojistaId,
      temCompositionId: !!compositionId,
      totalProdutos: produtos?.length || 0,
    });
    return [];
  }

  const db = getAdminDb();
  const registryRef = db.collection("productRegistry");
  const productIds: string[] = [];

  try {
    // Para cada produto, criar um registro com ID único
    const registrations = produtos.map(async (produto, index) => {
      // Gerar ID único para o produto
      const productId = produto.id || generateProductId(compositionId, index);
      
      // Criar entrada no registry
      const registryEntry: ProductRegistryEntry = {
        id: productId,
        lojistaId,
        compositionId,
        produto: {
          id: productId,
          nome: produto.nome || produto.name || "Produto",
          preco: produto.preco !== undefined ? produto.preco : (produto.price || 0),
          imagemUrl: produto.imagemUrl || produto.imageUrl || produto.productUrl || produto.imagem || produto.image || null,
          categoria: produto.categoria || produto.category || null,
          tamanhos: Array.isArray(produto.tamanhos) 
            ? produto.tamanhos 
            : (produto.tamanho ? [produto.tamanho] : (produto.size ? [produto.size] : ["Único"])),
          cores: Array.isArray(produto.cores) 
            ? produto.cores 
            : (produto.cor ? [produto.cor] : (produto.color ? [produto.color] : [])),
          medidas: produto.medidas || produto.medida || produto.measure || null,
          desconto: produto.desconto !== undefined ? produto.desconto : (produto.discount || 0),
          descricao: produto.descricao || produto.description || null,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Salvar no registry usando o productId como documento ID
      await registryRef.doc(productId).set(registryEntry);
      
      console.log(`[ProductRegistry] ✅ Produto registrado:`, {
        productId,
        nome: registryEntry.produto.nome,
        preco: registryEntry.produto.preco,
        compositionId,
      });

      return productId;
    });

    const registeredIds = await Promise.all(registrations);
    productIds.push(...registeredIds);

    console.log(`[ProductRegistry] ✅ ${productIds.length} produtos registrados para composição ${compositionId}`);

    return productIds;
  } catch (error: any) {
    console.error("[ProductRegistry] ❌ Erro ao registrar produtos:", error);
    throw error;
  }
}

/**
 * Busca produtos de uma composição pelo compositionId
 */
export async function getProductsByCompositionId(
  lojistaId: string,
  compositionId: string
): Promise<any[]> {
  if (!lojistaId || !compositionId) {
    return [];
  }

  const db = getAdminDb();
  const registryRef = db.collection("productRegistry");

  try {
    // Buscar todos os produtos registrados para esta composição
    const query = await registryRef
      .where("lojistaId", "==", lojistaId)
      .where("compositionId", "==", compositionId)
      .get();

    if (query.empty) {
      console.log(`[ProductRegistry] ⚠️ Nenhum produto encontrado para compositionId: ${compositionId}`);
      return [];
    }

    const produtos = query.docs.map(doc => {
      const data = doc.data() as ProductRegistryEntry;
      return data.produto;
    });

    console.log(`[ProductRegistry] ✅ ${produtos.length} produtos encontrados para compositionId: ${compositionId}`);

    return produtos;
  } catch (error: any) {
    console.error("[ProductRegistry] ❌ Erro ao buscar produtos:", error);
    return [];
  }
}

/**
 * Busca produtos por lista de productIds
 */
export async function getProductsByIds(
  lojistaId: string,
  productIds: string[]
): Promise<any[]> {
  if (!lojistaId || !Array.isArray(productIds) || productIds.length === 0) {
    return [];
  }

  const db = getAdminDb();
  const registryRef = db.collection("productRegistry");

  try {
    // Buscar produtos em lotes (Firestore limita a 10 por vez em whereIn)
    const batchSize = 10;
    const allProducts: any[] = [];

    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);
      
      const query = await registryRef
        .where("lojistaId", "==", lojistaId)
        .where("id", "in", batch)
        .get();

      query.docs.forEach(doc => {
        const data = doc.data() as ProductRegistryEntry;
        allProducts.push(data.produto);
      });
    }

    console.log(`[ProductRegistry] ✅ ${allProducts.length} produtos encontrados de ${productIds.length} IDs`);

    return allProducts;
  } catch (error: any) {
    console.error("[ProductRegistry] ❌ Erro ao buscar produtos por IDs:", error);
    
    // Fallback: buscar individualmente
    const allProducts: any[] = [];
    for (const productId of productIds) {
      try {
        const doc = await registryRef.doc(productId).get();
        if (doc.exists) {
          const data = doc.data() as ProductRegistryEntry;
          if (data.lojistaId === lojistaId) {
            allProducts.push(data.produto);
          }
        }
      } catch (err) {
        console.warn(`[ProductRegistry] ⚠️ Erro ao buscar produto ${productId}:`, err);
      }
    }

    return allProducts;
  }
}

/**
 * Atualiza produtos de uma composição (útil para refinamentos)
 */
export async function updateCompositionProducts(
  lojistaId: string,
  compositionId: string,
  produtos: any[]
): Promise<string[]> {
  // Primeiro, remover registros antigos desta composição
  try {
    const existingProducts = await getProductsByCompositionId(lojistaId, compositionId);
    const db = getAdminDb();
    const registryRef = db.collection("productRegistry");

    // Deletar registros antigos
    for (const produto of existingProducts) {
      try {
        await registryRef.doc(produto.id).delete();
      } catch (error) {
        console.warn(`[ProductRegistry] ⚠️ Erro ao deletar produto antigo ${produto.id}:`, error);
      }
    }
  } catch (error) {
    console.warn("[ProductRegistry] ⚠️ Erro ao limpar produtos antigos:", error);
  }

  // Registrar novos produtos
  return await registerCompositionProducts(lojistaId, compositionId, produtos);
}

