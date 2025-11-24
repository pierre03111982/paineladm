import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

const db = getAdminDb();

export const dynamic = 'force-dynamic';

/**
 * POST /api/lojista/add-credits
 * Adiciona créditos de IA para um lojista
 * Body: { lojistaId?: string, amount: number }
 * 
 * Se lojistaId não for fornecido, usa o lojista logado
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lojistaId: lojistaIdFromBody, amount } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: "amount deve ser um número positivo" },
        { status: 400 }
      );
    }

    // Prioridade: body > usuário logado
    let lojistaIdFromAuth = null;
    if (!lojistaIdFromBody) {
      try {
        lojistaIdFromAuth = await getCurrentLojistaId();
        console.log("[API Add Credits] lojistaIdFromAuth:", lojistaIdFromAuth);
      } catch (authError: any) {
        console.error("[API Add Credits] Erro ao buscar lojista logado:", authError);
      }
    }
    
    const lojistaId = lojistaIdFromBody || lojistaIdFromAuth;
    
    console.log("[API Add Credits] lojistaId final:", lojistaId, {
      fromBody: lojistaIdFromBody,
      fromAuth: lojistaIdFromAuth,
    });

    if (!lojistaId) {
      console.error("[API Add Credits] lojistaId não encontrado. Body:", body);
      return NextResponse.json(
        { error: "lojistaId não encontrado. Faça login ou forneça o lojistaId no corpo da requisição." },
        { status: 400 }
      );
    }

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
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");

    // Prioridade: query string > usuário logado
    let lojistaIdFromAuth = null;
    if (!lojistaIdFromQuery) {
      try {
        lojistaIdFromAuth = await getCurrentLojistaId();
        console.log("[API Add Credits GET] lojistaIdFromAuth:", lojistaIdFromAuth);
      } catch (authError: any) {
        console.error("[API Add Credits GET] Erro ao buscar lojista logado:", authError);
      }
    }
    
    const lojistaId = lojistaIdFromQuery || lojistaIdFromAuth;
    
    console.log("[API Add Credits GET] lojistaId final:", lojistaId, {
      fromQuery: lojistaIdFromQuery,
      fromAuth: lojistaIdFromAuth,
    });

    if (!lojistaId) {
      console.error("[API Add Credits GET] lojistaId não encontrado");
      return NextResponse.json(
        { error: "lojistaId não encontrado. Faça login ou forneça o lojistaId na query string." },
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

