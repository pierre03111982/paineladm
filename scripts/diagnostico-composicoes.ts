/**
 * Script de diagnóstico para verificar onde estão as composições
 * Executar com: npx tsx scripts/diagnostico-composicoes.ts <lojistaId>
 */

// Carregar variáveis de ambiente do .env.local ANTES de qualquer import do Firebase
import { config } from "dotenv";
import { resolve } from "path";

// Carregar .env.local se existir
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });
config({ path: resolve(process.cwd(), ".env") });

async function diagnosticarComposicoes(lojistaId: string) {
  if (!lojistaId) {
    console.error("❌ Erro: lojistaId é obrigatório!");
    console.log("\nUso: npx tsx scripts/diagnostico-composicoes.ts <lojistaId>");
    process.exit(1);
  }

  console.log("=".repeat(80));
  console.log("🔍 DIAGNÓSTICO DE COMPOSIÇÕES");
  console.log("=".repeat(80));
  console.log(`📌 Lojista ID: ${lojistaId}\n`);

  try {
    const { getAdminDb } = await import("../src/lib/firebaseAdmin");
    const db = getAdminDb();

    // 1. Verificar subcoleção
    console.log("📦 1. Verificando SUBCOLEÇÃO (lojas/{lojistaId}/composicoes)...");
    try {
      const subcollectionRef = db
        .collection("lojas")
        .doc(lojistaId)
        .collection("composicoes");
      
      const subcollectionSnapshot = await subcollectionRef.limit(10).get();
      console.log(`   ✅ Encontradas ${subcollectionSnapshot.size} composições na subcoleção`);
      
      if (subcollectionSnapshot.size > 0) {
        subcollectionSnapshot.forEach((doc, idx) => {
          const data = doc.data();
          let createdAt = "N/A";
          if (data?.createdAt) {
            if (data.createdAt.toDate) {
              createdAt = data.createdAt.toDate().toLocaleDateString("pt-BR");
            }
          }
          console.log(`      ${idx + 1}. ID: ${doc.id.substring(0, 20)}... | Data: ${createdAt}`);
        });
      }
    } catch (error: any) {
      console.log(`   ❌ Erro ao acessar subcoleção: ${error.message}`);
    }

    console.log("\n📦 2. Verificando COLEÇÃO GLOBAL (composicoes)...");
    try {
      const globalRef = db.collection("composicoes");
      const globalSnapshot = await globalRef
        .where("lojistaId", "==", lojistaId)
        .limit(10)
        .get();
      
      console.log(`   ✅ Encontradas ${globalSnapshot.size} composições na coleção global`);
      
      if (globalSnapshot.size > 0) {
        globalSnapshot.forEach((doc, idx) => {
          const data = doc.data();
          let createdAt = "N/A";
          if (data?.createdAt) {
            if (data.createdAt.toDate) {
              createdAt = data.createdAt.toDate().toLocaleDateString("pt-BR");
            }
          }
          console.log(`      ${idx + 1}. ID: ${doc.id.substring(0, 20)}... | Data: ${createdAt}`);
        });
      }
    } catch (error: any) {
      console.log(`   ❌ Erro ao acessar coleção global: ${error.message}`);
    }

    console.log("\n📦 3. Buscando TODOS os lojistaIds únicos na coleção global...");
    try {
      const allComposicoesRef = db.collection("composicoes");
      const allSnapshot = await allComposicoesRef.limit(100).get();
      
      const lojistaIds = new Set<string>();
      allSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data?.lojistaId) {
          lojistaIds.add(data.lojistaId);
        }
      });
      
      console.log(`   ✅ Encontrados ${lojistaIds.size} lojistaId(s) únicos:`);
      Array.from(lojistaIds).forEach((id, idx) => {
        console.log(`      ${idx + 1}. ${id}${id === lojistaId ? ' ← Este é o que você está buscando' : ''}`);
      });
    } catch (error: any) {
      console.log(`   ❌ Erro: ${error.message}`);
    }

    console.log("\n📦 4. Verificando se o documento do lojista existe...");
    try {
      const lojaDoc = await db.collection("lojas").doc(lojistaId).get();
      if (lojaDoc.exists) {
        console.log(`   ✅ Documento do lojista existe na coleção 'lojas'`);
        const lojaData = lojaDoc.data();
        console.log(`      Nome: ${lojaData?.nome || lojaData?.nomeCompleto || "N/A"}`);
      } else {
        console.log(`   ⚠️  Documento do lojista NÃO existe na coleção 'lojas'`);
      }
    } catch (error: any) {
      console.log(`   ❌ Erro: ${error.message}`);
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ Diagnóstico concluído!");
    console.log("=".repeat(80));

  } catch (error) {
    console.error("\n❌ Erro ao diagnosticar:", error);
    if (error instanceof Error) {
      console.error("Mensagem:", error.message);
    }
    process.exit(1);
  }
}

const lojistaId = process.argv[2] || process.env.LOJISTA_ID || process.env.NEXT_PUBLIC_LOJISTA_ID;

diagnosticarComposicoes(lojistaId || "")
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erro fatal:", error);
    process.exit(1);
  });


