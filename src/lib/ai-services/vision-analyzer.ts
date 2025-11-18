/**
 * Serviço de análise de imagem usando Google Cloud Vision API
 * Extrai características visuais detalhadas de imagens de óculos
 */

import { getAdminApp } from "@/lib/firebaseAdmin";

/**
 * Configuração do Vision API
 */
const VISION_CONFIG = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || "",
  location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
  // Endpoint do Vision API
  endpoint: "https://vision.googleapis.com/v1/images:annotate",
};

/**
 * Analisa uma imagem usando Google Cloud Vision API
 * Extrai: objetos, cores, labels, texto, etc.
 */
export async function analyzeImageWithVision(imageUrl: string): Promise<{
  objects?: Array<{ name: string; score: number }>;
  colors?: Array<{ color: { red: number; green: number; blue: number }; score: number; pixelFraction: number }>;
  labels?: Array<{ description: string; score: number }>;
  text?: string;
}> {
  try {
    if (!VISION_CONFIG.projectId) {
      console.warn("[Vision] GOOGLE_CLOUD_PROJECT_ID não configurado");
      return {};
    }

    // Obter token de autenticação
    const adminApp = getAdminApp();
    if (!adminApp) {
      throw new Error("Firebase Admin não inicializado");
    }

    const client = await adminApp.options.credential?.getAccessToken();
    if (!client || !client.access_token) {
      throw new Error("Não foi possível obter token de acesso");
    }

    const accessToken = client.access_token;

    // Baixar imagem e converter para base64
    let imageBase64: string;
    if (imageUrl.startsWith("data:")) {
      imageBase64 = imageUrl.split(",")[1];
    } else {
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      imageBase64 = Buffer.from(imageBuffer).toString('base64');
    }

    // Fazer requisição para Vision API
    const requestBody = {
      requests: [
        {
          image: {
            content: imageBase64,
          },
          features: [
            {
              type: "OBJECT_LOCALIZATION", // Detecta objetos na imagem
              maxResults: 10,
            },
            {
              type: "IMAGE_PROPERTIES", // Extrai cores dominantes
              maxResults: 10,
            },
            {
              type: "LABEL_DETECTION", // Identifica labels/categorias
              maxResults: 10,
            },
            {
              type: "TEXT_DETECTION", // Detecta texto (se houver)
              maxResults: 10,
            },
          ],
        },
      ],
    };

    console.log("[Vision] Enviando requisição para Vision API...");

    const response = await fetch(VISION_CONFIG.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vision API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const annotations = data.responses?.[0] || {};

    console.log("[Vision] Análise concluída:", {
      objects: annotations.localizedObjectAnnotations?.length || 0,
      colors: annotations.imagePropertiesAnnotation?.dominantColors?.colors?.length || 0,
      labels: annotations.labelAnnotations?.length || 0,
    });

    return {
      objects: annotations.localizedObjectAnnotations?.map((obj: any) => ({
        name: obj.name,
        score: obj.score,
      })),
      colors: annotations.imagePropertiesAnnotation?.dominantColors?.colors,
      labels: annotations.labelAnnotations?.map((label: any) => ({
        description: label.description,
        score: label.score,
      })),
      text: annotations.textAnnotations?.[0]?.description,
    };
  } catch (error) {
    console.error("[Vision] Erro ao analisar imagem:", error);
    return {};
  }
}

/**
 * Converte cor RGB para nome aproximado
 */
function rgbToColorName(r: number, g: number, b: number): string {
  // Cores comuns para óculos
  if (r > 200 && g > 200 && b > 200) return "branco";
  if (r < 50 && g < 50 && b < 50) return "preto";
  if (r > 150 && g < 100 && b < 100) return "vermelho";
  if (r < 100 && g > 150 && b < 100) return "verde";
  if (r < 100 && g < 100 && b > 150) return "azul";
  if (r > 150 && g > 150 && b < 100) return "amarelo";
  if (r > 150 && g < 150 && b > 150) return "roxo";
  if (r > 200 && g > 150 && b < 100) return "laranja";
  if (r > 100 && g > 100 && b > 100) return "cinza";
  if (r > 150 && g > 100 && b < 50) return "dourado";
  if (r > 100 && g > 100 && b > 150) return "prateado";
  return `RGB(${r},${g},${b})`;
}

/**
 * Analisa especificamente uma imagem de óculos e retorna descrição detalhada
 */
export async function analyzeOculosWithVision(oculosImageUrl: string): Promise<string> {
  try {
    console.log("[Vision] Analisando imagem de óculos com Vision API...");

    const analysis = await analyzeImageWithVision(oculosImageUrl);

    const descriptions: string[] = [];

    // Extrair objetos detectados
    if (analysis.objects && analysis.objects.length > 0) {
      const objects = analysis.objects
        .filter((obj) => obj.score > 0.5)
        .map((obj) => obj.name.toLowerCase())
        .join(", ");
      if (objects) {
        descriptions.push(`Objetos detectados: ${objects}`);
      }
    }

    // Extrair cores dominantes
    if (analysis.colors && analysis.colors.length > 0) {
      const topColors = analysis.colors
        .slice(0, 3)
        .map((color) => {
          const { red, green, blue } = color.color;
          const colorName = rgbToColorName(red, green, blue);
          const percentage = Math.round(color.pixelFraction * 100);
          return `${colorName} (${percentage}%)`;
        })
        .join(", ");
      if (topColors) {
        descriptions.push(`Cores dominantes: ${topColors}`);
      }
    }

    // Extrair labels/categorias
    if (analysis.labels && analysis.labels.length > 0) {
      const relevantLabels = analysis.labels
        .filter((label) => label.score > 0.7)
        .slice(0, 5)
        .map((label) => label.description.toLowerCase())
        .join(", ");
      if (relevantLabels) {
        descriptions.push(`Características: ${relevantLabels}`);
      }
    }

    // Construir descrição final
    let finalDescription = "óculos";
    
    if (descriptions.length > 0) {
      finalDescription += ` com as seguintes características extraídas da imagem: ${descriptions.join(". ")}.`;
    } else {
      finalDescription += " com armação moderna e estilo contemporâneo.";
    }

    finalDescription += ` IMPORTANTE: A imagem de referência do óculos mostra o formato exato, cor, estilo e detalhes que devem ser replicados fielmente. O óculos deve ter a mesma aparência visual da imagem de referência, incluindo formato da armação, cor, espessura das hastes, formato das lentes e todos os detalhes visíveis.`;

    console.log("[Vision] Descrição gerada:", finalDescription.substring(0, 100) + "...");

    return finalDescription;
  } catch (error) {
    console.error("[Vision] Erro ao analisar óculos:", error);
    // Fallback para descrição genérica
    return `óculos com armação moderna, estilo contemporâneo, detalhes precisos. IMPORTANTE: A imagem de referência do óculos mostra o formato exato, cor, estilo e detalhes que devem ser replicados fidelmente.`;
  }
}
