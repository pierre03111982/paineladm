/**
 * Script para contar todas as composições no banco de dados
 * Executar com: npx tsx scripts/count-compositions.ts [lojistaId]
 */

import { getAdminDb } from "../src/lib/firebaseAdmin";

async function countAllCompositions(lojistaId?: string) {
  const db = getAdminDb();
  
  // Se não forneceu lojistaId, usar do env ou pedir
  const targetLojistaId = lojistaId || 
    process.env.NEXT_PUBLIC_LOJISTA_ID || 
    process.env.LOJISTA_ID || 
    "";

  if (!targetLojistaId) {
    console.error("❌ Erro: Lojista ID não fornecido!");
    console.log("Uso: npx tsx scripts/count-compositions.ts [lojistaId]");
    process.exit(1);
  }

  console.log(`\n🔍 Contando composições para lojista: ${targetLojistaId}\n`);

  const seenIds = new Set<string>();
  let globalCount = 0;
  let subcollectionCount = 0;
  let globalTotal = 0;
  let subcollectionTotal = 0;

  // Contar da coleção global
  try {
    console.log("📊 Buscando da coleção global 'composicoes'...");
    const globalSnapshot = await db
      .collection("composicoes")
      .where("lojistaId", "==", targetLojistaId)
      .get();

    globalTotal = globalSnapshot.size;
    
    globalSnapshot.forEach((doc) => {
      if (!seenIds.has(doc.id)) {
        seenIds.add(doc.id);
        globalCount++;
      }
    });
    console.log(`   ✅ Encontradas ${globalTotal} composições na coleção global (${globalCount} únicas)\n`);
  } catch (error: any) {
    console.warn(`   ⚠️  Erro ao contar da coleção global: ${error.message}\n`);
  }

  // Contar da subcoleção do lojista
  try {
    console.log(`📊 Buscando da subcoleção 'lojas/${targetLojistaId}/composicoes'...`);
    const subcollectionSnapshot = await db
      .collection("lojas")
      .doc(targetLojistaId)
      .collection("composicoes")
      .get();

    subcollectionTotal = subcollectionSnapshot.size;
    
    subcollectionSnapshot.forEach((doc) => {
      if (!seenIds.has(doc.id)) {
        seenIds.add(doc.id);
        subcollectionCount++;
      }
    });
    console.log(`   ✅ Encontradas ${subcollectionTotal} composições na subcoleção (${subcollectionCount} únicas)\n`);
  } catch (error: any) {
    console.warn(`   ⚠️  Erro ao contar da subcoleção: ${error.message}\n`);
  }

  const uniqueCount = seenIds.size;
  const totalDocuments = globalTotal + subcollectionTotal;

  // Resultado final
  console.log("=".repeat(60));
  console.log("📈 RESULTADO FINAL");
  console.log("=".repeat(60));
  console.log(`\n🎯 Total de Composições Únicas: ${uniqueCount.toLocaleString('pt-BR')}`);
  console.log(`\n📦 Detalhamento:`);
  console.log(`   • Coleção Global: ${globalTotal.toLocaleString('pt-BR')} documentos (${globalCount.toLocaleString('pt-BR')} únicos)`);
  console.log(`   • Subcoleção: ${subcollectionTotal.toLocaleString('pt-BR')} documentos (${subcollectionCount.toLocaleString('pt-BR')} únicos)`);
  console.log(`   • Total de documentos: ${totalDocuments.toLocaleString('pt-BR')}`);
  if (totalDocuments > uniqueCount) {
    console.log(`   • Duplicatas: ${(totalDocuments - uniqueCount).toLocaleString('pt-BR')}`);
  }
  console.log("\n" + "=".repeat(60) + "\n");

  return {
    uniqueCount,
    globalTotal,
    subcollectionTotal,
    globalCount,
    subcollectionCount,
  };
}

// Executar se chamado diretamente
const lojistaId = process.argv[2];
countAllCompositions(lojistaId)
  .then(() => {
    console.log("✅ Contagem concluída!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erro ao contar composições:", error);
    process.exit(1);
  });


