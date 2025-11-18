import { getAdminDb } from "../firebaseAdmin";
import type { ProdutoDoc, ClienteDoc, ComposicaoDoc, LojaMetrics } from "./types";

const db = getAdminDb();

/**
 * Helper para obter referência da loja
 */
function lojaRef(lojistaId: string) {
  return db.collection("lojas").doc(lojistaId);
}

/**
 * Referência para favoritos de um cliente
 */
function clienteFavoritosRef(lojistaId: string, customerId: string) {
  return lojaRef(lojistaId)
    .collection("clientes")
    .doc(customerId)
    .collection("favoritos");
}

/**
 * Busca o perfil da loja
 */
export async function fetchLojaPerfil(lojistaId: string): Promise<{
  nome?: string | null;
  descricao?: string | null;
  logoUrl?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  whatsapp?: string | null;
  checkoutLink?: string | null;
  descontoRedesSociais?: number | null;
  descontoRedesSociaisExpiraEm?: string | null;
  appModel?: "modelo-1" | "modelo-2" | "modelo-3" | null;
  salesConfig?: {
    channel?: string;
    salesWhatsapp?: string | null;
    checkoutLink?: string | null;
  } | null;
} | null> {
  try {
    if (!lojistaId) {
      console.warn("[fetchLojaPerfil] lojistaId vazio");
      return null;
    }

    console.log("[fetchLojaPerfil] Buscando perfil para lojistaId:", lojistaId);
    
    // PRIORIDADE 1: Buscar em perfil/dados (onde salvamos os dados)
    const perfilDadosDoc = await lojaRef(lojistaId).collection("perfil").doc("dados").get();
    if (perfilDadosDoc.exists) {
      const data = perfilDadosDoc.data();
      console.log("[fetchLojaPerfil] Perfil encontrado em perfil/dados:", data?.nome || "sem nome");
      console.log("[fetchLojaPerfil] Dados completos:", JSON.stringify(data, null, 2));
      return {
        nome: data?.nome || null,
        descricao: data?.descricao || null,
        logoUrl: data?.logoUrl || null,
        instagram: data?.instagram || null,
        facebook: data?.facebook || null,
        tiktok: data?.tiktok || null,
        whatsapp: data?.whatsapp || null,
        checkoutLink: data?.checkoutLink || null,
        descontoRedesSociais: data?.descontoRedesSociais || null,
        appModel: data?.appModel || "modelo-1",
        descontoRedesSociaisExpiraEm: data?.descontoRedesSociaisExpiraEm || null,
        salesConfig: data?.salesConfig || null,
      };
    }

    // PRIORIDADE 2: Tentar buscar dados diretamente do documento da loja
    const lojaDoc = await lojaRef(lojistaId).get();
    if (lojaDoc.exists) {
      const lojaData = lojaDoc.data();
      if (lojaData?.nome || lojaData?.descricao) {
        console.log("[fetchLojaPerfil] Perfil encontrado no documento da loja:", lojaData?.nome || "sem nome");
        return {
          nome: lojaData?.nome || null,
          descricao: lojaData?.descricao || null,
          logoUrl: lojaData?.logoUrl || null,
          instagram: lojaData?.instagram || null,
          facebook: lojaData?.facebook || null,
          tiktok: lojaData?.tiktok || null,
          whatsapp: lojaData?.whatsapp || null,
          checkoutLink: lojaData?.checkoutLink || null,
          descontoRedesSociais: lojaData?.descontoRedesSociais || null,
          appModel: lojaData?.appModel || "modelo-1",
          salesConfig: lojaData?.salesConfig || null,
        };
      }
    }

    // PRIORIDADE 3: Tentar buscar em perfil/publico
    const perfilPublicoDoc = await lojaRef(lojistaId).collection("perfil").doc("publico").get();
    if (perfilPublicoDoc.exists) {
      const data = perfilPublicoDoc.data();
      console.log("[fetchLojaPerfil] Perfil encontrado em perfil/publico:", data?.nome || "sem nome");
      return {
        nome: data?.nome || null,
        descricao: data?.descricao || null,
        logoUrl: data?.logoUrl || null,
        instagram: data?.instagram || null,
        facebook: data?.facebook || null,
        tiktok: data?.tiktok || null,
        whatsapp: data?.whatsapp || null,
        checkoutLink: data?.checkoutLink || null,
        descontoRedesSociais: data?.descontoRedesSociais || null,
        appModel: data?.appModel || "modelo-1",
        salesConfig: data?.salesConfig || null,
      };
    }

    console.warn("[fetchLojaPerfil] Perfil não encontrado em nenhum lugar para lojistaId:", lojistaId);
    return null;
  } catch (error) {
    console.error("[fetchLojaPerfil] Erro ao buscar perfil:", error);
    return null;
  }
}

/**
 * Atualiza o perfil da loja
 */
export async function updateLojaPerfil(
  lojistaId: string,
  updateData: {
    nome?: string;
    descricao?: string;
    logoUrl?: string | null;
    logoStoragePath?: string | null;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    descontoRedesSociais?: number | null;
    descontoRedesSociaisExpiraEm?: string | null;
    appModel?: "modelo-1" | "modelo-2" | "modelo-3";
    salesConfig?: {
      channel?: string;
      salesWhatsapp?: string | null;
      checkoutLink?: string | null;
    };
  }
): Promise<void> {
  try {
    if (!lojistaId) {
      throw new Error("lojistaId é obrigatório");
    }

    console.log("[updateLojaPerfil] Atualizando perfil para lojistaId:", lojistaId);
    console.log("[updateLojaPerfil] Dados recebidos:", JSON.stringify(updateData, null, 2));

    // Preparar dados para merge (remover undefined)
    const cleanData: any = {};
    
    if (updateData.nome !== undefined) cleanData.nome = updateData.nome;
    if (updateData.descricao !== undefined) cleanData.descricao = updateData.descricao;
    if (updateData.logoUrl !== undefined) {
      cleanData.logoUrl = updateData.logoUrl;
      if (updateData.logoStoragePath !== undefined) {
        cleanData.logoStoragePath = updateData.logoStoragePath;
      }
    }
    if (updateData.instagram !== undefined) cleanData.instagram = updateData.instagram;
    if (updateData.facebook !== undefined) cleanData.facebook = updateData.facebook;
    if (updateData.tiktok !== undefined) cleanData.tiktok = updateData.tiktok;
    if (updateData.descontoRedesSociais !== undefined) cleanData.descontoRedesSociais = updateData.descontoRedesSociais;
    if (updateData.descontoRedesSociaisExpiraEm !== undefined) cleanData.descontoRedesSociaisExpiraEm = updateData.descontoRedesSociaisExpiraEm;
    
    // SalesConfig precisa ser salvo como objeto completo
    if (updateData.salesConfig !== undefined) {
      cleanData.salesConfig = {
        channel: updateData.salesConfig.channel || "whatsapp",
        salesWhatsapp: updateData.salesConfig.salesWhatsapp || null,
        checkoutLink: updateData.salesConfig.checkoutLink || null,
        whatsappMessageTemplate: updateData.salesConfig.whatsappMessageTemplate || null,
      };
    }

    console.log("[updateLojaPerfil] Dados limpos para salvar:", JSON.stringify(cleanData, null, 2));

    const docRef = lojaRef(lojistaId).collection("perfil").doc("dados");
    await docRef.set(cleanData, { merge: true });

    // Verificar se foi salvo corretamente
    const savedDoc = await docRef.get();
    const savedData = savedDoc.data();
    console.log("[updateLojaPerfil] Dados salvos no Firestore:", JSON.stringify(savedData, null, 2));
    
    console.log("[updateLojaPerfil] ✅ Perfil atualizado com sucesso");
  } catch (error) {
    console.error("[updateLojaPerfil] Erro:", error);
    throw error;
  }
}

/**
 * Registra um favorito de look criativo para um cliente
 */
export async function registerFavoriteLook(params: {
  lojistaId: string;
  customerId: string;
  customerName?: string | null;
  compositionId?: string | null;
  jobId?: string | null;
  imagemUrl?: string | null;
  productName?: string | null;
  productPrice?: number | null;
}) {
  const {
    lojistaId,
    customerId,
    customerName,
    compositionId,
    jobId,
    imagemUrl,
    productName,
    productPrice,
  } = params;

  if (!lojistaId || !customerId) {
    throw new Error("lojistaId e customerId são obrigatórios para favoritos");
  }

  const ref = clienteFavoritosRef(lojistaId, customerId);
  await ref.add({
    lojistaId,
    customerId,
    customerName: customerName ?? null,
    compositionId: compositionId ?? null,
    jobId: jobId ?? null,
    imagemUrl: imagemUrl ?? null,
    productName: productName ?? null,
    productPrice: typeof productPrice === "number" ? productPrice : null,
    lookType: "criativo",
    action: "like", // Garantir que o campo action está presente
    tipo: "like", // Compatibilidade com código antigo
    votedType: "like", // Compatibilidade adicional
    createdAt: new Date(),
  });
}

/**
 * Busca os últimos 10 favoritos de um cliente
 */
export async function fetchFavoriteLooks(params: {
  lojistaId: string;
  customerId: string;
}) {
  const { lojistaId, customerId } = params;
  if (!lojistaId || !customerId) return [];

  try {
    // Tentar buscar com orderBy primeiro
    let snapshot;
    try {
      snapshot = await clienteFavoritosRef(lojistaId, customerId)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
    } catch (orderByError: any) {
      // Se falhar por falta de índice, buscar todos e ordenar em memória
      if (orderByError?.code === "failed-precondition") {
        console.warn("[fetchFavoriteLooks] Índice não encontrado, buscando todos e ordenando em memória");
        const allSnapshot = await clienteFavoritosRef(lojistaId, customerId)
          .limit(50) // Buscar mais para garantir que temos os últimos
          .get();
        
        const allDocs: any[] = [];
        allSnapshot.forEach((doc) => {
          const data = doc.data();
          const createdAt = data?.createdAt?.toDate?.() || new Date(data?.createdAt || 0);
          allDocs.push({ id: doc.id, data, createdAt });
        });
        
        // Ordenar por data em memória
        allDocs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        // Pegar os 10 mais recentes
        snapshot = {
          forEach: (callback: any) => {
            allDocs.slice(0, 10).forEach((item) => {
              callback({ id: item.id, data: () => item.data });
            });
          },
          size: Math.min(allDocs.length, 10),
          empty: allDocs.length === 0,
        } as any;
      } else {
        throw orderByError;
      }
    }

    const results: any[] = [];
    snapshot.forEach((doc: any) => {
      const data = typeof doc.data === "function" ? doc.data() : doc.data;
      // Filtrar apenas likes e garantir que tem imagem
      const isLike = data?.action === "like" || data?.tipo === "like" || data?.votedType === "like" || (!data?.action && !data?.tipo && !data?.votedType);
      const hasImage = data?.imagemUrl && data.imagemUrl.trim() !== "";
      
      if (isLike && hasImage) {
        results.push({ id: doc.id, ...data });
      }
    });

    // Garantir ordenação por data (mais recente primeiro)
    results.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });

    // Limitar a 10 mais recentes
    const limitedResults = results.slice(0, 10);

    console.log("[fetchFavoriteLooks] ✅ Favoritos encontrados:", limitedResults.length, "de", results.length, "likes totais");
    return limitedResults;
  } catch (error) {
    console.error("[fetchFavoriteLooks] Erro:", error);
    return [];
  }
}

/**
 * Busca produtos da loja
 */
export async function fetchProdutos(lojistaId: string): Promise<ProdutoDoc[]> {
  try {
    if (!lojistaId) return [];

    const snapshot = await lojaRef(lojistaId).collection("produtos").get();

    const produtos: ProdutoDoc[] = [];
    
    // Função auxiliar para converter Timestamps do Firestore
    const convertTimestamp = (ts: any): Date => {
      if (!ts) return new Date();
      if (ts.toDate && typeof ts.toDate === "function") return ts.toDate();
      if (ts instanceof Date) return ts;
      if (typeof ts === "string" || typeof ts === "number") return new Date(ts);
      return new Date();
    };
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      produtos.push({
        id: doc.id,
        nome: data?.nome || "",
        preco: typeof data?.preco === "number" ? data.preco : 0,
        imagemUrl: data?.imagemUrl || "",
        categoria: data?.categoria || "",
        tamanhos: Array.isArray(data?.tamanhos) ? data.tamanhos : [],
        cores: Array.isArray(data?.cores) ? data.cores : [],
        medidas: data?.medidas || "",
        obs: data?.obs || data?.observacoes || "",
        estoque: typeof data?.estoque === "number" ? data.estoque : undefined,
        tags: Array.isArray(data?.tags) ? data.tags : [],
        createdAt: convertTimestamp(data?.createdAt),
        updatedAt: convertTimestamp(data?.updatedAt),
        arquivado: data?.arquivado === true,
        // Sincronização de E-commerce
        ecommerceSync: data?.ecommerceSync
          ? {
              platform: data.ecommerceSync.platform || "other",
              productId: data.ecommerceSync.productId,
              variantId: data.ecommerceSync.variantId,
              lastSyncedAt: data.ecommerceSync.lastSyncedAt
                ? convertTimestamp(data.ecommerceSync.lastSyncedAt)
                : undefined,
              autoSync: data.ecommerceSync.autoSync === true,
              syncPrice: data.ecommerceSync.syncPrice === true,
              syncStock: data.ecommerceSync.syncStock === true,
              syncVariations: data.ecommerceSync.syncVariations === true,
            }
          : undefined,
        // Métricas de Qualidade
        qualityMetrics: data?.qualityMetrics
          ? {
              compatibilityScore: typeof data.qualityMetrics.compatibilityScore === "number"
                ? data.qualityMetrics.compatibilityScore
                : undefined,
              conversionRate: typeof data.qualityMetrics.conversionRate === "number"
                ? data.qualityMetrics.conversionRate
                : undefined,
              complaintRate: typeof data.qualityMetrics.complaintRate === "number"
                ? data.qualityMetrics.complaintRate
                : undefined,
              lastCalculatedAt: data.qualityMetrics.lastCalculatedAt
                ? convertTimestamp(data.qualityMetrics.lastCalculatedAt)
                : undefined,
            }
          : undefined,
      });
    });

    return produtos;
  } catch (error) {
    console.error("[fetchProdutos] Erro:", error);
    return [];
  }
}

/**
 * Cria um novo produto
 */
export async function createProduto(
  lojistaId: string,
  produtoData: {
    nome: string;
    categoria: string;
    preco: number;
    imagemUrl?: string;
    cores?: string[];
    tamanhos?: string[];
    estoque?: number;
    tags?: string[];
    observacoes?: string;
    medidas?: string;
  }
): Promise<string> {
  try {
    if (!lojistaId) {
      throw new Error("lojistaId é obrigatório");
    }

    const newProduto: any = {
      nome: produtoData.nome,
      categoria: produtoData.categoria,
      preco: produtoData.preco,
      imagemUrl: produtoData.imagemUrl || "",
      cores: produtoData.cores || [],
      tamanhos: produtoData.tamanhos || [],
      tags: produtoData.tags || [],
      medidas: produtoData.medidas || "",
      obs: produtoData.observacoes || "", // Firestore usa 'obs', não 'observacoes'
      createdAt: new Date(),
      updatedAt: new Date(),
      arquivado: false,
    };

    // Só adiciona estoque se for um número válido (não undefined/null)
    if (produtoData.estoque !== undefined && produtoData.estoque !== null) {
      newProduto.estoque = produtoData.estoque;
    }

    const docRef = await lojaRef(lojistaId).collection("produtos").add(newProduto);
    return docRef.id;
  } catch (error) {
    console.error("[createProduto] Erro:", error);
    throw error;
  }
}

/**
 * Cria múltiplos produtos em lote
 */
export async function createProdutosEmLote(
  lojistaId: string,
  produtosData: Array<{
    nome: string;
    categoria: string;
    preco?: number;
    imagemUrl?: string;
    cores?: string[];
    tamanhos?: string[];
    estoque?: number;
    tags?: string[];
    observacoes?: string;
    medidas?: string;
  }>
): Promise<{
  created: string[];
  errors: Array<{ index: number; message: string }>;
}> {
  const created: string[] = [];
  const errors: Array<{ index: number; message: string }> = [];

  if (!lojistaId) {
    throw new Error("lojistaId é obrigatório");
  }

  const batch = db.batch();
  const produtosRef = lojaRef(lojistaId).collection("produtos");

  produtosData.forEach((produtoData, index) => {
    try {
      const newProduto = {
        ...produtoData,
        preco: produtoData.preco ?? 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        arquivado: false,
      };

      const docRef = produtosRef.doc();
      batch.set(docRef, newProduto);
      created.push(docRef.id);
    } catch (error: any) {
      errors.push({
        index,
        message: error.message || "Erro ao criar produto",
      });
    }
  });

  try {
    await batch.commit();
  } catch (error: any) {
    console.error("[createProdutosEmLote] Erro ao commitar batch:", error);
    throw error;
  }

  return { created, errors };
}

/**
 * Atualiza um produto
 */
export async function updateProduto(
  lojistaId: string,
  productId: string,
  updateData: {
    nome?: string;
    categoria?: string;
    preco?: number;
    imagemUrl?: string;
    cores?: string[];
    tamanhos?: string[];
    estoque?: number;
    tags?: string[];
    observacoes?: string;
    medidas?: string;
    arquivado?: boolean;
  }
): Promise<void> {
  try {
    if (!lojistaId || !productId) {
      throw new Error("lojistaId e productId são obrigatórios");
    }

    console.log("[updateProduto] Iniciando atualização:", {
      lojistaId,
      productId,
      updateData,
    });

    const update: any = {
      updatedAt: new Date(),
    };

    // Adicionar apenas campos definidos
    if (updateData.nome !== undefined) update.nome = updateData.nome;
    if (updateData.categoria !== undefined) update.categoria = updateData.categoria;
    if (updateData.preco !== undefined) update.preco = updateData.preco;
    if (updateData.imagemUrl !== undefined) update.imagemUrl = updateData.imagemUrl;
    if (updateData.medidas !== undefined) update.medidas = updateData.medidas;
    
    // Arrays - sempre incluir, mesmo se vazios
    if (updateData.cores !== undefined) update.cores = updateData.cores;
    if (updateData.tamanhos !== undefined) update.tamanhos = updateData.tamanhos;
    if (updateData.tags !== undefined) update.tags = updateData.tags;
    
    // Estoque - só incluir se for número válido
    if (updateData.estoque !== undefined && updateData.estoque !== null) {
      update.estoque = updateData.estoque;
    }
    
    // Mapear observacoes para obs (Firestore usa 'obs', não 'observacoes')
    if (updateData.observacoes !== undefined) {
      update.obs = updateData.observacoes;
    }

    console.log("[updateProduto] Dados finais para atualizar:", update);

    await lojaRef(lojistaId).collection("produtos").doc(productId).update(update);
    
    console.log("[updateProduto] Produto atualizado com sucesso");
  } catch (error) {
    console.error("[updateProduto] Erro:", error);
    throw error;
  }
}

/**
 * Arquivar um produto
 */
export async function archiveProduto(lojistaId: string, productId: string): Promise<void> {
  try {
    if (!lojistaId || !productId) {
      throw new Error("lojistaId e productId são obrigatórios");
    }

    await lojaRef(lojistaId).collection("produtos").doc(productId).update({
      arquivado: true,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("[archiveProduto] Erro:", error);
    throw error;
  }
}

/**
 * Busca clientes da loja
 */
export async function fetchClientes(
  lojistaId: string,
  limit: number = 100,
  includeArchived: boolean = false
): Promise<ClienteDoc[]> {
  try {
    if (!lojistaId) {
      console.warn("[fetchClientes] lojistaId não fornecido");
      return [];
    }

    console.log("[fetchClientes] Buscando clientes:", { lojistaId, limit, includeArchived });

    let snapshot;
    
    // Tentar buscar com orderBy primeiro, mas ter fallback se falhar
    try {
      if (includeArchived) {
        snapshot = await lojaRef(lojistaId)
          .collection("clientes")
          .orderBy("totalComposicoes", "desc")
          .limit(limit)
          .get();
      } else {
        // Nota: Firestore não permite orderBy após where com !=, então buscamos todos e filtramos
        snapshot = await lojaRef(lojistaId)
          .collection("clientes")
          .orderBy("totalComposicoes", "desc")
          .limit(limit * 2) // Buscar mais para compensar filtro
          .get();
      }
      console.log("[fetchClientes] Query com orderBy bem-sucedida, documentos encontrados:", snapshot.size);
    } catch (orderByError: any) {
      // Se falhar por falta de índice ou campo, buscar sem orderBy
      if (orderByError?.code === "failed-precondition" || orderByError?.code === "invalid-argument") {
        console.warn("[fetchClientes] Índice não encontrado ou campo inválido, buscando sem orderBy:", orderByError.message);
        snapshot = await lojaRef(lojistaId)
          .collection("clientes")
          .limit(limit * 3) // Buscar mais para garantir que temos todos
          .get();
        console.log("[fetchClientes] Query sem orderBy bem-sucedida, documentos encontrados:", snapshot.size);
      } else {
        console.error("[fetchClientes] Erro inesperado na query:", orderByError);
        throw orderByError;
      }
    }

    // Função auxiliar para converter Timestamps do Firestore
    const convertTimestamp = (ts: any): Date => {
      if (!ts) return new Date();
      if (ts.toDate && typeof ts.toDate === "function") return ts.toDate();
      if (ts instanceof Date) return ts;
      if (typeof ts === "string" || typeof ts === "number") return new Date(ts);
      return new Date();
    };

    const clientes: ClienteDoc[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // Filtrar arquivados se necessário
      if (!includeArchived && data?.arquivado === true) {
        return;
      }

      clientes.push({
        id: doc.id,
        nome: data?.nome || "",
        whatsapp: data?.whatsapp || "",
        email: data?.email || "",
        totalComposicoes: typeof data?.totalComposicoes === "number" ? data.totalComposicoes : 0,
        createdAt: convertTimestamp(data?.createdAt),
        updatedAt: convertTimestamp(data?.updatedAt),
        arquivado: data?.arquivado === true,
        // Segmentação Automática
        tags: Array.isArray(data?.tags) ? data.tags : undefined,
        segmentacao: data?.segmentacao
          ? {
              tipo: data.segmentacao.tipo,
              ultimaAtualizacao: data.segmentacao.ultimaAtualizacao
                ? convertTimestamp(data.segmentacao.ultimaAtualizacao)
                : undefined,
            }
          : undefined,
        // Histórico de Tentativas
        historicoTentativas: data?.historicoTentativas
          ? {
              produtosExperimentados: Array.isArray(data.historicoTentativas.produtosExperimentados)
                ? data.historicoTentativas.produtosExperimentados.map((prod: any) => ({
                    produtoId: prod.produtoId || "",
                    produtoNome: prod.produtoNome || "",
                    categoria: prod.categoria || "",
                    dataTentativa: convertTimestamp(prod.dataTentativa),
                    liked: prod.liked === true,
                    compartilhado: prod.compartilhado === true,
                    checkout: prod.checkout === true,
                  }))
                : [],
              ultimaAtualizacao: data.historicoTentativas.ultimaAtualizacao
                ? convertTimestamp(data.historicoTentativas.ultimaAtualizacao)
                : undefined,
            }
          : undefined,
      });
    });

    console.log("[fetchClientes] Clientes processados (antes de filtrar arquivados):", clientes.length);

    // Ordenar e limitar após filtrar
    // Ordenar por totalComposicoes (desc) e depois por createdAt (desc) para clientes novos aparecerem
    clientes.sort((a, b) => {
      if (b.totalComposicoes !== a.totalComposicoes) {
        return b.totalComposicoes - a.totalComposicoes;
      }
      // Se totalComposicoes for igual, ordenar por data de criação (mais recente primeiro)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const result = !includeArchived ? clientes.slice(0, limit) : clientes;
    console.log("[fetchClientes] ✅ Retornando clientes:", result.length);
    
    return result;
  } catch (error) {
    console.error("[fetchClientes] Erro:", error);
    return [];
  }
}

/**
 * Cria um novo cliente
 */
/**
 * Busca cliente por WhatsApp
 */
export async function fetchClienteByWhatsapp(
  lojistaId: string,
  whatsapp: string
): Promise<ClienteDoc | null> {
  try {
    if (!lojistaId || !whatsapp) return null;

    const cleanWhatsapp = whatsapp.replace(/\D/g, "");
    const snapshot = await lojaRef(lojistaId)
      .collection("clientes")
      .where("whatsapp", "==", cleanWhatsapp)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      nome: data?.nome || "",
      whatsapp: data?.whatsapp || "",
      email: data?.email || "",
      totalComposicoes: data?.totalComposicoes || 0,
      createdAt: data?.createdAt?.toDate?.() || new Date(),
      updatedAt: data?.updatedAt?.toDate?.() || new Date(),
      arquivado: data?.arquivado === true,
    };
  } catch (error) {
    console.error("[fetchClienteByWhatsapp] Erro:", error);
    return null;
  }
}

export async function createCliente(
  lojistaId: string,
  clienteData: {
    nome: string;
    whatsapp?: string;
    email?: string;
    observacoes?: string;
    passwordHash?: string; // Hash da senha (já deve vir hasheado)
  }
): Promise<string> {
  try {
    if (!lojistaId) {
      throw new Error("lojistaId é obrigatório");
    }

    if (!clienteData.nome || clienteData.nome.trim().length === 0) {
      throw new Error("Nome é obrigatório");
    }

    // Verificar se cliente já existe pelo WhatsApp
    if (clienteData.whatsapp) {
      const existing = await fetchClienteByWhatsapp(lojistaId, clienteData.whatsapp);
      if (existing) {
        // Se cliente existe e tem senha sendo atualizada, atualizar senha
        if (clienteData.passwordHash) {
          const clienteRef = lojaRef(lojistaId).collection("clientes").doc(existing.id);
          await clienteRef.update({
            passwordHash: clienteData.passwordHash,
            updatedAt: new Date(),
          });
          console.log("[createCliente] Senha atualizada para cliente existente:", existing.id);
        }
        console.log("[createCliente] Cliente já existe, retornando ID existente:", existing.id);
        return existing.id;
      }
    }

    const newCliente: any = {
      nome: clienteData.nome.trim(),
      whatsapp: clienteData.whatsapp?.replace(/\D/g, "") || "",
      email: clienteData.email?.trim() || "",
      obs: clienteData.observacoes?.trim() || "",
      passwordHash: clienteData.passwordHash || null, // Senha hash (pode ser null se não tiver)
      totalComposicoes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      arquivado: false,
    };

    console.log("[createCliente] Criando cliente:", {
      lojistaId,
      nome: newCliente.nome,
      whatsapp: newCliente.whatsapp,
      temPasswordHash: !!newCliente.passwordHash,
    });

    const docRef = await lojaRef(lojistaId).collection("clientes").add(newCliente);
    console.log("[createCliente] ✅ Cliente criado com sucesso:", {
      clienteId: docRef.id,
      lojistaId,
      nome: newCliente.nome,
      whatsapp: newCliente.whatsapp,
    });
    return docRef.id;
  } catch (error) {
    console.error("[createCliente] Erro:", error);
    throw error;
  }
}

/**
 * Busca composições recentes da loja
 */
export async function fetchComposicoesRecentes(
  lojistaId: string,
  limit: number = 50
): Promise<ComposicaoDoc[]> {
  try {
    if (!lojistaId) return [];

    const composicoesRef = lojaRef(lojistaId).collection("composicoes");

    let snapshot;
    try {
      snapshot = await composicoesRef
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();
    } catch (error: any) {
      // Se falhar por falta de índice, buscar todas e ordenar em memória
      if (error?.code === "failed-precondition") {
        console.warn("[fetchComposicoesRecentes] Índice não encontrado, buscando todas e ordenando em memória");
        const allSnapshot = await composicoesRef.get();
        const allDocs: any[] = [];
        allSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data?.createdAt) {
            const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            allDocs.push({ id: doc.id, data, createdAt });
          }
        });
        allDocs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        snapshot = {
          forEach: (callback: any) => {
            allDocs.slice(0, limit).forEach((item) => {
              callback({
                id: item.id,
                data: () => item.data,
                exists: true,
              });
            });
          },
        } as any;
      } else {
        throw error;
      }
    }

    const composicoes: ComposicaoDoc[] = [];
    snapshot.forEach((doc: any) => {
      const data = typeof doc.data === "function" ? doc.data() : doc.data;
      if (!data) return;

      const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date();

      composicoes.push({
        id: doc.id,
        customer: data.customerId
          ? {
              id: data.customerId,
              nome: data.customerName || "Cliente",
            }
          : null,
        products: Array.isArray(data.looks) && data.looks.length > 0
          ? data.looks.map((look: any) => ({
              id: data.primaryProductId || "",
              nome: look.produtoNome || data.primaryProductName || "Produto",
            }))
          : data.primaryProductId
          ? [
              {
                id: data.primaryProductId,
                nome: data.primaryProductName || "Produto",
              },
            ]
          : [],
        createdAt,
        liked: data.curtido === true || data.liked === true,
        shares: typeof data.shares === "number" ? data.shares : 0,
        isAnonymous: !data.customerId,
        metrics: data.metrics || null,
        totalCostBRL: typeof data.totalCostBRL === "number" ? data.totalCostBRL : undefined,
        processingTime: typeof data.processingTime === "number" ? data.processingTime : undefined,
      });
    });

    return composicoes;
  } catch (error) {
    console.error("[fetchComposicoesRecentes] Erro:", error);
    return [];
  }
}

/**
 * Busca métricas da loja
 */
export async function fetchLojaMetrics(lojistaId: string): Promise<LojaMetrics | null> {
  try {
    if (!lojistaId) return null;

    const metricsDoc = await lojaRef(lojistaId).collection("metrics").doc("dados").get();

    if (!metricsDoc.exists) {
      return null;
    }

    const data = metricsDoc.data();
    return {
      totalComposicoes: typeof data?.totalComposicoes === "number" ? data.totalComposicoes : 0,
      likedTotal: typeof data?.likedTotal === "number" ? data.likedTotal : 0,
      sharesTotal: typeof data?.sharesTotal === "number" ? data.sharesTotal : 0,
      checkoutTotal: typeof data?.checkoutTotal === "number" ? data.checkoutTotal : 0,
      anonymousTotal: typeof data?.anonymousTotal === "number" ? data.anonymousTotal : 0,
      lastAction: data?.lastAction || null,
      atualizadoEm: data?.atualizadoEm?.toDate?.() || new Date(),
    };
  } catch (error) {
    console.error("[fetchLojaMetrics] Erro:", error);
    return null;
  }
}

/**
 * Calcula ROI e custo por Try-On
 */
export async function calculateROIMetrics(lojistaId: string): Promise<{
  totalCostUSD: number;
  totalCostBRL: number;
  totalTryOns: number;
  costPerTryOn: number;
  estimatedRevenue: number; // Receita estimada baseada em checkouts
  roi: number; // ROI em porcentagem
  roiMultiplier: number; // Multiplicador de ROI (receita/custo)
}> {
  try {
    const { getTotalAPICost } = await import("../ai-services/cost-logger");
    const totalCostUSD = await getTotalAPICost(lojistaId, "USD");
    // Tentar buscar BRL diretamente, se não existir, converter de USD
    let totalCostBRL = await getTotalAPICost(lojistaId, "BRL");
    if (totalCostBRL === 0 && totalCostUSD > 0) {
      // Converter USD para BRL (taxa aproximada de 5.0)
      const usdToBrl = 5.0;
      totalCostBRL = totalCostUSD * usdToBrl;
    }
    
    // Buscar total de composições (Try-Ons)
    const composicoes = await fetchComposicoesRecentes(lojistaId, 10000); // Buscar todas
    const totalTryOns = composicoes.length;
    
    // Calcular custo médio por Try-On
    const costPerTryOn = totalTryOns > 0 ? totalCostBRL / totalTryOns : 0;
    
    // Estimar receita baseada em checkouts (assumindo valor médio de R$ 150 por checkout)
    const metrics = await fetchLojaMetrics(lojistaId);
    const checkoutCount = metrics?.checkoutTotal || 0;
    const averageOrderValue = 150; // Valor médio por pedido em BRL
    const estimatedRevenue = checkoutCount * averageOrderValue;
    
    // Calcular ROI
    const roi = totalCostBRL > 0 ? ((estimatedRevenue - totalCostBRL) / totalCostBRL) * 100 : 0;
    const roiMultiplier = totalCostBRL > 0 ? estimatedRevenue / totalCostBRL : 0;
    
    return {
      totalCostUSD,
      totalCostBRL,
      totalTryOns,
      costPerTryOn,
      estimatedRevenue,
      roi,
      roiMultiplier,
    };
  } catch (error) {
    console.error("[calculateROIMetrics] Erro:", error);
    return {
      totalCostUSD: 0,
      totalCostBRL: 0,
      totalTryOns: 0,
      costPerTryOn: 0,
      estimatedRevenue: 0,
      roi: 0,
      roiMultiplier: 0,
    };
  }
}

/**
 * Calcula funil de conversão
 */
export async function calculateConversionFunnel(lojistaId: string): Promise<{
  visitantes: number;
  tryOns: number;
  favoritos: number;
  compartilhamentos: number;
  compras: number;
  conversionRates: {
    tryOnToFavorito: number;
    favoritoToCompartilhamento: number;
    compartilhamentoToCompra: number;
    tryOnToCompra: number;
  };
}> {
  try {
    const metrics = await fetchLojaMetrics(lojistaId);
    const composicoes = await fetchComposicoesRecentes(lojistaId, 10000);
    
    // Contar visitantes únicos (clientes que geraram composições)
    const uniqueCustomers = new Set(
      composicoes
        .map((c) => c.customer?.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    );
    const visitantes = uniqueCustomers.size;
    
    const tryOns = composicoes.length;
    const favoritos = metrics?.likedTotal || 0;
    const compartilhamentos = metrics?.sharesTotal || 0;
    const compras = metrics?.checkoutTotal || 0;
    
    // Calcular taxas de conversão
    const tryOnToFavorito = tryOns > 0 ? (favoritos / tryOns) * 100 : 0;
    const favoritoToCompartilhamento = favoritos > 0 ? (compartilhamentos / favoritos) * 100 : 0;
    const compartilhamentoToCompra = compartilhamentos > 0 ? (compras / compartilhamentos) * 100 : 0;
    const tryOnToCompra = tryOns > 0 ? (compras / tryOns) * 100 : 0;
    
    return {
      visitantes,
      tryOns,
      favoritos,
      compartilhamentos,
      compras,
      conversionRates: {
        tryOnToFavorito,
        favoritoToCompartilhamento,
        compartilhamentoToCompra,
        tryOnToCompra,
      },
    };
  } catch (error) {
    console.error("[calculateConversionFunnel] Erro:", error);
    return {
      visitantes: 0,
      tryOns: 0,
      favoritos: 0,
      compartilhamentos: 0,
      compras: 0,
      conversionRates: {
        tryOnToFavorito: 0,
        favoritoToCompartilhamento: 0,
        compartilhamentoToCompra: 0,
        tryOnToCompra: 0,
      },
    };
  }
}

/**
 * Busca produtos com estoque baixo que são mais experimentados
 */
export async function getLowStockAlerts(lojistaId: string, lowStockThreshold: number = 10): Promise<Array<{
  produtoId: string;
  produtoNome: string;
  estoqueAtual: number;
  experimentacoes: number;
  prioridade: "alta" | "media" | "baixa";
}>> {
  try {
    const produtos = await fetchProdutos(lojistaId);
    const composicoes = await fetchComposicoesRecentes(lojistaId, 10000);
    
    // Contar experimentações por produto
    const experimentacoesPorProduto: Record<string, number> = {};
    composicoes.forEach((comp) => {
      comp.products.forEach((produto) => {
        if (produto.id) {
          experimentacoesPorProduto[produto.id] = 
            (experimentacoesPorProduto[produto.id] || 0) + 1;
        }
      });
    });
    
    // Filtrar produtos com estoque baixo e ordenar por experimentações
    const alerts = produtos
      .filter((produto) => {
        const estoque = produto.estoque ?? Infinity;
        return estoque <= lowStockThreshold && estoque >= 0;
      })
      .map((produto) => {
        const experimentacoes = experimentacoesPorProduto[produto.id] || 0;
        const estoque = produto.estoque ?? 0;
        
        // Determinar prioridade baseada em experimentações e estoque
        let prioridade: "alta" | "media" | "baixa" = "baixa";
        if (experimentacoes > 20 && estoque <= 5) {
          prioridade = "alta";
        } else if (experimentacoes > 10 && estoque <= 7) {
          prioridade = "media";
        }
        
        return {
          produtoId: produto.id,
          produtoNome: produto.nome,
          estoqueAtual: estoque,
          experimentacoes,
          prioridade,
        };
      })
      .sort((a, b) => {
        // Ordenar por prioridade e depois por experimentações
        const priorityOrder = { alta: 3, media: 2, baixa: 1 };
        if (priorityOrder[a.prioridade] !== priorityOrder[b.prioridade]) {
          return priorityOrder[b.prioridade] - priorityOrder[a.prioridade];
        }
        return b.experimentacoes - a.experimentacoes;
      });
    
    return alerts;
  } catch (error) {
    console.error("[getLowStockAlerts] Erro:", error);
    return [];
  }
}








