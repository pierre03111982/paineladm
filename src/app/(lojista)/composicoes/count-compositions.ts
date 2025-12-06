import { getAdminDb } from "@/lib/firebaseAdmin";

export async function countAllCompositions(lojistaId: string): Promise<{
  total: number;
  fromGlobal: number;
  fromSubcollection: number;
  unique: number;
}> {
  if (!lojistaId) {
    return {
      total: 0,
      fromGlobal: 0,
      fromSubcollection: 0,
      unique: 0,
    };
  }

    try {
      const db = getAdminDb();
      let subcollectionCount = 0;

      // PAINEL DO LOJISTA: Contar APENAS da subcoleção (não acessa coleção global)
      // Apenas o painel administrativo tem acesso à coleção global
      try {
        const subcollectionSnapshot = await db
          .collection("lojas")
          .doc(lojistaId)
          .collection("composicoes")
          .get();

        subcollectionSnapshot.forEach((doc) => {
          subcollectionCount++;
        });
        console.log(`[countCompositions] ${subcollectionSnapshot.size} composições encontradas na subcoleção`);
      } catch (error) {
        console.warn("[countCompositions] Erro ao contar da subcoleção:", error);
      }

    // NOTA: Painel do lojista não acessa coleção global
    // Apenas painel administrativo tem acesso à coleção global
    console.log(`[countCompositions] Total: ${subcollectionCount} composições na subcoleção`);

    return {
      total: subcollectionCount,
      fromGlobal: 0, // Painel do lojista não acessa coleção global
      fromSubcollection: subcollectionCount,
      unique: subcollectionCount,
    };
  } catch (error) {
    console.error("[countCompositions] Erro ao contar composições:", error);
    return {
      total: 0,
      fromGlobal: 0,
      fromSubcollection: 0,
      unique: 0,
    };
  }
}

