"use client";

import { doc, updateDoc, getDoc, getFirestore } from "firebase/firestore";
import { getFirebaseApp } from "../firebaseConfig";
import { type EstimatedMeasurements } from "@/hooks/useFittingAlgorithm";

// Inicializar Firestore uma vez
let dbInstance: ReturnType<typeof getFirestore> | null = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = getFirestore(getFirebaseApp());
  }
  return dbInstance;
}

export interface UserMeasurements {
  height: number;
  weight: number;
  age: number;
  gender: "female" | "male";
  shapeAdjustments: {
    bust: number;
    waist: number;
    hip: number;
  };
  estimatedCm: EstimatedMeasurements;
  lastUpdated: Date;
}

export interface UserProfile {
  uid: string;
  measurements?: UserMeasurements;
  // Outros campos do perfil podem ser adicionados aqui
}

/**
 * Salva as medidas do usuário no perfil do Firestore
 */
export async function saveUserMeasurements(
  userId: string,
  measurements: UserMeasurements
): Promise<void> {
  try {
    const db = getDb();
    const userRef = doc(db, "users", userId);
    
    // Converter Date para Timestamp do Firestore
    const measurementsData = {
      ...measurements,
      lastUpdated: new Date(), // Firestore converterá automaticamente
    };

    await updateDoc(userRef, {
      measurements: measurementsData,
    });

    console.log("[UserProfile] Medidas salvas com sucesso para usuário:", userId);
  } catch (error) {
    console.error("[UserProfile] Erro ao salvar medidas:", error);
    throw error;
  }
}

/**
 * Busca as medidas salvas do usuário
 */
export async function getUserMeasurements(
  userId: string
): Promise<UserMeasurements | null> {
  try {
    const db = getDb();
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data();
    return userData.measurements || null;
  } catch (error) {
    console.error("[UserProfile] Erro ao buscar medidas:", error);
    throw error;
  }
}

/**
 * Busca o perfil completo do usuário
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const db = getDb();
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    return {
      uid: userId,
      ...userSnap.data(),
    } as UserProfile;
  } catch (error) {
    console.error("[UserProfile] Erro ao buscar perfil:", error);
    throw error;
  }
}
