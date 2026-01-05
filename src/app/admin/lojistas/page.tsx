import { LojistasPageClient } from "./components/LojistasPageClient";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { fetchLojaPerfil } from "@/lib/firestore/server";

// Forçar renderização dinâmica (não estática)
export const dynamic = 'force-dynamic';

async function fetchLojistas() {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection("lojas").get();
    
    // Buscar dados de todos os lojistas, incluindo perfil
    const lojistasPromises = snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const lojistaId = doc.id;
      
      // Buscar perfil para obter logoUrl e nome atualizado
      const perfil = await fetchLojaPerfil(lojistaId);
      
      // FASE 3: Buscar subscription e usageMetrics para auditoria
      const subscription = data.subscription || {
        planId: "start",
        status: "active",
        adSlotsLimit: 0,
        clientType: "standard",
      };
      const usageMetrics = data.usageMetrics || {
        totalGenerated: 0,
        creditsUsed: 0,
        creditsRemaining: 0,
      };

      return {
        id: lojistaId,
        nome: perfil?.nome || data.nome || "Loja sem nome",
        email: data.email || "",
        planoAtual: subscription.planId || data.planoAtual || "start",
        statusPagamento: data.statusPagamento || "pendente",
        dataVencimento: data.dataVencimento?.toDate?.() || null,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        status: data.status || "pendente",
        logoUrl: perfil?.logoUrl || data.logoUrl || null,
        limiteImagens: data.limiteImagens || 0,
        imagensGeradasMes: data.imagensGeradasMes || 0,
        // FASE 3: Auditoria de GPU
        totalGenerated: usageMetrics.totalGenerated || 0,
        clientType: subscription.clientType || "standard",
      };
    });
    
    return await Promise.all(lojistasPromises);
  } catch (error) {
    console.error("[AdminLojistas] Erro ao buscar lojistas:", error);
    return [];
  }
}

export default async function AdminLojistasPage() {
  // Verificar se o usuário é admin
  await requireAdmin();
  
  const lojistas = await fetchLojistas();

  return <LojistasPageClient initialLojistas={lojistas} />;
}

