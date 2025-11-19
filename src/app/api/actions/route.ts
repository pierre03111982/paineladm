import { NextResponse } from "next/server";
// import { registerLojaAction } from "@/lib/firestore/server";

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
    const { action, compositionId, jobId, lojistaId, customerName, productName } =
      (await request.json()) as {
        action?: "like" | "share" | "checkout";
        compositionId?: string | null;
        jobId?: string | null;
        lojistaId?: string | null;
        customerName?: string | null;
        productName?: string | null;
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

    // TODO: Implementar registerLojaAction
    // await registerLojaAction(lojistaId, {
    //   action,
    //   compositionId,
    //   jobId,
    //   customerName,
    //   productName,
    // });
    console.log("[api/actions] Ação registrada:", { action, lojistaId, compositionId });

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



