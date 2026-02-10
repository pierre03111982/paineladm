import { getAdminDb } from "../firebaseAdmin";
import type { ProdutoDoc, ClienteDoc, ComposicaoDoc, LojaMetrics } from "./types";

/**
 * Helper para obter referência da loja
 * Usa lazy initialization para evitar erros se Firebase não estiver configurado
 */
function lojaRef(lojistaId: string) {
  const db = getAdminDb();
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
  app_icon_url?: string | null; // PHASE 17: Ícone do aplicativo PWA
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  whatsapp?: string | null;
  checkoutLink?: string | null;
  descontoRedesSociais?: number | null;
  descontoRedesSociaisExpiraEm?: string | null;
  appModel?: "modelo-1" | "modelo-2" | "modelo-3" | null;
  displayOrientation?: "horizontal" | "vertical" | null;
  salesConfig?: {
    channel?: string;
    salesWhatsapp?: string | null;
    checkoutLink?: string | null;
  } | null;
  planTier?: "micro" | "growth" | "enterprise" | string | null;
  planBillingStatus?: string | null;
  // FASE 1: Novos campos de subscription
  subscription?: {
    planId?: "start" | "pro" | "elite" | string | null;
    status?: "active" | "blocked" | "trial" | string | null;
    adSlotsLimit?: number;
    clientType?: "standard" | "test_unlimited" | string | null;
    startedAt?: Date | null;
    expiresAt?: Date | null;
  } | null;
  usageMetrics?: {
    totalGenerated?: number;
    creditsUsed?: number;
    creditsRemaining?: number;
    lastResetAt?: Date | null;
  } | null;
  // Debug fields
  _debugSource?: string;
  _rawAppModel?: any;
  settings?: {
    sidebarWallpaper?: string | null;
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
      return {
        nome: data?.nome || null,
        descricao: data?.descricao || null,
        logoUrl: data?.logoUrl || null,
        app_icon_url: data?.app_icon_url || null, // PHASE 17
        instagram: data?.instagram || null,
        facebook: data?.facebook || null,
        tiktok: data?.tiktok || null,
        whatsapp: data?.whatsapp || null,
        checkoutLink: data?.checkoutLink || null,
        descontoRedesSociais: data?.descontoRedesSociais || null,
        appModel: data?.appModel || data?.modeloApp || "modelo-1",
        displayOrientation: data?.displayOrientation || "horizontal",
        descontoRedesSociaisExpiraEm: data?.descontoRedesSociaisExpiraEm || null,
        salesConfig: data?.salesConfig || null,
        planTier: data?.financials?.plan_tier || data?.planTier || null,
        planBillingStatus: data?.financials?.billing_status || data?.planBillingStatus || null,
        subscription: data?.subscription || null,
        usageMetrics: data?.usageMetrics || null,
        settings: data?.settings || null,
        _debugSource: "perfil/dados",
        _rawAppModel: data?.appModel
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
          app_icon_url: lojaData?.app_icon_url || null, // PHASE 17
          instagram: lojaData?.instagram || null,
          facebook: lojaData?.facebook || null,
          tiktok: lojaData?.tiktok || null,
          whatsapp: lojaData?.whatsapp || null,
          checkoutLink: lojaData?.checkoutLink || null,
          descontoRedesSociais: lojaData?.descontoRedesSociais || null,
          appModel: lojaData?.appModel || lojaData?.modeloApp || "modelo-1",
          displayOrientation: lojaData?.displayOrientation || "horizontal",
        salesConfig: lojaData?.salesConfig || null,
        planTier: lojaData?.financials?.plan_tier || lojaData?.planTier || null,
        planBillingStatus: lojaData?.financials?.billing_status || lojaData?.planBillingStatus || null,
        subscription: lojaData?.subscription || null,
        usageMetrics: lojaData?.usageMetrics || null,
        settings: lojaData?.settings || null,
        _debugSource: "lojas/{id}",
        _rawAppModel: lojaData?.appModel
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
        app_icon_url: data?.app_icon_url || null, // PHASE 17
        instagram: data?.instagram || null,
        facebook: data?.facebook || null,
        tiktok: data?.tiktok || null,
        whatsapp: data?.whatsapp || null,
        checkoutLink: data?.checkoutLink || null,
        descontoRedesSociais: data?.descontoRedesSociais || null,
        appModel: data?.appModel || data?.modeloApp || "modelo-1",
        displayOrientation: data?.displayOrientation || "horizontal",
        salesConfig: data?.salesConfig || null,
        planTier: data?.financials?.plan_tier || data?.planTier || null,
        planBillingStatus: data?.financials?.billing_status || data?.planBillingStatus || null,
        subscription: data?.subscription || null,
        usageMetrics: data?.usageMetrics || null,
        settings: data?.settings || null,
        _debugSource: "perfil/publico",
        _rawAppModel: data?.appModel
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
    app_icon_url?: string | null; // PHASE 17: Ícone do aplicativo PWA
    app_icon_storage_path?: string | null; // PHASE 17: Caminho do ícone no storage
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    descontoRedesSociais?: number | null;
    descontoRedesSociaisExpiraEm?: string | null;
    appModel?: "modelo-1" | "modelo-2" | "modelo-3" | string;
    salesConfig?: {
      channel?: string;
      salesWhatsapp?: string | null;
      checkoutLink?: string | null;
      whatsappMessageTemplate?: string | null;
    };
    settings?: {
      sidebarWallpaper?: string | null;
    };
  }
): Promise<void> {
  try {
    if (!lojistaId) {
      throw new Error("lojistaId é obrigatório");
    }

    console.log("[updateLojaPerfil] Atualizando perfil para lojistaId:", lojistaId);

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
    // PHASE 17: App Icon URL
    if (updateData.app_icon_url !== undefined) {
      cleanData.app_icon_url = updateData.app_icon_url;
      if (updateData.app_icon_storage_path !== undefined) {
        cleanData.app_icon_storage_path = updateData.app_icon_storage_path;
      }
      console.log("[updateLojaPerfil] PHASE 25: Salvando app_icon_url:", updateData.app_icon_url ? (updateData.app_icon_url.length > 50 ? updateData.app_icon_url.substring(0, 50) + "..." : updateData.app_icon_url) : "null");
    }
    if (updateData.instagram !== undefined) cleanData.instagram = updateData.instagram;
    if (updateData.facebook !== undefined) cleanData.facebook = updateData.facebook;
    if (updateData.tiktok !== undefined) cleanData.tiktok = updateData.tiktok;
    if (updateData.descontoRedesSociais !== undefined) cleanData.descontoRedesSociais = updateData.descontoRedesSociais;
    if (updateData.descontoRedesSociaisExpiraEm !== undefined) cleanData.descontoRedesSociaisExpiraEm = updateData.descontoRedesSociaisExpiraEm;
    
    // Salvar appModel explicitamente se vier
    if (updateData.appModel !== undefined) {
        cleanData.appModel = updateData.appModel;
        console.log("[updateLojaPerfil] Salvando appModel:", updateData.appModel);
    }
    
    // SalesConfig precisa ser salvo como objeto completo
    if (updateData.salesConfig !== undefined) {
      cleanData.salesConfig = {
        channel: updateData.salesConfig.channel || "whatsapp",
        salesWhatsapp: updateData.salesConfig.salesWhatsapp || null,
        checkoutLink: updateData.salesConfig.checkoutLink || null,
        whatsappMessageTemplate: updateData.salesConfig.whatsappMessageTemplate || null,
      };
    }

    // Settings (incluindo sidebarWallpaper) - fazer merge com settings existentes
    if (updateData.settings !== undefined) {
      // Buscar settings existentes para fazer merge
      const perfilAtual = await fetchLojaPerfil(lojistaId);
      const settingsExistentes = perfilAtual?.settings || {};
      
      cleanData.settings = {
        ...settingsExistentes,
        ...(updateData.settings.sidebarWallpaper !== undefined && { sidebarWallpaper: updateData.settings.sidebarWallpaper }),
      };
    }

    const docRef = lojaRef(lojistaId).collection("perfil").doc("dados");
    await docRef.set(cleanData, { merge: true });
    
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

  console.log("[registerFavoriteLook] Iniciando registro de favorito:", {
    lojistaId,
    customerId,
    hasImagemUrl: !!imagemUrl,
    imagemUrl: imagemUrl?.substring(0, 100), // Log parcial da URL
    compositionId,
    jobId,
  });

  if (!lojistaId || !customerId) {
    const error = new Error("lojistaId e customerId são obrigatórios para favoritos");
    console.error("[registerFavoriteLook] Erro de validação:", error);
    throw error;
  }

  // Validar se imagemUrl está presente (obrigatório para favoritos)
  if (!imagemUrl || imagemUrl.trim() === "") {
    console.warn("[registerFavoriteLook] AVISO: imagemUrl vazio ou ausente. Favorito será salvo mesmo assim para contabilização.");
    // Não bloquear, mas avisar
  }

  try {
    const ref = clienteFavoritosRef(lojistaId, customerId);
    
    // Verificar se já existe um favorito com a mesma imagemUrl ou compositionId
    // Isso evita duplicatas quando o usuário atualiza a página e dá like novamente
    let existingFavorite = null;
    
    if (imagemUrl && imagemUrl.trim() !== "") {
      // Buscar por imagemUrl
      const byImageQuery = ref
        .where("imagemUrl", "==", imagemUrl)
        .where("action", "==", "like")
        .limit(1);
      
      const byImageSnapshot = await byImageQuery.get();
      if (!byImageSnapshot.empty) {
        existingFavorite = byImageSnapshot.docs[0];
        console.log("[registerFavoriteLook] Favorito já existe com mesma imagemUrl. ID:", existingFavorite.id);
      }
    }
    
    // Se não encontrou por imagemUrl e tem compositionId, buscar por compositionId
    if (!existingFavorite && compositionId) {
      const byCompositionQuery = ref
        .where("compositionId", "==", compositionId)
        .where("action", "==", "like")
        .limit(1);
      
      const byCompositionSnapshot = await byCompositionQuery.get();
      if (!byCompositionSnapshot.empty) {
        existingFavorite = byCompositionSnapshot.docs[0];
        console.log("[registerFavoriteLook] Favorito já existe com mesmo compositionId. ID:", existingFavorite.id);
      }
    }
    
    // Se já existe, atualizar a data de criação e retornar o ID existente
    if (existingFavorite) {
      await existingFavorite.ref.update({
        createdAt: new Date(), // Atualizar data para manter como mais recente
        updatedAt: new Date(),
      });
      console.log("[registerFavoriteLook] Favorito existente atualizado. ID:", existingFavorite.id);
      return existingFavorite.id;
    }
    
    // Se não existe, criar novo favorito
    const favoriteData = {
      lojistaId,
      customerId,
      customerName: customerName ?? null,
      compositionId: compositionId ?? null,
      jobId: jobId ?? null,
      imagemUrl: imagemUrl ?? null,
      productName: productName ?? null,
      productPrice: typeof productPrice === "number" ? productPrice : null,
      lookType: "criativo",
      action: "like",
      tipo: "like",
      votedType: "like",
      createdAt: new Date(),
    };
    
    console.log("[registerFavoriteLook] Dados do favorito a serem salvos:", {
      ...favoriteData,
      imagemUrl: favoriteData.imagemUrl?.substring(0, 100), // Log parcial
    });
    
    const docRef = await ref.add(favoriteData);
    
    console.log("[registerFavoriteLook] Favorito salvo com sucesso. ID:", docRef.id);
    
    return docRef.id;
  } catch (error: any) {
    console.error("[registerFavoriteLook] Erro ao salvar favorito:", error);
    console.error("[registerFavoriteLook] Stack:", error?.stack);
    throw error;
  }
}

/**
 * Busca os últimos 10 favoritos REAIS de um cliente
 * CORREÇÃO: Filtra 'like' no banco para evitar que dislikes ocupem o limite
 */
export async function fetchFavoriteLooks(params: {
  lojistaId: string;
  customerId: string;
}) {
  const { lojistaId, customerId } = params;
  if (!lojistaId || !customerId) return [];

  try {
    let snapshot;
    const ref = clienteFavoritosRef(lojistaId, customerId);

    try {
      // --- SOLUÇÃO DO MISTÉRIO ---
      // Filtramos APENAS onde action == 'like'.
      // Assim, mesmo que existam 1000 dislikes recentes, o banco vai pular eles
      // e buscar os likes que estão salvos atrás deles.
      snapshot = await ref
        .where("action", "==", "like") 
        .orderBy("createdAt", "desc")
        .limit(10) // Agora podemos limitar a 10 com segurança
        .get();

    } catch (error: any) {
      // ERRO DE ÍNDICE NO FIRESTORE
      // Se der erro porque falta o índice composto (action + createdAt),
      // o link para criar estará no console.log do servidor.
      if (error?.code === 'failed-precondition') {
        console.error("⚠️ FALTA ÍNDICE NO FIRESTORE! Crie o índice clicando no link do erro abaixo:");
        console.error(error);
        
        // FALLBACK (PLANO B):
        // Se não tiver índice, busca MUITOS itens para tentar achar os likes
        // Aumentei de 50 para 200 para garantir
        console.log("[fetchFavoriteLooks] Usando fallback sem índice (limit 200)");
        snapshot = await ref
          .orderBy("createdAt", "desc")
          .limit(200) 
          .get();
      } else {
        throw error;
      }
    }

    const results: any[] = [];

    snapshot.forEach((doc: any) => {
      const data = typeof doc.data === "function" ? doc.data() : doc.data;
      
      // Dupla verificação (caso use o fallback ou dados legados)
      const action = data?.action || data?.tipo || data?.votedType;
      
      // Se a query principal funcionou, isso aqui é redundante mas seguro.
      // Se caiu no fallback, isso aqui é essencial.
      const isLike = action === "like" || (!action && !data?.action); 
      const isDislike = action === "dislike";

      if (isDislike) return; // Ignora dislikes
      if (!isLike) return;   // Ignora outros tipos

      const hasImage = data?.imagemUrl && data.imagemUrl.trim() !== "";
      if (!hasImage) return;

      // Tratamento de Data
      let createdAt = data?.createdAt;
      if (createdAt?.toDate) {
        createdAt = createdAt.toDate();
      } else if (createdAt?.seconds) {
        createdAt = new Date(createdAt.seconds * 1000);
      } else if (typeof createdAt === 'string') {
        createdAt = new Date(createdAt);
      } else {
        createdAt = new Date();
      }

      results.push({
        id: doc.id,
        ...data,
        createdAt: createdAt
      });
    });

    // Ordenação final (para garantir)
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Retorna os top 10
    const limitedResults = results.slice(0, 10);
    
    if (limitedResults.length > 0) {
      console.log(`[fetchFavoriteLooks] Favoritos encontrados: ${limitedResults.length}`);
      console.log(`[fetchFavoriteLooks] Primeiro favorito (mais recente):`, {
        id: limitedResults[0].id,
        imagemUrl: limitedResults[0].imagemUrl?.substring(0, 50),
        createdAt: limitedResults[0].createdAt,
        action: limitedResults[0].action
      });
    }

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

    // Limitar busca de produtos para melhor performance (máximo 1000 produtos)
    const snapshot = await lojaRef(lojistaId)
      .collection("produtos")
      .limit(1000)
      .get();

    const produtos: ProdutoDoc[] = [];
    
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
        status: data?.status === "draft" ? "draft" : data?.status === "published" ? "published" : undefined,
        exibirNoDisplay: data?.exibirNoDisplay === true,
        videoUrl: typeof data?.videoUrl === "string" && data.videoUrl.trim() ? data.videoUrl.trim() : undefined,
        imagemUrlCatalogo: typeof data?.imagemUrlCatalogo === "string" ? data.imagemUrlCatalogo : undefined,
        imagemUrlOriginal: typeof data?.imagemUrlOriginal === "string" ? data.imagemUrlOriginal : undefined,
        imagemUrlCombinada: typeof data?.imagemUrlCombinada === "string" ? data.imagemUrlCombinada : undefined,
        catalogImageUrls: Array.isArray(data?.catalogImageUrls) ? data.catalogImageUrls.filter((u: unknown) => typeof u === "string" && (u as string).trim() !== "") : undefined,
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
    status?: "draft" | "published";
    exibirNoDisplay?: boolean;
    imagemUrlOriginal?: string;
    imagemUrlCatalogo?: string;
    imagemUrlCombinada?: string;
    catalogImageUrls?: string[];
    analiseIA?: Record<string, unknown>;
    extraImageUrls?: Array<{ idx: number; url: string }>;
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
      obs: produtoData.observacoes || "",
      createdAt: new Date(),
      updatedAt: new Date(),
      arquivado: false,
    };
    if (produtoData.analiseIA && typeof produtoData.analiseIA === "object") {
      newProduto.analiseIA = produtoData.analiseIA;
    }

    if (produtoData.estoque !== undefined && produtoData.estoque !== null) {
      newProduto.estoque = produtoData.estoque;
    }
    if (produtoData.status === "draft" || produtoData.status === "published") {
      newProduto.status = produtoData.status;
    }
    if (produtoData.exibirNoDisplay === true) {
      newProduto.exibirNoDisplay = true;
    }
    if (typeof produtoData.imagemUrlOriginal === "string") {
      newProduto.imagemUrlOriginal = produtoData.imagemUrlOriginal;
    }
    if (typeof produtoData.imagemUrlCatalogo === "string") {
      newProduto.imagemUrlCatalogo = produtoData.imagemUrlCatalogo;
    }
    if (typeof produtoData.imagemUrlCombinada === "string") {
      newProduto.imagemUrlCombinada = produtoData.imagemUrlCombinada;
    }
    if (Array.isArray(produtoData.catalogImageUrls) && produtoData.catalogImageUrls.length > 0) {
      newProduto.catalogImageUrls = produtoData.catalogImageUrls.filter((u: unknown) => typeof u === "string" && (u as string).trim() !== "").slice(0, 6);
    }
    if (Array.isArray(produtoData.extraImageUrls) && produtoData.extraImageUrls.length > 0) {
      newProduto.extraImageUrls = produtoData.extraImageUrls;
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

  const db = getAdminDb();
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
    status?: "draft" | "published";
    exibirNoDisplay?: boolean;
    imagemUrlOriginal?: string;
    imagemUrlCatalogo?: string;
    imagemUrlCombinada?: string;
    catalogImageUrls?: string[];
    analiseIA?: Record<string, unknown>;
    extraImageUrls?: Array<{ idx: number; url: string }>;
    /** IDs dos produtos usados no Look Combinado 1 (slot5) */
    lookCombinado1ProductIds?: string[];
    /** IDs dos produtos usados no Look Combinado 2 (slot6) */
    lookCombinado2ProductIds?: string[];
    /** URL do vídeo gerado pela IA (provador virtual) */
    videoUrl?: string | null;
  }
): Promise<void> {
  try {
    if (!lojistaId || !productId) {
      throw new Error("lojistaId e productId são obrigatórios");
    }

    const update: any = {
      updatedAt: new Date(),
    };
    if (updateData.analiseIA !== undefined && typeof updateData.analiseIA === "object") {
      update.analiseIA = updateData.analiseIA;
    }
    if (updateData.nome !== undefined) update.nome = updateData.nome;
    if (updateData.categoria !== undefined) update.categoria = updateData.categoria;
    if (updateData.preco !== undefined) update.preco = updateData.preco;
    if (updateData.imagemUrl !== undefined) update.imagemUrl = updateData.imagemUrl;
    if (updateData.medidas !== undefined) update.medidas = updateData.medidas;
    if (updateData.status !== undefined) update.status = updateData.status;
    if (updateData.exibirNoDisplay !== undefined) update.exibirNoDisplay = !!updateData.exibirNoDisplay;
    if (updateData.imagemUrlOriginal !== undefined) update.imagemUrlOriginal = updateData.imagemUrlOriginal;
    if (updateData.imagemUrlCatalogo !== undefined) update.imagemUrlCatalogo = updateData.imagemUrlCatalogo;
    if (updateData.imagemUrlCombinada !== undefined) update.imagemUrlCombinada = updateData.imagemUrlCombinada;
    if (updateData.catalogImageUrls !== undefined) update.catalogImageUrls = Array.isArray(updateData.catalogImageUrls) ? updateData.catalogImageUrls.slice(0, 6) : updateData.catalogImageUrls;
    if (Array.isArray(updateData.extraImageUrls)) update.extraImageUrls = updateData.extraImageUrls;
    if (Array.isArray(updateData.lookCombinado1ProductIds)) update.lookCombinado1ProductIds = updateData.lookCombinado1ProductIds.slice(0, 2);
    if (Array.isArray(updateData.lookCombinado2ProductIds)) update.lookCombinado2ProductIds = updateData.lookCombinado2ProductIds.slice(0, 2);
    if (updateData.videoUrl !== undefined) update.videoUrl = updateData.videoUrl ?? null;

    if (updateData.cores !== undefined) update.cores = updateData.cores;
    if (updateData.tamanhos !== undefined) update.tamanhos = updateData.tamanhos;
    if (updateData.tags !== undefined) update.tags = updateData.tags;

    if (updateData.estoque !== undefined && updateData.estoque !== null) {
      update.estoque = updateData.estoque;
    }

    if (updateData.observacoes !== undefined) {
      update.obs = updateData.observacoes;
    }

    await lojaRef(lojistaId).collection("produtos").doc(productId).update(update);
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
  includeArchived: boolean = false,
  includeBlocked: boolean = false
): Promise<ClienteDoc[]> {
  try {
    if (!lojistaId) return [];

    let snapshot;
    try {
      if (includeArchived) {
        snapshot = await lojaRef(lojistaId)
          .collection("clientes")
          .orderBy("totalComposicoes", "desc")
          .limit(limit)
          .get();
      } else {
        snapshot = await lojaRef(lojistaId)
          .collection("clientes")
          .orderBy("totalComposicoes", "desc")
          .limit(limit * 2)
          .get();
      }
    } catch (orderByError: any) {
      if (orderByError?.code === "failed-precondition" || orderByError?.code === "invalid-argument") {
        snapshot = await lojaRef(lojistaId)
          .collection("clientes")
          .limit(limit * 3)
          .get();
      } else {
        throw orderByError;
      }
    }

    const convertTimestamp = (ts: any): Date => {
      if (!ts) return new Date();
      if (ts.toDate && typeof ts.toDate === "function") return ts.toDate();
      if (ts instanceof Date) return ts;
      if (typeof ts === "string" || typeof ts === "number") return new Date(ts);
      return new Date();
    };

    const clientes: ClienteDoc[] = [];
    snapshot.forEach((doc) => {
      try {
        const data = doc.data();
        if (!data) return;
        
        if (!includeArchived && data?.arquivado === true) {
          return;
        }
        
        if (!includeBlocked && data?.acessoBloqueado === true) {
          return;
        }

        clientes.push({
          id: doc.id,
          nome: data?.nome || "",
          whatsapp: data?.whatsapp || "",
          email: data?.email || "",
          totalComposicoes: typeof data?.totalComposicoes === "number" ? data.totalComposicoes : 0,
          totalLikes: typeof data?.totalLikes === "number" ? data.totalLikes : 0,
          totalDislikes: typeof data?.totalDislikes === "number" ? data.totalDislikes : 0,
          createdAt: convertTimestamp(data?.createdAt),
          updatedAt: convertTimestamp(data?.updatedAt),
          arquivado: data?.arquivado === true,
          acessoBloqueado: data?.acessoBloqueado === true || false,
          tags: Array.isArray(data?.tags) ? data.tags : undefined,
          segmentacao: data?.segmentacao
            ? {
                tipo: data.segmentacao.tipo,
                ultimaAtualizacao: data.segmentacao.ultimaAtualizacao
                  ? convertTimestamp(data.segmentacao.ultimaAtualizacao)
                  : undefined,
              }
            : undefined,
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
      } catch (docError: any) {
        console.error(`[fetchClientes] Erro ao processar documento ${doc.id}:`, docError);
        // Continuar processando outros documentos mesmo se um falhar
      }
    });

    clientes.sort((a, b) => {
      if (b.totalComposicoes !== a.totalComposicoes) {
        return b.totalComposicoes - a.totalComposicoes;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return !includeArchived ? clientes.slice(0, limit) : clientes;
  } catch (error) {
    console.error("[fetchClientes] Erro:", error);
    return [];
  }
}

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
    passwordHash?: string;
  }
): Promise<string> {
  try {
    if (!lojistaId) {
      throw new Error("lojistaId é obrigatório");
    }

    if (!clienteData.nome || clienteData.nome.trim().length === 0) {
      throw new Error("Nome é obrigatório");
    }

    if (clienteData.whatsapp) {
      const existing = await fetchClienteByWhatsapp(lojistaId, clienteData.whatsapp);
      if (existing) {
        if (clienteData.passwordHash) {
          const clienteRef = lojaRef(lojistaId).collection("clientes").doc(existing.id);
          await clienteRef.update({
            passwordHash: clienteData.passwordHash,
            updatedAt: new Date(),
          });
        }
        return existing.id;
      }
    }

    const newCliente: any = {
      nome: clienteData.nome.trim(),
      whatsapp: clienteData.whatsapp?.replace(/\D/g, "") || "",
      email: clienteData.email?.trim() || "",
      obs: clienteData.observacoes?.trim() || "",
      passwordHash: clienteData.passwordHash || null,
      totalComposicoes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      arquivado: false,
    };

    const docRef = await lojaRef(lojistaId).collection("clientes").add(newCliente);
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
      if (error?.code === "failed-precondition") {
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

      // Buscar URL da imagem da composição (pode estar em vários campos)
      const imagemUrl = 
        data.imagemUrl || 
        data.imageUrl || 
        data.final_image_url ||
        data.looks?.[0]?.imagemUrl ||
        data.looks?.[0]?.imageUrl ||
        data.generation?.imagemUrl ||
        null;

      composicoes.push({
        id: doc.id,
        customer: data.customerId
          ? {
              id: data.customerId,
              nome: data.customerName || data.customer?.nome || "Cliente",
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
        dislikeReason:
          (typeof data.dislikeReason === "string" && data.dislikeReason) ||
          (typeof data.feedbackReason === "string" && data.feedbackReason) ||
          (typeof data.rejectionReason === "string" && data.rejectionReason) ||
          null,
        metrics: data.metrics || null,
        totalCostBRL: typeof data.totalCostBRL === "number" ? data.totalCostBRL : undefined,
        processingTime: typeof data.processingTime === "number" ? data.processingTime : undefined,
        imagemUrl: imagemUrl, // Adicionar campo imagemUrl ao objeto ComposicaoDoc
      } as any);
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

    // Buscar métricas do documento (para likes, shares, etc.)
    const metricsDoc = await lojaRef(lojistaId).collection("metrics").doc("dados").get();
    const data = metricsDoc.exists ? metricsDoc.data() : null;

    // Buscar total de composições diretamente do banco (sempre atualizado)
    let totalComposicoes = 0;
    try {
      const { countAllCompositions } = await import("@/app/(lojista)/composicoes/count-compositions");
      const countResult = await countAllCompositions(lojistaId);
      totalComposicoes = countResult.unique;
      console.log(`[fetchLojaMetrics] Total de composições no banco: ${totalComposicoes}`);
    } catch (error) {
      console.warn("[fetchLojaMetrics] Erro ao contar composições, usando valor do documento:", error);
      // Fallback para valor do documento se houver
      totalComposicoes = typeof data?.totalComposicoes === "number" ? data.totalComposicoes : 0;
    }

    return {
      totalComposicoes, // Usar contagem real do banco
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
  estimatedRevenue: number;
  roi: number;
  roiMultiplier: number;
}> {
  try {
    const { getTotalAPICost } = await import("../ai-services/cost-logger");
    const totalCostUSD = await getTotalAPICost(lojistaId, "USD");
    let totalCostBRL = await getTotalAPICost(lojistaId, "BRL");
    if (totalCostBRL === 0 && totalCostUSD > 0) {
      const usdToBrl = 5.0;
      totalCostBRL = totalCostUSD * usdToBrl;
    }
    
    const composicoes = await fetchComposicoesRecentes(lojistaId, 10000);
    const totalTryOns = composicoes.length;
    
    const costPerTryOn = totalTryOns > 0 ? totalCostBRL / totalTryOns : 0;
    
    const metrics = await fetchLojaMetrics(lojistaId);
    const checkoutCount = metrics?.checkoutTotal || 0;
    const averageOrderValue = 150;
    const estimatedRevenue = checkoutCount * averageOrderValue;
    
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
  produtoImagem: string;
  estoqueAtual: number;
  experimentacoes: number;
  prioridade: "alta" | "media" | "baixa";
}>> {
  try {
    const produtos = await fetchProdutos(lojistaId);
    const composicoes = await fetchComposicoesRecentes(lojistaId, 10000);
    
    const experimentacoesPorProduto: Record<string, number> = {};
    composicoes.forEach((comp) => {
      comp.products.forEach((produto) => {
        if (produto.id) {
          experimentacoesPorProduto[produto.id] = 
            (experimentacoesPorProduto[produto.id] || 0) + 1;
        }
      });
    });
    
    const alerts = produtos
      .filter((produto) => {
        const estoque = produto.estoque ?? Infinity;
        return estoque <= lowStockThreshold && estoque >= 0;
      })
      .map((produto) => {
        const experimentacoes = experimentacoesPorProduto[produto.id] || 0;
        const estoque = produto.estoque ?? 0;
        
        let prioridade: "alta" | "media" | "baixa" = "baixa";
        if (experimentacoes > 20 && estoque <= 5) {
          prioridade = "alta";
        } else if (experimentacoes > 10 && estoque <= 7) {
          prioridade = "media";
        }
        
        return {
          produtoId: produto.id,
          produtoNome: produto.nome,
          produtoImagem: produto.imagemUrlCatalogo || produto.imagemUrl || '',
          estoqueAtual: estoque,
          experimentacoes,
          prioridade,
        };
      })
      .sort((a, b) => {
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

/**
 * Atualiza estatísticas de composições para um cliente específico
 * Conta TODAS as composições geradas, likes e dislikes
 */
export async function updateClienteComposicoesStats(
  lojistaId: string,
  customerId: string
): Promise<{ totalComposicoes: number; totalLikes: number; totalDislikes: number }> {
  try {
    if (!lojistaId || !customerId) {
      return { totalComposicoes: 0, totalLikes: 0, totalDislikes: 0 };
    }

    const composicoesRef = lojaRef(lojistaId).collection("composicoes");
    
    // Buscar todas as composições do cliente
    const snapshot = await composicoesRef
      .where("customerId", "==", customerId)
      .get();

    if (snapshot.empty) {
      // Atualizar todas as estatísticas para 0
      const clienteRef = lojaRef(lojistaId)
        .collection("clientes")
        .doc(customerId);
      await clienteRef.update({ 
        totalComposicoes: 0,
        totalLikes: 0,
        totalDislikes: 0,
        updatedAt: new Date(),
      });
      return { totalComposicoes: 0, totalLikes: 0, totalDislikes: 0 };
    }

    let totalComposicoes = 0;
    let totalLikes = 0;
    let totalDislikes = 0;

    // Contar TODAS as composições geradas
    totalComposicoes = snapshot.size;

    // Buscar likes e dislikes na coleção de favoritos (fonte mais confiável)
    try {
      const favoritosRef = lojaRef(lojistaId)
        .collection("clientes")
        .doc(customerId)
        .collection("favoritos");

      const favoritosSnapshot = await favoritosRef.get();
      
      favoritosSnapshot.forEach((doc) => {
        const data = doc.data();
        const action = data.action || data.tipo || data.votedType;
        
        // Contar likes
        if (action === "like") {
          totalLikes++;
        }
        // Contar dislikes
        else if (action === "dislike") {
          totalDislikes++;
        }
      });
    } catch (error) {
      console.error("[updateClienteComposicoesStats] Erro ao buscar favoritos:", error);
      
      // Fallback: contar likes/dislikes das composições se não conseguir buscar favoritos
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Verificar se tem like
        const hasLike = data.curtido === true || data.liked === true;
        if (hasLike) {
          totalLikes++;
        }
        
        // Verificar se tem dislike explícito
        const hasDislike = data.disliked === true;
        if (hasDislike) {
          totalDislikes++;
        }
      });
    }

    // Atualizar estatísticas no documento do cliente
    const clienteRef = lojaRef(lojistaId)
      .collection("clientes")
      .doc(customerId);
    
    await clienteRef.update({ 
      totalComposicoes,
      totalLikes,
      totalDislikes,
      updatedAt: new Date(),
    });

    return { totalComposicoes, totalLikes, totalDislikes };
  } catch (error) {
    console.error("[updateClienteComposicoesStats] Erro:", error);
    return { totalComposicoes: 0, totalLikes: 0, totalDislikes: 0 };
  }
}

/**
 * Atualiza totalComposicoes para um cliente específico
 * Conta apenas composições com like e sem duplicidade (baseado em imagemUrl)
 * @deprecated Use updateClienteComposicoesStats instead
 */
export async function updateClienteTotalComposicoes(
  lojistaId: string,
  customerId: string
): Promise<number> {
  const stats = await updateClienteComposicoesStats(lojistaId, customerId);
  return stats.totalComposicoes;
}

/**
 * Busca composições com like e sem duplicidade para exibir no painel
 * Retorna apenas composições que foram curtidas
 */
export async function fetchComposicoesComLike(
  lojistaId: string,
  customerId?: string,
  limit: number = 50
): Promise<ComposicaoDoc[]> {
  try {
    if (!lojistaId) return [];

    const composicoesRef = lojaRef(lojistaId).collection("composicoes");
    
    let query: any = composicoesRef;
    
    // Se customerId fornecido, filtrar por cliente
    if (customerId) {
      query = query.where("customerId", "==", customerId);
    }

    let snapshot;
    try {
      snapshot = await query
        .orderBy("createdAt", "desc")
        .limit(limit * 2) // Buscar mais para filtrar duplicatas
        .get();
    } catch (error: any) {
      if (error?.code === "failed-precondition") {
        // Se não houver índice, buscar todas e filtrar
        const allSnapshot = customerId
          ? await composicoesRef.where("customerId", "==", customerId).get()
          : await composicoesRef.get();
        
        const allDocs: any[] = [];
        allSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data?.createdAt && (data.curtido === true || data.liked === true)) {
            const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            allDocs.push({ id: doc.id, data, createdAt });
          }
        });
        allDocs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        snapshot = {
          forEach: (callback: any) => {
            allDocs.slice(0, limit * 2).forEach((item) => {
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
    const seenUrls = new Map<string, ComposicaoDoc>();

    snapshot.forEach((doc: any) => {
      const data = typeof doc.data === "function" ? doc.data() : doc.data;
      if (!data) return;

      // Filtrar apenas composições com like
      const hasLike = data.curtido === true || data.liked === true;
      if (!hasLike) return;

      // Buscar primeira imagemUrl dos looks
      let imagemUrl: string | null = null;
      if (Array.isArray(data.looks) && data.looks.length > 0) {
        imagemUrl = data.looks[0]?.imagemUrl || null;
      }

      if (!imagemUrl) return;

      const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date();

      const composicao: ComposicaoDoc = {
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
        liked: true,
        shares: typeof data.shares === "number" ? data.shares : 0,
        isAnonymous: !data.customerId,
        metrics: data.metrics || null,
        totalCostBRL: typeof data.totalCostBRL === "number" ? data.totalCostBRL : undefined,
        processingTime: typeof data.processingTime === "number" ? data.processingTime : undefined,
      };

      // Remover duplicatas baseadas em imagemUrl (manter apenas o mais recente)
      const imageUrlKey = imagemUrl.trim();
      const existing = seenUrls.get(imageUrlKey);
      
      if (!existing || createdAt.getTime() > existing.createdAt.getTime()) {
        seenUrls.set(imageUrlKey, composicao);
      }
    });

    // Converter Map para Array e ordenar por data
    const uniqueComposicoes = Array.from(seenUrls.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    // Limitar ao número solicitado
    return uniqueComposicoes.slice(0, limit);
  } catch (error) {
    console.error("[fetchComposicoesComLike] Erro:", error);
    return [];
  }
}