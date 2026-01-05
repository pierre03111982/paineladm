/**
 * API Route: Geração de Imagem com Gemini 2.5 Flash Image
 * POST /api/ai/generate
 * 
 * Fluxo: Valida Saldo -> Chama Gemini Flash Image -> Salva no Firestore -> Retorna URL
 */

import { NextRequest, NextResponse } from "next/server";
import { generateImagenPrompt } from "@/lib/ai/gemini-prompt";
import { getGeminiFlashImageService } from "@/lib/ai-services/gemini-flash-image";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getStorage } from "firebase-admin/storage";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { logger } from "@/lib/logger";
import { deductCredits, checkCreditsAvailable } from "@/lib/financials/deduct-credits";
import { getOrCreateUser } from "@/lib/firestore/users";

const db = getAdminDb();

// Custo estimado por geração (em créditos)
const COST_PER_GENERATION = 1;

// Domínios permitidos para CORS (separados por vírgula ou array)
const getAllowedOrigins = (): string[] => {
  const isDevelopment = process.env.NODE_ENV === "development";
  
  // Em desenvolvimento, sempre incluir localhost
  const defaultOrigins = isDevelopment 
    ? ["http://localhost:3005", "http://localhost:3000", "http://localhost:3004", "http://localhost:3010", "http://127.0.0.1:3005", "http://127.0.0.1:3000", "http://127.0.0.1:3004", "http://127.0.0.1:3010"]
    : [];
  
  // Adicionar origens da variável de ambiente
  const envOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
    : [];
  
  // Adicionar URL do app cliente se configurada
  const clientAppUrl = process.env.NEXT_PUBLIC_CLIENT_APP_URL;
  if (clientAppUrl && !envOrigins.includes(clientAppUrl)) {
    envOrigins.push(clientAppUrl);
  }
  
  // Adicionar URLs dos modelos de app cliente (app1, app2, app3)
  const modeloUrls = [
    process.env.NEXT_PUBLIC_MODELO_1_URL,
    process.env.NEXT_PUBLIC_MODELO_2_URL,
    process.env.NEXT_PUBLIC_MODELO_3_URL,
    process.env.NEXT_PUBLIC_MODELO_1_SUBDOMAIN ? `https://${process.env.NEXT_PUBLIC_MODELO_1_SUBDOMAIN}` : null,
    process.env.NEXT_PUBLIC_MODELO_2_SUBDOMAIN ? `https://${process.env.NEXT_PUBLIC_MODELO_2_SUBDOMAIN}` : null,
    process.env.NEXT_PUBLIC_MODELO_3_SUBDOMAIN ? `https://${process.env.NEXT_PUBLIC_MODELO_3_SUBDOMAIN}` : null,
  ].filter((url): url is string => !!url && !envOrigins.includes(url));
  
  envOrigins.push(...modeloUrls);
  
  // Adicionar também os subdomínios padrão em produção se não estiverem nas variáveis
  if (!isDevelopment) {
    const defaultSubdomains = [
      "https://app1.experimenteai.com.br",
      "https://app2.experimenteai.com.br",
      "https://app3.experimenteai.com.br",
    ];
    defaultSubdomains.forEach(subdomain => {
      if (!envOrigins.includes(subdomain)) {
        envOrigins.push(subdomain);
      }
    });
  }
  
  // Combinar todas as origens e remover duplicatas
  const allOrigins = [...defaultOrigins, ...envOrigins];
  return [...new Set(allOrigins)];
};

const ALLOWED_ORIGINS = getAllowedOrigins();

/**
 * Verifica se o Origin da requisição é permitido
 */
function isOriginAllowed(origin: string | null): boolean {
  const isDevelopment = process.env.NODE_ENV === "development";
  
  // Em desenvolvimento, permitir requisições sem Origin ou de localhost
  if (!origin) {
    return isDevelopment;
  }
  
  // Em desenvolvimento, sempre permitir localhost
  if (isDevelopment && (
    origin.startsWith("http://localhost:") || 
    origin.startsWith("http://127.0.0.1:")
  )) {
    console.log(`[CORS] Permitindo origem de desenvolvimento: ${origin}`);
    return true;
  }

  // Verificar se o origin está na lista de permitidos
  const isAllowed = ALLOWED_ORIGINS.some(allowed => {
    // Comparação exata
    if (origin === allowed) return true;
    // Permitir subdomínios (ex: https://app.exemplo.com permite https://*.exemplo.com)
    const allowedPattern = allowed.replace("*", ".*");
    const regex = new RegExp(`^${allowedPattern}$`);
    return regex.test(origin);
  });
  
  if (!isAllowed) {
    console.warn(`[CORS] Origem não permitida: ${origin}`);
    console.warn(`[CORS] Origens permitidas:`, ALLOWED_ORIGINS);
  }
  
  return isAllowed;
}

/**
 * Adiciona headers CORS estritos
 */
function addCorsHeaders(response: NextResponse, origin: string | null): NextResponse {
  if (isOriginAllowed(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin || "*");
  } else {
    // Bloquear requisições de origens não permitidas
    response.headers.set("Access-Control-Allow-Origin", "null");
  }
  
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400"); // 24 horas
  
  return response;
}

/**
 * FASE 1: Validação de créditos usando novo sistema de prioridades
 * Substitui a função antiga validateBalance
 */
async function validateBalanceWithPriorities(
  lojistaId: string,
  customerId?: string,
  customerWhatsapp?: string
): Promise<{ available: boolean; source: string; message: string }> {
  try {
    // Buscar lojista de origem do cliente (se fornecido)
    let customerLojistaId: string | undefined;
    
    if (customerId && customerWhatsapp) {
      try {
        // Buscar cliente em todas as lojas para encontrar a loja de origem
        // Por enquanto, assumir que customerId já contém informação suficiente
        // TODO: Melhorar busca de lojista de origem na Fase 3
        customerLojistaId = undefined; // Será implementado na Fase 3
      } catch (e) {
        // Ignorar erro
      }
    }

    const checkResult = await checkCreditsAvailable({
      lojistaId,
      customerId,
      customerLojistaId,
      amount: COST_PER_GENERATION,
    });

    return {
      available: checkResult.available,
      source: checkResult.source || "unknown",
      message: checkResult.message,
    };
  } catch (error: any) {
    console.error("[API/AI/Generate] Erro ao validar saldo:", error);
    return {
      available: false,
      source: "error",
      message: error.message || "Erro ao validar créditos",
    };
  }
}

/**
 * Salva imagem base64 no Firebase Storage e retorna URL pública
 */
async function saveBase64ToFirebaseStorage(
  base64DataUrl: string,
  lojistaId: string,
  customerId: string
): Promise<string> {
  try {
    // Extrair base64 do data URL (data:image/png;base64,...)
    const base64Match = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Formato de imagem base64 inválido");
    }

    const mimeType = base64Match[1]; // png, jpeg, etc.
    const base64Data = base64Match[2];
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Salvar no Firebase Storage
    const adminApp = getAdminApp();
    const storage = getStorage(adminApp);
    
    // Obter nome do bucket da variável de ambiente ou usar o padrão do projeto
    const bucketName = 
      process.env.FIREBASE_STORAGE_BUCKET || 
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      process.env.FIREBASE_PROJECT_ID + ".appspot.com" ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID + ".appspot.com";
    
    if (!bucketName) {
      throw new Error("Bucket name not specified. Configure FIREBASE_STORAGE_BUCKET or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable.");
    }
    
    const bucket = storage.bucket(bucketName);

    const timestamp = Date.now();
    const fileExtension = mimeType === "png" ? "png" : "jpg";
    const fileName = `composicoes/${lojistaId}/${customerId}/${timestamp}.${fileExtension}`;

    const file = bucket.file(fileName);
    await file.save(imageBuffer, {
      metadata: {
        contentType: `image/${mimeType}`,
        metadata: {
          lojistaId,
          customerId,
          generatedAt: new Date().toISOString(),
          provider: "gemini-flash-image",
        },
      },
    });

    // Tornar público e obter URL
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    console.log("[API/AI/Generate] ✅ Imagem salva no Firebase Storage:", publicUrl);
    return publicUrl;
  } catch (error) {
    console.error("[API/AI/Generate] Erro ao salvar imagem no Firebase Storage:", error);
    throw error;
  }
}

/**
 * Salva composição no Firestore
 */
async function saveComposition(
  lojistaId: string,
  customerId: string,
  imageUrl: string,
  userImageUrl: string,
  productImageUrls: string[],
  isRemix: boolean = false,
  produtos?: any[], // NOVO: Produtos completos
  productIds?: string[] // NOVO: IDs dos produtos
): Promise<string> {
  try {
    const compositionData: any = {
      lojistaId,
      customerId,
      imagemUrl: imageUrl,
      userImageUrl,
      productImageUrls,
      createdAt: new Date().toISOString(),
      status: "completed",
      provider: "gemini-flash-image",
      prompt: "Generated via Gemini 2.5 Flash Image",
      isRemix: isRemix, // Flag para identificar remix (não contará no radar)
    };

    // NOVO: Salvar produtos completos se fornecidos
    if (Array.isArray(produtos) && produtos.length > 0) {
      compositionData.produtos = produtos;
      console.log("[API/AI/Generate] ✅ Produtos completos salvos na composição:", produtos.length);
    }

    // NOVO: Salvar productIds se fornecidos
    if (Array.isArray(productIds) && productIds.length > 0) {
      compositionData.productIds = productIds;
      console.log("[API/AI/Generate] ✅ ProductIds salvos na composição:", productIds.length);
    }

    const docRef = await db.collection("composicoes").add(compositionData);
    
    console.log("[API/AI/Generate] ✅ Composição salva:", {
      compositionId: docRef.id,
      temProdutos: !!compositionData.produtos,
      totalProdutos: compositionData.produtos?.length || 0,
      temProductIds: !!compositionData.productIds,
      totalProductIds: compositionData.productIds?.length || 0,
    });
    
    return docRef.id;
  } catch (error) {
    console.error("[API/AI/Generate] Erro ao salvar composição:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  
  // Declarar variáveis no escopo da função para uso no catch
  let body: any = null;
  let lojistaId: string | undefined;
  let customerId: string | undefined;
  let userImageUrl: string | undefined;
  let productImageUrl: string | string[] | undefined;
  let scenePrompts: string[] | null | undefined;
  
  // Log para debug
  console.log("[API/AI/Generate] Requisição recebida:", {
    origin,
    referer,
    allowedOrigins: ALLOWED_ORIGINS,
    isDevelopment: process.env.NODE_ENV === "development",
  });
  
  try {
    // Verificar CORS estrito
    if (!isOriginAllowed(origin)) {
      console.warn("[API/AI/Generate] Origem não permitida:", origin);
      console.warn("[API/AI/Generate] Origens permitidas:", ALLOWED_ORIGINS);
      const response = NextResponse.json(
        { error: "Origem não permitida" },
        { status: 403 }
      );
      return addCorsHeaders(response, origin);
    }

    body = await request.json();
    const { 
      lojistaId, 
      customerId, 
      userImageUrl, 
      productImageUrl, 
      scenePrompts,
      produtos = undefined, // NOVO: Produtos completos (opcional)
      productIds = undefined // NOVO: IDs dos produtos (opcional)
    } = body;
    
    // Verificar se é remix (tem scenePrompts)
    // Garantir que isRemix seja sempre boolean, nunca null
    const isRemix: boolean = Boolean(scenePrompts && Array.isArray(scenePrompts) && scenePrompts.length > 0);

    // Validação de entrada
    if (!lojistaId || !userImageUrl) {
      const response = NextResponse.json(
        { error: "lojistaId e userImageUrl são obrigatórios" },
        { status: 400 }
      );
      return addCorsHeaders(response, origin);
    }


    // FASE 1: Validar saldo com sistema de prioridades
    // Buscar WhatsApp do cliente se customerId fornecido (para verificar VIP)
    let customerWhatsapp: string | undefined;
    if (customerId) {
      try {
        // Buscar cliente para obter WhatsApp
        const clienteDoc = await db.collection("lojas").doc(lojistaId).collection("clientes").doc(customerId).get();
        if (clienteDoc.exists) {
          customerWhatsapp = clienteDoc.data()?.whatsapp;
        }
      } catch (e) {
        // Ignorar erro
      }
    }

    const balanceCheck = await validateBalanceWithPriorities(lojistaId, customerId, customerWhatsapp);
    
    if (!balanceCheck.available) {
      // Log evento de saldo insuficiente
      await logger.logCreditEvent(
        lojistaId,
        "insufficient",
        0,
        0,
        0,
        { customerId, source: balanceCheck.source }
      );

      const response = NextResponse.json(
        { error: balanceCheck.message || "Saldo insuficiente. Recarregue seus créditos." },
        { status: 402 }
      );
      return addCorsHeaders(response, origin);
    }

    console.log("[API/AI/Generate] ✅ Créditos disponíveis:", {
      source: balanceCheck.source,
      message: balanceCheck.message,
    });

    console.log("[API/AI/Generate] Iniciando geração", {
      lojistaId,
      customerId,
      userImageUrl: userImageUrl ? userImageUrl.substring(0, 100) + "..." : "N/A",
      productImageUrl: productImageUrl 
        ? (typeof productImageUrl === "string" 
          ? productImageUrl.substring(0, 100) + "..." 
          : Array.isArray(productImageUrl) 
            ? `${productImageUrl.length} produto(s)` 
            : "N/A")
        : "N/A",
    });

    // Preparar URLs dos produtos
    const productImageUrls = productImageUrl 
      ? (Array.isArray(productImageUrl) ? productImageUrl : [productImageUrl])
      : [];

    // Preparar array de URLs: primeira é a pessoa (IMAGEM_PESSOA), seguintes são produtos
    // Ordem fixa conforme PROMPT_LOOK_CRIATIVO.md:
    // 1. IMAGEM_PESSOA (primeira imagem)
    // 2. IMAGEM_PRODUTO_1, IMAGEM_PRODUTO_2, IMAGEM_PRODUTO_3 (máximo 3)
    const allImageUrls = [userImageUrl, ...productImageUrls.slice(0, 3)]; // Limitar a 3 produtos
    
    // Usar o prompt mestre diretamente do documento PROMPT_LOOK_CRIATIVO.md
    // O prompt já está otimizado para Gemini 2.5 Flash Image
    const masterPrompt = await generateImagenPrompt(userImageUrl, productImageUrls);
    
    console.log("[API/AI/Generate] Gerando imagem com Gemini 2.5 Flash Image usando prompt mestre VTO...");
    console.log("[API/AI/Generate] Total de imagens:", allImageUrls.length, {
      pessoa: 1,
      produtos: allImageUrls.length - 1,
    });
    
    const geminiService = getGeminiFlashImageService();
    let geminiResult;
    
    try {
      // REFINAMENTO VISUAL: Forçar proporção 9:16 e adicionar negative prompt para cenários noturnos
      geminiResult = await geminiService.generateImage({
        prompt: masterPrompt,
        imageUrls: allImageUrls,
        aspectRatio: "9:16", // REFINAMENTO VISUAL: Sempre vertical para mobile
        negativePrompt: "(night scene:2.5), (dark background:2.5), (evening:2.5), (sunset:2.5), (dusk:2.5), (nighttime:2.5), (neon lights:2.5), (cyberpunk:2.5), (artificial night lighting:2.5), (night street:2.5), (dark alley:2.5), (nightclub:2.5), (bad shadows:2.0), (wrong lighting:2.0), (floating person:2.0), (no shadows:2.0), (unnatural shadows:2.0), (sticker effect:2.0)",
      });

      if (!geminiResult.success || !geminiResult.data?.imageUrl) {
        const error = new Error(geminiResult.error || "Falha ao gerar imagem com Gemini Flash Image");
        // Log erro de geração
        await logger.logAIGeneration(
          lojistaId,
          customerId || null,
          false,
          error,
          {
            prompt: masterPrompt.substring(0, 200), // Limitar tamanho
            provider: "gemini-flash-image",
            cost: COST_PER_GENERATION,
          }
        );
        throw error;
      }
    } catch (error: any) {
      // Log erro crítico de geração
      await logger.logAIGeneration(
        lojistaId,
        customerId || null,
        false,
        error,
        {
          prompt: masterPrompt.substring(0, 200),
          provider: "gemini-flash-image",
          cost: COST_PER_GENERATION,
        }
      );
      throw error;
    }

    // A imagem vem em base64 (data:image/png;base64,...)
    // Precisamos salvar no Firebase Storage e retornar a URL pública
    let imageUrl = geminiResult.data.imageUrl;
    
    // Se for base64, salvar no Firebase Storage
    if (imageUrl.startsWith("data:image/")) {
      console.log("[API/AI/Generate] Convertendo imagem base64 para Firebase Storage...");
      imageUrl = await saveBase64ToFirebaseStorage(
        imageUrl,
        lojistaId,
        customerId || "anonymous"
      );
    }

    // FASE 1: PASSO 3: Descontar créditos com sistema de prioridades
    console.log("[API/AI/Generate] Passo 3: Descontando créditos (sistema de prioridades)...");
    
    // Buscar lojista de origem do cliente (para verificar VIP)
    let customerLojistaId: string | undefined;
    if (customerId && customerWhatsapp) {
      // TODO: Implementar busca de lojista de origem na Fase 3
      // Por enquanto, assumir que está na mesma loja
      customerLojistaId = lojistaId;
    }
    
    const deductResult = await deductCredits({
      lojistaId,
      customerId,
      customerLojistaId: customerLojistaId !== lojistaId ? customerLojistaId : undefined,
      amount: COST_PER_GENERATION,
    });
    
    // Capturar saldo antes e depois da dedução
    const balanceBefore = deductResult.balanceBefore ?? deductResult.remainingBalance ?? 0;
    const balanceAfter = deductResult.balanceAfter ?? deductResult.remainingBalance ?? 0;
    
    if (!deductResult.success) {
      // Log evento de erro ao debitar
      await logger.logCreditEvent(
        lojistaId,
        "insufficient",
        0,
        balanceBefore,
        balanceAfter,
        { customerId, error: deductResult.message }
      );

      const response = NextResponse.json(
        { error: deductResult.message || "Erro ao debitar créditos" },
        { status: 402 }
      );
      return addCorsHeaders(response, origin);
    }

    console.log("[API/AI/Generate] ✅ Créditos debitados:", {
      debitedFrom: deductResult.debitedFrom,
      remainingBalance: deductResult.remainingBalance,
      message: deductResult.message,
    });

    // PASSO 4: Salvar no Firestore
    console.log("[API/AI/Generate] Passo 4: Salvando composição no Firestore...");
    
    // Preparar produtos e productIds para salvar
    const produtosParaSalvar = Array.isArray(produtos) && produtos.length > 0 
      ? produtos 
      : null;
    
    const productIdsParaSalvar = Array.isArray(productIds) && productIds.length > 0
      ? productIds
      : null;
    
    console.log("[API/AI/Generate] 📦 Dados para salvar:", {
      temProdutos: !!produtosParaSalvar,
      totalProdutos: produtosParaSalvar?.length || 0,
      temProductIds: !!productIdsParaSalvar,
      totalProductIds: productIdsParaSalvar?.length || 0,
    });
    
    const compositionId = await saveComposition(
      lojistaId,
      customerId || "anonymous",
      imageUrl,
      userImageUrl,
      productImageUrls,
      isRemix, // Marcar como remix se tiver scenePrompts
      produtosParaSalvar || undefined, // Produtos completos
      productIdsParaSalvar || undefined // ProductIds
    );
    
    // NOVO: Registrar produtos no ProductRegistry
    if (produtosParaSalvar && produtosParaSalvar.length > 0 && compositionId) {
      try {
        const { registerCompositionProducts } = await import("@/lib/firestore/productRegistry");
        const registeredProductIds = await registerCompositionProducts(
          lojistaId,
          compositionId,
          produtosParaSalvar
        );
        
        console.log("[API/AI/Generate] ✅ Produtos registrados no ProductRegistry:", {
          total: registeredProductIds.length,
          productIds: registeredProductIds,
        });
      } catch (registryError) {
        console.warn("[API/AI/Generate] ⚠️ Erro ao registrar produtos no ProductRegistry:", registryError);
      }
    }
    
    // NOVO: Salvar também na generation se tiver customerId e productIds
    if (customerId && (productIdsParaSalvar || produtosParaSalvar)) {
      try {
        const { saveGeneration } = await import("@/lib/firestore/generations");
        await saveGeneration({
          lojistaId,
          userId: customerId,
          compositionId: compositionId,
          jobId: null,
          imagemUrl: imageUrl,
          uploadImageUrl: userImageUrl || null,
          productIds: productIdsParaSalvar || (produtosParaSalvar?.map((p: any) => p.id || p.productId).filter(Boolean) || []),
          productName: produtosParaSalvar?.[0]?.nome || null,
          customerName: null,
          produtos: produtosParaSalvar || undefined,
        });
        console.log("[API/AI/Generate] ✅ Generation salva com produtos");
      } catch (genError) {
        console.warn("[API/AI/Generate] ⚠️ Erro ao salvar generation:", genError);
      }
    }
    
    // Log evento de desconto de créditos (após criar compositionId)
    await logger.logCreditEvent(
      lojistaId,
      "deduct",
      COST_PER_GENERATION,
      balanceBefore,
      balanceAfter,
      { customerId, compositionId }
    );

    console.log("[API/AI/Generate] ✅ Geração concluída com sucesso", {
      compositionId,
      imageUrl: imageUrl.substring(0, 100) + "...",
    });

    // Log sucesso de geração
    await logger.logAIGeneration(
      lojistaId,
      customerId || null,
      true,
      undefined,
      {
        prompt: masterPrompt.substring(0, 200),
        provider: "gemini-flash-image",
        compositionId,
        imageUrl: imageUrl.substring(0, 100),
        cost: COST_PER_GENERATION,
      }
    );

    const response = NextResponse.json({
      success: true,
      imageUrl,
      compositionId,
      prompt: masterPrompt, // Usar masterPrompt que foi gerado anteriormente
      provider: "gemini-flash-image",
    });
    
    return addCorsHeaders(response, origin);
  } catch (error: any) {
    console.error("[API/AI/Generate] Erro:", error);
    
    // Log erro crítico (usar variáveis do escopo da função)
    await logger.critical(
      "Erro ao gerar imagem",
      error instanceof Error ? error : new Error(error.message || "Erro desconhecido"),
      {
        lojistaId: lojistaId || body?.lojistaId,
        customerId: customerId || body?.customerId,
        origin,
      }
    );
    
    const response = NextResponse.json(
      {
        error: error.message || "Erro ao gerar imagem",
        success: false,
      },
      { status: 500 }
    );
    
    return addCorsHeaders(response, origin);
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response, origin);
}

