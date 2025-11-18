import { redirect, notFound } from "next/navigation";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { LojistaPanelView } from "./lojista-panel-view";

// Forçar renderização dinâmica
export const dynamic = 'force-dynamic';

async function getLojistaData(lojistaId: string) {
  try {
    const db = getAdminDb();
    const lojistaDoc = await db.collection("lojas").doc(lojistaId).get();
    
    if (!lojistaDoc.exists) {
      return null;
    }

    const data = lojistaDoc.data();
    return {
      id: lojistaDoc.id,
      nome: data?.nome || "Loja sem nome",
      email: data?.email || "",
      planoAtual: data?.planoAtual || "free",
      statusPagamento: data?.statusPagamento || "pendente",
      dataVencimento: data?.dataVencimento?.toDate?.() || null,
      createdAt: data?.createdAt?.toDate?.() || new Date(),
      status: data?.status || "pendente",
      logoUrl: data?.logoUrl || null,
      limiteImagens: data?.limiteImagens || 0,
      imagensGeradasMes: data?.imagensGeradasMes || 0,
      descricao: data?.descricao || "",
    };
  } catch (error) {
    console.error("[AdminLojistaView] Erro ao buscar lojista:", error);
    return null;
  }
}

export default async function AdminLojistaViewPage({
  params,
}: {
  params: Promise<{ lojistaId: string }>;
}) {
  await requireAdmin();
  
  const { lojistaId } = await params;
  const lojista = await getLojistaData(lojistaId);

  if (!lojista) {
    notFound();
  }

  return <LojistaPanelView lojista={lojista} />;
}




