/**
 * Script para verificar se há generations salvas e por que podem não estar sendo encontradas
 */

import { config } from "dotenv";
import { resolve } from "path";

// Carregar variáveis de ambiente
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });
config({ path: resolve(process.cwd(), ".env") });

async function verificarGenerations() {
  const lojistaId = process.argv[2] || "hOQL4BaVY92787EjKVMt";

  console.log("=".repeat(80));
  console.log("🔍 VERIFICAÇÃO DE GENERATIONS SALVAS");
  console.log("=".repeat(80));
  console.log(`📋 LojistaId: ${lojistaId}\n`);

  try {
    const { getAdminDb } = await import("../src/lib/firebaseAdmin");
    const db = getAdminDb();
    console.log("✅ Firebase Admin inicializado\n");

    // 1. Verificar quantas generations existem no total
    console.log("1️⃣ Verificando generations na coleção global...");
    const allGenerationsRef = db.collection("generations");
    const allGenerationsSnapshot = await allGenerationsRef.limit(10).get();
    console.log(`   📊 Total de generations na coleção global (primeiras 10): ${allGenerationsSnapshot.size}`);
    
    if (allGenerationsSnapshot.size > 0) {
      console.log("\n   📋 Primeiras 3 generations encontradas:");
      allGenerationsSnapshot.docs.slice(0, 3).forEach((doc, idx) => {
        const data = doc.data();
        console.log(`\n   ${idx + 1}. Generation ID: ${doc.id}`);
        console.log(`      - LojistaId: ${data.lojistaId || "N/A"}`);
        console.log(`      - UserId: ${data.userId || "N/A"}`);
        console.log(`      - CompositionId: ${data.compositionId || "N/A"}`);
        console.log(`      - Status: ${data.status || "N/A"}`);
        console.log(`      - ProductIds: ${data.productIds?.length || 0}`);
        if (data.productIds && data.productIds.length > 0) {
          console.log(`        ${data.productIds.join(", ")}`);
        }
      });
    }

    // 2. Verificar generations deste lojista
    console.log("\n2️⃣ Verificando generations deste lojista...");
    try {
      const generationsSnapshot = await allGenerationsRef
        .where("lojistaId", "==", lojistaId)
        .limit(10)
        .get();

      console.log(`   📊 Total de generations encontradas para este lojista: ${generationsSnapshot.size}`);

      if (generationsSnapshot.size > 0) {
        console.log("\n   📋 Generations encontradas:");
        generationsSnapshot.docs.forEach((doc, idx) => {
          const data = doc.data();
          console.log(`\n   ${idx + 1}. Generation ID: ${doc.id}`);
          console.log(`      - CompositionId: ${data.compositionId || "N/A"}`);
          console.log(`      - UserId: ${data.userId || "N/A"}`);
          console.log(`      - Status: ${data.status || "N/A"}`);
          console.log(`      - ShowInRadar: ${data.showInRadar || false}`);
          console.log(`      - ProductIds: ${data.productIds?.length || 0}`);
          if (data.productIds && data.productIds.length > 0) {
            console.log(`        ${data.productIds.join(", ")}`);
          }
          console.log(`      - ImagemUrl: ${(data.imagemUrl || "N/A").substring(0, 80)}...`);
          console.log(`      - CreatedAt: ${data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : "N/A"}`);
        });
      } else {
        console.log("\n   ❌ NENHUMA GENERATION ENCONTRADA para este lojista!");
        console.log("\n   🔍 Possíveis causas:");
        console.log("      1. As generations não estão sendo salvas quando as composições são criadas");
        console.log("      2. O customerId pode estar null/vazio, impedindo o salvamento");
        console.log("      3. Pode haver um erro silencioso no salvamento");
        console.log("      4. As generations podem estar sendo salvas com um lojistaId diferente");
      }
    } catch (error: any) {
      console.error(`   ❌ Erro ao buscar generations: ${error.message}`);
      console.log("\n   💡 Pode não haver índice no Firestore para esta query");
    }

    // 3. Verificar composições recentes para ver se têm customerId
    console.log("\n3️⃣ Verificando composições recentes para ver se têm customerId...");
    const lojaRef = db.collection("lojas").doc(lojistaId);
    const composicoesSnapshot = await lojaRef
      .collection("composicoes")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    console.log(`   📊 Composições recentes encontradas: ${composicoesSnapshot.size}`);

    if (composicoesSnapshot.size > 0) {
      console.log("\n   📋 Composições recentes:");
      composicoesSnapshot.docs.forEach((doc, idx) => {
        const data = doc.data();
        const hasCustomerId = !!(data.customerId || data.userId);
        const customerIdValue = data.customerId || data.userId || "N/A";
        
        console.log(`\n   ${idx + 1}. Composition ID: ${doc.id}`);
        console.log(`      - Tem customerId: ${hasCustomerId ? "✅ SIM" : "❌ NÃO"}`);
        console.log(`      - CustomerId: ${customerIdValue}`);
        console.log(`      - CustomerName: ${data.customerName || "N/A"}`);
        console.log(`      - ProductIds: ${data.productIds?.length || 0}`);
        console.log(`      - Produtos salvos: ${data.produtos?.length || 0}`);
        console.log(`      - CreatedAt: ${data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : "N/A"}`);
        
        if (!hasCustomerId) {
          console.log(`      ⚠️  ATENÇÃO: Esta composição NÃO tem customerId, então a generation não foi salva!`);
        }
      });
    }

    // 4. Verificar se há generations sem lojistaId (pode estar salvo incorretamente)
    console.log("\n4️⃣ Verificando se há generations sem lojistaId ou com lojistaId diferente...");
    try {
      // Buscar algumas generations para ver os lojistaIds
      const sampleGenerations = await allGenerationsRef.limit(20).get();
      
      if (sampleGenerations.size > 0) {
        const lojistaIdsEncontrados = new Set<string>();
        sampleGenerations.docs.forEach((doc) => {
          const data = doc.data();
          if (data.lojistaId) {
            lojistaIdsEncontrados.add(data.lojistaId);
          }
        });
        
        console.log(`   📊 LojistaIds únicos encontrados nas generations: ${lojistaIdsEncontrados.size}`);
        console.log(`   📋 LojistaIds: ${Array.from(lojistaIdsEncontrados).join(", ")}`);
        
        if (!lojistaIdsEncontrados.has(lojistaId)) {
          console.log(`\n   ⚠️  ATENÇÃO: O lojistaId "${lojistaId}" NÃO foi encontrado nas generations!`);
          console.log(`      Isso pode significar que as generations estão sendo salvas com um ID diferente.`);
        }
      }
    } catch (error: any) {
      console.log(`   ⚠️  Não foi possível verificar: ${error.message}`);
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ Verificação concluída!");
    console.log("=".repeat(80));

  } catch (error: any) {
    console.error("\n❌ Erro na verificação:", error);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

verificarGenerations().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error("❌ Erro fatal:", error);
  process.exit(1);
});

