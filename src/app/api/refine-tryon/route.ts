/**
 * API Route: Refinamento de Look (Edição Incremental)
 * POST /api/refine-tryon
 * 
 * Adiciona 1 ou 2 acessórios a uma composição já gerada, preservando a pessoa e roupa base
 */

import { NextRequest, NextResponse } from "next/server";
import { getGeminiFlashImageService } from "@/lib/ai-services/gemini-flash-image";
import { logAPICost } from "@/lib/ai-services/cost-logger";
import { getAdminDb, getAdminStorage } from "@/lib/firebaseAdmin";
import { randomUUID } from "crypto";

const db = getAdminDb();
const storage = (() => {
  try {
    return getAdminStorage();
  } catch (error) {
    console.warn("[RefineTryOn] Storage indisponível:", error);
    return null;
  }
})();
const bucket =
  storage && process.env.FIREBASE_STORAGE_BUCKET
    ? storage.bucket(process.env.FIREBASE_STORAGE_BUCKET)
    : null;

/**
 * Salva imagem base64 no Firebase Storage e retorna URL pública
 */
async function saveBase64ImageToStorage(
  base64DataUrl: string,
  lojistaId: string,
  customerId: string
): Promise<string> {
  if (!bucket) {
    throw new Error("Firebase Storage não configurado");
  }

  try {
    // Extrair base64 do data URL (data:image/png;base64,...)
    const base64Match = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Formato de imagem base64 inválido");
    }

    const imageType = base64Match[1] || "png";
    const base64Data = base64Match[2];

    // Converter base64 para Buffer
    const buffer = Buffer.from(base64Data, "base64");

    // Criar caminho único para o arquivo
    const timestamp = Date.now();
    const fileExtension = imageType === "jpeg" ? "jpg" : imageType;
    const fileName = `composicoes/${lojistaId}/${customerId}/refined-${timestamp}-${randomUUID()}.${fileExtension}`;
    const token = randomUUID();

    // Fazer upload para Firebase Storage
    const file = bucket.file(fileName);
    await file.save(buffer, {
      metadata: {
        contentType: `image/${imageType}`,
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      },
      resumable: false,
    });

    // Tornar o arquivo público
    await file.makePublic();

    // Gerar URL pública (formato correto do Firebase Storage)
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
      fileName
    )}?alt=media&token=${token}`;

    console.log("[RefineTryOn] Imagem salva no Storage:", {
      fileName,
      publicUrl: publicUrl.substring(0, 100) + "...",
    });

    return publicUrl;
  } catch (error) {
    console.error("[RefineTryOn] Erro ao salvar imagem no Storage:", error);
    throw error;
  }
}

export const dynamic = 'force-dynamic';

// REFINAMENTO VISUAL: Prompt Mestre de Edição Incremental com preservação de identidade e realismo
const REFINEMENT_PROMPT = `⚠️⚠️⚠️ IDENTITY LOCK: The input person's face, body shape, skin tone, and pose MUST BE PRESERVED EXACTLY.
- Do NOT generate a new model.
- Do NOT change ethnicity or age.
- Imagine you are dressing THIS specific person.
- If the face is visible in the input, the output face must match 100%.
- Maintain exact facial features, bone structure, and body proportions.
- Preserve all unique physical characteristics (scars, freckles, body shape, etc.).

📸 PHOTOREALISM RULES:
- LIGHTING MATCH: Analyze the light source in the IMAGEM_BASE. Apply exactly the same lighting direction, temperature, and intensity to the new products.
- SHADOWS: Cast realistic soft shadows based on the scene's existing light. The person and new products must look grounded, not floating.
- CLOTHING FIT: The new products must integrate naturally with the person's specific body shape. Create realistic fabric folds, tension, and texture. No 'sticker' effect.
- DEPTH INTEGRATION: The new products must appear physically present in the scene, not pasted on top. Match depth of field and atmospheric perspective.
- COLOR GRADING: Match color temperature and saturation between new products and existing scene for seamless integration.

🔄 INPAINTING LOGIC: You must conceptually integrate the new products naturally into the existing look. Do NOT change the existing clothes or person.

📐 OUTPUT FORMAT (9:16 VERTICAL - MANDATORY):
- The output MUST be vertical (9:16 aspect ratio) - MOBILE FIRST format
- Maintain the exact same composition and framing from IMAGEM_BASE
- NEVER generate horizontal or square images - ALWAYS 9:16 vertical
- Preserve the exact background scenario from IMAGEM_BASE

🚫 FORBIDDEN SCENARIOS:
- NO night scenes, dark backgrounds, evening, sunset, dusk, or any nighttime setting
- NO neon-lit streets, cyberpunk aesthetics, or artificial night lighting
- ALWAYS use well-lit daytime environments with natural sunlight
- If IMAGEM_BASE has night scene, convert it to daytime with natural lighting

⚠️ INSTRUÇÃO CRÍTICA ABSOLUTA: EDIÇÃO INCREMENTAL DE ACESSÓRIOS.
META: Receber a IMAGEM_BASE (primeira imagem: contém a pessoa e o look completo) e adicionar de forma fotorrealista e natural o(s) PRODUTO(S)_NOVO(S) (imagens subsequentes).
🎯 PRIORIZAÇÃO ABSOLUTA E INEGOCIÁVEL (P0): ESTABILIDADE MÁXIMA.

A IMAGEM_BASE (pessoa, roupa, pose, caimento, cenário, iluminação) é o TEMPLATE FINAL INTOCÁVEL. A IA NÃO TEM PERMISSÃO para alterar a identidade da pessoa, nem a roupa, caimento, proporção de estampa ou fundo já presentes.

A única mudança permitida é a INTEGRAÇÃO FÍSICA E NATURAL do(s) PRODUTO(S)_NOVO(S) (Prioridade 1 - P1).

REGRAS:

PRESERVAR IDENTIDADE: A pessoa na IMAGEM_BASE deve ser 100% IDÊNTICA.

PRESERVAR LOOK: O vestuário, caimento e estampa na IMAGEM_BASE devem ser 100% IDÊNTICOS.

FIDELIDADE DO PRODUTO NOVO: O(s) produto(s) novo(s) deve(m) ser integrados com realismo fotorrealista, correta iluminação e sombras que correspondem EXATAMENTE à iluminação da IMAGEM_BASE.

QUALIDADE: Fotografia profissional ultra-realista 8K.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      baseImageUrl,
      newProductUrls,
      lojistaId,
      customerId,
      compositionId,
    } = body;

    // Validações
    if (!baseImageUrl || typeof baseImageUrl !== 'string') {
      return NextResponse.json(
        { error: "baseImageUrl é obrigatório e deve ser uma string" },
        { status: 400 }
      );
    }

    if (!newProductUrls || !Array.isArray(newProductUrls)) {
      return NextResponse.json(
        { error: "newProductUrls é obrigatório e deve ser um array" },
        { status: 400 }
      );
    }

    if (newProductUrls.length === 0 || newProductUrls.length > 2) {
      return NextResponse.json(
        { error: "newProductUrls deve conter entre 1 e 2 URLs de produtos" },
        { status: 400 }
      );
    }

    // Validar que todas as URLs são válidas
    for (const url of newProductUrls) {
      if (typeof url !== 'string' || !url.startsWith('http')) {
        return NextResponse.json(
          { error: "Todas as URLs de produtos devem ser válidas e começar com 'http'" },
          { status: 400 }
        );
      }
    }

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    console.log("[RefineTryOn] Iniciando refinamento:", {
      lojistaId,
      customerId,
      compositionId,
      baseImageUrl: baseImageUrl.substring(0, 100) + "...",
      newProductUrlsCount: newProductUrls.length,
      newProductUrls: newProductUrls.map((url: string) => url.substring(0, 80) + "..."),
    });

    // Construir array de imagens: primeira é a base, seguintes são os produtos novos
    const imageUrls = [
      baseImageUrl, // IMAGEM_BASE (primeira imagem)
      ...newProductUrls, // IMAGENS_DE_PRODUTO_NOVO (seguintes)
    ];

    // Chamar Gemini Flash Image Service com o prompt de refinamento
    // REFINAMENTO VISUAL: Forçar proporção 9:16 e melhorar realismo
    const geminiService = getGeminiFlashImageService();
    const geminiResult = await geminiService.generateImage({
      prompt: REFINEMENT_PROMPT,
      imageUrls: imageUrls,
      aspectRatio: "9:16", // REFINAMENTO VISUAL: Sempre vertical
      negativePrompt: "(night scene:2.0), (dark background:2.0), (evening:2.0), (sunset:2.0), (dusk:2.0), (nighttime:2.0), (neon lights:2.0), (cyberpunk:2.0), (artificial night lighting:2.0), (floating:2.0), (sticker effect:2.0), (bad shadows:2.0), (wrong lighting:2.0)",
    });

    if (!geminiResult.success || !geminiResult.data) {
      console.error("[RefineTryOn] Erro ao gerar imagem refinada:", geminiResult.error);
      return NextResponse.json(
        {
          error: "Erro ao gerar imagem refinada",
          details: geminiResult.error || "Erro desconhecido",
        },
        { status: 500 }
      );
    }

    let refinedImageUrl = geminiResult.data.imageUrl;
    const cost = geminiResult.cost || 0;

    // Se a imagem vier em base64 (data:image/png;base64,...), salvar no Firebase Storage
    if (refinedImageUrl.startsWith("data:image/")) {
      console.log("[RefineTryOn] Convertendo imagem base64 para Firebase Storage...");
      try {
        refinedImageUrl = await saveBase64ImageToStorage(
          refinedImageUrl,
          lojistaId,
          customerId || "anonymous"
        );
        console.log("[RefineTryOn] Imagem salva no Firebase Storage:", refinedImageUrl.substring(0, 100) + "...");
      } catch (storageError) {
        console.error("[RefineTryOn] Erro ao salvar imagem no Storage:", storageError);
        // Se falhar, retornar erro pois blob URLs não funcionam no servidor
        return NextResponse.json(
          {
            error: "Erro ao salvar imagem refinada",
            details: storageError instanceof Error ? storageError.message : "Erro desconhecido ao salvar no Storage",
          },
          { status: 500 }
        );
      }
    }

    // Calcular custo reduzido (50% do custo de uma geração completa)
    // O custo já vem do Gemini, então vamos usar metade dele para o refinamento
    const refinementCost = cost * 0.5;

    console.log("[RefineTryOn] Imagem refinada gerada com sucesso:", {
      refinedImageUrl: refinedImageUrl.substring(0, 100) + "...",
      cost: refinementCost,
      originalCost: cost,
      isBase64: refinedImageUrl.startsWith("data:image/"),
    });

    // Log do custo
    if (compositionId) {
      await logAPICost({
        lojistaId,
        compositionId,
        provider: "gemini-flash-image",
        operation: "other",
        cost: refinementCost,
        currency: "USD",
      }).catch((error) => {
        console.error("[RefineTryOn] Erro ao registrar custo:", error);
      });
    }

    // Criar nova composição na coleção principal "composicoes" para refinamento (adicionar acessório)
    // Esta composição só será contabilizada no radar se tiver like
    let newCompositionId: string | null = null; // Declarar fora do bloco para usar depois
    
    if (lojistaId && customerId) {
      try {
        // Buscar dados da composição original se compositionId foi fornecido
        let originalCompositionData: any = null;
        if (compositionId) {
          try {
            const originalRef = db
              .collection("lojas")
              .doc(lojistaId)
              .collection("composicoes")
              .doc(compositionId);
            const originalDoc = await originalRef.get();
            if (originalDoc.exists) {
              originalCompositionData = originalDoc.data();
            }
          } catch (e) {
            console.warn("[RefineTryOn] Não foi possível buscar composição original:", e);
          }
        }

        // Criar nova composição na coleção principal "composicoes"
        const newCompositionData = {
          lojistaId,
          customerId,
          imagemUrl: refinedImageUrl,
          userImageUrl: baseImageUrl, // Imagem base (look anterior)
          productImageUrls: newProductUrls, // Novos produtos adicionados
          createdAt: new Date().toISOString(),
          status: "completed",
          provider: "gemini-flash-image",
          prompt: "Refinement - Adicionar acessórios",
          isRefined: true, // Flag para identificar refinamento
          originalCompositionId: compositionId || null, // ID da composição original
          refinementProducts: newProductUrls,
          produtoNome: originalCompositionData?.produtoNome || originalCompositionData?.primaryProductName || "Produto",
          productName: originalCompositionData?.produtoNome || originalCompositionData?.primaryProductName || "Produto",
          // Inicialmente sem like (só contará no radar se receber like depois)
          curtido: false,
          liked: false,
        };

        const newCompositionRef = await db.collection("composicoes").add(newCompositionData);
        newCompositionId = newCompositionRef.id; // Salvar o ID imediatamente
        console.log("[RefineTryOn] Nova composição de refinamento criada:", newCompositionId);

        // Atualizar composição original também (se existir) para manter histórico
        if (compositionId) {
          try {
            const composicaoRef = db
              .collection("lojas")
              .doc(lojistaId)
              .collection("composicoes")
              .doc(compositionId);

            const composicaoDoc = await composicaoRef.get();
            if (composicaoDoc.exists) {
              const composicaoData = composicaoDoc.data();
              const looks = composicaoData?.looks || [];

              // Adicionar novo look refinado
              const refinedLook = {
                id: `refined-${Date.now()}`,
                titulo: "Look Refinado",
                descricao: `Look refinado com ${newProductUrls.length} acessório(s) adicional(is)`,
                imagemUrl: refinedImageUrl,
                produtoNome: composicaoData?.primaryProductName || "Produto",
                produtoPreco: composicaoData?.primaryProductPrice || null,
                createdAt: new Date(),
                isRefined: true,
                refinementProducts: newProductUrls,
              };

              looks.push(refinedLook);

              await composicaoRef.update({
                looks,
                updatedAt: new Date(),
                refinementCount: (composicaoData?.refinementCount || 0) + 1,
                totalCost: (composicaoData?.totalCost || 0) + refinementCost,
              });

              console.log("[RefineTryOn] Composição original atualizada no Firestore");
            }
          } catch (error) {
            console.error("[RefineTryOn] Erro ao atualizar composição original:", error);
            // Não falhar a requisição se a atualização falhar
          }
        }
      } catch (error) {
        console.error("[RefineTryOn] Erro ao criar composição de refinamento:", error);
        // Não falhar a requisição se o Firestore falhar
      }
    }

    // Retornar o novo compositionId da composição de refinamento criada
    // newCompositionId já foi definido acima quando criamos a composição
    // Se não foi criado (erro), usar o compositionId original como fallback
    const finalCompositionId = newCompositionId || compositionId || null;
    
    console.log("[RefineTryOn] CompositionId a ser retornado:", {
      newCompositionId,
      originalCompositionId: compositionId,
      finalCompositionId,
    });

    return NextResponse.json({
      success: true,
      refinedImageUrl,
      cost: refinementCost,
      originalCost: cost,
      compositionId: newCompositionId || compositionId, // Retornar novo ID se disponível
      newProductsCount: newProductUrls.length,
    });
  } catch (error) {
    console.error("[RefineTryOn] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao refinar look",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

