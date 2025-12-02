/**
 * Funções Firestore para gerenciamento de Insights (IA Consultiva)
 */

import { getAdminDb } from "@/lib/firebaseAdmin";
import { InsightDoc, InsightResult } from "@/types/insights";

const db = getAdminDb();

/**
 * Cria um novo insight no Firestore
 */
export async function createInsight(
  lojistaId: string,
  insight: InsightResult
): Promise<string> {
  try {
    const insightsRef = db.collection("lojas").doc(lojistaId).collection("insights");
    
    // Calcular data de expiração
    const expiresInDays = insight.expiresInDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const insightDoc: Omit<InsightDoc, "id"> = {
      lojistaId,
      type: insight.type,
      title: insight.title,
      message: insight.message,
      priority: insight.priority,
      relatedEntity: insight.relatedEntity,
      actionLabel: insight.actionLabel,
      actionLink: insight.actionLink,
      isRead: false,
      createdAt: new Date(),
      expiresAt,
    };

    const docRef = await insightsRef.add(insightDoc);
    console.log("[Insights] ✅ Insight criado:", {
      id: docRef.id,
      type: insight.type,
      priority: insight.priority,
      lojistaId,
    });

    return docRef.id;
  } catch (error) {
    console.error("[Insights] ❌ Erro ao criar insight:", error);
    throw error;
  }
}

/**
 * Obtém insights não lidos de um lojista
 */
export async function getUnreadInsights(
  lojistaId: string,
  limit: number = 10
): Promise<InsightDoc[]> {
  try {
    const insightsRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("insights");

    const snapshot = await insightsRef
      .where("isRead", "==", false)
      .where("expiresAt", ">", new Date()) // Apenas insights não expirados
      .orderBy("expiresAt", "asc")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const insights: InsightDoc[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      insights.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        expiresAt: data.expiresAt?.toDate() || new Date(),
      } as InsightDoc);
    });

    console.log("[Insights] 📊 Insights não lidos encontrados:", {
      count: insights.length,
      lojistaId,
    });

    return insights;
  } catch (error) {
    console.error("[Insights] ❌ Erro ao buscar insights:", error);
    throw error;
  }
}

/**
 * Obtém todos os insights de um lojista (lidos e não lidos)
 */
export async function getAllInsights(
  lojistaId: string,
  limit: number = 20
): Promise<InsightDoc[]> {
  try {
    const insightsRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("insights");

    const snapshot = await insightsRef
      .where("expiresAt", ">", new Date()) // Apenas insights não expirados
      .orderBy("expiresAt", "asc")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const insights: InsightDoc[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      insights.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        expiresAt: data.expiresAt?.toDate() || new Date(),
      } as InsightDoc);
    });

    return insights;
  } catch (error) {
    console.error("[Insights] ❌ Erro ao buscar todos os insights:", error);
    throw error;
  }
}

/**
 * Marca um insight como lido
 */
export async function markAsRead(
  lojistaId: string,
  insightId: string
): Promise<void> {
  try {
    const insightRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("insights")
      .doc(insightId);

    await insightRef.update({
      isRead: true,
    });

    console.log("[Insights] ✅ Insight marcado como lido:", {
      insightId,
      lojistaId,
    });
  } catch (error) {
    console.error("[Insights] ❌ Erro ao marcar insight como lido:", error);
    throw error;
  }
}

/**
 * Marca todos os insights de um lojista como lidos
 */
export async function markAllAsRead(lojistaId: string): Promise<void> {
  try {
    const insightsRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("insights");

    const snapshot = await insightsRef
      .where("isRead", "==", false)
      .get();

    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.update(doc.ref, { isRead: true });
    });

    await batch.commit();

    console.log("[Insights] ✅ Todos os insights marcados como lidos:", {
      count: snapshot.size,
      lojistaId,
    });
  } catch (error) {
    console.error("[Insights] ❌ Erro ao marcar todos como lidos:", error);
    throw error;
  }
}

/**
 * Remove insights expirados (limpeza periódica)
 */
export async function deleteExpiredInsights(lojistaId: string): Promise<number> {
  try {
    const insightsRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("insights");

    const snapshot = await insightsRef
      .where("expiresAt", "<=", new Date())
      .get();

    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log("[Insights] 🗑️ Insights expirados removidos:", {
      count: snapshot.size,
      lojistaId,
    });

    return snapshot.size;
  } catch (error) {
    console.error("[Insights] ❌ Erro ao remover insights expirados:", error);
    throw error;
  }
}

