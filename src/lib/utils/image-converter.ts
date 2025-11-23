import { getAdminStorage } from "@/lib/firebaseAdmin";
import sharp from "sharp";

/**
 * Converte uma imagem de URL para PNG e faz upload para Firebase Storage
 * @param imageUrl URL da imagem a ser convertida
 * @param lojistaId ID do lojista
 * @param productId ID do produto (opcional)
 * @returns URL pública da imagem no Firebase Storage
 */
export async function convertImageUrlToPng(
  imageUrl: string,
  lojistaId: string,
  productId?: string
): Promise<string> {
  try {
    // Validar URL
    if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.trim()) {
      throw new Error("URL da imagem inválida");
    }

    const url = imageUrl.trim();

    // Verificar se já é uma URL do Firebase Storage (não precisa converter)
    if (url.includes("storage.googleapis.com") || url.includes("firebasestorage.googleapis.com")) {
      console.log("[convertImageUrlToPng] URL já é do Firebase Storage, retornando como está");
      return url;
    }

    // Baixar a imagem
    console.log(`[convertImageUrlToPng] Baixando imagem de: ${url}`);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao baixar imagem: ${response.status} ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`[convertImageUrlToPng] Imagem baixada, tamanho: ${imageBuffer.length} bytes`);

    // Converter para PNG usando sharp
    const pngBuffer = await sharp(imageBuffer)
      .png()
      .toBuffer();

    console.log(`[convertImageUrlToPng] Imagem convertida para PNG, tamanho: ${pngBuffer.length} bytes`);

    // Upload para Firebase Storage
    const storage = getAdminStorage();
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    if (!bucketName) {
      throw new Error("FIREBASE_STORAGE_BUCKET não configurado");
    }

    const bucket = storage.bucket(bucketName);
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const fileName = `lojas/${lojistaId}/produtos/${productId ? `${productId}/` : ""}${timestamp}-${randomId}.png`;
    const file = bucket.file(fileName);

    await file.save(pngBuffer, {
      metadata: {
        contentType: "image/png",
      },
    });

    // Tornar público
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    console.log(`[convertImageUrlToPng] Imagem salva em: ${publicUrl}`);
    return publicUrl;
  } catch (error: any) {
    console.error("[convertImageUrlToPng] Erro:", error);
    throw new Error(`Erro ao converter imagem: ${error.message}`);
  }
}

