import { NextRequest, NextResponse } from "next/server";
// import { setComposicaoAnonymous } from "@/lib/firestore/server";

function applyCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin") ?? "*";
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    request.headers.get("access-control-request-headers") ?? "Content-Type"
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Vary", "Origin");
  return response;
}

export function OPTIONS(request: NextRequest) {
  return applyCors(
    request,
    new NextResponse(null, {
      status: 204,
    })
  );
}

type SaveAnonymousPayload = {
  lojistaId?: string;
  compositionId?: string | null;
  images?: Array<{
    url?: string;
    downloadUrl?: string;
    type?: string;
    storagePath?: string | null;
    width?: number | null;
    height?: number | null;
    aspectRatio?: number | null;
  }>;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SaveAnonymousPayload;
    const { lojistaId, compositionId, images } = body;

    if (!lojistaId || !compositionId) {
      return applyCors(
        request,
        NextResponse.json(
          { error: "lojistaId e compositionId são obrigatórios." },
          { status: 400 }
        )
      );
    }

    // TODO: Implementar setComposicaoAnonymous
    // await setComposicaoAnonymous(lojistaId, compositionId, images ?? []);
    console.log("[api/anonymize] Composição anônima registrada:", { lojistaId, compositionId });

    return applyCors(
      request,
      NextResponse.json({ success: true })
    );
  } catch (error) {
    console.error("[api/anonymize] erro ao registrar avatar anônimo", error);
    return applyCors(
      request,
      NextResponse.json(
        { error: "Erro ao registrar avatar anônimo." },
        { status: 500 }
      )
    );
  }
}




