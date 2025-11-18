/**
 * Serviço de Anonimização de Imagens
 * Remove ou oculta informações pessoais identificáveis das imagens
 */

import {
  AnonymizationParams,
  AnonymizationResult,
  RequestAnonymousAvatarInput,
  RequestAnonymousAvatarOutput,
  AnonymousAvatarStyle,
} from "./types";
import { getAdminStorage } from "../firebaseAdmin";

const FALLBACK_AVATARS: Record<AnonymousAvatarStyle, string> = {
  silhouette: "https://api.dicebear.com/7.x/avataaars/svg?seed=anonymous",
  abstract: "https://api.dicebear.com/7.x/shapes/svg?seed=anonymous",
  minimal: "https://api.dicebear.com/7.x/initials/svg?seed=AI",
};

/**
 * Serviço de Anonimização
 */
export class AnonymizationService {
  /**
   * Anonimiza uma imagem (blur no rosto, etc)
   */
  async anonymizeImage(
    params: AnonymizationParams
  ): Promise<AnonymizationResult> {
    try {
      console.log("[Anonymization] Anonimizando imagem", {
        method: params.method || "blur",
      });

      // TODO: Implementar com Sharp ou outra biblioteca
      // const sharp = require("sharp");
      //
      // // 1. Baixar a imagem
      // const response = await fetch(params.imageUrl);
      // const imageBuffer = await response.arrayBuffer();
      //
      // // 2. Aplicar blur/pixelate
      // const processedBuffer = await sharp(Buffer.from(imageBuffer))
      //   .blur(params.intensity || 50) // ou .pixelate()
      //   .toBuffer();
      //
      // // 3. Upload da imagem anonimizada
      // const anonymizedUrl = await uploadToStorage(processedBuffer);

      // Por enquanto, retorna mock
      const result: AnonymizationResult = {
        anonymizedImageUrl: params.imageUrl, // Mock: mesma URL
        originalImageUrl: params.imageUrl,
        method: params.method || "blur",
        processedAt: new Date(),
      };

      console.log("[Anonymization] Imagem anonimizada (mock)");

      return result;
    } catch (error) {
      console.error("[Anonymization] Erro ao anonimizar imagem:", error);
      throw error;
    }
  }

  /**
   * Verifica se uma imagem contém rostos (detecção facial)
   */
  async detectFaces(imageUrl: string): Promise<{
    hasFaces: boolean;
    faceCount: number;
    confidence: number;
  }> {
    try {
      console.log("[Anonymization] Detectando rostos...");

      // TODO: Implementar com Google Vision API ou similar
      // const vision = require("@google-cloud/vision");
      // const client = new vision.ImageAnnotatorClient();
      //
      // const [result] = await client.faceDetection(imageUrl);
      // const faces = result.faceAnnotations;

      // Mock
      return {
        hasFaces: false,
        faceCount: 0,
        confidence: 0,
      };
    } catch (error) {
      console.error("[Anonymization] Erro ao detectar rostos:", error);
      return {
        hasFaces: false,
        faceCount: 0,
        confidence: 0,
      };
    }
  }

  /**
   * Remove informações EXIF da imagem
   */
  async removeExifData(imageUrl: string): Promise<string> {
    try {
      console.log("[Anonymization] Removendo dados EXIF...");

      // TODO: Implementar com Sharp
      // const sharp = require("sharp");
      //
      // const response = await fetch(imageUrl);
      // const imageBuffer = await response.arrayBuffer();
      //
      // const cleanBuffer = await sharp(Buffer.from(imageBuffer))
      //   .withMetadata({ exif: {} }) // Remove EXIF
      //   .toBuffer();
      //
      // return await uploadToStorage(cleanBuffer);

      // Mock
      return imageUrl;
    } catch (error) {
      console.error("[Anonymization] Erro ao remover EXIF:", error);
      throw error;
    }
  }

  /**
   * Cria um avatar genérico a partir de uma imagem
   */
  async createGenericAvatar(
    imageUrl: string,
    style: "silhouette" | "abstract" | "minimal" = "silhouette"
  ): Promise<string> {
    try {
      console.log("[Anonymization] Criando avatar genérico", { style });

      // TODO: Implementar geração de avatar
      // Opções:
      // 1. Usar Sharp para criar uma silhueta
      // 2. Usar uma API de geração de avatars
      // 3. Usar um conjunto de avatars pré-definidos

      // Mock: retorna URL placeholder
      const placeholderUrls = {
        silhouette:
          "https://api.dicebear.com/7.x/avataaars/svg?seed=anonymous",
        abstract: "https://api.dicebear.com/7.x/shapes/svg?seed=anonymous",
        minimal: "https://api.dicebear.com/7.x/initials/svg?seed=AI",
      };

      return placeholderUrls[style];
    } catch (error) {
      console.error("[Anonymization] Erro ao criar avatar:", error);
      throw error;
    }
  }
  private async uploadToStorage(
    buffer: Buffer,
    lojistaId: string,
    compositionId?: string,
    style: AnonymousAvatarStyle = "silhouette"
  ) {
    const storage = getAdminStorage();
    const bucket = storage.bucket();

    const path = [
      "lojas",
      lojistaId,
      "anonymous-avatars",
      compositionId ?? `avatar-${Date.now()}`,
      `${style}-${Date.now()}.png`,
    ].join("/");

    const file = bucket.file(path);
    await file.save(buffer, {
      metadata: {
        contentType: "image/png",
        cacheControl: "public,max-age=31536000",
      },
    });

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });

    return { url, path };
  }

  private async getAccessToken(): Promise<string> {
    const { exec } = await import("node:child_process");
    return new Promise((resolve, reject) => {
      exec("gcloud auth print-access-token", (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  async requestAnonymousAvatar(
    params: RequestAnonymousAvatarInput & {
      lojistaId: string;
      compositionId?: string;
    }
  ): Promise<RequestAnonymousAvatarOutput> {
    const style = params.style ?? "silhouette";

    const fallback: RequestAnonymousAvatarOutput = {
      avatarUrl: FALLBACK_AVATARS[style],
      method: style,
      createdAt: new Date(),
      usedFallback: true,
    };

    const endpoint = process.env.VERTEX_ANONYMIZATION_ENDPOINT;
    if (!endpoint) {
      console.warn(
        "[Anonymization] VERTEX_ANONYMIZATION_ENDPOINT não configurado. Usando fallback."
      );
      return fallback;
    }

    try {
      console.log("[Anonymization] Gerando avatar anônimo", {
        style,
        compositionId: params.compositionId,
      });

      if (params.forcePlaceholder) {
        return fallback;
      }

      const accessToken = await this.getAccessToken();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          imageUrl: params.imageUrl,
          style,
        }),
      });

      if (!response.ok) {
        throw new Error(`Avatar request failed: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { url } = await this.uploadToStorage(
        buffer,
        params.lojistaId,
        params.compositionId,
        style
      );

      return {
        avatarUrl: url,
        method: style,
        createdAt: new Date(),
        usedFallback: false,
      };
    } catch (error) {
      console.error("[Anonymization] Falha ao gerar avatar via Vertex", error);
      return fallback;
    }
  }
}

// Singleton instance
let instance: AnonymizationService | null = null;

/**
 * Obtém a instância do serviço
 */
export function getAnonymizationService(): AnonymizationService {
  if (!instance) {
    instance = new AnonymizationService();
  }
  return instance;
}




