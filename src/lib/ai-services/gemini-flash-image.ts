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
 * Parâmetros para geração de imagem com Gemini Flash Image
 */
export interface GeminiFlashImageParams {
  prompt: string;
  imageUrls: string[]; // Array de URLs de imagens (primeira é a pessoa, seguintes são produtos)
  negativePrompt?: string;
  aspectRatio?: "1:1" | "4:3" | "3:4" | "16:9" | "9:16";
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
   */
  async generateImage(
    params: GeminiFlashImageParams
  ): Promise<APIResponse<GeminiFlashImageResult>> {
    const startTime = Date.now();

    console.log("[GeminiFlashImage] Iniciando geração de imagem", {
      promptLength: params.prompt.length,
      imageCount: params.imageUrls.length,
      isConfigured: this.isConfigured(),
    });

    if (!this.isConfigured()) {
      console.warn("[GeminiFlashImage] ⚠️ USANDO MOCK - Configure GOOGLE_CLOUD_PROJECT_ID para usar o serviço real!");
      return this.mockGeneration(params, startTime);
    }

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
      const requestBody: any = {
        contents,
        generationConfig: {
          temperature: 0.4,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
          // Removido responseModalities - não é suportado pelo Vertex AI endpoint
          // O modelo detecta automaticamente que deve gerar imagens quando recebe imagens de entrada
        },
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
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      };

      // NOTA: aspectRatio não é suportado pela API Gemini 2.5 Flash Image
      // O modelo gera imagens em formato padrão
      // if (params.aspectRatio) {
      //   requestBody.generationConfig.aspectRatio = params.aspectRatio;
      // }

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

      // Implementar retry com backoff exponencial para erro 429
      let lastError: Error | null = null;
      const maxRetries = 3;
      const baseDelay = 2000; // 2 segundos base
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch(this.endpoint, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorData: any = {};
            
            try {
              errorData = JSON.parse(errorText);
            } catch {
              // Se não conseguir fazer parse, usar o texto como está
            }

            // Tratamento específico para erro 429 (Resource Exhausted)
            if (response.status === 429) {
              const retryAfter = response.headers.get("Retry-After");
              const delaySeconds = retryAfter ? parseInt(retryAfter) : Math.min(baseDelay * Math.pow(2, attempt), 30000) / 1000;
              
              if (attempt < maxRetries) {
                console.warn(`[GeminiFlashImage] ⚠️ Rate limit atingido (429). Tentativa ${attempt + 1}/${maxRetries + 1}. Aguardando ${delaySeconds}s antes de tentar novamente...`);
                await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
                continue; // Tentar novamente
              } else {
                // Última tentativa falhou
                const errorMessage = errorData?.error?.message || "Resource exhausted. Please try again later.";
                console.error("[GeminiFlashImage] ❌ Rate limit (429) após todas as tentativas:", errorMessage);
                throw new Error(`Gemini Flash Image API error: 429 ${JSON.stringify({ error: { code: 429, message: errorMessage, status: "RESOURCE_EXHAUSTED" } })}`);
              }
            } else {
              // Outros erros HTTP
              console.error("[GeminiFlashImage] ❌ Erro na API:", response.status, errorText.substring(0, 500));
              throw new Error(`Gemini Flash Image API error: ${response.status} ${errorText}`);
            }
          }

          // Sucesso - sair do loop de retry
          const data = await response.json();
          const executionTime = Date.now() - startTime;

          console.log("[GeminiFlashImage] ✅ Resposta da API recebida", {
            attempt: attempt + 1,
            executionTime,
          });

          // Extrair a imagem gerada da resposta
          // O Gemini Flash Image pode retornar a imagem em diferentes estruturas
          let imageUrl: string | null = null;

          console.log("[GeminiFlashImage] 🔍 Analisando estrutura da resposta:", {
            hasCandidates: !!data.candidates,
            candidatesLength: data.candidates?.length || 0,
            firstCandidate: data.candidates?.[0] ? {
              hasContent: !!data.candidates[0].content,
              hasParts: !!data.candidates[0].content?.parts,
              partsLength: data.candidates[0].content?.parts?.length || 0,
            } : null,
          });

          if (data.candidates && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            
            // Verificar se há finishReason que indique bloqueio
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
                // Tentar encontrar imagem em inlineData
                if (part.inlineData?.data) {
                  const mimeType = part.inlineData.mimeType || "image/png";
                  imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
                  console.log("[GeminiFlashImage] ✅ Imagem encontrada em inlineData:", {
                    mimeType,
                    dataLength: part.inlineData.data.length,
                  });
                  break;
                }
                
                // Verificar se há texto que possa conter URL de imagem
                if (part.text) {
                  console.log("[GeminiFlashImage] 📝 Texto encontrado na resposta:", part.text.substring(0, 200));
                  // Se o texto contém uma URL de imagem, usar ela
                  const urlMatch = part.text.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i);
                  if (urlMatch) {
                    imageUrl = urlMatch[0];
                    console.log("[GeminiFlashImage] ✅ URL de imagem encontrada no texto:", imageUrl);
                    break;
                  }
                }
              }
            }
          }

          if (!imageUrl) {
            console.error("[GeminiFlashImage] ❌ Resposta completa da API:", JSON.stringify(data, null, 2));
            console.error("[GeminiFlashImage] ❌ Estrutura da resposta:", {
              topLevelKeys: Object.keys(data),
              candidates: data.candidates?.map((c: any) => ({
                finishReason: c.finishReason,
                hasContent: !!c.content,
                contentKeys: c.content ? Object.keys(c.content) : [],
                partsCount: c.content?.parts?.length || 0,
              })),
            });
            throw new Error("Resposta da API não contém imagem gerada. Verifique os logs para mais detalhes.");
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
          lastError = error instanceof Error ? error : new Error(String(error));
          
          // Se não for erro 429 ou se já tentamos todas as vezes, lançar o erro
          if (!lastError.message.includes("429") || attempt >= maxRetries) {
            throw lastError;
          }
          
          // Continuar o loop para tentar novamente
        }
      }
      
      // Se chegou aqui, todas as tentativas falharam
      throw lastError || new Error("Falha ao gerar imagem após múltiplas tentativas");
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

