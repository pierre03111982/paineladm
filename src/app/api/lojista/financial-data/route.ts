/**
 * FASE 2: API para dados financeiros do dashboard
 * 
 * Retorna: créditos, subscription, usageMetrics
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { checkSuperAdminAccess } from "@/lib/auth/admin-auth";

// Função helper para adicionar CORS
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");

    // Resolver lojistaId
    let lojistaId: string | null = null;

    if (lojistaIdFromQuery) {
      // Verificar se é super_admin tentando acessar outra loja
      const isSuperAdmin = await checkSuperAdminAccess();
      if (isSuperAdmin) {
        lojistaId = lojistaIdFromQuery;
      } else {
        // Usuário comum só pode ver seus próprios dados
        const currentLojistaId = await getCurrentLojistaId();
        if (currentLojistaId === lojistaIdFromQuery) {
          lojistaId = lojistaIdFromQuery;
        } else {
          const response = NextResponse.json(
            { error: "Não autorizado" },
            { status: 403 }
          );
          return addCorsHeaders(response);
        }
      }
    } else {
      // Sem lojistaId na query, usar o logado com fallback para env var para evitar erros de dashboard
      const lojistaIdFromAuth = await getCurrentLojistaId();
      lojistaId = lojistaIdFromAuth || process.env.NEXT_PUBLIC_LOJISTA_ID || process.env.LOJISTA_ID || null;
    }

    if (!lojistaId) {
      const response = NextResponse.json(
        { error: "lojistaId não encontrado" },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }

    const db = getAdminDb();
    
    // Buscar dados da loja
    const lojaRef = db.collection("lojas").doc(lojistaId);
    const lojaDoc = await lojaRef.get();

    if (!lojaDoc.exists) {
      const response = NextResponse.json(
        { error: "Loja não encontrada" },
        { status: 404 }
      );
      return addCorsHeaders(response);
    }

    const lojaData = lojaDoc.data() || {};

    // Extrair dados financeiros
    const credits = lojaData.aiCredits || lojaData.saldo || 0;
    const subscription = lojaData.subscription || {
      planId: "start",
      status: "active",
      adSlotsLimit: 0,
      clientType: "standard",
    };
    const usageMetrics = lojaData.usageMetrics || {
      totalGenerated: 0,
      creditsUsed: 0,
      creditsRemaining: credits,
    };

    const response = NextResponse.json({
      credits,
      subscription,
      usageMetrics,
    });
    return addCorsHeaders(response);
  } catch (error: any) {
    console.error("[FinancialData] Erro:", error);
    const response = NextResponse.json(
      { error: error.message || "Erro ao buscar dados financeiros" },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}

