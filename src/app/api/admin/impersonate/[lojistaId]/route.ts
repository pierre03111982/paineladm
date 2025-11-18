/**
 * API Route: Impersonificação de Lojista (Admin)
 * GET /api/admin/impersonate/[lojistaId]
 * 
 * Permite que um admin acesse o painel do lojista temporariamente sem senha
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp, getAdminDb } from "@/lib/firebaseAdmin";
import { requireAdmin, getCurrentAdmin } from "@/lib/auth/admin-auth";

const auth = getAuth(getAdminApp());
const db = getAdminDb();

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lojistaId: string }> }
) {
  try {
    // Verificar se o usuário é admin
    const adminEmail = await requireAdmin();
    if (!adminEmail) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem impersonar lojistas." },
        { status: 403 }
      );
    }

    const { lojistaId } = await params;

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se o lojista existe
    const lojaDoc = await db.collection("lojas").doc(lojistaId).get();
    if (!lojaDoc.exists) {
      return NextResponse.json(
        { error: "Lojista não encontrado" },
        { status: 404 }
      );
    }

    const lojaData = lojaDoc.data();
    const lojistaEmail = lojaData?.email;

    if (!lojistaEmail) {
      return NextResponse.json(
        { error: "Email do lojista não encontrado" },
        { status: 404 }
      );
    }

    // Buscar o usuário no Firebase Auth pelo email
    let user;
    try {
      user = await auth.getUserByEmail(lojistaEmail);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: "Usuário não encontrado no Firebase Auth" },
          { status: 404 }
        );
      }
      throw error;
    }

    // Criar token customizado para o lojista
    // Este token será trocado por um ID token no frontend
    const customToken = await auth.createCustomToken(user.uid);

    // Criar um token de sessão temporário para impersonificação
    // Armazenar no Firestore com expiração de 30 minutos
    const impersonationSessionId = `impersonate_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

    await db.collection("impersonation_sessions").doc(impersonationSessionId).set({
      adminEmail,
      lojistaId,
      lojistaEmail,
      customToken,
      createdAt: new Date(),
      expiresAt,
      used: false,
    });

    // Construir URL do painel do lojista com o session ID
    const baseUrl = process.env.NEXT_PUBLIC_PAINELADM_URL || 
                    process.env.NEXT_PUBLIC_BACKEND_URL || 
                    request.nextUrl.origin;
    
    // O painel do lojista está na mesma aplicação
    const impersonationUrl = `${baseUrl}/configuracoes?impersonation_session=${impersonationSessionId}&lojistaId=${lojistaId}`;

    console.log("[Impersonate] Token criado:", {
      adminEmail,
      lojistaId,
      lojistaEmail,
      expiresIn: "30 minutos",
    });

    return NextResponse.json({
      success: true,
      impersonationUrl,
      expiresIn: 1800, // 30 minutos em segundos
      lojistaId,
      lojistaNome: lojaData?.nome || "Lojista",
    });
  } catch (error) {
    console.error("[Impersonate] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao criar token de impersonificação",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

