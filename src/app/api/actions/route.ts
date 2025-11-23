import { NextResponse } from "next/server";
import { registerFavoriteLook, updateClienteComposicoesStats } from "@/lib/firestore/server";

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

    // Registrar favorito para likes e dislikes (para contabilização)
    if ((action === "like" || action === "dislike") && customerId) {
      if (action === "like") {
        // Registrar like como favorito
        try {
          console.log("[api/actions] Registrando favorito para like:", {
            lojistaId,
            customerId,
            hasImagemUrl: !!imagemUrl,
            imagemUrl: imagemUrl?.substring(0, 100),
            compositionId,
            jobId,
          });
          
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
          
          console.log("[api/actions] Favorito registrado com sucesso");
        } catch (favoriteError: any) {
          console.error("[api/actions] Erro ao registrar favorito:", favoriteError);
          console.error("[api/actions] Stack do erro:", favoriteError?.stack);
          // Não falhar a requisição se o favorito falhar, mas logar o erro
          // O like ainda será contabilizado na composição
        }
      } else if (action === "dislike") {
        // Registrar dislike na coleção de favoritos para contabilização (mas não será exibido como favorito)
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
          imagemUrl: imagemUrl ?? null,
          productName: productName ?? null,
          productPrice: typeof productPrice === "number" ? productPrice : null,
          lookType: "criativo",
          action: "dislike",
          tipo: "dislike",
          votedType: "dislike",
          createdAt: new Date(),
        });
      }

      // Atualizar estatísticas do cliente (totalComposicoes, totalLikes, totalDislikes)
      try {
        await updateClienteComposicoesStats(lojistaId, customerId);
      } catch (updateError) {
        console.error("[api/actions] Erro ao atualizar estatísticas:", updateError);
        // Não falhar a requisição se a atualização falhar
      }
    }

    // Atualizar composição como curtida ou não curtida
    if (compositionId && (action === "like" || action === "dislike")) {
      try {
        const { getAdminDb } = await import("@/lib/firebaseAdmin");
        const db = getAdminDb();
        const composicaoRef = db
          .collection("lojas")
          .doc(lojistaId)
          .collection("composicoes")
          .doc(compositionId);

        await composicaoRef.update({
          curtido: action === "like",
          liked: action === "like",
          disliked: action === "dislike",
          updatedAt: new Date(),
        });

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



