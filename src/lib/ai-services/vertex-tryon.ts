/**
 * Serviço de integração com Google Vertex AI Try-On
 * Para virtual try-on de roupas
 * Documentação: https://cloud.google.com/vertex-ai/docs/generative-ai/image/try-on
 */

import { APIResponse, TryOnParams, TryOnResult } from "./types";

/**
 * Configuração do Google Vertex AI Try-On
 */
const TRYON_CONFIG = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || "",
  location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
  // Custo oficial por imagem (em USD)
  // Fonte: https://cloud.google.com/vertex-ai/generative-ai/pricing
  // Try-On: $0.04 por imagem
  costPerRequest: parseFloat(process.env.TRYON_COST || "0.04"),
};

/**
 * Cliente para Google Vertex AI Try-On
 */
export class VertexTryOnService {
  private projectId: string;
  private location: string;
  private endpoint: string;

  constructor() {
    this.projectId = TRYON_CONFIG.projectId;
    this.location = TRYON_CONFIG.location;
    
    // Endpoint do Try-On API - usa o endpoint específico para virtual try-on
    // Documentação: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/virtual-try-on-api
    // O endpoint correto é virtual-try-on-preview-08-04, não imagegeneration@006
    this.endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/virtual-try-on-preview-08-04:predict`;

    if (!this.projectId) {
      console.warn(
        "[VertexTryOn] GOOGLE_CLOUD_PROJECT_ID não configurado. Serviço em modo mock."
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
      console.error("[VertexTryOn] Erro ao obter access token:", error);
      throw new Error("Falha na autenticação. Configure GOOGLE_APPLICATION_CREDENTIALS ou use Service Account do Firebase.");
    }
  }

  /**
   * Converte URL de imagem para base64
   */
  private async imageUrlToBase64(imageUrl: string): Promise<string> {
    try {
      console.log("[VertexTryOn] Baixando imagem de:", imageUrl.substring(0, 100) + "...");
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        console.error("[VertexTryOn] ❌ Erro ao baixar imagem:", response.status, response.statusText);
        throw new Error(`Falha ao baixar imagem: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      console.log("[VertexTryOn] ✅ Imagem convertida para base64, tamanho:", base64.length);
      return base64;
    } catch (error) {
      console.error("[VertexTryOn] ❌ Erro ao converter imagem para base64:", error);
      console.error("[VertexTryOn] URL que falhou:", imageUrl);
      throw new Error(`Erro ao processar imagem: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  /**
   * Gera try-on de roupa na pessoa
   * O Try-On não requer prompt/texto, apenas as imagens da pessoa e da roupa
   */
  async generateTryOn(params: TryOnParams): Promise<APIResponse<TryOnResult>> {
    const startTime = Date.now();

    console.log("[VertexTryOn] Iniciando geração de try-on", {
      productId: params.productId,
      personImageUrl: params.personImageUrl ? params.personImageUrl.substring(0, 100) + "..." : "NÃO FORNECIDA",
      productImageUrl: params.productImageUrl ? params.productImageUrl.substring(0, 100) + "..." : "NÃO FORNECIDA",
      isConfigured: this.isConfigured(),
    });

    // Se não estiver configurado, retorna mock
    if (!this.isConfigured()) {
      console.warn("[VertexTryOn] ⚠️ Serviço NÃO configurado! Usando MOCK (imagem placeholder). Configure GOOGLE_CLOUD_PROJECT_ID.");
      return this.mockTryOn(params, startTime);
    }
    
    console.log("[VertexTryOn] ✅ Serviço configurado, usando Vertex AI real");

    try {
      const accessToken = await this.getAccessToken();

      // Converte as URLs das imagens para base64
      // O Try-On requer as imagens em base64, não URLs
      console.log("[VertexTryOn] Convertendo imagens para base64...");
      console.log("[VertexTryOn] personImageUrl:", params.personImageUrl ? params.personImageUrl.substring(0, 100) + "..." : "NÃO FORNECIDA");
      console.log("[VertexTryOn] productImageUrl:", params.productImageUrl ? params.productImageUrl.substring(0, 100) + "..." : "NÃO FORNECIDA");
      
      if (!params.personImageUrl) {
        throw new Error("personImageUrl não fornecida");
      }
      
      if (!params.productImageUrl) {
        throw new Error("productImageUrl não fornecida");
      }
      
      // Validar que a URL da pessoa está acessível ANTES de converter
      console.log("[VertexTryOn] 🔍 Validando acesso à foto da pessoa...");
      const personImageBase64 = await this.imageUrlToBase64(params.personImageUrl);
      console.log("[VertexTryOn] ✅ personImageBase64 convertida, tamanho:", personImageBase64.length, "bytes");
      
      if (personImageBase64.length < 1000) {
        console.warn("[VertexTryOn] ⚠️ ATENÇÃO: personImageBase64 muito pequena! Pode estar vazia ou corrompida.");
      }
      
      // Validar que a URL do produto está acessível ANTES de converter
      console.log("[VertexTryOn] 🔍 Validando acesso à foto do produto...");
      const garmentImageBase64 = await this.imageUrlToBase64(params.productImageUrl);
      console.log("[VertexTryOn] ✅ garmentImageBase64 convertida, tamanho:", garmentImageBase64.length, "bytes");
      
      if (garmentImageBase64.length < 1000) {
        console.warn("[VertexTryOn] ⚠️ ATENÇÃO: garmentImageBase64 muito pequena! Pode estar vazia ou corrompida.");
      }

      // Prepara o payload para a API do Try-On
      // O Try-On não requer prompt/texto, apenas as imagens
      // Formato baseado na documentação oficial: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/virtual-try-on-api
      // Formato correto: personImage e productImages (array) dentro de objetos image com bytesBase64Encoded
      const payload = {
        instances: [
          {
            personImage: {
              image: {
                bytesBase64Encoded: personImageBase64,
              },
            },
            productImages: [
              {
                image: {
                  bytesBase64Encoded: garmentImageBase64,
                },
              },
            ],
          },
        ],
        parameters: {
          // Parâmetros obrigatórios do Try-On
          sampleCount: 1, // Número de imagens a gerar (1-4)
          // storageUri é opcional, mas pode ser necessário dependendo da configuração
        },
      };

      console.log("[VertexTryOn] Enviando requisição para:", this.endpoint);
      console.log("[VertexTryOn] Payload (sem imagens):", {
        instances: payload.instances.map(inst => ({
          personImage: { image: { bytesBase64Encoded: `${inst.personImage.image.bytesBase64Encoded.substring(0, 50)}...` } },
          productImages: inst.productImages.map((p: any) => ({ image: { bytesBase64Encoded: `${p.image.bytesBase64Encoded.substring(0, 50)}...` } })),
        })),
        parameters: payload.parameters,
      });

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[VertexTryOn] ❌ Erro na API:", response.status, errorText.substring(0, 500));
        throw new Error(`Vertex AI Try-On API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const executionTime = Date.now() - startTime;

      console.log("[VertexTryOn] ✅ Resposta da API recebida");
      console.log("[VertexTryOn] Estrutura da resposta:", {
        hasPredictions: !!data.predictions,
        predictionsCount: data.predictions?.length || 0,
        firstPredictionKeys: data.predictions?.[0] ? Object.keys(data.predictions[0]) : [],
      });
      
      // Log completo da resposta para debug (limitado a 2000 caracteres)
      const responseStr = JSON.stringify(data, null, 2);
      console.log("[VertexTryOn] Resposta completa (primeiros 2000 chars):", responseStr.substring(0, 2000));

      // Extrai a imagem gerada da resposta
      // O Try-On retorna as imagens em predictions[0].bytesBase64Encoded ou predictions[0].imageUri
      const prediction = data.predictions?.[0];
      let imageUrl: string | null = null;

      if (prediction) {
        console.log("[VertexTryOn] 🔍 Analisando prediction:", {
          hasBytesBase64: !!prediction.bytesBase64Encoded,
          hasImageUri: !!prediction.imageUri,
          hasImageObject: !!prediction.image,
          imageObjectKeys: prediction.image ? Object.keys(prediction.image) : [],
        });
        
        // Pode retornar como base64 direto
        if (prediction.bytesBase64Encoded) {
          imageUrl = `data:image/png;base64,${prediction.bytesBase64Encoded}`;
          console.log("[VertexTryOn] ✅ Imagem encontrada em prediction.bytesBase64Encoded, tamanho:", prediction.bytesBase64Encoded.length);
        }
        // Ou como URI do Cloud Storage
        else if (prediction.imageUri) {
          imageUrl = prediction.imageUri;
          console.log("[VertexTryOn] ✅ Imagem encontrada em prediction.imageUri:", prediction.imageUri.substring(0, 100) + "...");
        }
        // Ou dentro de um objeto image
        else if (prediction.image?.bytesBase64Encoded) {
          imageUrl = `data:image/png;base64,${prediction.image.bytesBase64Encoded}`;
          console.log("[VertexTryOn] ✅ Imagem encontrada em prediction.image.bytesBase64Encoded, tamanho:", prediction.image.bytesBase64Encoded.length);
        }
        // Ou dentro de um objeto imageUri
        else if (prediction.image?.imageUri) {
          imageUrl = prediction.image.imageUri;
          console.log("[VertexTryOn] ✅ Imagem encontrada em prediction.image.imageUri:", prediction.image.imageUri.substring(0, 100) + "...");
        }
        else {
          console.warn("[VertexTryOn] ⚠️ Nenhum formato de imagem conhecido encontrado na prediction");
          console.warn("[VertexTryOn] Prediction keys:", Object.keys(prediction));
        }
      } else {
        console.error("[VertexTryOn] ❌ Nenhuma prediction encontrada na resposta!");
      }

      if (!imageUrl) {
        console.error("[VertexTryOn] ❌ Resposta completa (para debug):", JSON.stringify(data, null, 2));
        throw new Error("Resposta da API não contém imagem gerada. Verifique os logs para mais detalhes.");
      }
      
      console.log("[VertexTryOn] ✅ Imagem extraída com sucesso, tipo:", imageUrl.startsWith("data:") ? "base64" : "URI");

      console.log("[VertexTryOn] Try-on gerado com sucesso", {
        executionTime,
        cost: TRYON_CONFIG.costPerRequest,
        imageUrlType: imageUrl.startsWith("data:") ? "base64" : "uri",
      });

      return {
        success: true,
        data: {
          imageUrl,
          processingTime: executionTime,
        },
        executionTime,
        cost: TRYON_CONFIG.costPerRequest,
        metadata: {
          provider: "vertex-tryon",
          model: "virtual-try-on-preview-08-04",
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error("[VertexTryOn] Erro ao gerar try-on:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao gerar try-on",
        executionTime,
      };
    }
  }

  /**
   * Mock para desenvolvimento/testes
   */
  private mockTryOn(params: TryOnParams, startTime: number): APIResponse<TryOnResult> {
    const executionTime = Date.now() - startTime;
    
    console.warn("[VertexTryOn] ⚠️⚠️⚠️ USANDO MOCK - A foto do upload NÃO será usada! ⚠️⚠️⚠️");
    console.warn("[VertexTryOn] personImageUrl recebida (mas não será usada):", params.personImageUrl ? params.personImageUrl.substring(0, 100) + "..." : "NÃO FORNECIDA");
    console.warn("[VertexTryOn] Configure GOOGLE_CLOUD_PROJECT_ID para usar o serviço real!");
    
    // Retorna uma imagem mock (placeholder)
    // IMPORTANTE: Esta imagem NÃO usa a foto do upload!
    const mockImageUrl = "https://via.placeholder.com/1024x1024/4A90E2/FFFFFF?text=Try-On+Mock";

    return {
      success: true,
      data: {
        imageUrl: mockImageUrl,
        processingTime: executionTime,
      },
      executionTime,
      cost: TRYON_CONFIG.costPerRequest,
      metadata: {
        mode: "mock",
        provider: "vertex-tryon",
      },
    };
  }
}

/**
 * Singleton do serviço Vertex Try-On
 */
let vertexTryOnServiceInstance: VertexTryOnService | null = null;

export function getVertexTryOnService(): VertexTryOnService {
  if (!vertexTryOnServiceInstance) {
    vertexTryOnServiceInstance = new VertexTryOnService();
  }
  return vertexTryOnServiceInstance;
}





