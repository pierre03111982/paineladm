import { NextRequest, NextResponse } from "next/server";
import { registerShareAccess, registerShareSignup } from "@/lib/firestore/shares";

/**
 * POST /api/cliente/share/track
 * Rastreia acesso a um link compartilhado
 * Body: { lojistaId, shareCode, visitorId?, isSignup?, referredClienteId?, referredClienteNome?, referredClienteWhatsapp? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      lojistaId,
      shareCode,
      visitorId,
      isSignup = false,
      referredClienteId,
      referredClienteNome,
      referredClienteWhatsapp,
    } = body;

    if (!lojistaId || !shareCode) {
      return NextResponse.json(
        { error: "lojistaId e shareCode são obrigatórios" },
        { status: 400 }
      );
    }

    // Registrar acesso
    const { share, isNewAccess } = await registerShareAccess({
      lojistaId,
      shareCode,
      visitorId,
    });

    if (!share) {
      return NextResponse.json(
        { error: "Compartilhamento não encontrado" },
        { status: 404 }
      );
    }

    // Se for um signup, registrar também
    if (isSignup && referredClienteId && referredClienteNome) {
      try {
        const cleanWhatsapp = referredClienteWhatsapp?.replace(/\D/g, "") || "";
        await registerShareSignup({
          lojistaId,
          shareCode,
          referrerClienteId: share.clienteId,
          referredClienteId,
          referredClienteNome,
          referredClienteWhatsapp: cleanWhatsapp,
        });
      } catch (signupError: any) {
        console.error("[API Share Track] Erro ao registrar signup:", signupError);
        // Não falhar a requisição se o signup falhar
      }
    }

    return NextResponse.json({
      success: true,
      share: {
        id: share.id,
        clienteNome: share.clienteNome,
        imagemUrl: share.imagemUrl,
      },
      isNewAccess,
    });
  } catch (error: any) {
    console.error("[API Share Track] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao rastrear compartilhamento" },
      { status: 500 }
    );
  }
}

