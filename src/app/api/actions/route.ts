import { NextResponse } from "next/server";
import { registerFavoriteLook, updateClienteTotalComposicoes } from "@/lib/firestore/server";

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

    // Registrar favorito apenas para likes
    if (action === "like" && customerId) {
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

      // Atualizar totalComposicoes do cliente (apenas composições com like e sem duplicidade)
      try {
        await updateClienteTotalComposicoes(lojistaId, customerId);
      } catch (updateError) {
        console.error("[api/actions] Erro ao atualizar totalComposicoes:", updateError);
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
          updatedAt: new Date(),
        });
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



