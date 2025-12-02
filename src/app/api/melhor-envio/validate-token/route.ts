import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Valida o token do Melhor Envio fazendo uma requisição de teste à API
 * POST /api/melhor-envio/validate-token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = body?.token as string | undefined;

    if (!token?.trim()) {
      return NextResponse.json(
        { valid: false, error: "Token não fornecido" },
        { status: 400 }
      );
    }

    // Usar produção por padrão (sandbox apenas para testes iniciais)
    // A URL pode ser configurada via variável de ambiente se necessário
    const apiUrl = process.env.MELHOR_ENVIO_SANDBOX === "true"
      ? "https://sandbox.melhorenvio.com.br/api/v2/me"
      : "https://www.melhorenvio.com.br/api/v2/me";

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token.trim()}`,
        "User-Agent": "Virtual Try-On App (app@experimenteai.com)",
      },
    });

    if (response.ok) {
      const userData = await response.json().catch(() => ({}));
      return NextResponse.json({
        valid: true,
        message: "Token válido",
        user: userData,
      });
    } else if (response.status === 401) {
      return NextResponse.json({
        valid: false,
        error: "Token inválido ou expirado",
        status: response.status,
      });
    } else {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        valid: false,
        error: errorData.message || `Erro ao validar token: ${response.statusText}`,
        status: response.status,
      });
    }
  } catch (error: any) {
    console.error("[melhor-envio/validate-token] Erro:", error);
    return NextResponse.json(
      {
        valid: false,
        error: error.message || "Erro desconhecido ao validar token",
      },
      { status: 500 }
    );
  }
}




