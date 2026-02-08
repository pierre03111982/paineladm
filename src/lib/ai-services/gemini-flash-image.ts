/**
 * Serviço de integração com Google Vertex AI Gemini 2.5 Flash Image
 * Para geração de imagens criativas com múltiplas imagens de entrada
 * Documentação: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-image
 */

import { APIResponse } from "./types";

/**
 * Configuração do Gemini 2.5 Flash Image
 */
/**
 * Configuração do Gemini 2.5 Flash Image
 * 
 * Documentação:
 * - Modelo: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-image?hl=pt_br
 * - Preços: https://cloud.google.com/vertex-ai/generative-ai/pricing?hl=pt-br
 */
const GEMINI_FLASH_IMAGE_CONFIG = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || "",
  location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
  modelId: "gemini-2.5-flash-image",
  // Custo por imagem gerada (em USD) - Valor padrão estimado
  // ⚠️ IMPORTANTE: Consultar https://cloud.google.com/vertex-ai/generative-ai/pricing?hl=pt-br para valores atualizados
  // O custo real varia por região e pode incluir:
  // - Custo de entrada (imagens + texto)
  // - Custo de saída (imagem gerada)
  costPerRequest: parseFloat(process.env.GEMINI_FLASH_IMAGE_COST || "0.02"),
};

/**
 * Mensagem amigável quando a API bloqueia por conteúdo (IMAGE_PROHIBITED_CONTENT, SAFETY, etc.)
 */
function getBlockedContentUserMessage(finishReason: string | undefined): string {
  const blocked = (finishReason || "").toUpperCase();
  if (
    blocked.includes("IMAGE_PROHIBITED_CONTENT") ||
    blocked.includes("SAFETY") ||
    blocked.includes("PROHIBITED")
  ) {
    return (
      "Os filtros de segurança bloquearam a geração. " +
      "Na maioria das vezes o bloqueio é pelo tipo de produto (ex.: peças de praia). Tente outro produto (blusa, vestido, short etc.). " +
      "Se persistir: use outra foto (rosto visível, fundo neutro, roupa casual)."
    );
  }
  return (
    `Resposta da API não contém imagem gerada.${finishReason ? ` Motivo: ${finishReason}.` : ""} ` +
    "Verifique os logs e tente outra foto ou produtos."
  );
}

/**
 * Fila Global para Serializar Requisições de Geração de Imagem
 * Garante que nunca ultrapassemos o limite de 5 RPM (1 requisição a cada 12 segundos)
 */
class GlobalImageGenerationQueue {
  private queue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
    fn: () => Promise<any>;
  }> = [];
  private processing = false;
  private lastRequestTime: number = 0;
  private readonly minDelayBetweenRequests = 12000; // 12 segundos = 5 RPM

  /**
   * Adiciona uma função à fila e espera sua execução
   */
  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ resolve, reject, fn });
      this.processQueue();
    });
  }

  /**
   * Processa a fila sequencialmente com intervalo mínimo entre requisições
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      try {
        // Calcular tempo de espera necessário para respeitar o limite de 5 RPM
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        // Sempre esperar 12 segundos desde o término da última requisição
        if (timeSinceLastRequest < this.minDelayBetweenRequests) {
          const waitTime = this.minDelayBetweenRequests - timeSinceLastRequest;
          console.log(`[ImageGenerationQueue] ⏳ Aguardando ${Math.round(waitTime/1000)}s para respeitar limite de 5 RPM (12s entre requisições)...`);
          console.log(`[ImageGenerationQueue] 📊 Posição na fila: ${this.queue.length + 1} requisição(ões) aguardando`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        console.log(`[ImageGenerationQueue] 🚀 Processando requisição (${this.queue.length} aguardando na fila)...`);

        // Executar a função
        const result = await item.fn();
        
        // Marcar o término da requisição (após processar)
        this.lastRequestTime = Date.now();
        
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }

    this.processing = false;
  }

  /**
   * Retorna o tamanho atual da fila
   */
  getQueueSize(): number {
    return this.queue.length;
  }
}

// Singleton global da fila
const globalImageGenerationQueue = new GlobalImageGenerationQueue();

/**
 * Parâmetros para geração de imagem com Gemini Flash Image
 */
export interface GeminiFlashImageParams {
  prompt: string;
  imageUrls: string[]; // Array de URLs de imagens (primeira é a pessoa, seguintes são produtos)
  negativePrompt?: string;
  aspectRatio?: "1:1" | "4:3" | "3:4" | "16:9" | "9:16";
  temperature?: number; // PHASE 14 FIX: Temperatura para controlar variação (0.0-1.0, padrão 0.4)
  safetySettings?: {
    category: string;
    threshold: string;
  }[];
}

/**
 * Resultado da geração
 */
export interface GeminiFlashImageResult {
  imageUrl: string;
  seed?: number;
  finishReason?: string;
  processingTime: number;
}

/**
 * Cliente para Google Vertex AI Gemini 2.5 Flash Image
 */
export class GeminiFlashImageService {
  private projectId: string;
  private location: string;
  private endpoint: string;

  constructor() {
    this.projectId = GEMINI_FLASH_IMAGE_CONFIG.projectId;
    this.location = GEMINI_FLASH_IMAGE_CONFIG.location;
    
    // Endpoint do Gemini 2.5 Flash Image
    // Documentação: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-image
    // O endpoint usa o padrão de streaming/generateContent do Gemini
    this.endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${GEMINI_FLASH_IMAGE_CONFIG.modelId}:generateContent`;

    if (!this.projectId) {
      console.warn(
        "[GeminiFlashImage] GOOGLE_CLOUD_PROJECT_ID não configurado. Serviço em modo mock."
      );
    }
  }

  /**
   * Verifica se o serviço está configurado
   */
  isConfigured(): boolean {
    return !!(this.projectId && this.location);
  }

  /**
   * Obtém token de acesso do Firebase Admin
   */
  private async getAccessToken(): Promise<string> {
    try {
      const { getAdminApp } = await import("@/lib/firebaseAdmin");
      const adminApp = getAdminApp();
      
      if (!adminApp) {
        throw new Error("Firebase Admin não inicializado");
      }

      const client = await adminApp.options.credential?.getAccessToken();
      
      if (!client || !client.access_token) {
        throw new Error("Não foi possível obter token de acesso");
      }

      return client.access_token;
    } catch (error) {
      console.error("[GeminiFlashImage] Erro ao obter access token:", error);
      throw new Error("Falha na autenticação. Configure GOOGLE_APPLICATION_CREDENTIALS ou use Service Account do Firebase.");
    }
  }

  /**
   * Função wrapper para gerar conteúdo com retry inteligente para erro 429
   * Tenta até 3 vezes com espera de 12 segundos entre tentativas
   */
  private async generateWithSmartRetry(
    endpoint: string,
    accessToken: string,
    requestBody: any,
    maxRetries: number = 3
  ): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[GeminiFlashImage] 🔄 Tentativa ${attempt}/${maxRetries} de geração...`);
        
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        // Se a resposta for bem-sucedida, retornar
        if (response.ok) {
          console.log(`[GeminiFlashImage] ✅ Sucesso na tentativa ${attempt}/${maxRetries}`);
          return response;
        }

        // Ler o erro
        const errorText = await response.text();
        let errorData: any = {};
        
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Se não conseguir fazer parse, usar o texto como está
        }

        // Verificar se é erro 429 ou Resource Exhausted
        const isRateLimitError = 
          response.status === 429 || 
          errorText.includes("Resource Exhausted") ||
          errorText.includes("RESOURCE_EXHAUSTED") ||
          errorData?.error?.status === "RESOURCE_EXHAUSTED" ||
          errorData?.error?.code === 429;

        if (isRateLimitError) {
          // Se ainda temos tentativas restantes, esperar e tentar novamente
          if (attempt < maxRetries) {
            // Esperar 12 segundos entre tentativas
            const waitTime = 12000; // 12 segundos
            console.warn(`[GeminiFlashImage] ⚠️ Rate limit (429) detectado na tentativa ${attempt}/${maxRetries}. Aguardando ${waitTime}ms (12 segundos) antes de tentar novamente...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue; // Tentar novamente
          } else {
            // Última tentativa também falhou
            const errorMessage = errorData?.error?.message || "Resource exhausted. Please try again later.";
            console.error(`[GeminiFlashImage] ❌ Rate limit (429) após ${maxRetries} tentativas. Abortando.`);
            throw new Error(`Gemini Flash Image API error: 429 ${JSON.stringify({ error: { code: 429, message: errorMessage, status: "RESOURCE_EXHAUSTED" } })}`);
          }
        } else {
          // Outros erros HTTP - não fazer retry, retornar erro imediatamente
          console.error(`[GeminiFlashImage] ❌ Erro HTTP ${response.status} na tentativa ${attempt}/${maxRetries}:`, errorText.substring(0, 500));
          throw new Error(`Gemini Flash Image API error: ${response.status} ${errorText}`);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Se for erro de rate limit e ainda temos tentativas, continuar o loop
        if (lastError.message.includes("429") || lastError.message.includes("RESOURCE_EXHAUSTED")) {
          if (attempt < maxRetries) {
            const waitTime = 12000; // 12 segundos
            console.warn(`[GeminiFlashImage] ⚠️ Erro de rate limit capturado. Aguardando ${waitTime}ms (12 segundos) antes de tentar novamente...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
        
        // Se for último erro ou erro não relacionado a rate limit, lançar
        if (attempt === maxRetries || !lastError.message.includes("429")) {
          throw lastError;
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    throw lastError || new Error("Falha ao gerar imagem após múltiplas tentativas");
  }

  /**
   * Converte URL de imagem para base64
   */
  private async imageUrlToBase64(imageUrl: string): Promise<string> {
    try {
      console.log("[GeminiFlashImage] 📥 Baixando imagem de:", imageUrl.substring(0, 100) + "...");
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        console.error("[GeminiFlashImage] ❌ Erro ao baixar imagem:", response.status, response.statusText);
        throw new Error(`Falha ao baixar imagem: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      console.log("[GeminiFlashImage] ✅ Imagem convertida para base64, tamanho:", base64.length, "bytes");
      return base64;
    } catch (error) {
      console.error("[GeminiFlashImage] ❌ Erro ao converter imagem para base64:", error);
      console.error("[GeminiFlashImage] URL que falhou:", imageUrl);
      throw new Error(`Erro ao processar imagem: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Gera imagem usando Gemini 2.5 Flash Image
   * Usa fila global para serializar requisições e respeitar limite de 5 RPM
   */
  async generateImage(
    params: GeminiFlashImageParams
  ): Promise<APIResponse<GeminiFlashImageResult>> {
    const startTime = Date.now();

    console.log("[GeminiFlashImage] Iniciando geração de imagem", {
      promptLength: params.prompt.length,
      imageCount: params.imageUrls.length,
      isConfigured: this.isConfigured(),
      queueSize: globalImageGenerationQueue.getQueueSize(),
    });

    if (!this.isConfigured()) {
      console.warn("[GeminiFlashImage] ⚠️ USANDO MOCK - Configure GOOGLE_CLOUD_PROJECT_ID para usar o serviço real!");
      return this.mockGeneration(params, startTime);
    }

    // Enfileirar requisição na fila global para garantir que nunca ultrapassemos 5 RPM
    return globalImageGenerationQueue.enqueue(() => this._generateImageInternal(params, startTime));
  }

  /**
   * Método interno que executa a geração de imagem (chamado pela fila)
   */
  private async _generateImageInternal(
    params: GeminiFlashImageParams,
    startTime: number
  ): Promise<APIResponse<GeminiFlashImageResult>> {

    try {
      const accessToken = await this.getAccessToken();

      // Validar que temos pelo menos uma imagem
      if (!params.imageUrls || params.imageUrls.length === 0) {
        throw new Error("Pelo menos uma imagem é obrigatória");
      }

      // Converter todas as imagens para base64
      console.log("[GeminiFlashImage] 🔄 Convertendo imagens para base64...");
      console.log("[GeminiFlashImage] 📋 Lista de imagens a converter:", {
        total: params.imageUrls.length,
        imagens: params.imageUrls.map((url, index) => ({
          indice: index,
          tipo: index === 0 ? "IMAGEM_PESSOA" : `IMAGEM_PRODUTO_${index}`,
          url: url.substring(0, 80) + "...",
        })),
      });
      
      const imageParts = await Promise.all(
        params.imageUrls.map(async (url, index) => {
          console.log(`[GeminiFlashImage] 🔄 Convertendo imagem ${index + 1}/${params.imageUrls.length}...`, {
            tipo: index === 0 ? "IMAGEM_PESSOA" : `IMAGEM_PRODUTO_${index}`,
            url: url.substring(0, 80) + "...",
          });
          const base64 = await this.imageUrlToBase64(url);
          console.log(`[GeminiFlashImage] ✅ Imagem ${index + 1} convertida:`, {
            tipo: index === 0 ? "IMAGEM_PESSOA" : `IMAGEM_PRODUTO_${index}`,
            tamanhoBase64: base64.length,
          });
          return {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64,
            },
          };
        })
      );

      console.log("[GeminiFlashImage] ✅ Todas as imagens convertidas:", {
        total: imageParts.length,
        detalhes: imageParts.map((part, index) => ({
          indice: index,
          tipo: index === 0 ? "IMAGEM_PESSOA" : `IMAGEM_PRODUTO_${index}`,
          temData: !!part.inlineData?.data,
          tamanhoData: part.inlineData?.data?.length || 0,
        })),
      });

      // Construir o payload para a API do Gemini
      // A primeira imagem é a pessoa, as seguintes são produtos
      const contents = [
        {
          role: "user",
          parts: [
            ...imageParts,
            {
              text: params.prompt,
            },
          ],
        },
      ];

      // Estrutura do requestBody para Gemini Flash Image
      // NOTA: O modelo gemini-2.5-flash-image gera imagens automaticamente quando recebe
      // imagens de entrada junto com um prompt. Não é necessário especificar responseModalities
      // para o endpoint do Vertex AI (diferente de outros provedores).
      // PHASE 14 FIX: Usar temperatura customizada se fornecida (maior temperatura = mais variação)
      const temperature = params.temperature !== undefined ? params.temperature : 0.4;
      const requestBody: any = {
        contents,
        generationConfig: {
          temperature: temperature, // PHASE 14 FIX: Temperatura configurável (0.4 padrão, 0.7-0.9 para remix)
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
          // Removido responseModalities - não é suportado pelo Vertex AI endpoint
          // O modelo detecta automaticamente que deve gerar imagens quando recebe imagens de entrada
        },
        // Google pode ter endurecido os filtros recentemente. Para moda/retail (incl. praia),
        // relaxamos SEXUALLY_EXPLICIT para BLOCK_ONLY_HIGH: bloqueia só conteúdo realmente explícito,
        // permite fotos de produto de moda praia (biquíni, maiô) no contexto de provador virtual.
        safetySettings: params.safetySettings || [
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_ONLY_HIGH", // Moda/retail: permite swimwear; bloqueia apenas conteúdo explícito
          },
        ],
      };

      // Forçar proporção 2:3 (Look Completo) - Aspect ratio padrão para imagens de catálogo
      // NOTA: A API Gemini 2.5 Flash Image não suporta aspectRatio diretamente no generationConfig,
      // mas podemos instruir via prompt. O aspectRatio será sempre 2:3 para looks completos.
      // A instrução de crop já está no prompt do orchestrator.
      const forcedAspectRatio = "2:3"; // Aspect ratio padrão para looks completos (full body)
      
      // Adicionar instrução de proporção no prompt se não estiver presente
      // (O orchestrator já adiciona isso, mas garantimos aqui também)
      if (params.aspectRatio && params.aspectRatio !== (forcedAspectRatio as any)) {
        console.warn(`[GeminiFlashImage] aspectRatio ${params.aspectRatio} solicitado, mas forçando 2:3 (Look Completo)`);
      }
      
      // Log para debug
      console.log("[GeminiFlashImage] Proporção forçada para 2:3 (Look Completo)", {
        requestedAspectRatio: params.aspectRatio,
        forcedAspectRatio: forcedAspectRatio,
        note: "Instrução de crop já está no prompt do orchestrator",
      });

      console.log("[GeminiFlashImage] 📤 Enviando requisição para:", this.endpoint);
      console.log("[GeminiFlashImage] 📦 Payload completo:", {
        totalImagens: imageParts.length,
        estruturaImagens: imageParts.map((part, index) => ({
          indice: index,
          tipo: index === 0 ? "IMAGEM_PESSOA" : `IMAGEM_PRODUTO_${index}`,
          temInlineData: !!part.inlineData,
          mimeType: part.inlineData?.mimeType,
          tamanhoData: part.inlineData?.data?.length || 0,
        })),
        promptLength: params.prompt.length,
        totalParts: imageParts.length + 1, // +1 para o texto do prompt
      });

      // Usar função wrapper com retry inteligente para erro 429
      const response = await this.generateWithSmartRetry(
        this.endpoint,
        accessToken,
        requestBody,
        3 // Máximo de 3 tentativas
      );

      // Sucesso - processar resposta
      const data = await response.json();
      const executionTime = Date.now() - startTime;

      console.log("[GeminiFlashImage] ✅ Resposta da API recebida", {
        executionTime,
      });

      // Verificar bloqueio ou erro no nível da resposta (promptFeedback, error)
      const promptFeedback = data.promptFeedback as any;
      if (promptFeedback?.blockReason) {
        const msg = `API bloqueou a geração (${promptFeedback.blockReason}). Tente outro prompt ou imagem.`;
        console.error("[GeminiFlashImage] ❌", msg, promptFeedback);
        throw new Error(msg);
      }
      if (data.error?.message) {
        const msg = data.error.message || "Erro retornado pela API.";
        console.error("[GeminiFlashImage] ❌", msg, data.error);
        throw new Error(msg);
      }

      // Extrair a imagem gerada da resposta
      let imageUrl: string | null = null;
      const finishReason = data.candidates?.[0]?.finishReason;

      console.log("[GeminiFlashImage] 🔍 Analisando estrutura da resposta:", {
        hasCandidates: !!data.candidates,
        candidatesLength: data.candidates?.length || 0,
        finishReason,
        firstCandidate: data.candidates?.[0] ? {
          hasContent: !!data.candidates[0].content,
          hasParts: !!data.candidates[0].content?.parts,
          partsLength: data.candidates[0].content?.parts?.length || 0,
        } : null,
      });

      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        
        if (candidate.finishReason && candidate.finishReason !== "STOP") {
          console.warn("[GeminiFlashImage] ⚠️ FinishReason não é STOP:", candidate.finishReason);
        }
        
        if (candidate.content?.parts) {
          console.log("[GeminiFlashImage] 🔍 Analisando parts:", {
            partsCount: candidate.content.parts.length,
            partsStructure: candidate.content.parts.map((part: any, index: number) => ({
              index,
              hasInlineData: !!part.inlineData,
              hasText: !!part.text,
              inlineDataMimeType: part.inlineData?.mimeType,
              inlineDataHasData: !!part.inlineData?.data,
              inlineDataLength: part.inlineData?.data?.length || 0,
              textPreview: part.text?.substring(0, 100),
            })),
          });

          for (const part of candidate.content.parts) {
            // Imagem em inlineData.data (formato padrão)
            if (part.inlineData?.data) {
              const mimeType = part.inlineData.mimeType || "image/png";
              imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
              console.log("[GeminiFlashImage] ✅ Imagem encontrada em inlineData:", {
                mimeType,
                dataLength: part.inlineData.data.length,
              });
              break;
            }
            // Alternativa: bytesBase64Encoded (algumas APIs Vertex)
            const base64 = part.inlineData?.bytesBase64Encoded ?? part.inlineData?.bytesBase64;
            if (base64) {
              const mimeType = part.inlineData?.mimeType || "image/png";
              imageUrl = `data:${mimeType};base64,${base64}`;
              console.log("[GeminiFlashImage] ✅ Imagem encontrada em bytesBase64Encoded");
              break;
            }
            // URL no texto
            if (part.text) {
              console.log("[GeminiFlashImage] 📝 Texto na resposta:", part.text.substring(0, 200));
              const urlMatch = part.text.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i);
              if (urlMatch) {
                imageUrl = urlMatch[0];
                console.log("[GeminiFlashImage] ✅ URL de imagem no texto:", imageUrl);
                break;
              }
            }
          }
        }
      }

      if (!imageUrl) {
        console.error("[GeminiFlashImage] ❌ Resposta sem imagem. finishReason:", finishReason);
        if (data.candidates?.[0]) {
          console.error("[GeminiFlashImage] ❌ candidate[0]:", {
            finishReason: data.candidates[0].finishReason,
            safetyRatings: data.candidates[0].safetyRatings,
          });
        }
        const userMessage = getBlockedContentUserMessage(finishReason);
        throw new Error(userMessage);
      }

      console.log("[GeminiFlashImage] ✅ Imagem gerada com sucesso", {
        executionTime,
        cost: GEMINI_FLASH_IMAGE_CONFIG.costPerRequest,
        imageUrlType: imageUrl.startsWith("data:") ? "base64" : "uri",
      });

      return {
        success: true,
        data: {
          imageUrl,
          processingTime: executionTime,
          finishReason: data.candidates?.[0]?.finishReason || "SUCCESS",
        },
        executionTime,
        cost: GEMINI_FLASH_IMAGE_CONFIG.costPerRequest,
        metadata: {
          provider: "gemini-flash-image",
          model: GEMINI_FLASH_IMAGE_CONFIG.modelId,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error("[GeminiFlashImage] Erro ao gerar imagem:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao gerar imagem",
        executionTime,
      };
    }
  }

  /**
   * Mock para desenvolvimento/testes
   */
  private mockGeneration(
    params: GeminiFlashImageParams,
    startTime: number
  ): APIResponse<GeminiFlashImageResult> {
    const executionTime = Date.now() - startTime;
    
    console.warn("[GeminiFlashImage] ⚠️ USANDO MOCK - Configure GOOGLE_CLOUD_PROJECT_ID para usar o serviço real!");
    
    const mockImageUrl = "https://via.placeholder.com/1024x1024/6f5cf1/FFFFFF?text=Gemini+Flash+Image+Mock";

    return {
      success: true,
      data: {
        imageUrl: mockImageUrl,
        processingTime: executionTime,
        finishReason: "SUCCESS",
      },
      executionTime,
      cost: GEMINI_FLASH_IMAGE_CONFIG.costPerRequest,
      metadata: {
        mode: "mock",
        provider: "gemini-flash-image",
        model: GEMINI_FLASH_IMAGE_CONFIG.modelId,
      },
    };
  }
}

let geminiFlashImageServiceInstance: GeminiFlashImageService | null = null;

export function getGeminiFlashImageService(): GeminiFlashImageService {
  if (!geminiFlashImageServiceInstance) {
    geminiFlashImageServiceInstance = new GeminiFlashImageService();
  }
  return geminiFlashImageServiceInstance;
}

