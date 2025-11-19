import { NextRequest, NextResponse } from "next/server";
import { createShare } from "@/lib/firestore/shares";

function buildCorsHeaders() {
  const origin =
    process.env.NEXT_PUBLIC_CLIENT_APP_URL ?? "http://localhost:3002";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

/**
 * POST /api/cliente/share
 * Cria um link de compartilhamento com tracking
 * Body: { lojistaId, clienteId, clienteNome, clienteWhatsapp, imagemUrl, lookId?, compositionId?, jobId? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      lojistaId,
      clienteId,
      clienteNome,
      clienteWhatsapp,
      imagemUrl,
      lookId,
      compositionId,
      jobId,
    } = body;

    if (!lojistaId || !imagemUrl) {
      return NextResponse.json(
        { error: "lojistaId e imagemUrl são obrigatórios" },
        { status: 400, headers: buildCorsHeaders() }
      );
    }

    // Se não tiver clienteId, criar um temporário baseado no nome
    const finalClienteId = clienteId || `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const finalClienteNome = clienteNome || "Cliente";

    const cleanWhatsapp = clienteWhatsapp?.replace(/\D/g, "") || "";

    const share = await createShare({
      lojistaId,
      clienteId: finalClienteId,
      clienteNome: finalClienteNome,
      clienteWhatsapp: cleanWhatsapp,
      imagemUrl,
      lookId: lookId || undefined,
      compositionId: compositionId || undefined,
      jobId: jobId || undefined,
    });

    return NextResponse.json({
      success: true,
      shareId: share.shareId,
      shareCode: share.shareCode,
      shareUrl: share.shareUrl,
    }, { headers: buildCorsHeaders() });
  } catch (error: any) {
    console.error("[API Cliente Share] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao criar link de compartilhamento" },
      { status: 500, headers: buildCorsHeaders() }
    );
  }
}

