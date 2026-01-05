/**
 * FASE 1: Middleware de Consumo de Créditos
 * 
 * Lógica central para autorizar geração de imagem com sistema de prioridades:
 * 
 * Prioridade 1 (Cliente VIP): Se usuário tem globalCredits > 0 e está em loja diferente da origem, debita dele
 * Prioridade 2 (Lojista Teste): Se store.clientType === 'test_unlimited', PERMITIR geração, NÃO debitar saldo, mas incrementar métricas
 * Prioridade 3 (Lojista Padrão): Verificar store.credits > 0. Se sim, debitar. Se não, bloquear com erro 'Saldo Insuficiente'
 */

import { getAdminDb } from "../firebaseAdmin";
import type { SubscriptionData, UsageMetrics, UserDoc } from "../firestore/types";
import { FieldValue } from "firebase-admin/firestore";

export interface DeductCreditsParams {
  lojistaId: string;
  customerId?: string; // ID do cliente (para verificar VIP)
  customerLojistaId?: string; // Lojista de origem do cliente (para verificar se está em loja diferente)
  amount?: number; // Quantidade de créditos a debitar (padrão: 1)
}

export interface DeductCreditsResult {
  success: boolean;
  debitedFrom: "vip_global" | "lojista_test" | "lojista_standard" | null;
  message?: string;
  remainingBalance?: number;
}

/**
 * FASE 1: Função principal para debitar créditos com sistema de prioridades
 */
export async function deductCredits(params: DeductCreditsParams): Promise<DeductCreditsResult> {
  const { lojistaId, customerId, customerLojistaId, amount = 1 } = params;

  if (!lojistaId) {
    return {
      success: false,
      debitedFrom: null,
      message: "lojistaId é obrigatório",
    };
  }

  const db = getAdminDb();
  const lojaRef = db.collection("lojas").doc(lojistaId);

  try {
    return await db.runTransaction(async (transaction) => {
      // Buscar dados da loja
      const lojaDoc = await transaction.get(lojaRef);
      
      if (!lojaDoc.exists) {
        return {
          success: false,
          debitedFrom: null,
          message: "Loja não encontrada",
        };
      }

      const lojaData = lojaDoc.data() || {};
      const subscription: SubscriptionData = lojaData.subscription || {
        planId: "start",
        status: "active",
        adSlotsLimit: 0,
        clientType: "standard",
      };

      // ========================================
      // PRIORIDADE 2: Lojista Teste Ilimitado
      // ========================================
      if (subscription.clientType === "test_unlimited") {
        console.log("[deductCredits] ✅ Modo Teste Ilimitado - Permitindo geração sem debitar saldo");
        
        // Incrementar métricas de uso (para controle de custo interno)
        const usageMetrics: UsageMetrics = lojaData.usageMetrics || {
          totalGenerated: 0,
          creditsUsed: 0,
          creditsRemaining: 0,
        };

        transaction.update(lojaRef, {
          "usageMetrics.totalGenerated": FieldValue.increment(amount),
          "usageMetrics.creditsUsed": FieldValue.increment(amount),
          updatedAt: FieldValue.serverTimestamp(),
        });

        return {
          success: true,
          debitedFrom: "lojista_test",
          message: "Geração permitida (Modo Teste Ilimitado)",
          remainingBalance: Infinity, // Ilimitado
        };
      }

      // ========================================
      // PRIORIDADE 1: Cliente VIP (globalCredits)
      // ========================================
      if (customerId && customerLojistaId && customerLojistaId !== lojistaId) {
        // Cliente está em loja diferente da origem - verificar se tem créditos globais
        const userRef = db.collection("users").doc(customerId);
        const userDoc = await transaction.get(userRef);

        if (userDoc.exists) {
          const userData = userDoc.data() as UserDoc;
          
          if (userData.globalCredits && userData.globalCredits >= amount) {
            console.log("[deductCredits] ✅ Cliente VIP - Debitando créditos globais:", {
              customerId,
              globalCredits: userData.globalCredits,
              amount,
            });

            // Debitar do cliente VIP
            transaction.update(userRef, {
              globalCredits: FieldValue.increment(-amount),
              updatedAt: FieldValue.serverTimestamp(),
            });

            return {
              success: true,
              debitedFrom: "vip_global",
              message: `Crédito bônus usado (Passaporte Fashion VIP)`,
              remainingBalance: userData.globalCredits - amount,
            };
          }
        }
      }

      // ========================================
      // PRIORIDADE 3: Lojista Padrão
      // ========================================
      // Verificar saldo da loja
      const credits = lojaData.aiCredits || lojaData.saldo || 0;

      if (credits < amount) {
        return {
          success: false,
          debitedFrom: null,
          message: "Saldo Insuficiente. Recarregue seus créditos para continuar gerando imagens.",
          remainingBalance: credits,
        };
      }

      // Debitar créditos da loja
      const newCredits = credits - amount;
      
      transaction.update(lojaRef, {
        aiCredits: newCredits,
        saldo: newCredits, // Manter compatibilidade
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Atualizar métricas de uso
      const usageMetrics: UsageMetrics = lojaData.usageMetrics || {
        totalGenerated: 0,
        creditsUsed: 0,
        creditsRemaining: 0,
      };

      transaction.update(lojaRef, {
        "usageMetrics.totalGenerated": FieldValue.increment(amount),
        "usageMetrics.creditsUsed": FieldValue.increment(amount),
        "usageMetrics.creditsRemaining": newCredits,
      });

      console.log("[deductCredits] ✅ Créditos debitados da loja:", {
        lojistaId,
        amount,
        previousBalance: credits,
        newBalance: newCredits,
      });

      return {
        success: true,
        debitedFrom: "lojista_standard",
        message: "Créditos debitados com sucesso",
        remainingBalance: newCredits,
      };
    });
  } catch (error: any) {
    console.error("[deductCredits] Erro ao debitar créditos:", error);
    return {
      success: false,
      debitedFrom: null,
      message: error.message || "Erro ao debitar créditos",
    };
  }
}

/**
 * Verifica se há créditos disponíveis sem debitar
 */
export async function checkCreditsAvailable(params: DeductCreditsParams): Promise<{
  available: boolean;
  source: "vip_global" | "lojista_test" | "lojista_standard" | null;
  balance: number;
  message: string;
}> {
  const { lojistaId, customerId, customerLojistaId } = params;

  if (!lojistaId) {
    return {
      available: false,
      source: null,
      balance: 0,
      message: "lojistaId é obrigatório",
    };
  }

  const db = getAdminDb();
  const lojaRef = db.collection("lojas").doc(lojistaId);

  try {
    const lojaDoc = await lojaRef.get();
    
    if (!lojaDoc.exists) {
      return {
        available: false,
        source: null,
        balance: 0,
        message: "Loja não encontrada",
      };
    }

    const lojaData = lojaDoc.data() || {};
    const subscription: SubscriptionData = lojaData.subscription || {
      planId: "start",
      status: "active",
      adSlotsLimit: 0,
      clientType: "standard",
    };

    // Prioridade 2: Teste ilimitado
    if (subscription.clientType === "test_unlimited") {
      return {
        available: true,
        source: "lojista_test",
        balance: Infinity,
        message: "Modo Teste Ilimitado ativo",
      };
    }

    // Prioridade 1: Cliente VIP
    if (customerId && customerLojistaId && customerLojistaId !== lojistaId) {
      const userRef = db.collection("users").doc(customerId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data() as UserDoc;
        
        if (userData.globalCredits && userData.globalCredits > 0) {
          return {
            available: true,
            source: "vip_global",
            balance: userData.globalCredits,
            message: "Créditos globais disponíveis (Passaporte Fashion VIP)",
          };
        }
      }
    }

    // Prioridade 3: Lojista padrão
    const credits = lojaData.aiCredits || lojaData.saldo || 0;
    
    return {
      available: credits > 0,
      source: "lojista_standard",
      balance: credits,
      message: credits > 0 ? "Créditos disponíveis" : "Saldo Insuficiente",
    };
  } catch (error: any) {
    console.error("[checkCreditsAvailable] Erro:", error);
    return {
      available: false,
      source: null,
      balance: 0,
      message: error.message || "Erro ao verificar créditos",
    };
  }
}


