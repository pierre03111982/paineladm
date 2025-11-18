/**
 * Serviço de integração com Google Vertex AI Imagen 3.0/4.0
 * Para geração de cenários/backgrounds personalizados
 * Documentação:
 * - Imagen 4.0: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate-001
 * - Imagen 3.0: https://cloud.google.com/vertex-ai/docs/generative-ai/image/generate-images
 */

import { APIResponse, SceneGenerationParams, SceneGenerationResult } from "./types";

/**
 * Configuração do Google Imagen
 * Suporta Imagen 3.0 e 4.0
 */
const IMAGEN_CONFIG = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || "",
  location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
  // Pode usar Imagen 4.0 se disponível, senão usa 3.0
  modelVersion: process.env.IMAGEN_MODEL_VERSION || "imagen-4.0-generate-001", // Imagen 4.0
  fallbackModelVersion: "imagen-3.0-capability-001", // Fallback para 3.0
  // Custo oficial por imagem (em USD)
  // Fonte: https://cloud.google.com/vertex-ai/generative-ai/pricing
  // Imagen 3: $0.04 por imagem
  // Imagen 4: Verificar preços atualizados
  costPerRequest: parseFloat(process.env.IMAGEN_COST || "0.04"),
};

/**
 * Cliente para Google Vertex AI Imagen 3.0/4.0
 * Por padrão usa Imagen 4.0 (imagen-4.0-generate-001)
 * Pode ser configurado via IMAGEN_MODEL_VERSION
 */
export class ImagenService {
  private projectId: string;
  private location: string;
  private modelVersion: string;
  private endpoint: string;

  constructor() {
    this.projectId = IMAGEN_CONFIG.projectId;
    this.location = IMAGEN_CONFIG.location;
    this.modelVersion = IMAGEN_CONFIG.modelVersion;
    
    // Monta o endpoint do Imagen conforme documentação oficial
    // Imagen 4.0: imagen-4.0-generate-001
    // Imagen 3.0: imagen-3.0-capability-001
    this.endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.modelVersion}:predict`;

    if (!this.projectId) {
      console.warn(
        "[Imagen] GOOGLE_CLOUD_PROJECT_ID não configurado. Serviço em modo mock."
      );
    } else {
      console.log(`[Imagen] Usando modelo: ${this.modelVersion}`);
    }
  }

  /**
   * Verifica se o serviço está configurado
   */
  isConfigured(): boolean {
    return !!(this.projectId && this.location);
  }
  
  /**
   * Obtém token de autenticação do Google Cloud usando Service Account
   */
  private async getAccessToken(): Promise<string> {
    try {
      // Usa Firebase Admin SDK para obter credenciais do Service Account
      const { getAdminApp } = await import("@/lib/firebaseAdmin");
      const adminApp = getAdminApp();
      
      if (!adminApp) {
        throw new Error("Firebase Admin não inicializado");
      }

      // Obtém o token de acesso usando as credenciais do Service Account
      const client = await adminApp.options.credential?.getAccessToken();
      
      if (!client || !client.access_token) {
        throw new Error("Não foi possível obter token de acesso");
      }

      return client.access_token;
    } catch (error) {
      console.error("[Imagen] Erro ao obter access token:", error);
      
      // Fallback: tenta usar gcloud CLI se disponível (apenas para desenvolvimento)
      try {
        const { exec } = require('child_process');
        return new Promise((resolve, reject) => {
          exec('gcloud auth print-access-token', (error: Error | null, stdout: string) => {
            if (error) {
              reject(new Error("Falha na autenticação. Configure GOOGLE_APPLICATION_CREDENTIALS ou use Service Account do Firebase."));
            } else {
              resolve(stdout.trim());
            }
          });
        });
      } catch (fallbackError) {
        throw new Error("Falha na autenticação. Configure as credenciais do Firebase Admin SDK.");
      }
    }
  }

  /**
   * Gera um cenário/background personalizado usando Imagen 3.0
   * Baseado na documentação oficial do Vertex AI
   */
  async generateScene(
    params: SceneGenerationParams
  ): Promise<APIResponse<SceneGenerationResult>> {
    const startTime = Date.now();

    try {
      // Se não estiver configurado, retorna mock
      if (!this.isConfigured()) {
        console.log("[Imagen] Usando mock para geração de cenário");
        return this.mockSceneGeneration(params, startTime);
      }

      console.log("[Imagen] Iniciando geração de cenário", {
        prompt: params.prompt,
        lojistaId: params.lojistaId,
        endpoint: this.endpoint,
      });

      // Obtém token de autenticação
      const accessToken = await this.getAccessToken();

      // Monta o body da requisição conforme documentação oficial do Imagen
      // Para moda/roupas, usar aspect ratio 3:4 (portrait) que é mais adequado
      // O prompt deve ser detalhado e específico para gerar um cenário adequado
      const enhancedPrompt = `${params.prompt}. Estilo editorial de moda, alta qualidade, iluminação profissional, foco no produto e na pessoa, composição elegante.`;
      
      // Converter baseImageUrl para base64 se for uma URL
      let baseImageBase64: string | null = null;
      if (params.baseImageUrl && !params.baseImageUrl.startsWith("data:")) {
        try {
          const imageResponse = await fetch(params.baseImageUrl);
          const imageBuffer = await imageResponse.arrayBuffer();
          baseImageBase64 = Buffer.from(imageBuffer).toString('base64');
        } catch (error) {
          console.warn("[Imagen] Não foi possível converter baseImageUrl para base64:", error);
        }
      } else if (params.baseImageUrl?.startsWith("data:")) {
        baseImageBase64 = params.baseImageUrl.split(",")[1];
      }
      
      const requestBody: any = {
        instances: [
          {
            prompt: enhancedPrompt,
            // Se temos imagem base, usar para image-to-image (se suportado)
            ...(baseImageBase64 ? {
              image: {
                bytesBase64Encoded: baseImageBase64
              }
            } : {}),
          }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: "3:4", // Portrait - melhor para moda/roupas (formato vertical)
          // personGeneration: "allow_adult", // Opcional
          // safetySetting: "block_some", // Opcional
        }
      };

      console.log("[Imagen] Enviando requisição para Vertex AI...");

      // Faz a requisição para a API
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Imagen API error: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      
      // Processa a resposta
      if (!responseData.predictions || responseData.predictions.length === 0) {
        throw new Error("Nenhuma imagem gerada pela API");
      }

      const prediction = responseData.predictions[0];
      const imageBase64 = prediction.bytesBase64Encoded;

      // TODO: Fazer upload da imagem para Firebase Storage
      // Por enquanto, retorna a imagem em base64
      const imageUrl = `data:${prediction.mimeType || 'image/png'};base64,${imageBase64}`;

      const executionTime = Date.now() - startTime;

      const result: SceneGenerationResult = {
        imageUrl,
        prompt: params.prompt,
        processingTime: executionTime,
      };

      console.log("[Imagen] Cenário gerado com sucesso", {
        processingTime: executionTime,
        cost: IMAGEN_CONFIG.costPerRequest,
      });

      return {
        success: true,
        data: result,
        executionTime,
        cost: IMAGEN_CONFIG.costPerRequest,
        metadata: {
          mode: "production",
          provider: "imagen",
          modelVersion: this.modelVersion,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error("[Imagen] Erro ao gerar cenário:", error);

      // Em caso de erro, tenta usar mock como fallback
      if (error instanceof Error && error.message.includes("auth")) {
        console.warn("[Imagen] Erro de autenticação, usando mock");
        return this.mockSceneGeneration(params, startTime);
      }

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao gerar cenário",
        executionTime,
      };
    }
  }

  /**
   * Gera composição de pessoa + óculos usando Imagen 3.0
   * ENTRADA: 2 imagens (pessoa + óculos)
   * SAÍDA: 1 imagem (pessoa usando exatamente o óculos)
   */
  async generateOculosComposition(params: {
    personImageUrl: string;
    oculosImageUrl: string;
    prompt: string;
    compositionId: string;
    lojistaId: string;
  }): Promise<APIResponse<SceneGenerationResult>> {
    const startTime = Date.now();

    try {
      if (!this.isConfigured()) {
        console.log("[Imagen] Usando mock para composição de óculos");
        return this.mockSceneGeneration(
          {
            baseImageUrl: params.personImageUrl,
            prompt: params.prompt,
            compositionId: params.compositionId,
            lojistaId: params.lojistaId,
          },
          startTime
        );
      }

      console.log("[Imagen] Gerando composição pessoa + óculos:", {
        personImageUrl: params.personImageUrl.substring(0, 50) + "...",
        oculosImageUrl: params.oculosImageUrl.substring(0, 50) + "...",
      });

      const accessToken = await this.getAccessToken();

      // Converter ambas as imagens para base64
      let personImageBase64: string | null = null;
      let oculosImageBase64: string | null = null;

      try {
        // Converter imagem da pessoa
        if (params.personImageUrl && !params.personImageUrl.startsWith("data:")) {
          const personResponse = await fetch(params.personImageUrl);
          const personBuffer = await personResponse.arrayBuffer();
          personImageBase64 = Buffer.from(personBuffer).toString('base64');
        } else if (params.personImageUrl?.startsWith("data:")) {
          personImageBase64 = params.personImageUrl.split(",")[1];
        }

        // Converter imagem do óculos
        if (params.oculosImageUrl && !params.oculosImageUrl.startsWith("data:")) {
          const oculosResponse = await fetch(params.oculosImageUrl);
          const oculosBuffer = await oculosResponse.arrayBuffer();
          oculosImageBase64 = Buffer.from(oculosBuffer).toString('base64');
        } else if (params.oculosImageUrl?.startsWith("data:")) {
          oculosImageBase64 = params.oculosImageUrl.split(",")[1];
        }
      } catch (error) {
        console.warn("[Imagen] Erro ao converter imagens para base64:", error);
      }

      // IMPORTANTE: Imagen 3.0 NÃO suporta múltiplas imagens de referência
      // Apenas podemos usar uma imagem base (pessoa) + prompt detalhado (descrevendo o óculos)
      // A imagem do óculos foi analisada e suas características estão no prompt
      
      console.log("[Imagen] Usando imagem da pessoa como base");
      console.log("[Imagen] Características do óculos estão no prompt detalhado");
      console.warn("[Imagen] LIMITAÇÃO: Imagen 3.0 não aceita múltiplas imagens. Dependemos do prompt para descrever o óculos.");

      // Montar request body
      // Usamos a imagem da pessoa como base e o prompt detalhado descreve o óculos
      const requestBody: any = {
        instances: [
          {
            prompt: params.prompt, // Prompt já inclui descrição detalhada do óculos
            // Imagem da pessoa como base para image-to-image
            ...(personImageBase64 ? {
              image: {
                bytesBase64Encoded: personImageBase64
              }
            } : {}),
            // NOTA: A imagem do óculos (oculosImageBase64) não pode ser enviada diretamente
            // porque Imagen 3.0 não suporta múltiplas imagens de referência
            // As características do óculos devem estar descritas no prompt
          }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: "3:4", // Portrait - melhor para retratos
          // Tentar usar modo de edição se disponível
          // guidanceScale: 7.5, // Pode ajudar a seguir o prompt mais fielmente
        }
      };

      console.log("[Imagen] Enviando requisição para Vertex AI...");

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Imagen API error: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      
      if (!responseData.predictions || responseData.predictions.length === 0) {
        throw new Error("Nenhuma imagem gerada pela API");
      }

      const prediction = responseData.predictions[0];
      const imageBase64 = prediction.bytesBase64Encoded;
      const imageUrl = `data:${prediction.mimeType || 'image/png'};base64,${imageBase64}`;

      const executionTime = Date.now() - startTime;

      const result: SceneGenerationResult = {
        imageUrl,
        prompt: params.prompt,
        processingTime: executionTime,
      };

      console.log("[Imagen] Composição de óculos gerada com sucesso", {
        processingTime: executionTime,
        cost: IMAGEN_CONFIG.costPerRequest,
      });

      return {
        success: true,
        data: result,
        executionTime,
        cost: IMAGEN_CONFIG.costPerRequest,
        metadata: {
          mode: "production",
          provider: "imagen",
          modelVersion: this.modelVersion,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error("[Imagen] Erro ao gerar composição de óculos:", error);

      if (error instanceof Error && error.message.includes("auth")) {
        console.warn("[Imagen] Erro de autenticação, usando mock");
        return this.mockSceneGeneration(
          {
            baseImageUrl: params.personImageUrl,
            prompt: params.prompt,
            compositionId: params.compositionId,
            lojistaId: params.lojistaId,
          },
          startTime
        );
      }

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao gerar composição de óculos",
        executionTime,
      };
    }
  }

  /**
   * Gera múltiplos cenários em batch
   */
  async generateMultipleScenes(
    baseImageUrl: string,
    prompts: string[],
    compositionId: string,
    lojistaId: string
  ): Promise<APIResponse<SceneGenerationResult[]>> {
    const startTime = Date.now();

    try {
      console.log("[Imagen] Gerando múltiplos cenários", {
        count: prompts.length,
        compositionId,
      });

      const results = await Promise.all(
        prompts.map((prompt) =>
          this.generateScene({
            baseImageUrl,
            prompt,
            compositionId,
            lojistaId,
          })
        )
      );

      const successfulResults = results
        .filter((r) => r.success && r.data)
        .map((r) => r.data!);

      const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);
      const executionTime = Date.now() - startTime;

      return {
        success: successfulResults.length > 0,
        data: successfulResults,
        executionTime,
        cost: totalCost,
        metadata: {
          total: prompts.length,
          successful: successfulResults.length,
          failed: prompts.length - successfulResults.length,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error("[Imagen] Erro ao gerar múltiplos cenários:", error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao gerar cenários",
        executionTime,
      };
    }
  }

  /**
   * Mock para desenvolvimento/testes
   */
  private async mockSceneGeneration(
    params: SceneGenerationParams,
    startTime: number
  ): Promise<APIResponse<SceneGenerationResult>> {
    // Simula tempo de processamento (3-6 segundos)
    const mockDelay = 3000 + Math.random() * 3000;
    await new Promise((resolve) => setTimeout(resolve, mockDelay));

    const executionTime = Date.now() - startTime;

    // URLs de exemplo do Unsplash baseadas no prompt
    const sceneUrls: Record<string, string> = {
      "praia": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1024",
      "beach": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1024",
      "montanha": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1024",
      "mountain": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1024",
      "cidade": "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1024",
      "city": "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1024",
      "cafeteria": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1024",
      "cafe": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1024",
      "parque": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1024",
      "park": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1024",
    };

    // Tenta encontrar uma imagem baseada no prompt
    const promptLower = params.prompt.toLowerCase();
    let mockImageUrl = params.baseImageUrl; // fallback

    for (const [key, url] of Object.entries(sceneUrls)) {
      if (promptLower.includes(key)) {
        mockImageUrl = url;
        break;
      }
    }

    const result: SceneGenerationResult = {
      imageUrl: mockImageUrl || "",
      prompt: params.prompt,
      processingTime: executionTime,
    };

    return {
      success: true,
      data: result,
      executionTime,
      cost: IMAGEN_CONFIG.costPerRequest,
      metadata: {
        mode: "mock",
        provider: "imagen",
      },
    };
  }

  /**
   * Estima o custo de uma operação
   */
  estimateCost(sceneCount: number = 1): number {
    return IMAGEN_CONFIG.costPerRequest * sceneCount;
  }

  /**
   * Obtém informações sobre o provedor
   */
  getProviderInfo() {
    const isImagen4 = this.modelVersion.includes('4.0');
    return {
      name: `Google Vertex AI Imagen ${isImagen4 ? '4.0' : '3.0'}`,
      provider: "imagen" as const,
      configured: this.isConfigured(),
      costPerRequest: IMAGEN_CONFIG.costPerRequest,
      currency: "USD" as const,
      capabilities: [
        "text-to-image",
        "image-to-image",
        "scene-generation",
        "image-editing",
        ...(isImagen4 ? ["inpainting", "outpainting"] : []),
        "personalization",
        "high-quality-generation",
      ],
      modelVersion: this.modelVersion,
      // NOTA: Imagen 4.0 NÃO suporta múltiplas imagens de referência nativamente
      // Ainda depende de prompt detalhado + 1 imagem base
      supportsMultipleReferenceImages: false,
    };
  }
}

// Singleton instance
let instance: ImagenService | null = null;

/**
 * Obtém a instância do serviço Imagen
 */
export function getImagenService(): ImagenService {
  if (!instance) {
    instance = new ImagenService();
  }
  return instance;
}

// Mantém compatibilidade com código antigo
export function getNanoBananaService(): ImagenService {
  return getImagenService();
}

export class NanoBananaService extends ImagenService {
  // Alias para compatibilidade
}








