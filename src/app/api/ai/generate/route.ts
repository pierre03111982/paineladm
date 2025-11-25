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
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

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
 * Valida se o lojista tem saldo suficiente
 */
async function validateBalance(lojistaId: string): Promise<boolean> {
  try {
    let lojistaDoc = await db.collection("lojistas").doc(lojistaId).get();
    
    // Se não existe em lojistas, tentar criar a partir de lojas
    if (!lojistaDoc.exists) {
      const lojaDoc = await db.collection("lojas").doc(lojistaId).get();
      if (lojaDoc.exists) {
        // Criar documento em lojistas baseado nos dados de lojas
        const lojaData = lojaDoc.data();
        await db.collection("lojistas").doc(lojistaId).set({
          lojistaId: lojistaId,
          nome: lojaData?.nome || lojaData?.name || "",
          email: lojaData?.email || "",
          aiCredits: 0,
          saldo: 0,
          totalCreditsAdded: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        // Buscar novamente após criar
        lojistaDoc = await db.collection("lojistas").doc(lojistaId).get();
      } else {
        return false;
      }
    }

    const lojistaData = lojistaDoc.data();
    const credits = lojistaData?.aiCredits || lojistaData?.saldo || 0;

    return credits >= COST_PER_GENERATION;
  } catch (error) {
    console.error("[API/AI/Generate] Erro ao validar saldo:", error);
    return false;
  }
}

/**
 * Desconta créditos do lojista
 */
async function deductCredits(lojistaId: string, amount: number): Promise<void> {
  try {
    const lojistaRef = db.collection("lojistas").doc(lojistaId);
    const lojaRef = db.collection("lojas").doc(lojistaId);
    
    await db.runTransaction(async (transaction) => {
      let lojistaDoc = await transaction.get(lojistaRef);
      
      // Se não existe em lojistas, tentar criar a partir de lojas
      if (!lojistaDoc.exists) {
        const lojaDoc = await transaction.get(lojaRef);
        if (lojaDoc.exists) {
          // Criar documento em lojistas baseado nos dados de lojas
          const lojaData = lojaDoc.data();
          transaction.set(lojistaRef, {
            lojistaId: lojistaId,
            nome: lojaData?.nome || lojaData?.name || "",
            email: lojaData?.email || "",
            aiCredits: 0,
            saldo: 0,
            totalCreditsAdded: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          // Buscar novamente após criar
          lojistaDoc = await transaction.get(lojistaRef);
        } else {
          throw new Error("Lojista não encontrado");
        }
      }

      const lojistaData = lojistaDoc.data();
      const currentCredits = lojistaData?.aiCredits || lojistaData?.saldo || 0;

      if (currentCredits < amount) {
        throw new Error("Saldo insuficiente");
      }

      const newCredits = currentCredits - amount;
      
      transaction.update(lojistaRef, {
        aiCredits: newCredits,
        saldo: newCredits, // Manter compatibilidade
        lastCreditUpdate: new Date().toISOString(),
      });
    });
  } catch (error) {
    console.error("[API/AI/Generate] Erro ao descontar créditos:", error);
    throw error;
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
  productImageUrls: string[]
): Promise<string> {
  try {
    const compositionData = {
      lojistaId,
      customerId,
      imagemUrl: imageUrl,
      userImageUrl,
      productImageUrls,
      createdAt: new Date().toISOString(),
      status: "completed",
      provider: "gemini-flash-image",
      prompt: "Generated via Gemini 2.5 Flash Image",
    };

    const docRef = await db.collection("composicoes").add(compositionData);
    
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
    ({ lojistaId, customerId, userImageUrl, productImageUrl } = body);

    // Validação de entrada
    if (!lojistaId || !userImageUrl) {
      const response = NextResponse.json(
        { error: "lojistaId e userImageUrl são obrigatórios" },
        { status: 400 }
      );
      return addCorsHeaders(response, origin);
    }

    // Rate Limiting: 1 requisição a cada 10 segundos por IP ou customerId
    const clientIP = getClientIP(request);
    const rateLimitKey = customerId ? `customer:${customerId}` : `ip:${clientIP}`;
    const rateLimit = checkRateLimit(rateLimitKey, 1, 10000); // 1 requisição a cada 10 segundos

    if (!rateLimit.allowed) {
      const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      console.warn("[API/AI/Generate] Rate limit excedido:", { rateLimitKey, waitSeconds });
      const response = NextResponse.json(
        { 
          error: `Muitas requisições. Aguarde ${waitSeconds} segundo(s) antes de tentar novamente.`,
          retryAfter: waitSeconds
        },
        { status: 429 }
      );
      response.headers.set("Retry-After", waitSeconds.toString());
      return addCorsHeaders(response, origin);
    }

    // Validar saldo
    const hasBalance = await validateBalance(lojistaId);
    if (!hasBalance) {
      // Log evento de saldo insuficiente
      await logger.logCreditEvent(
        lojistaId,
        "insufficient",
        0,
        0,
        0,
        { customerId, ip: getClientIP(request) }
      );

      const response = NextResponse.json(
        { error: "Saldo insuficiente. Recarregue seus créditos." },
        { status: 402 }
      );
      return addCorsHeaders(response, origin);
    }

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
      geminiResult = await geminiService.generateImage({
        prompt: masterPrompt,
        imageUrls: allImageUrls,
        aspectRatio: "1:1",
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

    // PASSO 3: Descontar créditos
    console.log("[API/AI/Generate] Passo 3: Descontando créditos...");
    
    // Buscar saldo antes para log
    let balanceBefore = 0;
    try {
      const lojistaDoc = await db.collection("lojistas").doc(lojistaId).get();
      if (lojistaDoc.exists) {
        const data = lojistaDoc.data();
        balanceBefore = data?.aiCredits || data?.saldo || 0;
      }
    } catch (e) {
      // Ignorar erro ao buscar saldo
    }
    
    await deductCredits(lojistaId, COST_PER_GENERATION);
    
    // Buscar saldo depois para log
    let balanceAfter = 0;
    try {
      const lojistaDoc = await db.collection("lojistas").doc(lojistaId).get();
      if (lojistaDoc.exists) {
        const data = lojistaDoc.data();
        balanceAfter = data?.aiCredits || data?.saldo || 0;
      }
    } catch (e) {
      // Ignorar erro ao buscar saldo
    }

    // PASSO 4: Salvar no Firestore
    console.log("[API/AI/Generate] Passo 4: Salvando composição no Firestore...");
    const compositionId = await saveComposition(
      lojistaId,
      customerId || "anonymous",
      imageUrl,
      userImageUrl,
      productImageUrls
    );
    
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
        ip: getClientIP(request),
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

