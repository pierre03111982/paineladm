/**
 * Serviço Imagen 3 - O "Fotógrafo"
 * 
 * Gera imagens usando Imagen 3 e salva no Firebase Storage
 */

import { getStorage } from "firebase-admin/storage";
import { getAdminApp } from "@/lib/firebaseAdmin";

// Importar sharp dinamicamente para conversão de imagens
let sharp: any = null;
try {
  sharp = require("sharp");
} catch (e) {
  console.warn("[ImagenGenerate] Sharp não disponível, conversão de WEBP desabilitada");
}

const IMAGEN_CONFIG = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || "",
  location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
  // Modelo Imagen 3 conforme documentação oficial
  // https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate#3.0-capability-001
  // 
  // imagen-3.0-capability-001: Suporta customização e edição COM imagens de referência
  //   - NÃO suporta geração pura de texto
  //   - Suporta: Subject customization, Style customization, Image editing
  // 
  // imagegeneration@006: Suporta geração de imagens a partir de texto
  //   - Pode não suportar referenceImages da mesma forma
  //
  // Para composição de looks (virtual try-on), usar imagen-3.0-capability-001 com customização
  model: process.env.IMAGEN_MODEL || "imagen-3.0-capability-001", // Modelo para customização com imagens de referência
};

/**
 * Gera imagem usando Imagen 3 e salva no Firebase Storage
 */
/**
 * Gera imagem usando Imagen 3 com customização de estilo/sujeito
 * Usa imagen-3.0-capability-001 que suporta imagens de referência
 */
export async function generateImagenImage(
  prompt: string,
  userImageUrl: string,
  productImageUrls: string[],
  lojistaId: string,
  customerId: string
): Promise<string> {
  console.log("[ImagenGenerate] Iniciando geração de imagem", {
    promptLength: prompt.length,
    userImageUrl: userImageUrl.substring(0, 100) + "...",
    productCount: productImageUrls.length,
    lojistaId,
    customerId,
  });

  if (!IMAGEN_CONFIG.projectId) {
    throw new Error("GOOGLE_CLOUD_PROJECT_ID não configurado");
  }

  try {
    // Obter token de acesso
    const adminApp = getAdminApp();
    const credential = adminApp.options.credential;
    if (!credential) {
      throw new Error("Credenciais do Firebase Admin não encontradas");
    }

    const tokenResponse = await credential.getAccessToken();
    const accessToken = tokenResponse?.access_token;

    if (!accessToken) {
      throw new Error("Não foi possível obter token de acesso");
    }

    // Converter imagens para base64 com tipo MIME
    const userImageData = await imageUrlToBase64(userImageUrl);
    const productImagesData = await Promise.all(
      productImageUrls.map(url => imageUrlToBase64(url))
    );

    // Preparar payload para imagen-3.0-capability-001 conforme documentação oficial
    // https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/3-0-generate#3.0-capability-001
    // Este modelo usa customização de estilo/sujeito com imagens de referência
    // IMPORTANTE: O prompt DEVE referenciar as imagens usando [1], [2], etc.
    // [1] = primeira imagem (pessoa), [2], [3], etc. = produtos
    
    // Construir prompt com referências às imagens
    // Para subject customization: usar "person from [1]" ou "style from [1]"
    let enhancedPrompt = prompt;
    
    // Se o prompt não contém referências, adicionar automaticamente
    if (!prompt.includes("[1]") && !prompt.includes("[2]")) {
      // Adicionar referências ao prompt
      let promptParts = [prompt];
      
      // Adicionar referência à pessoa [1]
      if (userImageData.base64) {
        promptParts.push("Apply the person's appearance and pose from reference image [1]");
      }
      
      // Adicionar referências aos produtos [2], [3], etc.
      productImagesData.forEach((_, index) => {
        const refNum = index + 2; // [2], [3], [4]...
        promptParts.push(`Include the clothing/style from reference image [${refNum}]`);
      });
      
      enhancedPrompt = promptParts.join(". ");
    }
    
    // Preparar array de imagens de referência
    // IMPORTANTE: Tentar ambas as estruturas possíveis conforme documentação
    // Estrutura 1: mimeType dentro do objeto image
    // Estrutura 2: mimeType no mesmo nível do objeto image
    const referenceImagesArray = [];
    
    // [1] = Pessoa
    if (userImageData.base64) {
      referenceImagesArray.push({
        image: {
          bytesBase64Encoded: userImageData.base64,
          mimeType: userImageData.mimeType, // Tentar dentro do objeto image primeiro
        },
      });
    }
    
    // [2], [3], etc. = Produtos
    productImagesData.forEach((imgData) => {
      referenceImagesArray.push({
        image: {
          bytesBase64Encoded: imgData.base64,
          mimeType: imgData.mimeType, // Tentar dentro do objeto image primeiro
        },
      });
    });
    
    console.log("[ImagenGenerate] Estrutura das imagens de referência:", {
      count: referenceImagesArray.length,
      firstImageStructure: referenceImagesArray[0] ? {
        hasImage: !!referenceImagesArray[0].image,
        imageHasBytesBase64: !!referenceImagesArray[0].image?.bytesBase64Encoded,
        imageHasMimeType: !!referenceImagesArray[0].image?.mimeType,
        imageKeys: Object.keys(referenceImagesArray[0].image || {}),
        topLevelKeys: Object.keys(referenceImagesArray[0] || {}),
        mimeTypeValue: referenceImagesArray[0].image?.mimeType,
        bytesBase64Length: referenceImagesArray[0].image?.bytesBase64Encoded?.length || 0,
      } : null,
      allMimeTypes: referenceImagesArray.map((img: any) => img.image?.mimeType),
    });
    
    const instances = [
      {
        prompt: enhancedPrompt,
        referenceImages: referenceImagesArray,
      },
    ];
    
    console.log("[ImagenGenerate] Prompt ajustado:", {
      originalLength: prompt.length,
      enhancedLength: enhancedPrompt.length,
      referenceCount: referenceImagesArray.length,
      promptPreview: enhancedPrompt.substring(0, 200) + "...",
    });
    
    console.log("[ImagenGenerate] Payload preparado:", {
      promptLength: prompt.length,
      referenceImagesCount: instances[0].referenceImages.length,
      mimeTypes: instances[0].referenceImages.map((img: any) => img.mimeType),
      model: IMAGEN_CONFIG.model,
    });

    // Endpoint correto para Imagen 3 conforme documentação
    // https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api-edit
    const endpoint = `https://${IMAGEN_CONFIG.location}-aiplatform.googleapis.com/v1/projects/${IMAGEN_CONFIG.projectId}/locations/${IMAGEN_CONFIG.location}/publishers/google/models/${IMAGEN_CONFIG.model}:predict`;
    
    console.log("[ImagenGenerate] Endpoint:", endpoint);

    console.log("[ImagenGenerate] Enviando requisição para Imagen 3...");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances,
        parameters: {
          sampleCount: 1,
          aspectRatio: "1:1",
          safetyFilterLevel: "block_some",
          personGeneration: "allow_all",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        // Se não conseguir parsear, usar o texto como está
      }
      
      console.error("[ImagenGenerate] Erro na API:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        rawError: errorText,
        endpoint,
        payloadPreview: JSON.stringify({
          instances: instances.map((inst: any) => ({
            prompt: inst.prompt?.substring(0, 100) + "...",
            referenceImagesCount: inst.referenceImages?.length || 0,
            referenceImagesStructure: inst.referenceImages?.[0] ? {
              hasImage: !!inst.referenceImages[0].image,
              imageHasBytesBase64: !!inst.referenceImages[0].image?.bytesBase64Encoded,
              imageHasMimeType: !!inst.referenceImages[0].image?.mimeType,
              imageKeys: Object.keys(inst.referenceImages[0].image || {}),
              topLevelKeys: Object.keys(inst.referenceImages[0] || {}),
              mimeTypeValue: inst.referenceImages[0].image?.mimeType,
            } : null,
          })),
        }).substring(0, 800),
      });
      
      throw new Error(`Imagen 3 API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("[ImagenGenerate] Resposta recebida");

    // Extrair imagem gerada
    let imageBase64: string | null = null;

    if (data.predictions && data.predictions.length > 0) {
      const prediction = data.predictions[0];
      if (prediction.bytesBase64Encoded) {
        imageBase64 = prediction.bytesBase64Encoded;
      } else if (prediction.imageUri) {
        // Se retornar URI do Cloud Storage, baixar
        const imageResponse = await fetch(prediction.imageUri);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        imageBase64 = buffer.toString("base64");
      }
    }

    if (!imageBase64) {
      throw new Error("Resposta da API não contém imagem gerada");
    }

    console.log("[ImagenGenerate] ✅ Imagem gerada, salvando no Firebase Storage...");

    // Salvar no Firebase Storage
    const imageUrl = await saveToFirebaseStorage(
      imageBase64,
      lojistaId,
      customerId
    );

    console.log("[ImagenGenerate] ✅ Imagem salva:", imageUrl);

    return imageUrl;
  } catch (error) {
    console.error("[ImagenGenerate] Erro ao gerar imagem:", error);
    throw error;
  }
}

/**
 * Converte URL de imagem para base64 e detecta o tipo MIME
 * Converte WEBP para JPEG se necessário (Imagen 3 pode não suportar WEBP)
 */
async function imageUrlToBase64(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Falha ao baixar imagem: ${response.status}`);
    }
    
    // Detectar tipo MIME do Content-Type ou da extensão da URL
    let mimeType = response.headers.get("content-type") || "image/jpeg";
    
    // Se não tiver Content-Type, tentar detectar pela extensão
    if (!mimeType || mimeType === "application/octet-stream") {
      const urlLower = imageUrl.toLowerCase();
      if (urlLower.includes(".png")) {
        mimeType = "image/png";
      } else if (urlLower.includes(".webp")) {
        mimeType = "image/webp";
      } else if (urlLower.includes(".gif")) {
        mimeType = "image/gif";
      } else if (urlLower.includes(".jpg") || urlLower.includes(".jpeg")) {
        mimeType = "image/jpeg";
      } else {
        // Padrão: JPEG
        mimeType = "image/jpeg";
      }
    }
    
    // Validar que é um tipo de imagem válido
    if (!mimeType.startsWith("image/")) {
      throw new Error(`Tipo MIME inválido: ${mimeType}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);
    
    // Imagen 3 pode não suportar WEBP, converter para JPEG
    if (mimeType === "image/webp" && sharp) {
      console.log("[ImagenGenerate] Convertendo WEBP para JPEG...");
      try {
        buffer = await sharp(buffer)
          .jpeg({ quality: 90 })
          .toBuffer();
        mimeType = "image/jpeg";
        console.log("[ImagenGenerate] WEBP convertido para JPEG com sucesso");
      } catch (sharpError) {
        console.warn("[ImagenGenerate] Erro ao converter WEBP com sharp, tentando manter formato original:", sharpError);
        // Se não conseguir converter, manter WEBP e deixar a API decidir
      }
    } else if (mimeType === "image/webp" && !sharp) {
      console.warn("[ImagenGenerate] WEBP detectado mas sharp não disponível. Tentando enviar como WEBP.");
      // Tentar converter para PNG como fallback usando canvas ou manter WEBP
      // Por enquanto, manter WEBP e deixar a API decidir
    }
    
    const base64 = buffer.toString("base64");
    
    console.log(`[ImagenGenerate] Imagem convertida: ${mimeType}, tamanho: ${buffer.length} bytes`);
    
    return { base64, mimeType };
  } catch (error) {
    console.error("[ImagenGenerate] Erro ao converter imagem:", error);
    throw error;
  }
}

/**
 * Salva imagem no Firebase Storage e retorna URL pública
 */
async function saveToFirebaseStorage(
  imageBase64: string,
  lojistaId: string,
  customerId: string
): Promise<string> {
  try {
    const adminApp = getAdminApp();
    const storage = getStorage(adminApp);
    const bucket = storage.bucket();

    // Criar nome único para o arquivo
    const timestamp = Date.now();
    const fileName = `composicoes/${lojistaId}/${customerId}/${timestamp}.jpg`;

    // Converter base64 para buffer
    const imageBuffer = Buffer.from(imageBase64, "base64");

    // Upload para Firebase Storage
    const file = bucket.file(fileName);
    await file.save(imageBuffer, {
      metadata: {
        contentType: "image/jpeg",
        metadata: {
          lojistaId,
          customerId,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    // Tornar público e obter URL
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    return publicUrl;
  } catch (error) {
    console.error("[ImagenGenerate] Erro ao salvar no Firebase Storage:", error);
    throw error;
  }
}

/**
 * Gera imagem de catálogo para produto (Fase 13)
 * Usa Imagen 3 para criar imagem profissional com etiqueta de preço
 */
export async function generateCatalogImage(
  prompt: string,
  productImageUrl: string,
  lojistaId: string,
  produtoId: string
): Promise<string> {
  console.log("[ImagenGenerate] Iniciando geração de imagem de catálogo", {
    promptLength: prompt.length,
    productImageUrl: productImageUrl.substring(0, 100) + "...",
    lojistaId,
    produtoId,
  });

  if (!IMAGEN_CONFIG.projectId) {
    throw new Error("GOOGLE_CLOUD_PROJECT_ID não configurado");
  }

  try {
    // Obter token de acesso
    const adminApp = getAdminApp();
    const credential = adminApp.options.credential;
    if (!credential) {
      throw new Error("Credenciais do Firebase Admin não encontradas");
    }

    const tokenResponse = await credential.getAccessToken();
    const accessToken = tokenResponse?.access_token;

    if (!accessToken) {
      throw new Error("Não foi possível obter token de acesso");
    }

    // Converter imagem do produto para base64
    const productImageData = await imageUrlToBase64(productImageUrl);

    // Preparar array de imagens de referência (apenas o produto)
    const referenceImagesArray = [{
      image: {
        bytesBase64Encoded: productImageData.base64,
        mimeType: productImageData.mimeType,
      },
    }];

    const instances = [
      {
        prompt: prompt,
        referenceImages: referenceImagesArray,
      },
    ];

    // Endpoint para Imagen 3
    const endpoint = `https://${IMAGEN_CONFIG.location}-aiplatform.googleapis.com/v1/projects/${IMAGEN_CONFIG.projectId}/locations/${IMAGEN_CONFIG.location}/publishers/google/models/${IMAGEN_CONFIG.model}:predict`;

    console.log("[ImagenGenerate] Enviando requisição para Imagen 3 (catálogo)...");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances,
        parameters: {
          sampleCount: 1,
          aspectRatio: "16:9",
          negativePrompt: "low quality, blurry, distorted, watermark, text overlay, people, faces",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ImagenGenerate] Erro na resposta da API:", errorText);
      throw new Error(`Erro ao gerar imagem: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("[ImagenGenerate] Resposta recebida da API:", {
      hasPredictions: !!data.predictions,
      predictionsCount: data.predictions?.length || 0,
    });

    if (!data.predictions || data.predictions.length === 0) {
      throw new Error("Nenhuma imagem foi gerada");
    }

    const generatedImageBase64 = data.predictions[0].bytesBase64Encoded;
    if (!generatedImageBase64) {
      throw new Error("Imagem gerada não contém dados base64");
    }

    // Salvar no Firebase Storage
    const publicUrl = await saveCatalogImageToStorage(
      generatedImageBase64,
      lojistaId,
      produtoId
    );

    console.log("[ImagenGenerate] Imagem de catálogo gerada com sucesso:", publicUrl);
    return publicUrl;
  } catch (error: any) {
    console.error("[ImagenGenerate] Erro ao gerar imagem de catálogo:", error);
    throw error;
  }
}

/**
 * Salva imagem de catálogo no Firebase Storage
 */
async function saveCatalogImageToStorage(
  imageBase64: string,
  lojistaId: string,
  produtoId: string
): Promise<string> {
  try {
    const adminApp = getAdminApp();
    const storage = getStorage(adminApp);
    const bucket = storage.bucket();

    // Criar nome único para o arquivo
    const timestamp = Date.now();
    const fileName = `catalogos/${lojistaId}/${produtoId}/${timestamp}.jpg`;

    // Converter base64 para buffer
    const imageBuffer = Buffer.from(imageBase64, "base64");

    // Upload para Firebase Storage
    const file = bucket.file(fileName);
    await file.save(imageBuffer, {
      metadata: {
        contentType: "image/jpeg",
        metadata: {
          lojistaId,
          produtoId,
          tipo: "catalogo",
          generatedAt: new Date().toISOString(),
        },
      },
    });

    // Tornar público e obter URL
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    return publicUrl;
  } catch (error) {
    console.error("[ImagenGenerate] Erro ao salvar catálogo no Firebase Storage:", error);
    throw error;
  }
}

