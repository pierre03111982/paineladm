import { NextResponse } from "next/server";
import { registerFavoriteLook, updateClienteComposicoesStats } from "@/lib/firestore/server";
import { handleLike, handleDislike, saveGeneration } from "@/lib/firestore/generations";

const ALLOWED_METHODS = ["POST", "OPTIONS"];

function buildCorsHeaders() {
  const origin =
    process.env.NEXT_PUBLIC_CLIENT_APP_URL ?? "http://localhost:3000";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": ALLOWED_METHODS.join(", "),
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}

export async function POST(request: Request) {
  try {
    const {
      action,
      compositionId,
      jobId,
      lojistaId,
      customerId,
      customerName,
      productName,
      productPrice,
      imagemUrl,
      reason,
      uploadImageUrl, // URL da imagem de upload original (para hash)
      productIds, // Array de IDs dos produtos
      feedbackCategory, // 'style' ou 'technical'
    } =
      (await request.json()) as {
        action?: "like" | "dislike" | "share" | "checkout";
        compositionId?: string | null;
        jobId?: string | null;
        lojistaId?: string | null;
        customerId?: string | null;
        customerName?: string | null;
        productName?: string | null;
        productPrice?: number | null;
        imagemUrl?: string | null;
        reason?: string | null;
        uploadImageUrl?: string | null;
        productIds?: string[];
        feedbackCategory?: "style" | "technical" | null;
      };

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Ação obrigatória." },
        { status: 400, headers: buildCorsHeaders() }
      );
    }

    if (!lojistaId) {
      return NextResponse.json(
        { success: false, error: "lojistaId obrigatório." },
        { status: 400, headers: buildCorsHeaders() }
      );
    }

    // NOVO SISTEMA: Usar coleção 'generations' para controle de feedback e Radar
    if ((action === "like" || action === "dislike") && customerId && lojistaId) {
      try {
        // Extrair productIds - pode vir como array ou precisar buscar da composição
        let finalProductIds: string[] = [];
        if (Array.isArray(productIds) && productIds.length > 0) {
          finalProductIds = productIds;
        } else if (compositionId) {
          // Buscar productIds da composição se não foram fornecidos
          try {
            const { getAdminDb } = await import("@/lib/firebaseAdmin");
            const db = getAdminDb();
            if (!db) {
              throw new Error("Firebase Admin não inicializado");
            }
            
            // Tentar buscar da composição na subcoleção
            try {
            const composicaoRef = db
              .collection("lojas")
              .doc(lojistaId)
              .collection("composicoes")
              .doc(compositionId);
            const composicaoDoc = await composicaoRef.get();
            if (composicaoDoc.exists) {
              const data = composicaoDoc.data();
              finalProductIds = data?.produtos?.map((p: any) => p.id) || 
                                 data?.productIds ||
                                 (data?.primaryProductId ? [data.primaryProductId] : []);
              }
            } catch (subError) {
              // Tentar buscar na collection raiz
              try {
                const composicaoRef = db.collection("composicoes").doc(compositionId);
                const composicaoDoc = await composicaoRef.get();
                if (composicaoDoc.exists) {
                  const data = composicaoDoc.data();
                  finalProductIds = data?.produtos?.map((p: any) => p.id) || 
                                   data?.productIds ||
                               (data?.primaryProductId ? [data.primaryProductId] : []);
                }
              } catch (rootError) {
                console.warn("[api/actions] Erro ao buscar productIds da composição (raiz):", rootError);
              }
            }
            
            // Se ainda não encontrou, tentar buscar da generation
            if (finalProductIds.length === 0) {
              try {
                const generationsRef = db.collection("generations");
                const generationQuery = await generationsRef
                  .where("compositionId", "==", compositionId)
                  .where("lojistaId", "==", lojistaId)
                  .limit(1)
                  .get();
                
                if (!generationQuery.empty) {
                  const genData = generationQuery.docs[0].data();
                  finalProductIds = genData?.productIds || genData?.produtos?.map((p: any) => p.id) || [];
                }
              } catch (genError) {
                console.warn("[api/actions] Erro ao buscar productIds da generation:", genError);
              }
            }
          } catch (error) {
            console.warn("[api/actions] Erro ao buscar productIds da composição:", error);
          }
        }

        if (action === "like") {
          // NOVO: Usar handleLike com lógica de prevenção de duplicatas
          const { generationId, showInRadar } = await handleLike({
            lojistaId,
            userId: customerId,
            compositionId: compositionId ?? null,
            jobId: jobId ?? null,
            imagemUrl: imagemUrl ?? null,
            uploadImageUrl: uploadImageUrl ?? null,
            productIds: finalProductIds,
            productName: productName ?? null,
            customerName: customerName ?? null,
          });

          console.log("[api/actions] Generation criada/atualizada:", {
            generationId,
            showInRadar,
            compositionId,
          });

          // MANTER COMPATIBILIDADE: Registrar também como favorito (sistema antigo)
          try {
            await registerFavoriteLook({
              lojistaId,
              customerId,
              customerName,
              compositionId: compositionId ?? null,
              jobId: jobId ?? null,
              imagemUrl: imagemUrl ?? null,
              productName: productName ?? null,
              productPrice: typeof productPrice === "number" ? productPrice : null,
            });
          } catch (favoriteError: any) {
            console.warn("[api/actions] Erro ao registrar favorito (sistema antigo):", favoriteError);
            // Não falhar se o favorito falhar
          }
        } else if (action === "dislike") {
          // NOVO: Usar handleDislike com feedbackReason obrigatório
          if (!reason || reason.trim() === "") {
            return NextResponse.json(
              { success: false, error: "feedbackReason é obrigatório para dislike." },
              { status: 400, headers: buildCorsHeaders() }
            );
          }

          const generationId = await handleDislike({
            lojistaId,
            userId: customerId,
            compositionId: compositionId ?? null,
            jobId: jobId ?? null,
            imagemUrl: imagemUrl ?? null,
            uploadImageUrl: uploadImageUrl ?? null,
            productIds: finalProductIds,
            productName: productName ?? null,
            customerName: customerName ?? null,
            feedbackReason: reason.trim(),
            feedbackCategory: feedbackCategory || null,
          });

          console.log("[api/actions] Generation de dislike criada/atualizada:", {
            generationId,
            compositionId,
          });

          // MANTER COMPATIBILIDADE: Registrar também como favorito (sistema antigo)
          try {
            const { getAdminDb } = await import("@/lib/firebaseAdmin");
            const db = getAdminDb();
            const favoritosRef = db
              .collection("lojas")
              .doc(lojistaId)
              .collection("clientes")
              .doc(customerId)
              .collection("favoritos");
            
            await favoritosRef.add({
              lojistaId,
              customerId,
              customerName: customerName ?? null,
              compositionId: compositionId ?? null,
              jobId: jobId ?? null,
              imagemUrl: null, // Não salvar imagemUrl para dislikes
              productName: productName ?? null,
              productPrice: typeof productPrice === "number" ? productPrice : null,
              lookType: "criativo",
              action: "dislike",
              tipo: "dislike",
              votedType: "dislike",
              dislikeReason: reason ?? null,
              createdAt: new Date(),
            });
          } catch (favoriteError: any) {
            console.warn("[api/actions] Erro ao registrar favorito (sistema antigo):", favoriteError);
            // Não falhar se o favorito falhar
          }
        }

        // Atualizar estatísticas do cliente (totalComposicoes, totalLikes, totalDislikes)
        try {
          await updateClienteComposicoesStats(lojistaId, customerId);
        } catch (updateError) {
          console.error("[api/actions] Erro ao atualizar estatísticas:", updateError);
          // Não falhar a requisição se a atualização falhar
        }
      } catch (generationError: any) {
        console.error("[api/actions] Erro ao processar generation:", generationError);
        // Se o novo sistema falhar, tentar sistema antigo como fallback
        console.warn("[api/actions] Tentando fallback para sistema antigo de favoritos");
        
        // Fallback para sistema antigo (código original)
        if (action === "like") {
          try {
            await registerFavoriteLook({
              lojistaId,
              customerId,
              customerName,
              compositionId: compositionId ?? null,
              jobId: jobId ?? null,
              imagemUrl: imagemUrl ?? null,
              productName: productName ?? null,
              productPrice: typeof productPrice === "number" ? productPrice : null,
            });
          } catch (favoriteError: any) {
            console.error("[api/actions] Erro no fallback de favorito:", favoriteError);
          }
        }
      }
    }

    // Atualizar composição como curtida ou não curtida
    // IMPORTANTE: Atualizar tanto na coleção lojas/{lojistaId}/composicoes quanto na coleção principal "composicoes"
    if (compositionId && (action === "like" || action === "dislike")) {
      try {
        const { getAdminDb } = await import("@/lib/firebaseAdmin");
        const db = getAdminDb();
        
        // 1. Atualizar na coleção lojas/{lojistaId}/composicoes (se existir)
        try {
          const composicaoRef = db
            .collection("lojas")
            .doc(lojistaId)
            .collection("composicoes")
            .doc(compositionId);

          const composicaoDoc = await composicaoRef.get();
          if (composicaoDoc.exists) {
            await composicaoRef.update({
              curtido: action === "like",
              liked: action === "like",
              disliked: action === "dislike",
              dislikeReason: reason ?? null,
              updatedAt: new Date(),
            });
            console.log("[api/actions] Composição atualizada na coleção lojas/{lojistaId}/composicoes:", compositionId);
          }
        } catch (error) {
          console.warn("[api/actions] Composição não encontrada na coleção lojas/{lojistaId}/composicoes:", compositionId);
        }

        // 2. Atualizar na coleção principal "composicoes" (para composições de refinamento e outras)
        try {
          const mainComposicaoRef = db.collection("composicoes").doc(compositionId);
          const mainComposicaoDoc = await mainComposicaoRef.get();
          
          if (mainComposicaoDoc.exists) {
            await mainComposicaoRef.update({
              curtido: action === "like",
              liked: action === "like",
              disliked: action === "dislike",
              dislikeReason: reason ?? null,
              updatedAt: new Date(),
            });
            console.log("[api/actions] Composição atualizada na coleção principal composicoes:", compositionId);
          } else {
            console.warn("[api/actions] Composição não encontrada na coleção principal composicoes:", compositionId);
          }
        } catch (error) {
          console.error("[api/actions] Erro ao atualizar composição na coleção principal:", error);
        }

        // Atualizar estatísticas do cliente também para dislike
        if (action === "dislike" && customerId) {
          try {
            await updateClienteComposicoesStats(lojistaId, customerId);
          } catch (updateError) {
            console.error("[api/actions] Erro ao atualizar estatísticas após dislike:", updateError);
          }
        }
      } catch (updateError) {
        console.error("[api/actions] Erro ao atualizar composição:", updateError);
        // Não falhar a requisição se a atualização falhar
      }
    }

    console.log("[api/actions] Ação registrada:", {
      action,
      lojistaId,
      compositionId,
      customerId,
    });

    return NextResponse.json(
      { success: true, message: "Ação registrada." },
      { status: 200, headers: buildCorsHeaders() }
    );
  } catch (error) {
    console.error("[api/actions] erro ao registrar ação", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao registrar ação.",
      },
      { status: 500, headers: buildCorsHeaders() }
    );
  }
}
