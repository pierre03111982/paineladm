import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * API route para definir cookies de autenticação
 * POST /api/auth/set-token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, isAdmin } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token não fornecido" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    // Definir cookie de autenticação
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: "/",
    });

    // Se for admin, definir cookie adicional
    if (isAdmin) {
      cookieStore.set("admin-token", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 dias
        path: "/",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SetToken] Erro ao definir token:", error);
    return NextResponse.json(
      { error: "Erro ao definir token" },
      { status: 500 }
    );
  }
}




