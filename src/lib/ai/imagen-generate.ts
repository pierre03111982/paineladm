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
    // Validar URL
    if (!imageUrl || typeof imageUrl !== "string" || imageUrl.trim().length === 0) {
      throw new Error("URL da imagem é inválida ou vazia");
    }

    console.log(`[ImagenGenerate] Baixando imagem de: ${imageUrl.substring(0, 150)}...`);
    
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ExperimenteAI/1.0)',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Falha ao baixar imagem: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`);
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
    
    // Validar que o buffer não está vazio
    if (buffer.length === 0) {
      throw new Error("Imagem baixada está vazia");
    }
    
    // Imagen 3 tem melhor suporte para JPEG/PNG, converter outros formatos
    // Converter sempre para JPEG para garantir compatibilidade
    const formatosConvertiveis = ["image/webp", "image/gif", "image/png"];
    if (formatosConvertiveis.includes(mimeType) && sharp) {
      console.log(`[ImagenGenerate] Convertendo ${mimeType} para JPEG...`);
      try {
        buffer = await sharp(buffer)
          .jpeg({ quality: 90 })
          .toBuffer();
        mimeType = "image/jpeg";
        console.log("[ImagenGenerate] Conversão para JPEG concluída com sucesso");
      } catch (sharpError: any) {
        console.error("[ImagenGenerate] Erro ao converter com sharp:", sharpError?.message);
        throw new Error(`Falha ao converter imagem para JPEG: ${sharpError?.message}`);
      }
    } else if (formatosConvertiveis.includes(mimeType) && !sharp) {
      throw new Error(`Formato ${mimeType} requer conversão para JPEG, mas a biblioteca sharp não está disponível`);
    }
    
    // Garantir que temos um tipo MIME válido para imagem
    if (!mimeType || !mimeType.startsWith("image/")) {
      // Forçar JPEG como padrão seguro
      console.warn(`[ImagenGenerate] Tipo MIME inválido detectado (${mimeType}), usando JPEG como padrão`);
      mimeType = "image/jpeg";
    }
    
    const base64 = buffer.toString("base64");
    
    // Validar que o base64 não está vazio
    if (!base64 || base64.length === 0) {
      throw new Error("Falha ao converter imagem para base64");
    }
    
    console.log(`[ImagenGenerate] Imagem convertida: ${mimeType}, tamanho: ${buffer.length} bytes, base64 length: ${base64.length}`);
    
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
    
    // Obter nome do bucket da variável de ambiente ou usar o padrão do projeto
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 
                      process.env.FIREBASE_PROJECT_ID || 
                      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    const bucketName = 
      process.env.FIREBASE_STORAGE_BUCKET || 
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      (projectId ? `${projectId}.appspot.com` : null);
    
    if (!bucketName) {
      throw new Error("Bucket name not specified. Configure FIREBASE_STORAGE_BUCKET or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable, or set FIREBASE_PROJECT_ID.");
    }
    
    console.log("[ImagenGenerate] Usando bucket do Firebase Storage:", bucketName);
    const bucket = storage.bucket(bucketName);

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
 * Usa Gemini 2.5 Flash Image conforme documentação oficial
 * https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-image
 */
export async function generateCatalogImage(
  prompt: string,
  productImageUrl: string,
  lojistaId: string,
  produtoId: string
): Promise<string> {
  console.log("[GeminiFlashImage] Iniciando geração de imagem de catálogo", {
    promptLength: prompt.length,
    productImageUrl: productImageUrl.substring(0, 100) + "...",
    lojistaId,
    produtoId,
  });

  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || IMAGEN_CONFIG.projectId;
  const location = process.env.GOOGLE_CLOUD_LOCATION || IMAGEN_CONFIG.location;

  if (!projectId) {
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

    console.log("[GeminiFlashImage] Dados da imagem do produto:", {
      hasBase64: !!productImageData.base64,
      base64Length: productImageData.base64?.length || 0,
      mimeType: productImageData.mimeType,
      imageUrl: productImageUrl.substring(0, 100),
    });

    // Validar que temos dados válidos
    if (!productImageData.base64) {
      throw new Error("Falha ao converter imagem do produto para base64");
    }

    // Garantir que o mimeType é válido
    if (!productImageData.mimeType || !productImageData.mimeType.startsWith("image/")) {
      console.warn(`[GeminiFlashImage] MimeType inválido detectado (${productImageData.mimeType}), forçando image/jpeg`);
      productImageData.mimeType = "image/jpeg";
    }

    // Preparar payload conforme documentação do Gemini 2.5 Flash Image
    // Endpoint: POST .../models/gemini-2.5-flash-image:generateContent
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-2.5-flash-image:generateContent`;

    // Estrutura da requisição conforme documentação:
    // contents: [{ role: "user", parts: [{ inlineData: {...} }, { text: "..." }] }]
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            // Imagem de entrada (produto)
            {
              inlineData: {
                mimeType: productImageData.mimeType,
                data: productImageData.base64,
              },
            },
            // Prompt de texto
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
      // NOTA: responseModalities NÃO é suportado e não deve ser incluído
    };

    console.log("[GeminiFlashImage] 📤 Enviando requisição para:", endpoint);
    console.log("[GeminiFlashImage] Estrutura do payload:", {
      contentsCount: requestBody.contents.length,
      partsCount: requestBody.contents[0].parts.length,
      hasImage: !!requestBody.contents[0].parts[0].inlineData,
      hasPrompt: !!requestBody.contents[0].parts[1].text,
      promptLength: requestBody.contents[0].parts[1].text?.length || 0,
      imageMimeType: requestBody.contents[0].parts[0].inlineData?.mimeType,
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        // Se não conseguir parsear, usar o texto como está
      }
      
      console.error("[GeminiFlashImage] ❌ Erro na resposta da API:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        rawError: errorText,
      });
      
      throw new Error(`Erro ao gerar imagem: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("[GeminiFlashImage] ✅ Resposta da API recebida");

    // Estrutura da resposta do Gemini:
    // { candidates: [{ content: { parts: [{ inlineData: { mimeType, data } }] } }] }
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("Nenhuma imagem foi gerada - candidates vazio");
    }

    const candidate = data.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error("Resposta da API não contém parts");
    }

    const imagePart = candidate.content.parts.find((part: any) => part.inlineData);
    if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
      throw new Error("Imagem gerada não contém dados base64");
    }

    const generatedImageBase64 = imagePart.inlineData.data;
    const generatedMimeType = imagePart.inlineData.mimeType || "image/png";

    console.log("[GeminiFlashImage] ✅ Imagem gerada:", {
      mimeType: generatedMimeType,
      base64Length: generatedImageBase64.length,
    });

    // Salvar no Firebase Storage
    const publicUrl = await saveCatalogImageToStorage(
      generatedImageBase64,
      lojistaId,
      produtoId
    );

    console.log("[GeminiFlashImage] ✅ Imagem de catálogo salva com sucesso:", publicUrl);
    return publicUrl;
  } catch (error: any) {
    console.error("[GeminiFlashImage] ❌ Erro ao gerar imagem de catálogo:", error);
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
    
    // Obter nome do bucket da variável de ambiente ou usar o padrão do projeto
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 
                      process.env.FIREBASE_PROJECT_ID || 
                      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    const bucketName = 
      process.env.FIREBASE_STORAGE_BUCKET || 
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      (projectId ? `${projectId}.appspot.com` : null);
    
    if (!bucketName) {
      throw new Error("Bucket name not specified. Configure FIREBASE_STORAGE_BUCKET or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable, or set FIREBASE_PROJECT_ID.");
    }
    
    console.log("[GeminiFlashImage] Usando bucket do Firebase Storage:", bucketName);
    const bucket = storage.bucket(bucketName);

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

