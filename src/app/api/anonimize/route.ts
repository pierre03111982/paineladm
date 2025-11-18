import { NextRequest, NextResponse } from "next/server";

// TODO: Implementar serviço de anonimização
type AnonymousAvatarStyle = "realistic" | "cartoon" | "abstract";

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

type AnonymousRequestPayload = {
  lojistaId?: string;
  compositionId?: string | null;
  jobId?: string | null;
  style?: AnonymousAvatarStyle;
  originalImages?: Array<{ url?: string; type?: string }>;
  forcePlaceholder?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnonymousRequestPayload;
    const {
      lojistaId,
      compositionId,
      jobId,
      style,
      originalImages,
      forcePlaceholder,
    } = body;

    if (!lojistaId) {
      return applyCors(
        request,
        NextResponse.json(
          { error: "lojistaId obrigatório." },
          { status: 400 }
        )
      );
    }

    const sourceImage =
      originalImages?.find((image) => image?.type === "tryon" && image.url) ??
      originalImages?.find((image) => image?.url);

    if (!sourceImage?.url) {
      return applyCors(
        request,
        NextResponse.json(
          { error: "Imagem base não informada para anonimização." },
          { status: 400 }
        )
      );
    }

    // TODO: Implementar serviço de anonimização
    // Por enquanto, retorna a imagem original
    return applyCors(
      request,
      NextResponse.json({
        images: [
          {
            url: sourceImage.url,
            type: "anonymous",
          },
        ],
        provider: "fallback",
        method: "placeholder",
        usedFallback: true,
      })
    );
  } catch (error) {
    console.error("[api/anonimize] erro ao gerar avatar", error);
    return applyCors(
      request,
      NextResponse.json(
        { error: "Erro ao gerar avatar anônimo." },
        { status: 500 }
      )
    );
  }
}




