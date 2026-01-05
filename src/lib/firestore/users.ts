/**
 * FASE 1: Funções para gerenciar Usuários Finais (App Cliente)
 * 
 * Coleção: users (global, não por loja)
 * Usado para Passaporte Fashion VIP (créditos globais)
 */

import { getAdminDb } from "../firebaseAdmin";
import type { UserDoc } from "./types";

const db = getAdminDb();

/**
 * Busca ou cria um usuário por WhatsApp
 */
export async function getOrCreateUser(whatsapp: string): Promise<UserDoc> {
  const cleanWhatsapp = whatsapp.replace(/\D/g, "");
  
  if (!cleanWhatsapp || cleanWhatsapp.length < 10) {
    throw new Error("WhatsApp inválido");
  }

  // Buscar usuário existente por WhatsApp
  const usersRef = db.collection("users");
  const snapshot = await usersRef.where("whatsapp", "==", cleanWhatsapp).limit(1).get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      whatsapp: data.whatsapp || cleanWhatsapp,
      email: data.email || undefined,
      nome: data.nome || undefined,
      globalCredits: typeof data.globalCredits === "number" ? data.globalCredits : 0,
      vipStatus: data.vipStatus === true,
      vipExpiration: data.vipExpiration?.toDate?.() || (data.vipExpiration ? new Date(data.vipExpiration) : undefined),
      accumulatedBalance: typeof data.accumulatedBalance === "number" ? data.accumulatedBalance : 0,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt) || new Date(),
    };
  }

  // Criar novo usuário
  const newUser: Omit<UserDoc, "id"> = {
    whatsapp: cleanWhatsapp,
    globalCredits: 0,
    vipStatus: false,
    accumulatedBalance: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const docRef = await usersRef.add(newUser);

  return {
    id: docRef.id,
    ...newUser,
  };
}

/**
 * Busca usuário por ID
 */
export async function getUserById(userId: string): Promise<UserDoc | null> {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      return null;
    }

    const data = userDoc.data() || {};
    
    return {
      id: userDoc.id,
      whatsapp: data.whatsapp || "",
      email: data.email || undefined,
      nome: data.nome || undefined,
      globalCredits: typeof data.globalCredits === "number" ? data.globalCredits : 0,
      vipStatus: data.vipStatus === true,
      vipExpiration: data.vipExpiration?.toDate?.() || (data.vipExpiration ? new Date(data.vipExpiration) : undefined),
      accumulatedBalance: typeof data.accumulatedBalance === "number" ? data.accumulatedBalance : 0,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt) || new Date(),
    };
  } catch (error) {
    console.error("[getUserById] Erro:", error);
    return null;
  }
}

/**
 * Adiciona créditos globais ao usuário (com teto de 300)
 */
export async function addGlobalCredits(userId: string, amount: number): Promise<number> {
  if (!userId || amount <= 0) {
    throw new Error("userId e amount devem ser válidos");
  }

  const userRef = db.collection("users").doc(userId);
  
  return await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    
    if (!userDoc.exists) {
      throw new Error("Usuário não encontrado");
    }

    const data = userDoc.data() || {};
    const currentBalance = typeof data.accumulatedBalance === "number" ? data.accumulatedBalance : 0;
    const currentGlobalCredits = typeof data.globalCredits === "number" ? data.globalCredits : 0;
    
    // Teto de 300 créditos acumulados
    const TETO_CREDITOS = 300;
    const newAccumulated = Math.min(currentBalance + amount, TETO_CREDITOS);
    const creditsToAdd = newAccumulated - currentBalance;
    
    // Adicionar aos créditos globais disponíveis
    const newGlobalCredits = currentGlobalCredits + creditsToAdd;

    transaction.update(userRef, {
      globalCredits: newGlobalCredits,
      accumulatedBalance: newAccumulated,
      updatedAt: new Date(),
    });

    console.log("[addGlobalCredits] Créditos adicionados:", {
      userId,
      amount,
      creditsToAdd,
      newGlobalCredits,
      newAccumulated,
      teto: TETO_CREDITOS,
    });

    return newGlobalCredits;
  });
}

/**
 * Atualiza status VIP do usuário (baseado em compras nos últimos 30 dias)
 */
export async function updateVipStatus(userId: string, hasRecentPurchase: boolean): Promise<void> {
  if (!userId) {
    throw new Error("userId é obrigatório");
  }

  const userRef = db.collection("users").doc(userId);
  const now = new Date();
  const vipExpiration = hasRecentPurchase 
    ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 dias
    : null;

  await userRef.update({
    vipStatus: hasRecentPurchase,
    vipExpiration: vipExpiration,
    updatedAt: new Date(),
  });

  console.log("[updateVipStatus] Status VIP atualizado:", {
    userId,
    vipStatus: hasRecentPurchase,
    vipExpiration,
  });
}


