/**
 * Pré-processamento da foto da pessoa para envio ao Gemini em produtos sensíveis (praia/íntima).
 * Duas estratégias:
 * 1. cropPersonImageToFaceForGemini: envia só rosto/ombros (como no teste que passou no Gemini).
 * 2. stylizePersonImageForGemini: estilização leve (fallback).
 */

import sharp from "sharp";

const STYLIZE_QUALITY = 92;
const BLUR_SIGMA = 0.6;
const SHARPEN_SIGMA = 0.8;
/** Fração da altura: rosto + ombros + parte do tronco (preserva noção de proporções). */
const FACE_CROP_HEIGHT_RATIO = 0.55;

/**
 * Retorna buffer da imagem a partir de URL (HTTP ou data URL).
 */
async function imageUrlToBuffer(imageUrl: string): Promise<{ buffer: Buffer; mime: string }> {
  if (imageUrl.startsWith("data:image/")) {
    const match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) throw new Error("Data URL de imagem inválida");
    const mime = match[1].toLowerCase();
    const base64 = match[2];
    const buffer = Buffer.from(base64, "base64");
    return { buffer, mime: mime === "jpeg" ? "jpeg" : mime };
  }
  const res = await fetch(imageUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao baixar imagem: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const mime = contentType.includes("png") ? "png" : "jpeg";
  return { buffer, mime };
}

/**
 * Recorta a imagem para rosto + ombros + parte do tronco (topo ~55% da altura).
 * Dá referência de proporções ao modelo; o prompt pede corpo com mesmas proporções da pessoa.
 * Retorna data URL JPEG para enviar ao Gemini.
 */
export async function cropPersonImageToFaceForGemini(personImageUrl: string): Promise<string> {
  const { buffer } = await imageUrlToBuffer(personImageUrl);
  const meta = await sharp(buffer).metadata();
  const w = meta.width ?? 400;
  const h = meta.height ?? 600;
  const cropH = Math.max(200, Math.round(h * FACE_CROP_HEIGHT_RATIO));
  const out = await sharp(buffer)
    .extract({ left: 0, top: 0, width: w, height: cropH })
    .jpeg({ quality: 94 })
    .toBuffer();
  const base64 = out.toString("base64");
  return `data:image/jpeg;base64,${base64}`;
}

/**
 * Aplica estilização leve (soft fashion) na imagem da pessoa.
 * Retorna data URL (sempre JPEG) para enviar ao Gemini.
 */
export async function stylizePersonImageForGemini(personImageUrl: string): Promise<string> {
  const { buffer } = await imageUrlToBuffer(personImageUrl);
  const out = await sharp(buffer)
    .blur(BLUR_SIGMA)
    .sharpen({ sigma: SHARPEN_SIGMA })
    .modulate({ saturation: 1.05 })
    .jpeg({ quality: STYLIZE_QUALITY })
    .toBuffer();
  const base64 = out.toString("base64");
  return `data:image/jpeg;base64,${base64}`;
}
