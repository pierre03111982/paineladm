/**
 * FASE 2: API para dados financeiros do dashboard
 * 
 * Retorna: créditos, subscription, usageMetrics
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { checkSuperAdminAccess } from "@/lib/auth/admin-auth";

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
          return NextResponse.json(
            { error: "Não autorizado" },
            { status: 403 }
          );
        }
      }
    } else {
      // Sem lojistaId na query, usar o logado
      lojistaId = await getCurrentLojistaId();
    }

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId não encontrado" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    
    // Buscar dados da loja
    const lojaRef = db.collection("lojas").doc(lojistaId);
    const lojaDoc = await lojaRef.get();

    if (!lojaDoc.exists) {
      return NextResponse.json(
        { error: "Loja não encontrada" },
        { status: 404 }
      );
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

    return NextResponse.json({
      credits,
      subscription,
      usageMetrics,
    });
  } catch (error: any) {
    console.error("[FinancialData] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar dados financeiros" },
      { status: 500 }
    );
  }
}

