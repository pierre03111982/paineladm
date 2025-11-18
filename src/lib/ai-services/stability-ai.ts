/**
 * Serviço de integração com Stability.ai API
 * Documentação oficial: https://platform.stability.ai/docs/api-reference
 * 
 * Modelos disponíveis:
 * - stable-diffusion-xl-1024-v1-0: Geração de imagens de alta qualidade
 * - stable-diffusion-xl-1024-v0-9: Versão anterior
 * - stable-image-upscale-conservative: Upscale de imagens (conservativo)
 * - stable-image-upscale-creative: Upscale de imagens (criativo)
 * 
 * Para composição pessoa + produto, usaremos:
 * - Image-to-Image com ControlNet (quando disponível)
 * - Ou Stable Diffusion XL com prompt detalhado + imagem de referência
 */

import { APIResponse } from "./types";

/**
 * Configuração do Stability.ai
 */
const STABILITY_CONFIG = {
  apiKey: process.env.STABILITY_AI_API_KEY || "",
  baseUrl: "https://api.stability.ai",
  // Modelos disponíveis
  models: {
    // Geração de imagens
    sdxl: "stable-diffusion-xl-1024-v1-0",
    sdxlBeta: "stable-diffusion-xl-beta-v2-2-2",
    // Upscale
    upscaleConservative: "stable-image-upscale-conservative",
    upscaleCreative: "stable-image-upscale-creative",
  },
  // Preços por imagem (USD) - Fonte: https://platform.stability.ai/pricing
  // Atualizado em 2024
  pricing: {
    // Geração de imagens (SDXL)
    sdxlGeneration: 0.04, // $0.04 por imagem
    // Upscale
    upscaleConservative: 0.05, // $0.05 por imagem
    upscaleCreative: 0.05, // $0.05 por imagem
  },
};

/**
 * Parâmetros para geração de imagem com Stability.ai
 */
export interface StabilityGenerationParams {
  prompt: string;
  imageUrl?: string; // Imagem de referência (para image-to-image)
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  stylePreset?: string;
}

/**
 * Parâmetros para composição pessoa + produto
 */
export interface StabilityCompositionParams {
  personImageUrl: string;
  productImageUrl: string;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
}

/**
 * Resultado da geração
 */
export interface StabilityGenerationResult {
  imageUrl: string;
  seed: number;
  finishReason: string;
  processingTime: number;
}

/**
 * Cliente para Stability.ai API
 */
export class StabilityAIService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = STABILITY_CONFIG.apiKey;
    this.baseUrl = STABILITY_CONFIG.baseUrl;

    if (!this.apiKey) {
      console.warn(
        "[StabilityAI] STABILITY_AI_API_KEY não configurado. Serviço em modo mock."
      );
    }
  }

  /**
   * Verifica se o serviço está configurado
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Converte imagem URL para base64
   */
  private async imageUrlToBase64(imageUrl: string): Promise<string> {
    try {
      console.log("[StabilityAI] 📥 Baixando imagem de:", imageUrl.substring(0, 100) + "...");
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        console.error("[StabilityAI] ❌ Erro ao baixar imagem:", response.status, response.statusText);
        throw new Error(`Falha ao baixar imagem: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer as ArrayBuffer);
      const base64 = buffer.toString('base64');
      console.log("[StabilityAI] ✅ Imagem baixada e convertida para base64, tamanho:", base64.length, "bytes");
      return base64;
    } catch (error) {
      console.error("[StabilityAI] ❌ Erro ao converter imagem para Base64:", error);
      console.error("[StabilityAI] URL que falhou:", imageUrl);
      throw new Error("Falha ao processar imagem");
    }
  }

  /**
   * Gera imagem usando Stable Diffusion XL
   * Endpoint: POST /v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image
   */
  async generateImage(
    params: StabilityGenerationParams
  ): Promise<APIResponse<StabilityGenerationResult>> {
    const startTime = Date.now();

    try {
      if (!this.isConfigured()) {
        console.log("[StabilityAI] Usando mock para geração de imagem");
        return this.mockGeneration(params, startTime);
      }

      console.log("[StabilityAI] Gerando imagem com SDXL...", {
        prompt: params.prompt.substring(0, 50) + "...",
        hasImage: !!params.imageUrl,
      });

      const requestBody: any = {
        text_prompts: [
          {
            text: params.prompt,
            weight: 1.0,
          },
        ],
        cfg_scale: params.cfgScale || 7,
        height: params.height || 1024,
        width: params.width || 1024,
        steps: params.steps || 30,
        samples: 1,
      };

      // Para image-to-image, usar multipart/form-data com a biblioteca form-data
      if (params.imageUrl) {
        console.log("[StabilityAI] 🔍 Baixando imagem base (foto da pessoa):", params.imageUrl.substring(0, 100) + "...");
        const imageBase64 = await this.imageUrlToBase64(params.imageUrl);
        console.log("[StabilityAI] ✅ Imagem base baixada e convertida, tamanho base64:", imageBase64.length, "bytes");
        let imageBuffer = Buffer.from(imageBase64, 'base64');
        const originalImageSize = imageBuffer.length; // Salvar tamanho original para comparação
        console.log("[StabilityAI] ✅ Buffer criado, tamanho:", originalImageSize, "bytes");
        
        // Redimensionar imagem para dimensões compatíveis com stable-diffusion-xl-1024-v1-0
        // O modelo SDXL padrão aceita dimensões até 1024x1024
        // Para melhor qualidade, vamos usar 1024x1024 ou manter proporção original
        try {
          const sharp = (await import('sharp')).default;
          // Usar 1024x1024 (máxima qualidade para SDXL)
          // Ou manter proporção original se for menor que 1024x1024
          const metadata = await sharp(imageBuffer).metadata();
          const maxDimension = Math.max(metadata.width || 0, metadata.height || 0);
          
          if (maxDimension > 1024) {
            // Redimensionar mantendo proporção, limitando a 1024px na maior dimensão
            const resizedBuffer = await sharp(imageBuffer)
              .resize(1024, 1024, {
                fit: 'inside', // Mantém proporção, ajusta para caber dentro de 1024x1024
                withoutEnlargement: true,
              })
              .png()
              .toBuffer();
            imageBuffer = Buffer.from(resizedBuffer);
            
            console.log("[StabilityAI] Imagem redimensionada para máximo 1024x1024 para compatibilidade com SDXL");
          } else {
            // Se já é menor que 1024, manter original
            const processedBuffer = await sharp(imageBuffer)
              .png()
              .toBuffer();
            imageBuffer = Buffer.from(processedBuffer);
            
            console.log("[StabilityAI] Imagem mantida em dimensões originais (dentro do limite de 1024px)");
          }
        } catch (sharpError) {
          console.warn("[StabilityAI] Erro ao redimensionar imagem, usando original:", sharpError);
          // Continua com a imagem original se sharp falhar
        }
        
        // Construir multipart/form-data manualmente (mais confiável e direto)
        // Garantir que o prompt está em UTF-8 válido
        let promptText = params.prompt;
        try {
          promptText = Buffer.from(promptText, 'utf8').toString('utf8');
        } catch (e) {
          promptText = promptText.replace(/[^\x00-\x7F]/g, '');
        }
        
        // Usar o modelo Inpaint da Stability.ai
        // Endpoint: POST /v2beta/stable-image/edit/inpaint
        // Documentação: https://platform.stability.ai/docs/api-reference#tag/Edit/paths/~1v2beta~1stable-image~1edit~1inpaint/post
        const endpoint = `${this.baseUrl}/v2beta/stable-image/edit/inpaint`;
        
        console.log("[StabilityAI] Usando modelo Inpaint");
        console.log("[StabilityAI] Endpoint:", endpoint);
        
        // Construir multipart/form-data manualmente para Inpaint
        const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
        const parts: Buffer[] = [];
        const CRLF = '\r\n';
        
        // Helper para adicionar campo de texto
        const addTextField = (name: string, value: string) => {
          parts.push(Buffer.from(`--${boundary}${CRLF}`, 'utf8'));
          parts.push(Buffer.from(`Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}`, 'utf8'));
          parts.push(Buffer.from(value, 'utf8'));
          parts.push(Buffer.from(CRLF, 'utf8'));
        };
        
        // Helper para adicionar arquivo
        const addFileField = (name: string, filename: string, buffer: Buffer, contentType: string) => {
          parts.push(Buffer.from(`--${boundary}${CRLF}`, 'utf8'));
          parts.push(Buffer.from(`Content-Disposition: form-data; name="${name}"; filename="${filename}"${CRLF}`, 'utf8'));
          parts.push(Buffer.from(`Content-Type: ${contentType}${CRLF}${CRLF}`, 'utf8'));
          parts.push(buffer);
          parts.push(Buffer.from(CRLF, 'utf8'));
        };
        
        // Adicionar image (imagem original - obrigatório)
        addFileField('image', 'image.png', imageBuffer, 'image/png');
        
        // Adicionar prompt (obrigatório)
        // O prompt deve descrever o que será gerado nas áreas BRANCAS da máscara (fundo)
        addTextField('prompt', promptText);
        
        console.log("[StabilityAI] Prompt enviado para Inpaint:", promptText.substring(0, 150) + "...");
        
        // Adicionar negative_prompt se houver
        if (params.negativePrompt) {
          let negativeText = params.negativePrompt;
          try {
            negativeText = Buffer.from(negativeText, 'utf8').toString('utf8');
          } catch (e) {
            negativeText = negativeText.replace(/[^\x00-\x7F]/g, '');
          }
          addTextField('negative_prompt', negativeText);
        }
        
        // Adicionar output_format (opcional, padrão: png)
        addTextField('output_format', 'png');
        
        // Adicionar guidance_scale (opcional, mas importante para controlar a força da modificação)
        // Valores mais altos = mais aderência ao prompt
        addTextField('guidance_scale', String(params.cfgScale || 8));
        
        // Adicionar num_inference_steps (opcional, mas importante para qualidade)
        addTextField('num_inference_steps', String(params.steps || 50));
        
        // Criar máscara para proteger pessoa e roupa, permitindo modificar apenas o fundo
        // IMPORTANTE: No Inpaint da Stability.ai:
        // - BRANCO (255) = área que será MODIFICADA (onde o prompt será aplicado)
        // - PRETO (0) = área que será MANTIDA (preservada da imagem original)
        // Então: fundo BRANCO (modificar) e pessoa PRETA (manter)
        try {
          const sharp = (await import('sharp')).default;
          const metadata = await sharp(imageBuffer).metadata();
          const width = metadata.width || 1024;
          const height = metadata.height || 1024;
          
          // Criar máscara: fundo BRANCO (modificar cenário) com área central PRETA (manter pessoa)
          // A área central representa aproximadamente a pessoa (centro da imagem)
          // IMPORTANTE: Aumentar a área protegida para garantir que a pessoa inteira seja mantida
          // Usar valores maiores para garantir que toda a pessoa fique protegida
          const personWidth = Math.floor(width * 0.75); // 75% da largura (aumentado de 70%)
          const personHeight = Math.floor(height * 0.90); // 90% da altura (aumentado de 85%)
          const personLeft = Math.floor((width - personWidth) / 2); // Centralizado
          const personTop = Math.floor((height - personHeight) * 0.1); // Ligeiramente acima do centro (pessoas geralmente ficam mais acima)
          
          // Criar máscara usando RGB (3 canais) - Sharp não aceita channels: 1
          // Para escala de cinza, usamos RGB com valores iguais (branco = 255,255,255, preto = 0,0,0)
          const maskBuffer = await sharp({
            create: {
              width,
              height,
              channels: 3, // RGB (3 canais) - Sharp requer 3 ou 4
              background: { r: 255, g: 255, b: 255 }, // Branco = MODIFICAR (fundo/cenário)
            }
          })
          .composite([
            {
              input: {
                create: {
                  width: personWidth,
                  height: personHeight,
                  channels: 3, // RGB (3 canais)
                  background: { r: 0, g: 0, b: 0 }, // Preto = MANTER (pessoa e roupa)
                }
              },
              left: personLeft,
              top: personTop,
              blend: 'over',
            }
          ])
          .greyscale() // Converter para escala de cinza após criar
          .png()
          .toBuffer();
          
          // Adicionar máscara ao FormData
          addFileField('mask', 'mask.png', maskBuffer, 'image/png');
          
          const maskInfo = {
            imageSize: `${width}x${height}`,
            maskSize: maskBuffer.length,
            protectedArea: `${personWidth}x${personHeight} (${Math.round((personWidth * personHeight) / (width * height) * 100)}% da imagem)`,
            personPosition: `left: ${personLeft}, top: ${personTop}`,
            backgroundArea: `${Math.round((1 - (personWidth * personHeight) / (width * height)) * 100)}% será modificado`,
          };
          
          console.log("[StabilityAI] Máscara criada e adicionada ao FormData:", maskInfo);
          console.log("[StabilityAI] Área BRANCA (modificar):", `${maskInfo.backgroundArea} - O prompt será aplicado aqui`);
          console.log("[StabilityAI] Área PRETA (manter):", `${maskInfo.protectedArea} - Pessoa e roupa serão preservadas`);
        } catch (maskError) {
          console.warn("[StabilityAI] Erro ao criar máscara, continuando sem máscara:", maskError);
          // Continua sem máscara se houver erro
        }
        
        // Fechar boundary
        parts.push(Buffer.from(`--${boundary}--${CRLF}`, 'utf8'));
        
        const formDataBody = Buffer.concat(parts);
        
        const response = await fetch(
          endpoint,
          {
            method: "POST",
            headers: {
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
              Accept: "image/*", // API espera image/* ou application/json
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: formDataBody,
          }
        );
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorData: any = {};
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          throw new Error(
            `Stability.ai API error: ${response.status} - ${JSON.stringify(errorData)}`
          );
        }

        // Inpaint pode retornar a imagem diretamente ou como base64 JSON
        const contentType = response.headers.get('content-type') || '';
        let imageUrl: string;
        
        if (contentType.includes('application/json')) {
          // Se retornar JSON com base64
          const data = await response.json();
          if (data.image) {
            imageUrl = `data:image/png;base64,${data.image}`;
          } else if (data.base64) {
            imageUrl = `data:image/png;base64,${data.base64}`;
          } else {
            throw new Error("Formato de resposta inesperado da API Inpaint");
          }
        } else {
          // Se retornar imagem diretamente (PNG)
          const responseBuffer = Buffer.from(await response.arrayBuffer());
          const imageBase64 = responseBuffer.toString('base64');
          imageUrl = `data:image/png;base64,${imageBase64}`;
          
          // Log detalhado para debug
          console.log("[StabilityAI] Resposta do Inpaint recebida:", {
            contentType,
            responseSize: responseBuffer.length,
            originalImageSize: originalImageSize,
            sizesMatch: responseBuffer.length === originalImageSize,
            warning: responseBuffer.length === originalImageSize 
              ? "⚠️ Tamanhos idênticos - possível que a imagem não foi modificada!" 
              : "✓ Tamanhos diferentes - imagem provavelmente foi modificada"
          });
        }

        const executionTime = Date.now() - startTime;

        const result: StabilityGenerationResult = {
          imageUrl,
          seed: 0, // Inpaint não retorna seed na resposta
          finishReason: "SUCCESS",
          processingTime: executionTime,
        };

        console.log("[StabilityAI] Imagem gerada com sucesso (Inpaint)", {
          processingTime: executionTime,
          cost: STABILITY_CONFIG.pricing.sdxlGeneration,
        });

        return {
          success: true,
          data: result,
          executionTime,
          cost: STABILITY_CONFIG.pricing.sdxlGeneration,
          metadata: {
            mode: "production",
            provider: "stability-ai",
            model: STABILITY_CONFIG.models.sdxlBeta,
            operation: "image-to-image",
          },
        };
      }

      // Para text-to-image, usar JSON normalmente
      if (params.negativePrompt) {
        requestBody.text_prompts.push({
          text: params.negativePrompt,
          weight: -1.0,
        });
      }

      if (params.seed) {
        requestBody.seed = params.seed;
      }

      if (params.stylePreset) {
        requestBody.style_preset = params.stylePreset;
      }

      const endpoint = `${this.baseUrl}/v1/generation/${STABILITY_CONFIG.models.sdxl}/text-to-image`;

      const response = await fetch(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Stability.ai API error: ${response.status} - ${JSON.stringify(errorData)}`
        );
      }

      const data = await response.json();
      
      // A resposta vem com artifacts[0].base64
      if (!data.artifacts || data.artifacts.length === 0) {
        throw new Error("Nenhuma imagem retornada pela API");
      }

      const artifact = data.artifacts[0];
      const imageBase64 = artifact.base64;
      const imageUrl = `data:image/png;base64,${imageBase64}`;

      const executionTime = Date.now() - startTime;

      const result: StabilityGenerationResult = {
        imageUrl,
        seed: artifact.seed || 0,
        finishReason: artifact.finishReason || "SUCCESS",
        processingTime: executionTime,
      };

      console.log("[StabilityAI] Imagem gerada com sucesso", {
        processingTime: executionTime,
        cost: STABILITY_CONFIG.pricing.sdxlGeneration,
      });

      return {
        success: true,
        data: result,
        executionTime,
        cost: STABILITY_CONFIG.pricing.sdxlGeneration,
        metadata: {
          mode: "production",
          provider: "stability-ai",
          model: STABILITY_CONFIG.models.sdxl,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error("[StabilityAI] Erro ao gerar imagem:", error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao gerar imagem",
        executionTime,
      };
    }
  }

  /**
   * Gera composição pessoa + produto
   * Usa image-to-image com a foto da pessoa como base e prompt detalhado do produto
   */
  async generateComposition(
    params: StabilityCompositionParams
  ): Promise<APIResponse<StabilityGenerationResult>> {
    const startTime = Date.now();

    try {
      console.log("[StabilityAI] 🎨 Gerando composição pessoa + produto...");
      console.log("[StabilityAI] ✅ personImageUrl (foto do upload):", params.personImageUrl ? params.personImageUrl.substring(0, 100) + "..." : "❌ NÃO FORNECIDA");
      console.log("[StabilityAI] ✅ productImageUrl:", params.productImageUrl ? params.productImageUrl.substring(0, 100) + "..." : "❌ NÃO FORNECIDA");
      
      if (!params.personImageUrl || !params.personImageUrl.startsWith("http")) {
        throw new Error(`❌ personImageUrl inválida: ${params.personImageUrl}`);
      }

      // Prompt detalhado que combina pessoa + produto
      const enhancedPrompt = `${params.prompt}

IMPORTANTE: A pessoa na imagem deve estar usando o produto exatamente como mostrado na imagem de referência do produto. O produto deve ser aplicado de forma natural e realista, mantendo todas as características físicas da pessoa (rosto, corpo, postura) e todas as características do produto (cor, estilo, formato, detalhes).`;

      console.log("[StabilityAI] Usando foto da pessoa como base (image-to-image)");
      console.log("[StabilityAI] Prompt:", enhancedPrompt.substring(0, 150) + "...");

      // Usar a foto da pessoa como imagem base (image-to-image)
      return await this.generateImage({
        prompt: enhancedPrompt,
        imageUrl: params.personImageUrl, // Foto da pessoa como base
        negativePrompt: params.negativePrompt || "distorted, blurry, low quality, artifacts",
        width: params.width || 1024,
        height: params.height || 1024,
        steps: params.steps || 40, // Mais steps para melhor qualidade
        cfgScale: params.cfgScale || 8,
      });
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error("[StabilityAI] Erro ao gerar composição:", error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao gerar composição",
        executionTime,
      };
    }
  }

  /**
   * Upscale de imagem (conservativo)
   * Endpoint: POST /v2beta/stable-image/upscale/conservative
   */
  async upscaleImage(
    imageUrl: string,
    mode: "conservative" | "creative" = "conservative"
  ): Promise<APIResponse<StabilityGenerationResult>> {
    const startTime = Date.now();

    try {
      if (!this.isConfigured()) {
        console.log("[StabilityAI] Usando mock para upscale");
        return {
          success: true,
          data: {
            imageUrl,
            seed: 0,
            finishReason: "SUCCESS",
            processingTime: Date.now() - startTime,
          },
          executionTime: Date.now() - startTime,
          cost: STABILITY_CONFIG.pricing.upscaleConservative,
        };
      }

      console.log("[StabilityAI] Fazendo upscale de imagem...", {
        mode,
      });

      const imageBase64 = await this.imageUrlToBase64(imageUrl);
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      
      const modelId = mode === "conservative"
        ? STABILITY_CONFIG.models.upscaleConservative
        : STABILITY_CONFIG.models.upscaleCreative;

      // Criar FormData manualmente para Node.js
      const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
      const formDataParts: string[] = [];
      
      formDataParts.push(`--${boundary}`);
      formDataParts.push(`Content-Disposition: form-data; name="image"; filename="image.png"`);
      formDataParts.push(`Content-Type: image/png`);
      formDataParts.push('');
      formDataParts.push(imageBuffer.toString('binary'));
      formDataParts.push(`--${boundary}--`);
      
      const formDataBody = Buffer.from(formDataParts.join('\r\n'), 'binary');

      const response = await fetch(
        `${this.baseUrl}/v2beta/stable-image/upscale/${mode}`,
        {
          method: "POST",
          headers: {
            Accept: "image/png",
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": `multipart/form-data; boundary=${boundary}`,
          },
          body: formDataBody,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Stability.ai Upscale API error: ${response.status} - ${errorText}`
        );
      }

      const responseBuffer = await response.arrayBuffer();
      const imageBase64Result = Buffer.from(responseBuffer).toString('base64');
      const resultImageUrl = `data:image/png;base64,${imageBase64Result}`;

      const executionTime = Date.now() - startTime;

      const result: StabilityGenerationResult = {
        imageUrl: resultImageUrl,
        seed: 0,
        finishReason: "SUCCESS",
        processingTime: executionTime,
      };

      console.log("[StabilityAI] Upscale concluído", {
        processingTime: executionTime,
        cost: STABILITY_CONFIG.pricing.upscaleConservative,
      });

      return {
        success: true,
        data: result,
        executionTime,
        cost: STABILITY_CONFIG.pricing.upscaleConservative,
        metadata: {
          mode: "production",
          provider: "stability-ai",
          operation: "upscale",
          upscaleMode: mode,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error("[StabilityAI] Erro ao fazer upscale:", error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao fazer upscale",
        executionTime,
      };
    }
  }

  /**
   * Mock para desenvolvimento/testes
   */
  private mockGeneration(
    params: StabilityGenerationParams,
    startTime: number
  ): APIResponse<StabilityGenerationResult> {
    const executionTime = Date.now() - startTime;
    
    // Retorna uma imagem mock (placeholder)
    const mockImageUrl = "https://via.placeholder.com/1024x1024/4A90E2/FFFFFF?text=StabilityAI+Mock";

    return {
      success: true,
      data: {
        imageUrl: mockImageUrl,
        seed: Math.floor(Math.random() * 1000000),
        finishReason: "SUCCESS",
        processingTime: executionTime,
      },
      executionTime,
      cost: STABILITY_CONFIG.pricing.sdxlGeneration,
      metadata: {
        mode: "mock",
        provider: "stability-ai",
      },
    };
  }
}

/**
 * Singleton do serviço Stability.ai
 */
let stabilityServiceInstance: StabilityAIService | null = null;

export function getStabilityAIService(): StabilityAIService {
  if (!stabilityServiceInstance) {
    stabilityServiceInstance = new StabilityAIService();
  }
  return stabilityServiceInstance;
}


