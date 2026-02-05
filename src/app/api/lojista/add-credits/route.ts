import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { isSuperAdmin, requireSuperAdmin } from "@/lib/auth/admin-auth";

const db = getAdminDb();

export const dynamic = 'force-dynamic';

/**
 * POST /api/lojista/add-credits
 * Adiciona créditos de IA para um lojista
 * Body: { lojistaId?: string, amount: number, source?: 'webhook' | 'admin_panel' }
 * 
 * SEGURANÇA: Apenas super_admin pode adicionar créditos.
 * Esta rota deve ser chamada apenas via:
 * - Webhook de pagamento (Stripe/Asaas) com validação de assinatura
 * - Painel Super Admin
 * 
 * Lojistas NÃO podem chamar esta rota diretamente.
 */
export async function POST(request: NextRequest) {
  try {
    // FASE 0.1: VALIDAÇÃO DE SEGURANÇA - Apenas super_admin
    try {
      await requireSuperAdmin();
    } catch (error: any) {
      console.error("[API Add Credits] ❌ Acesso negado - não é super_admin:", error.message);
      return NextResponse.json(
        { 
          error: "FORBIDDEN: Apenas super_admin pode adicionar créditos. Esta rota deve ser chamada via Webhook de Pagamento ou Painel Super Admin.",
          code: "FORBIDDEN"
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { lojistaId: lojistaIdFromBody, amount, source } = body;

    // Validar amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: "amount deve ser um número positivo" },
        { status: 400 }
      );
    }

    // Validar source (opcional, mas recomendado para auditoria)
    const validSources = ['webhook', 'admin_panel', undefined];
    if (source && !validSources.includes(source)) {
      console.warn("[API Add Credits] ⚠️ Source inválido:", source);
    }

    // FASE 0.1: lojistaId é OBRIGATÓRIO no body quando chamado por admin
    // Não permitir que admin adicione créditos para si mesmo sem especificar lojistaId
    if (!lojistaIdFromBody) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório no corpo da requisição quando chamado por admin" },
        { status: 400 }
      );
    }
    
    const lojistaId = lojistaIdFromBody;
    
    console.log("[API Add Credits] ✅ Super Admin autorizado. Adicionando créditos:", {
      lojistaId,
      amount,
      source: source || 'admin_panel',
    });

    const lojistaRef = db.collection("lojistas").doc(lojistaId);
    const lojaRef = db.collection("lojas").doc(lojistaId);

    // Usar transação para garantir consistência
    const result = await db.runTransaction(async (transaction) => {
      let lojistaDoc = await transaction.get(lojistaRef);

      // Se não existe em lojistas, tentar criar a partir de lojas
      if (!lojistaDoc.exists) {
        const lojaDoc = await transaction.get(lojaRef);
        if (lojaDoc.exists) {
          // Criar documento em lojistas baseado nos dados de lojas
          const lojaData = lojaDoc.data();
          transaction.set(lojistaRef, {
            lojistaId: lojistaId,
            nome: lojaData?.nome || lojaData?.name || "",
            email: lojaData?.email || "",
            aiCredits: 0,
            saldo: 0,
            totalCreditsAdded: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          // Buscar novamente após criar
          lojistaDoc = await transaction.get(lojistaRef);
        } else {
          throw new Error("Lojista não encontrado");
        }
      }

      const lojistaData = lojistaDoc.data();
      const currentCredits = lojistaData?.aiCredits || lojistaData?.saldo || 0;
      const newCredits = currentCredits + amount;

      transaction.update(lojistaRef, {
        aiCredits: newCredits,
        saldo: newCredits, // Manter compatibilidade
        lastCreditUpdate: new Date().toISOString(),
        lastCreditAdded: new Date().toISOString(),
        totalCreditsAdded: (lojistaData?.totalCreditsAdded || 0) + amount,
      });

      // Sincronizar com lojas (dashboard, generate-studio e deduct-credits leem de lojas)
      const lojaDoc = await transaction.get(lojaRef);
      if (lojaDoc.exists) {
        const lojaData = lojaDoc.data();
        const lojaCredits = lojaData?.credits ?? lojaData?.aiCredits ?? lojaData?.saldo ?? 0;
        const newLojaCredits = lojaCredits + amount;
        transaction.update(lojaRef, {
          credits: newLojaCredits,
          aiCredits: newLojaCredits,
          saldo: newLojaCredits,
          updatedAt: new Date().toISOString(),
        });
      }

      return {
        previousCredits: currentCredits,
        newCredits,
        amountAdded: amount,
      };
    });

    console.log(`[API Add Credits] Créditos adicionados para lojista ${lojistaId}:`, result);

    return NextResponse.json({
      success: true,
      ...result,
      message: `${amount} crédito(s) adicionado(s) com sucesso`,
    });
  } catch (error: any) {
    console.error("[API Add Credits] Erro:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao adicionar créditos",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/lojista/add-credits
 * Retorna o saldo atual de créditos do lojista
 * 
 * SEGURANÇA: Lojistas podem consultar apenas seu próprio saldo.
 * Super Admin pode consultar qualquer lojista.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");

    // Verificar se é super_admin
    const isSuper = await isSuperAdmin();
    
    let lojistaId: string | null = null;

    if (isSuper) {
      // Super Admin pode consultar qualquer lojista
      lojistaId = lojistaIdFromQuery;
    } else {
      // Lojista comum só pode consultar seu próprio saldo
      try {
        lojistaId = await getCurrentLojistaId();
        console.log("[API Add Credits GET] Lojista consultando próprio saldo:", lojistaId);
        
        // Se tentou consultar outro lojista, negar
        if (lojistaIdFromQuery && lojistaIdFromQuery !== lojistaId) {
          return NextResponse.json(
            { error: "FORBIDDEN: Você só pode consultar seu próprio saldo de créditos" },
            { status: 403 }
          );
        }
      } catch (authError: any) {
        console.error("[API Add Credits GET] Erro ao buscar lojista logado:", authError);
        return NextResponse.json(
          { error: "Não autenticado. Faça login para consultar seu saldo." },
          { status: 401 }
        );
      }
    }
    
    if (!lojistaId) {
      console.error("[API Add Credits GET] lojistaId não encontrado");
      return NextResponse.json(
        { error: "lojistaId não encontrado. Faça login ou forneça o lojistaId na query string (apenas para super_admin)." },
        { status: 400 }
      );
    }

    let lojistaDoc = await db.collection("lojistas").doc(lojistaId).get();

    // Se não existe em lojistas, tentar criar a partir de lojas
    if (!lojistaDoc.exists) {
      const lojaDoc = await db.collection("lojas").doc(lojistaId).get();
      if (lojaDoc.exists) {
        // Criar documento em lojistas baseado nos dados de lojas
        const lojaData = lojaDoc.data();
        await db.collection("lojistas").doc(lojistaId).set({
          lojistaId: lojistaId,
          nome: lojaData?.nome || lojaData?.name || "",
          email: lojaData?.email || "",
          aiCredits: 0,
          saldo: 0,
          totalCreditsAdded: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        // Buscar novamente após criar
        lojistaDoc = await db.collection("lojistas").doc(lojistaId).get();
      } else {
        return NextResponse.json(
          { error: "Lojista não encontrado" },
          { status: 404 }
        );
      }
    }

    const lojistaData = lojistaDoc.data();
    const credits = lojistaData?.aiCredits || lojistaData?.saldo || 0;

    return NextResponse.json({
      lojistaId,
      credits,
      totalCreditsAdded: lojistaData?.totalCreditsAdded || 0,
      lastCreditUpdate: lojistaData?.lastCreditUpdate || null,
    });
  } catch (error: any) {
    console.error("[API Add Credits] Erro ao buscar saldo:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao buscar saldo",
      },
      { status: 500 }
    );
  }
}

