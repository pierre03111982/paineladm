/**
 * Serviço de Watermark
 * Aplica marca d'água em imagens geradas usando Sharp
 */

import sharp from "sharp";
import { WatermarkConfig } from "./types";
import { getAdminStorage } from "@/lib/firebaseAdmin";
import { randomUUID } from "crypto";

export interface WatermarkResult {
  imageUrl: string;
  success: boolean;
  error?: string;
}

/**
 * Serviço de Watermark
 */
class WatermarkService {
  private storage = (() => {
    try {
      return getAdminStorage();
    } catch (error) {
      console.warn("[Watermark] Storage indisponível:", error);
      return null;
    }
  })();

  private bucket =
    this.storage && process.env.FIREBASE_STORAGE_BUCKET
      ? this.storage.bucket(process.env.FIREBASE_STORAGE_BUCKET)
      : null;

  /**
   * Baixa uma imagem de uma URL e retorna o buffer
   */
  private async downloadImage(url: string): Promise<Buffer> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error("[Watermark] Erro ao baixar imagem:", error);
      throw error;
    }
  }

  /**
   * Cria um SVG para o texto do watermark
   */
  private createTextSVG(
    text: string,
    fontSize: number,
    width: number,
    height: number
  ): string {
    // Escapar caracteres especiais no SVG
    const escapedText = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <text
          x="50%"
          y="50%"
          font-family="Arial, sans-serif"
          font-size="${fontSize}"
          font-weight="bold"
          fill="white"
          text-anchor="middle"
          dominant-baseline="middle"
          stroke="black"
          stroke-width="2"
          stroke-opacity="0.8"
          paint-order="stroke fill"
        >${escapedText}</text>
      </svg>
    `;
  }

  /**
   * Extrai lojistaId de uma URL do Firebase Storage
   */
  private extractLojistaIdFromUrl(url: string): string | null {
    try {
      // Tentar extrair de URLs como: /lojas/{lojistaId}/composicoes/...
      const match = url.match(/\/lojas\/([^\/]+)\//);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Faz upload da imagem com watermark para Firebase Storage
   */
  private async uploadToStorage(
    buffer: Buffer,
    lojistaId: string,
    fileName: string
  ): Promise<string> {
    if (!this.bucket) {
      throw new Error("Storage não configurado");
    }

    const filePath = `lojas/${lojistaId}/composicoes/watermarked/${Date.now()}-${fileName}`;
    const token = randomUUID();

    const file = this.bucket.file(filePath);
    await file.save(buffer, {
      metadata: {
        contentType: "image/png",
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      },
      resumable: false,
    });

    await file.makePublic();
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${this.bucket.name}/o/${encodeURIComponent(
      filePath
    )}?alt=media&token=${token}`;

    return publicUrl;
  }

  /**
   * Aplica watermark em uma única imagem
   */
  async applyWatermark(
    imageUrl: string,
    config: WatermarkConfig,
    lojistaId?: string
  ): Promise<WatermarkResult> {
    try {
      console.log("[Watermark] Aplicando watermark na imagem:", imageUrl);

      // Baixar a imagem original
      const imageBuffer = await this.downloadImage(imageUrl);

      // Obter dimensões da imagem
      const metadata = await sharp(imageBuffer).metadata();
      const imageWidth = metadata.width || 1024;
      const imageHeight = metadata.height || 1024;

      // Calcular tamanho do watermark (20% da largura da imagem)
      const watermarkWidth = Math.floor(imageWidth * 0.3);
      const watermarkHeight = Math.floor(imageHeight * 0.15);

      // Posição do watermark
      const position = config.position || "bottom-right";
      let left = 0;
      let top = 0;

      switch (position) {
        case "bottom-right":
          left = Math.floor(imageWidth * 0.7);
          top = Math.floor(imageHeight * 0.85);
          break;
        case "bottom-left":
          left = Math.floor(imageWidth * 0.05);
          top = Math.floor(imageHeight * 0.85);
          break;
        case "top-right":
          left = Math.floor(imageWidth * 0.7);
          top = Math.floor(imageHeight * 0.05);
          break;
        case "top-left":
          left = Math.floor(imageWidth * 0.05);
          top = Math.floor(imageHeight * 0.05);
          break;
        case "bottom-center":
          left = Math.floor(imageWidth * 0.35);
          top = Math.floor(imageHeight * 0.85);
          break;
      }

      // Criar composição de watermark
      const watermarkLayers: any[] = [];

      // Adicionar logo se disponível
      if (config.logoUrl) {
        try {
          const logoBuffer = await this.downloadImage(config.logoUrl);
          const logoResized = await sharp(logoBuffer)
            .resize(Math.floor(watermarkWidth * 0.3), null, {
              fit: "contain",
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .png()
            .toBuffer();

          watermarkLayers.push({
            input: logoResized,
            left: left + 10,
            top: top + 10,
            blend: "over",
          });
        } catch (error) {
          console.warn("[Watermark] Erro ao carregar logo, continuando sem logo:", error);
        }
      }

      // Criar textos do watermark
      const textLines: string[] = [];

      if (config.storeName) {
        textLines.push(config.storeName);
      }

      if (config.productName) {
        textLines.push(config.productName);
      }

      if (config.productPrice !== undefined && config.productPrice !== null) {
        const price =
          typeof config.productPrice === "number"
            ? `R$ ${config.productPrice.toFixed(2)}`
            : config.productPrice;
        textLines.push(price);
      }

      // Data atual
      const date = new Date().toLocaleDateString("pt-BR");
      textLines.push(date);

      if (config.legalNotice) {
        textLines.push(config.legalNotice);
      }

      // Criar SVG com todos os textos
      const fontSize = Math.floor(watermarkWidth / 15);
      const lineHeight = fontSize * 1.5;
      const textBlockHeight = textLines.length * lineHeight;
      const textBlockWidth = watermarkWidth;

      const textSVG = `
        <svg width="${textBlockWidth}" height="${textBlockHeight}" xmlns="http://www.w3.org/2000/svg">
          ${textLines
            .map(
              (line, index) => `
            <text
              x="10"
              y="${(index + 1) * lineHeight}"
              font-family="Arial, sans-serif"
              font-size="${fontSize}"
              font-weight="bold"
              fill="white"
              stroke="black"
              stroke-width="1.5"
              stroke-opacity="0.8"
              paint-order="stroke fill"
            >${line
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#39;")}</text>
          `
            )
            .join("")}
        </svg>
      `;

      const textBuffer = Buffer.from(textSVG);
      const textImage = await sharp(textBuffer)
        .resize(textBlockWidth, textBlockHeight, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();

      // Criar fundo semi-transparente para o texto
      const backgroundBuffer = await sharp({
        create: {
          width: textBlockWidth + 20,
          height: textBlockHeight + 20,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: config.opacity || 0.7 },
        },
      })
        .png()
        .toBuffer();

      // Compositar tudo
      const watermarkedImage = await sharp(imageBuffer)
        .composite([
          {
            input: backgroundBuffer,
            left: left,
            top: top,
            blend: "over",
          },
          {
            input: textImage,
            left: left + 10,
            top: top + 10,
            blend: "over",
          },
          ...watermarkLayers,
        ])
        .png()
        .toBuffer();

      // Usar lojistaId fornecido ou tentar extrair da URL
      const finalLojistaId = lojistaId || this.extractLojistaIdFromUrl(imageUrl) || "default";
      const fileName = `watermarked-${randomUUID()}.png`;

      // Upload para Firebase Storage
      const publicUrl = await this.uploadToStorage(watermarkedImage, finalLojistaId, fileName);

      console.log("[Watermark] Watermark aplicado com sucesso:", publicUrl);

      return {
        imageUrl: publicUrl,
        success: true,
      };
    } catch (error) {
      console.error("[Watermark] Erro ao aplicar watermark:", error);
      return {
        imageUrl,
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  /**
   * Aplica watermark em um lote de imagens
   */
  async applyWatermarkBatch(
    imageUrls: string[],
    config: WatermarkConfig,
    lojistaId?: string
  ): Promise<WatermarkResult[]> {
    console.log(`[Watermark] Aplicando watermark em ${imageUrls.length} imagem(ns)`);

    const results = await Promise.all(
      imageUrls.map((url) => this.applyWatermark(url, config, lojistaId))
    );

    const successCount = results.filter((r) => r.success).length;
    console.log(
      `[Watermark] Concluído: ${successCount}/${imageUrls.length} imagens processadas com sucesso`
    );

    return results;
  }

  /**
   * Informações do provedor
   */
  getProviderInfo() {
    return {
      name: "Watermark Service",
      available: true,
      version: "2.0.0",
      features: ["logo", "text", "custom-position", "opacity"],
    };
  }
}

// Singleton instance
let instance: WatermarkService | null = null;

/**
 * Obtém a instância do serviço de watermark
 */
export function getWatermarkService(): WatermarkService {
  if (!instance) {
    instance = new WatermarkService();
  }
  return instance;
}
