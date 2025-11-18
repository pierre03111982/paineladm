import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/auth/admin-auth";

const db = getAdminDb();

export const dynamic = 'force-dynamic';

interface ClienteStats {
  clienteId: string;
  lojistaId: string;
  lojistaNome: string;
  nome: string;
  whatsapp: string;
  totalComposicoes: number;
  totalLikes: number;
  primeiraComposicao: Date | null;
  ultimaComposicao: Date | null;
  primeiroAcesso: Date | null;
  ultimoAcesso: Date | null;
  arquivado: boolean;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const lojistaId = searchParams.get("lojistaId");

    // Buscar todas as lojas ou apenas uma específica
    let lojasSnapshot;
    if (lojistaId) {
      const lojaDoc = await db.collection("lojas").doc(lojistaId).get();
      if (!lojaDoc.exists) {
        return NextResponse.json({ success: true, data: { clientes: [] } });
      }
      lojasSnapshot = { docs: [lojaDoc] };
    } else {
      lojasSnapshot = await db.collection("lojas").get();
    }

    const clientesStats: ClienteStats[] = [];

    // Processar cada loja
    for (const lojaDoc of lojasSnapshot.docs) {
      const lojistaId = lojaDoc.id;
      const lojaData = lojaDoc.data();
      const lojistaNome = lojaData?.nome || "Sem nome";

      // Buscar perfil da loja para pegar o nome
      const perfilDoc = await lojaDoc.ref.collection("perfil").doc("dados").get();
      const lojistaNomeFinal = perfilDoc.exists && perfilDoc.data()?.nome 
        ? perfilDoc.data()!.nome 
        : lojistaNome;

      // Buscar clientes da loja
      const clientesSnapshot = await lojaDoc.ref.collection("clientes").get();

      for (const clienteDoc of clientesSnapshot.docs) {
        const clienteData = clienteDoc.data();
        const clienteId = clienteDoc.id;

        // Buscar composições do cliente
        const composicoesSnapshot = await lojaDoc.ref
          .collection("composicoes")
          .where("customerId", "==", clienteId)
          .orderBy("createdAt", "desc")
          .get();

        let totalLikes = 0;
        let primeiraComposicao: Date | null = null;
        let ultimaComposicao: Date | null = null;

        composicoesSnapshot.forEach((compDoc) => {
          const compData = compDoc.data();
          if (compData?.liked === true) {
            totalLikes++;
          }

          const createdAt = compData?.createdAt?.toDate?.() || compData?.createdAt || null;
          if (createdAt) {
            if (!primeiraComposicao || createdAt < primeiraComposicao) {
              primeiraComposicao = createdAt;
            }
            if (!ultimaComposicao || createdAt > ultimaComposicao) {
              ultimaComposicao = createdAt;
            }
          }
        });

        clientesStats.push({
          clienteId,
          lojistaId,
          lojistaNome: lojistaNomeFinal,
          nome: clienteData?.nome || "",
          whatsapp: clienteData?.whatsapp || "",
          totalComposicoes: composicoesSnapshot.size,
          totalLikes,
          primeiraComposicao,
          ultimaComposicao,
          primeiroAcesso: clienteData?.createdAt?.toDate?.() || clienteData?.createdAt || null,
          ultimoAcesso: clienteData?.updatedAt?.toDate?.() || clienteData?.updatedAt || null,
          arquivado: clienteData?.arquivado === true,
        });
      }
    }

    // Calcular totais
    const totalClientes = clientesStats.length;
    const clientesAtivos = clientesStats.filter((c) => !c.arquivado).length;
    const clientesInativos = clientesStats.filter((c) => c.arquivado).length;

    return NextResponse.json({
      success: true,
      data: {
        clientes: clientesStats,
        totais: {
          total: totalClientes,
          ativos: clientesAtivos,
          inativos: clientesInativos,
        },
      },
    });
  } catch (error: any) {
    console.error("[API Admin Clientes] Erro:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao buscar clientes",
      },
      { status: 500 }
    );
  }
}


