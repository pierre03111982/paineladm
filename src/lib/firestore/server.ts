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
 * Busca produtos da loja
 */
export async function fetchProdutos(lojistaId: string): Promise<ProdutoDoc[]> {
  try {
    if (!lojistaId) return [];

    const snapshot = await lojaRef(lojistaId).collection("produtos").get();

    const produtos: ProdutoDoc[] = [];
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
        createdAt: data?.createdAt?.toDate?.() || new Date(),
        updatedAt: data?.updatedAt?.toDate?.() || new Date(),
        arquivado: data?.arquivado === true,
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
    if (!lojistaId) return [];

    let snapshot;
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

    const clientes: ClienteDoc[] = [];
    
    // Processar documentos de forma assíncrona
    // Se snapshot tiver docs, usar diretamente, senão usar forEach
    const docs = (snapshot as any).docs || [];
    
    if (docs.length > 0) {
      // Usar for...of para permitir await
      for (const doc of docs) {
      const data = doc.data();
      
      // Filtrar arquivados se necessário
      if (!includeArchived && data?.arquivado === true) {
        continue;
      }

      // Contar composições reais do cliente se totalComposicoes não estiver atualizado
      let totalComposicoes = typeof data?.totalComposicoes === "number" ? data.totalComposicoes : 0;
      
      // Se totalComposicoes for 0 ou não existir, contar composições reais
      if (totalComposicoes === 0 || !data?.totalComposicoes) {
        try {
          const composicoesSnapshot = await lojaRef(lojistaId)
            .collection("composicoes")
            .where("customerId", "==", doc.id)
            .get();
          totalComposicoes = composicoesSnapshot.size;
          
          // Atualizar o campo no Firestore se necessário
          if (totalComposicoes > 0 && (!data?.totalComposicoes || data.totalComposicoes === 0)) {
            await lojaRef(lojistaId).collection("clientes").doc(doc.id).update({
              totalComposicoes,
              updatedAt: new Date(),
            });
          }
        } catch (error) {
          // Ignorar erros de contagem
          console.warn(`[fetchClientes] Erro ao contar composições para ${doc.id}:`, error);
        }
      }

      clientes.push({
        id: doc.id,
        nome: data?.nome || "",
        whatsapp: data?.whatsapp || "",
        totalComposicoes,
        createdAt: data?.createdAt?.toDate?.() || new Date(),
        updatedAt: data?.updatedAt?.toDate?.() || new Date(),
        arquivado: data?.arquivado === true,
        referidoPor: data?.referidoPor || null,
      });
      }
    } else {
      // Fallback: usar forEach se não tiver docs (compatibilidade)
      snapshot.forEach((doc: any) => {
        const data = typeof doc.data === "function" ? doc.data() : doc.data;
        
        // Filtrar arquivados se necessário
        if (!includeArchived && data?.arquivado === true) {
          return;
        }

        clientes.push({
          id: doc.id,
          nome: data?.nome || "",
          whatsapp: data?.whatsapp || "",
          totalComposicoes: typeof data?.totalComposicoes === "number" ? data.totalComposicoes : 0,
          createdAt: data?.createdAt?.toDate?.() || new Date(),
          updatedAt: data?.updatedAt?.toDate?.() || new Date(),
          arquivado: data?.arquivado === true,
          referidoPor: data?.referidoPor || null,
        });
      });
    }

    // Ordenar e limitar após filtrar
    if (!includeArchived) {
      clientes.sort((a, b) => b.totalComposicoes - a.totalComposicoes);
      return clientes.slice(0, limit);
    }

    return clientes;
  } catch (error) {
    console.error("[fetchClientes] Erro:", error);
    return [];
  }
}

/**
 * Cria um novo cliente
 */
export async function createCliente(
  lojistaId: string,
  clienteData: {
    nome: string;
    whatsapp?: string;
    email?: string;
    observacoes?: string;
    referidoPor?: string | null; // ID do cliente que compartilhou o link
  }
): Promise<string> {
  try {
    if (!lojistaId) {
      throw new Error("lojistaId é obrigatório");
    }

    if (!clienteData.nome || clienteData.nome.trim().length === 0) {
      throw new Error("Nome é obrigatório");
    }

    const newCliente: any = {
      nome: clienteData.nome.trim(),
      whatsapp: clienteData.whatsapp?.trim() || "",
      email: clienteData.email?.trim() || "",
      obs: clienteData.observacoes?.trim() || "",
      totalComposicoes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      arquivado: false,
    };

    // Adicionar referidoPor se fornecido
    if (clienteData.referidoPor) {
      newCliente.referidoPor = clienteData.referidoPor;
    }

    const docRef = await lojaRef(lojistaId).collection("clientes").add(newCliente);
    console.log("[createCliente] Cliente criado com sucesso:", docRef.id, clienteData.referidoPor ? `referido por ${clienteData.referidoPor}` : "");
    return docRef.id;
  } catch (error) {
    console.error("[createCliente] Erro:", error);
    throw error;
  }
}

/**
 * Busca clientes referidos por um cliente específico
 */
export async function fetchClientesReferidos(
  lojistaId: string,
  clienteId: string
): Promise<ClienteDoc[]> {
  try {
    if (!lojistaId || !clienteId) return [];

    let snapshot;
    try {
      snapshot = await lojaRef(lojistaId)
        .collection("clientes")
        .where("referidoPor", "==", clienteId)
        .orderBy("createdAt", "desc")
        .get();
    } catch (error: any) {
      // Se falhar por falta de índice, buscar todos e filtrar em memória
      if (error?.code === "failed-precondition") {
        console.warn("[fetchClientesReferidos] Índice não encontrado, buscando todos e filtrando em memória");
        const allSnapshot = await lojaRef(lojistaId)
          .collection("clientes")
          .get();
        const allDocs: any[] = [];
        allSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data?.referidoPor === clienteId) {
            allDocs.push({ id: doc.id, data });
          }
        });
        // Ordenar por data em memória
        allDocs.sort((a, b) => {
          const dateA = a.data.createdAt?.toDate?.() || new Date(a.data.createdAt || 0);
          const dateB = b.data.createdAt?.toDate?.() || new Date(b.data.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });
        snapshot = {
          forEach: (callback: any) => {
            allDocs.forEach((item) => {
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

    const clientes: ClienteDoc[] = [];
    snapshot.forEach((doc: any) => {
      const data = typeof doc.data === "function" ? doc.data() : doc.data;
      clientes.push({
        id: doc.id,
        nome: data.nome || "",
        whatsapp: data.whatsapp || "",
        totalComposicoes: typeof data.totalComposicoes === "number" ? data.totalComposicoes : 0,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || 0),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt || 0),
        arquivado: data.arquivado === true,
        referidoPor: data.referidoPor || null,
      });
    });

    return clientes;
  } catch (error) {
    console.error("[fetchClientesReferidos] Erro:", error);
    return [];
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








