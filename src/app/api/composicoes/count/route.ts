import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaIdFromQuery = searchParams.get("lojistaId");
    
    // Prioridade: query string (modo admin) > usuário logado > env var
    const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId();
    const lojistaId =
      lojistaIdFromQuery ||
      lojistaIdFromAuth ||
      process.env.NEXT_PUBLIC_LOJISTA_ID ||
      process.env.LOJISTA_ID ||
      "";

    if (!lojistaId) {
      return NextResponse.json(
        { success: false, error: "Lojista ID não encontrado" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const seenIds = new Set<string>();
    let globalCount = 0;
    let subcollectionCount = 0;
    let globalTotal = 0;
    let subcollectionTotal = 0;

    // Contar da coleção global
    try {
      const globalSnapshot = await db
        .collection("composicoes")
        .where("lojistaId", "==", lojistaId)
        .get();

      globalTotal = globalSnapshot.size;
      
      globalSnapshot.forEach((doc) => {
        if (!seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          globalCount++;
        }
      });
      console.log(`[countCompositions] ${globalSnapshot.size} composições encontradas na coleção global (${globalCount} únicas)`);
    } catch (error: any) {
      console.warn("[countCompositions] Erro ao contar da coleção global:", error);
    }

    // Contar da subcoleção do lojista
    try {
      const subcollectionSnapshot = await db
        .collection("lojas")
        .doc(lojistaId)
        .collection("composicoes")
        .get();

      subcollectionTotal = subcollectionSnapshot.size;
      
      subcollectionSnapshot.forEach((doc) => {
        if (!seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          subcollectionCount++;
        }
      });
      console.log(`[countCompositions] ${subcollectionSnapshot.size} composições encontradas na subcoleção (${subcollectionCount} únicas)`);
    } catch (error: any) {
      console.warn("[countCompositions] Erro ao contar da subcoleção:", error);
    }

    const uniqueCount = seenIds.size;
    const totalDocuments = globalTotal + subcollectionTotal;

    const result = {
      success: true,
      lojistaId,
      counts: {
        totalDocuments, // Total de documentos em ambas as coleções (pode ter duplicatas)
        uniqueCompositions: uniqueCount, // Composições únicas (sem duplicatas)
        fromGlobalCollection: {
          total: globalTotal,
          unique: globalCount,
        },
        fromSubcollection: {
          total: subcollectionTotal,
          unique: subcollectionCount,
        },
      },
      message: `Total de ${uniqueCount} composições únicas encontradas no banco de dados`,
    };

    console.log(`[countCompositions] Resultado final:`, result);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[countCompositions] Erro ao contar composições:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Erro ao contar composições" 
      },
      { status: 500 }
    );
  }
}


