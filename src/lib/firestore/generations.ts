/**
 * Gerenciamento da coleção 'generations'
 * Sistema de feedback e controle de exibição no Radar
 */

import { getAdminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

export type GenerationStatus = "pending" | "liked" | "disliked";
export type FeedbackCategory = "style" | "technical";

export interface GenerationDocument {
  userId: string;
  lojistaId: string;
  uploadImageHash: string | null; // Hash único da foto de upload (crucial para identificar remixes)
  productIds: string[]; // Lista de IDs dos produtos usados
  compositionId: string | null; // ID da composição gerada
  jobId: string | null;
  imagemUrl: string | null; // URL da imagem gerada
  status: GenerationStatus;
  feedbackReason?: string | null; // Motivo do dislike
  feedbackCategory?: FeedbackCategory | null; // Categoria do feedback
  showInRadar: boolean; // Controla visibilidade para o lojista
  productName?: string | null; // Nome do produto (para facilitar leitura da IA)
  customerName?: string | null;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

/**
 * Calcula hash simples de uma string (para uploadImageHash)
 * Em produção, considere usar crypto.createHash('sha256')
 */
export function calculateImageHash(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  
  // Hash simples baseado na URL (em produção, use hash real da imagem)
  // Por enquanto, vamos usar a URL como identificador único
  // TODO: Implementar hash real da imagem quando disponível
  return imageUrl.split('?')[0]; // Remove query params para normalizar
}

/**
 * Cria ou atualiza um documento na coleção 'generations'
 */
export async function saveGeneration(params: {
  lojistaId: string;
  userId: string;
  compositionId: string | null;
  jobId: string | null;
  imagemUrl: string | null;
  uploadImageUrl?: string | null; // URL da imagem de upload original
  productIds: string[];
  productName?: string | null;
  customerName?: string | null;
  produtos?: any[]; // NOVO: Produtos completos para salvar na generation
}): Promise<string> {
  const {
    lojistaId,
    userId,
    compositionId,
    jobId,
    imagemUrl,
    uploadImageUrl,
    productIds: productIdsParam,
    productName,
    customerName,
    produtos: produtosParam,
  } = params;

  if (!lojistaId || !userId) {
    throw new Error("lojistaId e userId são obrigatórios");
  }

  const db = getAdminDb();
  const generationsRef = db.collection("generations");

  // Calcular hash da imagem de upload
  const uploadImageHash = calculateImageHash(uploadImageUrl || null);

  // Verificar se já existe uma generation com mesmo compositionId
  let existingGenerationId: string | null = null;
  if (compositionId) {
    const existingQuery = await generationsRef
      .where("compositionId", "==", compositionId)
      .where("userId", "==", userId)
      .where("lojistaId", "==", lojistaId)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      existingGenerationId = existingQuery.docs[0].id;
    }
  }

  // ============================================
  // VALIDAÇÃO BLOQUEANTE: Não salvar sem produtos
  // ============================================
  // Usar let para permitir reatribuição se necessário
  let produtos = produtosParam;
  let productIds = productIdsParam;
  
  const temProdutos = Array.isArray(produtos) && produtos.length > 0;
  const temProductIds = Array.isArray(productIds) && productIds.length > 0;
  
  if (!temProdutos && !temProductIds) {
    // Tentar criar produto de fallback
    console.warn("[saveGeneration] ⚠️ NENHUM PRODUTO OU PRODUCTID FORNECIDO!");
    console.warn("[saveGeneration] 📋 Parâmetros recebidos:", {
      lojistaId,
      userId,
      compositionId,
      temProdutos,
      temProductIds,
      productName,
      imagemUrl: imagemUrl?.substring(0, 100),
    });
    
    // Criar produto de fallback se tiver productName
    if (productName) {
      console.warn("[saveGeneration] ⚠️ Criando produto de fallback...");
      
      const produtoFallback = {
        id: `prod-${compositionId || Date.now()}-fallback`,
        nome: "Look Completo (Gerado pela IA)", // Nome mais bonito
        preco: 0,
        // ✅ IMPORTANTE: Forçar a imagem para o frontend não esconder o produto
        imagemUrl: imagemUrl || "", // Usar imagemUrl do parâmetro (nunca null)
        tamanhos: ["Único"],
        cores: [],
        categoria: "Gerado",
        medidas: null,
        desconto: 0,
        descricao: "Produto gerado automaticamente pela IA",
        lojaId: lojistaId,
      };
      
      // Aqui é onde dava o erro do 'const', agora com 'let' vai funcionar:
      produtos = [produtoFallback];
      productIds = [produtoFallback.id];
      
      console.warn("[saveGeneration] ⚠️ Criado produto de fallback:", {
        ...produtoFallback,
        temImagemUrl: !!produtoFallback.imagemUrl,
        imagemUrlPreview: produtoFallback.imagemUrl?.substring(0, 100) || "SEM IMAGEM",
      });
    } else {
      // Se não tem nem produtos nem productIds nem productName, lançar erro
      throw new Error(
        `[saveGeneration] ❌ ERRO CRÍTICO: Tentando salvar generation sem produtos, productIds ou productName. ` +
        `compositionId: ${compositionId}, lojistaId: ${lojistaId}, userId: ${userId}`
      );
    }
  }

  // ============================================
  // PASSO 3: INJEÇÃO DIRETA NO FIRESTORE
  // ============================================
  // Salvar o objeto completo, não apenas referência
  // NÃO USAR condicionais complexas - FORÇAR gravação
  
  const generationData: any = {
    userId,
    lojistaId,
    uploadImageHash,
    // 👇 AQUI ESTÁ A SOLUÇÃO: Salvar o objeto completo, não apenas referência
    produtos: Array.isArray(produtos) && produtos.length > 0 ? produtos : [], 
    productIds: Array.isArray(productIds) && productIds.length > 0 ? productIds : [],
    temProdutos: Array.isArray(produtos) && produtos.length > 0,
    compositionId: compositionId || null,
    jobId: jobId || null,
    imagemUrl: imagemUrl || null,
    status: "pending",
    showInRadar: false, // Por padrão, não mostrar até receber like
    productName: productName || null,
    customerName: customerName || null,
    generatedAt: new Date().toISOString(),
    updatedAt: new Date(),
  };
  
  // Log de confirmação antes de salvar
  console.log("💾 [saveGeneration] Tentando salvar generation com:", generationData.produtos.length, "produtos.");
  console.log("💾 [saveGeneration] Detalhes:", {
    temProdutos: generationData.temProdutos,
    totalProdutos: generationData.produtos.length,
    totalProductIds: generationData.productIds.length,
    produtos: generationData.produtos.map((p: any) => ({
      id: p.id,
      nome: p.nome,
      preco: p.preco,
      temImagemUrl: !!(p.imagemUrl || p.imageUrl),
    })),
  });

  if (existingGenerationId) {
    // ============================================
    // PASSO 4: ATUALIZAÇÃO DE CONTINGÊNCIA
    // ============================================
    // Garantir que o update NÃO sobrescreva o array de produtos com []
    // Se produtos foram fornecidos, SEMPRE atualizar
    // Se produtos não foram fornecidos, NÃO atualizar o campo (manter existente)
    
    const updateData: any = {
      ...generationData,
      updatedAt: new Date(),
    };
    
    // Se produtos foram fornecidos, SEMPRE atualizar (não deixar vazio)
    if (Array.isArray(produtos) && produtos.length > 0) {
      updateData.produtos = produtos;
      updateData.productIds = productIds;
      updateData.temProdutos = true;
      console.log("[saveGeneration] ✅ Atualizando generation COM produtos:", produtos.length);
    } else {
      // Se não tem produtos novos, NÃO atualizar o campo produtos (manter existente)
      // Remover do updateData para não sobrescrever
      delete updateData.produtos;
      delete updateData.temProdutos;
      console.log("[saveGeneration] ⚠️ Atualizando generation SEM produtos novos (mantendo existentes)");
    }
    
    await generationsRef.doc(existingGenerationId).update(updateData);
    console.log("[saveGeneration] ✅ Generation atualizada:", existingGenerationId, {
      temProdutos: Array.isArray(produtos) && produtos.length > 0,
      totalProdutos: produtos?.length || 0,
      atualizouProdutos: Array.isArray(produtos) && produtos.length > 0,
      temProductIds: updateData.productIds?.length > 0,
      totalProductIds: updateData.productIds?.length || 0,
    });
    return existingGenerationId;
  } else {
    // Criar nova generation
    generationData.createdAt = new Date();
    const docRef = await generationsRef.add(generationData);
    console.log("[saveGeneration] ✅ Nova generation criada:", docRef.id, {
      temProdutos: generationData.temProdutos,
      totalProdutos: generationData.produtos.length,
      totalProductIds: generationData.productIds.length,
    });
    return docRef.id;
  }
}

/**
 * Verifica se já existe uma generation com mesmo uploadImageHash + productIds + status liked
 * Usado para prevenir duplicatas no Radar
 */
export async function findSimilarLikedGeneration(params: {
  lojistaId: string;
  userId: string;
  uploadImageHash: string | null;
  productIds: string[];
}): Promise<GenerationDocument | null> {
  const { lojistaId, userId, uploadImageHash, productIds } = params;

  if (!uploadImageHash) {
    return null; // Sem hash, não pode verificar duplicatas
  }

  const db = getAdminDb();
  const generationsRef = db.collection("generations");

  try {
    // Buscar generations com mesmo userId, uploadImageHash e status liked
    const query = await generationsRef
      .where("lojistaId", "==", lojistaId)
      .where("userId", "==", userId)
      .where("uploadImageHash", "==", uploadImageHash)
      .where("status", "==", "liked")
      .get();

    // Verificar se algum tem os mesmos productIds
    for (const doc of query.docs) {
      const data = doc.data() as GenerationDocument;
      const existingProductIds = data.productIds || [];
      
      // Comparar arrays de productIds (ordem não importa)
      const existingSet = new Set(existingProductIds);
      const newSet = new Set(productIds);
      
      if (
        existingSet.size === newSet.size &&
        Array.from(existingSet).every(id => newSet.has(id))
      ) {
        // Mesmos produtos - é um remix/repetido
        return { ...data, createdAt: data.createdAt as Date, updatedAt: data.updatedAt as Date };
      }
    }

    return null;
  } catch (error) {
    console.error("[findSimilarLikedGeneration] Erro ao buscar:", error);
    return null;
  }
}

/**
 * Processa um LIKE: verifica duplicatas e define showInRadar
 */
export async function handleLike(params: {
  lojistaId: string;
  userId: string;
  compositionId: string | null;
  jobId: string | null;
  imagemUrl: string | null;
  uploadImageUrl?: string | null;
  productIds: string[];
  productName?: string | null;
  customerName?: string | null;
}): Promise<{ generationId: string; showInRadar: boolean }> {
  const {
    lojistaId,
    userId,
    compositionId,
    jobId,
    imagemUrl,
    uploadImageUrl,
    productIds,
    productName,
    customerName,
  } = params;

  const db = getAdminDb();
  const generationsRef = db.collection("generations");
  const uploadImageHash = calculateImageHash(uploadImageUrl || null);

  // CENÁRIO A: Verificar se já existe generation similar com like
  const similarGeneration = await findSimilarLikedGeneration({
    lojistaId,
    userId,
    uploadImageHash: uploadImageHash || null,
    productIds,
  });

  let showInRadar = true; // Por padrão, mostrar no Radar

  if (similarGeneration) {
    // CENÁRIO B: Já existe generation similar com like
    // Verificar se os productIds são diferentes (novo produto adicionado)
    const existingProductIds = similarGeneration.productIds || [];
    const existingSet = new Set(existingProductIds);
    const newSet = new Set(productIds);
    
    const hasNewProducts = productIds.some(id => !existingSet.has(id));
    const hasRemovedProducts = existingProductIds.some(id => !newSet.has(id));

    if (hasNewProducts || hasRemovedProducts) {
      // EXCEÇÃO: Produtos diferentes = novo look, mostrar no Radar
      showInRadar = true;
      console.log("[handleLike] Produtos diferentes detectados - mostrando no Radar");
    } else {
      // Mesmos produtos = remix/repetido, não mostrar no Radar
      showInRadar = false;
      console.log("[handleLike] Generation similar encontrada - NÃO mostrando no Radar (remix)");
    }
  } else {
    // CENÁRIO A: Look inédito, mostrar no Radar
    showInRadar = true;
    console.log("[handleLike] Look inédito - mostrando no Radar");
  }

  // Buscar ou criar generation
  let generationId: string;
  const existingQuery = compositionId
    ? await generationsRef
        .where("compositionId", "==", compositionId)
        .where("userId", "==", userId)
        .where("lojistaId", "==", lojistaId)
        .limit(1)
        .get()
    : { empty: true, docs: [] };

  if (!existingQuery.empty) {
    // Atualizar generation existente
    generationId = existingQuery.docs[0].id;
    await generationsRef.doc(generationId).update({
      status: "liked",
      showInRadar,
      imagemUrl: imagemUrl || null,
      updatedAt: new Date(),
    });
    console.log("[handleLike] Generation atualizada:", generationId);
  } else {
    // Criar nova generation
    const newGeneration: Partial<GenerationDocument> = {
      userId,
      lojistaId,
      uploadImageHash,
      productIds,
      compositionId: compositionId || null,
      jobId: jobId || null,
      imagemUrl: imagemUrl || null,
      status: "liked",
      showInRadar,
      productName: productName || null,
      customerName: customerName || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const docRef = await generationsRef.add(newGeneration);
    generationId = docRef.id;
    console.log("[handleLike] Nova generation criada:", generationId);
  }

  return { generationId, showInRadar };
}

/**
 * Processa um DISLIKE: sempre define showInRadar = false e exige feedbackReason
 */
export async function handleDislike(params: {
  lojistaId: string;
  userId: string;
  compositionId: string | null;
  jobId: string | null;
  imagemUrl: string | null;
  uploadImageUrl?: string | null;
  productIds: string[];
  productName?: string | null;
  customerName?: string | null;
  feedbackReason: string; // OBRIGATÓRIO
  feedbackCategory?: FeedbackCategory | null;
}): Promise<string> {
  const {
    lojistaId,
    userId,
    compositionId,
    jobId,
    imagemUrl,
    uploadImageUrl,
    productIds,
    productName,
    customerName,
    feedbackReason,
    feedbackCategory,
  } = params;

  if (!feedbackReason || feedbackReason.trim() === "") {
    throw new Error("feedbackReason é obrigatório para dislike");
  }

  const db = getAdminDb();
  const generationsRef = db.collection("generations");
  const uploadImageHash = calculateImageHash(uploadImageUrl || null);

  // Buscar ou criar generation
  let generationId: string;
  const existingQuery = compositionId
    ? await generationsRef
        .where("compositionId", "==", compositionId)
        .where("userId", "==", userId)
        .where("lojistaId", "==", lojistaId)
        .limit(1)
        .get()
    : { empty: true, docs: [] };

  if (!existingQuery.empty) {
    // Atualizar generation existente
    generationId = existingQuery.docs[0].id;
    await generationsRef.doc(generationId).update({
      status: "disliked",
      showInRadar: false, // SEMPRE false para dislike
      feedbackReason: feedbackReason.trim(),
      feedbackCategory: feedbackCategory || null,
      updatedAt: new Date(),
    });
    console.log("[handleDislike] Generation atualizada:", generationId);
  } else {
    // Criar nova generation
    const newGeneration: Partial<GenerationDocument> = {
      userId,
      lojistaId,
      uploadImageHash,
      productIds,
      compositionId: compositionId || null,
      jobId: jobId || null,
      imagemUrl: null, // Não salvar imagemUrl para dislikes
      status: "disliked",
      showInRadar: false, // SEMPRE false
      feedbackReason: feedbackReason.trim(),
      feedbackCategory: feedbackCategory || null,
      productName: productName || null,
      customerName: customerName || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const docRef = await generationsRef.add(newGeneration);
    generationId = docRef.id;
    console.log("[handleDislike] Nova generation criada:", generationId);
  }

  return generationId;
}

/**
 * Busca as últimas N generations de um usuário (para análise da IA)
 */
export async function fetchUserGenerations(
  lojistaId: string,
  userId: string,
  limit: number = 15
): Promise<GenerationDocument[]> {
  const db = getAdminDb();
  const generationsRef = db.collection("generations");

  try {
    const snapshot = await generationsRef
      .where("lojistaId", "==", lojistaId)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const generations: GenerationDocument[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      generations.push({
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || 0),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt || 0),
      } as GenerationDocument);
    });

    return generations;
  } catch (error) {
    console.error("[fetchUserGenerations] Erro ao buscar:", error);
    return [];
  }
}

/**
 * Processa resumo de feedback para a IA
 */
export interface FeedbackSummary {
  totalLikes: number;
  totalDislikes: number;
  dislikesByCategory: {
    style: number;
    technical: number;
  };
  recentProductNames: string[];
  likedProductNames: string[];
}

export async function getFeedbackSummary(
  lojistaId: string,
  userId: string
): Promise<FeedbackSummary> {
  const generations = await fetchUserGenerations(lojistaId, userId, 15);

  const summary: FeedbackSummary = {
    totalLikes: 0,
    totalDislikes: 0,
    dislikesByCategory: {
      style: 0,
      technical: 0,
    },
    recentProductNames: [],
    likedProductNames: [],
  };

  generations.forEach((gen) => {
    if (gen.status === "liked") {
      summary.totalLikes++;
      if (gen.productName) {
        summary.likedProductNames.push(gen.productName);
      }
    } else if (gen.status === "disliked") {
      summary.totalDislikes++;
      if (gen.feedbackCategory === "style") {
        summary.dislikesByCategory.style++;
      } else if (gen.feedbackCategory === "technical") {
        summary.dislikesByCategory.technical++;
      }
    }

    if (gen.productName && !summary.recentProductNames.includes(gen.productName)) {
      summary.recentProductNames.push(gen.productName);
    }
  });

  return summary;
}


