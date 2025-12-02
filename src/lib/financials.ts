/**
 * PHASE 27: Sistema de Reserva de Créditos (Backend)
 * 
 * Funções para reservar, confirmar e cancelar créditos.
 * Este arquivo é usado pelo backend (paineladm).
 */

import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./firebaseAdmin";

type CreditReservationResult =
  | {
      success: true
      reservationId: string
      remainingBalance: number
      planTier: "micro" | "growth" | "enterprise"
    }
  | {
      success: false
      status: number
      message: string
    }

const INSUFFICIENT_FUNDS_MESSAGE =
  "Créditos insuficientes. Recarregue sua carteira para continuar gerando looks."

/**
 * Confirma o débito efetivo da reserva
 * Deve ser chamado quando o usuário visualizar a imagem
 */
export async function commitCredit(lojistaId: string, reservationId: string): Promise<{ success: boolean; message?: string }> {
  if (!lojistaId || !reservationId) {
    return {
      success: false,
      message: "lojistaId e reservationId são obrigatórios.",
    };
  }

  // Se for reserva sandbox, apenas confirmar sem debitar
  if (reservationId.startsWith("sandbox-")) {
    console.log("[financials] Confirmando reserva sandbox (sem débito):", reservationId);
    return { success: true };
  }

  const db = getAdminDb();
  const lojistaRef = db.collection("lojistas").doc(lojistaId);
  const reservationRef = db.collection("credit_reservations").doc(reservationId);

  try {
    return await db.runTransaction(async (tx) => {
      // Verificar se a reserva existe e está válida
      const reservationSnapshot = await tx.get(reservationRef);
      
      if (!reservationSnapshot.exists) {
        return {
          success: false,
          message: "Reserva não encontrada.",
        };
      }

      const reservationData = reservationSnapshot.data();
      
      if (reservationData?.status !== "reserved") {
        return {
          success: false,
          message: `Reserva já foi ${reservationData?.status === "confirmed" ? "confirmada" : "cancelada"}.`,
        };
      }

      // Verificar se a reserva não expirou
      const expiresAt = reservationData?.expiresAt?.toDate();
      if (expiresAt && expiresAt < new Date()) {
        return {
          success: false,
          message: "Reserva expirada.",
        };
      }

      // Verificar saldo do lojista
      const lojistaSnapshot = await tx.get(lojistaRef);
      
      if (!lojistaSnapshot.exists) {
        return {
          success: false,
          message: "Lojista não encontrado.",
        };
      }

      const docData = lojistaSnapshot.data() || {};
      const financials = docData.financials;
      const isSandbox = Boolean(docData.is_sandbox_mode);

      if (isSandbox || !financials) {
        // Em sandbox, apenas marcar como confirmada sem debitar
        tx.update(reservationRef, {
          status: "confirmed",
          confirmedAt: FieldValue.serverTimestamp(),
        });
        return { success: true };
      }

      const availableBalance = financials.credits_balance + financials.overdraft_limit;

      if (availableBalance <= 0) {
        return {
          success: false,
          message: INSUFFICIENT_FUNDS_MESSAGE,
        };
      }

      // Debitar crédito
      tx.update(lojistaRef, {
        "financials.credits_balance": FieldValue.increment(-1),
        "metrics.paid_credits_count": FieldValue.increment(1), // PHASE 27: Métrica de créditos pagos
      });

      // Marcar reserva como confirmada
      tx.update(reservationRef, {
        status: "confirmed",
        confirmedAt: FieldValue.serverTimestamp(),
      });

      return { success: true };
    });
  } catch (error: any) {
    console.error("[financials] Erro ao confirmar crédito:", error);
    return {
      success: false,
      message: "Erro ao confirmar crédito. Tente novamente em instantes.",
    };
  }
}

/**
 * Cancela a reserva (rollback)
 * Deve ser chamado em caso de erro na geração da imagem
 */
export async function rollbackCredit(lojistaId: string, reservationId: string): Promise<{ success: boolean; message?: string }> {
  if (!lojistaId || !reservationId) {
    return {
      success: false,
      message: "lojistaId e reservationId são obrigatórios.",
    };
  }

  // Se for reserva sandbox, apenas cancelar sem fazer nada
  if (reservationId.startsWith("sandbox-")) {
    console.log("[financials] Cancelando reserva sandbox:", reservationId);
    return { success: true };
  }

  const db = getAdminDb();
  const reservationRef = db.collection("credit_reservations").doc(reservationId);

  try {
    return await db.runTransaction(async (tx) => {
      const reservationSnapshot = await tx.get(reservationRef);
      
      if (!reservationSnapshot.exists) {
        return {
          success: false,
          message: "Reserva não encontrada.",
        };
      }

      const reservationData = reservationSnapshot.data();
      
      if (reservationData?.status === "confirmed") {
        return {
          success: false,
          message: "Não é possível cancelar uma reserva já confirmada.",
        };
      }

      if (reservationData?.status === "cancelled") {
        return { success: true }; // Já estava cancelada
      }

      // Marcar reserva como cancelada
      tx.update(reservationRef, {
        status: "cancelled",
        cancelledAt: FieldValue.serverTimestamp(),
      });

      return { success: true };
    });
  } catch (error: any) {
    console.error("[financials] Erro ao cancelar reserva:", error);
    return {
      success: false,
      message: "Erro ao cancelar reserva. Tente novamente em instantes.",
    };
  }
}

