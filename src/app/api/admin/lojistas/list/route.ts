import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getCurrentAdmin } from "@/lib/auth/admin-auth";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { fetchLojaPerfil } from "@/lib/firestore/server";

const db = getAdminDb();

export async function GET(request: NextRequest) {
  try {
    // Verificar se é admin ou lojista
    const adminEmail = await getCurrentAdmin();
    const isAdmin = adminEmail !== null;
    
    let lojistaId: string | null = null;
    if (!isAdmin) {
      // Se não for admin, pegar apenas a loja do lojista logado
      lojistaId = await getCurrentLojistaId();
      if (!lojistaId) {
        return NextResponse.json(
          {
            success: false,
            error: "Não autorizado",
          },
          { status: 401 }
        );
      }
    }

    // Buscar lojas
    let docs: FirebaseFirestore.DocumentSnapshot[];
    if (isAdmin) {
      // Admin: buscar todas as lojas
      const lojasSnapshot = await db.collection("lojas").get();
      docs = lojasSnapshot.docs;
    } else {
      // Lojista: buscar apenas sua própria loja
      if (!lojistaId) {
        return NextResponse.json(
          {
            success: false,
            error: "Lojista ID não encontrado",
          },
          { status: 404 }
        );
      }
      const lojaDoc = await db.collection("lojas").doc(lojistaId).get();
      docs = lojaDoc.exists ? [lojaDoc] : [];
    }

    const lojas: Array<{ id: string; nome: string; logoUrl?: string | null }> = [];

    // Processar em lotes para não sobrecarregar
    const batchSize = 10;
    
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (doc) => {
          const data = doc.data();
          let nome = data?.nome || "";
          let logoUrl = data?.logoUrl || null;
          
          // Se não tiver nome no documento principal, buscar no perfil
          if (!nome) {
            const perfil = await fetchLojaPerfil(doc.id);
            nome = perfil?.nome || "";
            if (!logoUrl && perfil?.logoUrl) {
              logoUrl = perfil.logoUrl;
            }
          }

          if (nome) {
            lojas.push({
              id: doc.id,
              nome: nome,
              logoUrl: logoUrl,
            });
          }
        })
      );
    }

    // Ordenar por nome
    lojas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    return NextResponse.json({
      success: true,
      data: { lojas },
    });
  } catch (error: any) {
    console.error("[API] Erro ao listar lojas:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao listar lojas",
      },
      { status: 500 }
    );
  }
}

