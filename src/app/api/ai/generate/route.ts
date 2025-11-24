/**
 * API Route: Geração de Imagem com Gemini 2.5 Flash Image
 * POST /api/ai/generate
 * 
 * Fluxo: Valida Saldo -> Chama Gemini Flash Image -> Salva no Firestore -> Retorna URL
 */

import { NextRequest, NextResponse } from "next/server";
import { generateImagenPrompt } from "@/lib/ai/gemini-prompt";
import { getGeminiFlashImageService } from "@/lib/ai-services/gemini-flash-image";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getStorage } from "firebase-admin/storage";
import { getAdminApp } from "@/lib/firebaseAdmin";

const db = getAdminDb();

// Custo estimado por geração (em créditos)
const COST_PER_GENERATION = 1;

/**
 * Valida se o lojista tem saldo suficiente
 */
async function validateBalance(lojistaId: string): Promise<boolean> {
  try {
    let lojistaDoc = await db.collection("lojistas").doc(lojistaId).get();
    
    // Se não existe em lojistas, tentar criar a partir de lojas
    if (!lojistaDoc.exists) {
      const lojaDoc = await db.collection("lojas").doc(lojistaId).get();
      if (lojaDoc.exists) {
        // Criar documento em lojistas baseado nos dados de lojas
        const lojaData = lojaDoc.data();
        await db.collection("lojistas").doc(lojistaId).set({
          lojistaId: lojistaId,
          nome: lojaData?.nome || lojaData?.name || "",
          email: lojaData?.email || "",
          aiCredits: 0,
          saldo: 0,
          totalCreditsAdded: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        // Buscar novamente após criar
        lojistaDoc = await db.collection("lojistas").doc(lojistaId).get();
      } else {
        return false;
      }
    }

    const lojistaData = lojistaDoc.data();
    const credits = lojistaData?.aiCredits || lojistaData?.saldo || 0;

    return credits >= COST_PER_GENERATION;
  } catch (error) {
    console.error("[API/AI/Generate] Erro ao validar saldo:", error);
    return false;
  }
}

/**
 * Desconta créditos do lojista
 */
async function deductCredits(lojistaId: string, amount: number): Promise<void> {
  try {
    const lojistaRef = db.collection("lojistas").doc(lojistaId);
    const lojaRef = db.collection("lojas").doc(lojistaId);
    
    await db.runTransaction(async (transaction) => {
      let lojistaDoc = await transaction.get(lojistaRef);
      
      // Se não existe em lojistas, tentar criar a partir de lojas
      if (!lojistaDoc.exists) {
        const lojaDoc = await transaction.get(lojaRef);
        if (lojaDoc.exists) {
          // Criar documento em lojistas baseado nos dados de lojas
          const lojaData = lojaDoc.data();
          transaction.set(lojistaRef, {
            lojistaId: lojistaId,
            nome: lojaData?.nome || lojaData?.name || "",
            email: lojaData?.email || "",
            aiCredits: 0,
            saldo: 0,
            totalCreditsAdded: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          // Buscar novamente após criar
          lojistaDoc = await transaction.get(lojistaRef);
        } else {
          throw new Error("Lojista não encontrado");
        }
      }

      const lojistaData = lojistaDoc.data();
      const currentCredits = lojistaData?.aiCredits || lojistaData?.saldo || 0;

      if (currentCredits < amount) {
        throw new Error("Saldo insuficiente");
      }

      const newCredits = currentCredits - amount;
      
      transaction.update(lojistaRef, {
        aiCredits: newCredits,
        saldo: newCredits, // Manter compatibilidade
        lastCreditUpdate: new Date().toISOString(),
      });
    });
  } catch (error) {
    console.error("[API/AI/Generate] Erro ao descontar créditos:", error);
    throw error;
  }
}

/**
 * Salva imagem base64 no Firebase Storage e retorna URL pública
 */
async function saveBase64ToFirebaseStorage(
  base64DataUrl: string,
  lojistaId: string,
  customerId: string
): Promise<string> {
  try {
    // Extrair base64 do data URL (data:image/png;base64,...)
    const base64Match = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Formato de imagem base64 inválido");
    }

    const mimeType = base64Match[1]; // png, jpeg, etc.
    const base64Data = base64Match[2];
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Salvar no Firebase Storage
    const adminApp = getAdminApp();
    const storage = getStorage(adminApp);
    
    // Obter nome do bucket da variável de ambiente ou usar o padrão do projeto
    const bucketName = 
      process.env.FIREBASE_STORAGE_BUCKET || 
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      process.env.FIREBASE_PROJECT_ID + ".appspot.com" ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID + ".appspot.com";
    
    if (!bucketName) {
      throw new Error("Bucket name not specified. Configure FIREBASE_STORAGE_BUCKET or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable.");
    }
    
    const bucket = storage.bucket(bucketName);

    const timestamp = Date.now();
    const fileExtension = mimeType === "png" ? "png" : "jpg";
    const fileName = `composicoes/${lojistaId}/${customerId}/${timestamp}.${fileExtension}`;

    const file = bucket.file(fileName);
    await file.save(imageBuffer, {
      metadata: {
        contentType: `image/${mimeType}`,
        metadata: {
          lojistaId,
          customerId,
          generatedAt: new Date().toISOString(),
          provider: "gemini-flash-image",
        },
      },
    });

    // Tornar público e obter URL
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    console.log("[API/AI/Generate] ✅ Imagem salva no Firebase Storage:", publicUrl);
    return publicUrl;
  } catch (error) {
    console.error("[API/AI/Generate] Erro ao salvar imagem no Firebase Storage:", error);
    throw error;
  }
}

/**
 * Salva composição no Firestore
 */
async function saveComposition(
  lojistaId: string,
  customerId: string,
  imageUrl: string,
  userImageUrl: string,
  productImageUrls: string[]
): Promise<string> {
  try {
    const compositionData = {
      lojistaId,
      customerId,
      imagemUrl: imageUrl,
      userImageUrl,
      productImageUrls,
      createdAt: new Date().toISOString(),
      status: "completed",
      provider: "gemini-flash-image",
      prompt: "Generated via Gemini 2.5 Flash Image",
    };

    const docRef = await db.collection("composicoes").add(compositionData);
    
    return docRef.id;
  } catch (error) {
    console.error("[API/AI/Generate] Erro ao salvar composição:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lojistaId, customerId, userImageUrl, productImageUrl } = body;

    // Validação de entrada
    if (!lojistaId || !userImageUrl) {
      return NextResponse.json(
        { error: "lojistaId e userImageUrl são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar saldo
    const hasBalance = await validateBalance(lojistaId);
    if (!hasBalance) {
      return NextResponse.json(
        { error: "Saldo insuficiente. Recarregue seus créditos." },
        { status: 402 }
      );
    }

    console.log("[API/AI/Generate] Iniciando geração", {
      lojistaId,
      customerId,
      userImageUrl: userImageUrl.substring(0, 100) + "...",
      productImageUrl: productImageUrl ? productImageUrl.substring(0, 100) + "..." : "N/A",
    });

    // Preparar URLs dos produtos
    const productImageUrls = productImageUrl 
      ? (Array.isArray(productImageUrl) ? productImageUrl : [productImageUrl])
      : [];

    // Preparar array de URLs: primeira é a pessoa (IMAGEM_PESSOA), seguintes são produtos
    // Ordem fixa conforme PROMPT_LOOK_CRIATIVO.md:
    // 1. IMAGEM_PESSOA (primeira imagem)
    // 2. IMAGEM_PRODUTO_1, IMAGEM_PRODUTO_2, IMAGEM_PRODUTO_3 (máximo 3)
    const allImageUrls = [userImageUrl, ...productImageUrls.slice(0, 3)]; // Limitar a 3 produtos
    
    // Usar o prompt mestre diretamente do documento PROMPT_LOOK_CRIATIVO.md
    // O prompt já está otimizado para Gemini 2.5 Flash Image
    const masterPrompt = await generateImagenPrompt(userImageUrl, productImageUrls);
    
    console.log("[API/AI/Generate] Gerando imagem com Gemini 2.5 Flash Image usando prompt mestre VTO...");
    console.log("[API/AI/Generate] Total de imagens:", allImageUrls.length, {
      pessoa: 1,
      produtos: allImageUrls.length - 1,
    });
    
    const geminiService = getGeminiFlashImageService();
    const geminiResult = await geminiService.generateImage({
      prompt: masterPrompt,
      imageUrls: allImageUrls,
      aspectRatio: "1:1",
    });

    if (!geminiResult.success || !geminiResult.data?.imageUrl) {
      throw new Error(geminiResult.error || "Falha ao gerar imagem com Gemini Flash Image");
    }

    // A imagem vem em base64 (data:image/png;base64,...)
    // Precisamos salvar no Firebase Storage e retornar a URL pública
    let imageUrl = geminiResult.data.imageUrl;
    
    // Se for base64, salvar no Firebase Storage
    if (imageUrl.startsWith("data:image/")) {
      console.log("[API/AI/Generate] Convertendo imagem base64 para Firebase Storage...");
      imageUrl = await saveBase64ToFirebaseStorage(
        imageUrl,
        lojistaId,
        customerId || "anonymous"
      );
    }

    // PASSO 3: Descontar créditos
    console.log("[API/AI/Generate] Passo 3: Descontando créditos...");
    await deductCredits(lojistaId, COST_PER_GENERATION);

    // PASSO 4: Salvar no Firestore
    console.log("[API/AI/Generate] Passo 4: Salvando composição no Firestore...");
    const compositionId = await saveComposition(
      lojistaId,
      customerId || "anonymous",
      imageUrl,
      userImageUrl,
      productImageUrls
    );

    console.log("[API/AI/Generate] ✅ Geração concluída com sucesso", {
      compositionId,
      imageUrl: imageUrl.substring(0, 100) + "...",
    });

    return NextResponse.json({
      success: true,
      imageUrl,
      compositionId,
      prompt: masterPrompt, // Usar masterPrompt que foi gerado anteriormente
      provider: "gemini-flash-image",
    });
  } catch (error: any) {
    console.error("[API/AI/Generate] Erro:", error);
    
    return NextResponse.json(
      {
        error: error.message || "Erro ao gerar imagem",
        success: false,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

