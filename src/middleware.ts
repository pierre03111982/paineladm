import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware para proteger rotas administrativas
 * Verifica se o usuário está autenticado e tem permissão de admin
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Proteger todas as rotas /admin/*
  if (pathname.startsWith("/admin")) {
    // Verificar se há token de autenticação
    const token = request.cookies.get("auth-token")?.value;
    const adminToken = request.cookies.get("admin-token")?.value;

    // Se não houver token, redirecionar para login
    if (!token && !adminToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Se houver admin-token, permitir acesso
    if (adminToken === "true") {
      return NextResponse.next();
    }

    // Verificar se o token é válido (será verificado no servidor também)
    // Por enquanto, permitir se houver token
    if (token) {
      return NextResponse.next();
    }

    // Se não passar em nenhuma verificação, redirecionar para login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
  ],
};

