import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/auth/admin-auth";

const db = getAdminDb();

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  try {
    await requireAdmin();
    const { clienteId } = await params;

    // Buscar cliente em todas as lojas
    const lojasSnapshot = await db.collection("lojas").get();
    let clienteDoc: FirebaseFirestore.DocumentSnapshot | null = null;
    let lojistaId = "";
    let lojistaNome = "";

    for (const lojaDoc of lojasSnapshot.docs) {
      const clienteRef = lojaDoc.ref.collection("clientes").doc(clienteId);
      const doc = await clienteRef.get();
      if (doc.exists) {
        clienteDoc = doc;
        lojistaId = lojaDoc.id;
        const lojaData = lojaDoc.data();
        lojistaNome = lojaData?.nome || "Sem nome";

        // Buscar nome do perfil
        const perfilDoc = await lojaDoc.ref.collection("perfil").doc("dados").get();
        if (perfilDoc.exists && perfilDoc.data()?.nome) {
          lojistaNome = perfilDoc.data()!.nome;
        }
        break;
      }
    }

    if (!clienteDoc) {
      return NextResponse.json(
        { success: false, error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    const clienteData = clienteDoc.data()!;

    // Buscar composições do cliente
    let composicoesSnapshot;
    try {
      composicoesSnapshot = await db
        .collection("lojas")
        .doc(lojistaId)
        .collection("composicoes")
        .where("customerId", "==", clienteId)
        .orderBy("createdAt", "desc")
        .get();
    } catch (error: any) {
      // Se falhar por falta de índice, buscar sem orderBy e ordenar depois
      console.warn("[API Admin Cliente] Erro ao buscar com orderBy, tentando sem:", error.message);
      composicoesSnapshot = await db
        .collection("lojas")
        .doc(lojistaId)
        .collection("composicoes")
        .where("customerId", "==", clienteId)
        .get();
    }

    let composicoes = composicoesSnapshot.docs.map((doc) => {
      const data = doc.data();
      // Buscar imagem do primeiro look ou previewUrl
      const firstLook = data?.looks && data.looks.length > 0 ? data.looks[0] : null;
      const imageUrl = firstLook?.imagemUrl || data?.previewUrl || data?.imageUrl || null;
      
      const createdAt = data?.createdAt?.toDate?.() || data?.createdAt || null;
      
      return {
        id: doc.id,
        createdAt: createdAt,
        liked: data?.liked === true || data?.curtido === true,
        shares: data?.shares || (data?.compartilhado ? 1 : 0),
        products: data?.products || [],
        imageUrl: imageUrl,
        titulo: data?.titulo || data?.primaryProductName || "Composição",
      };
    });

    // Ordenar por data se não foi ordenado na query
    composicoes.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // Calcular estatísticas
    const totalComposicoes = composicoes.length;
    const totalLikes = composicoes.filter((c) => c.liked).length;
    const totalShares = composicoes.reduce((sum, c) => sum + c.shares, 0);

    const datasComposicoes = composicoes
      .map((c) => c.createdAt)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    const primeiraComposicao = datasComposicoes[0] || null;
    const ultimaComposicao = datasComposicoes[datasComposicoes.length - 1] || null;

    return NextResponse.json({
      success: true,
      data: {
        cliente: {
          id: clienteId,
          nome: clienteData?.nome || "",
          whatsapp: clienteData?.whatsapp || "",
          arquivado: clienteData?.arquivado === true,
          primeiroAcesso: clienteData?.createdAt?.toDate?.() || clienteData?.createdAt || null,
          ultimoAcesso: clienteData?.updatedAt?.toDate?.() || clienteData?.updatedAt || null,
        },
        lojista: {
          id: lojistaId,
          nome: lojistaNome,
        },
        estatisticas: {
          totalComposicoes,
          totalLikes,
          totalShares,
          primeiraComposicao,
          ultimaComposicao,
        },
        composicoes,
      },
    });
  } catch (error: any) {
    console.error("[API Admin Cliente Detalhes] Erro:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao buscar detalhes do cliente",
      },
      { status: 500 }
    );
  }
}

