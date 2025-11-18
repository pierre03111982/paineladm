import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { fetchLojaPerfil } from "@/lib/firestore/server";

const db = getAdminDb();

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: { lojas: [] },
      });
    }

    // Buscar todas as lojas
    const lojasSnapshot = await db.collection("lojas").get();
    const lojas: Array<{ id: string; nome: string }> = [];

    // Processar em lotes para não sobrecarregar
    const batchSize = 10;
    const docs = lojasSnapshot.docs;
    
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (doc) => {
          const data = doc.data();
          let nome = data?.nome || "";
          
          // Se não tiver nome no documento principal, buscar no perfil
          if (!nome) {
            const perfil = await fetchLojaPerfil(doc.id);
            nome = perfil?.nome || "";
          }

          if (nome) {
            lojas.push({
              id: doc.id,
              nome: nome,
            });
          }
        })
      );
    }

    // Filtrar por nome (case-insensitive)
    const filtered = lojas.filter((loja) =>
      loja.nome.toLowerCase().includes(query.toLowerCase())
    );

    // Ordenar por nome
    filtered.sort((a, b) => a.nome.localeCompare(b.nome));

    return NextResponse.json({
      success: true,
      data: { lojas: filtered.slice(0, 10) }, // Limitar a 10 resultados
    });
  } catch (error: any) {
    console.error("[API] Erro ao buscar lojas:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao buscar lojas",
      },
      { status: 500 }
    );
  }
}

