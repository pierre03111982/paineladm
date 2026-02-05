/**
 * Script para adicionar 300 créditos de IA a uma loja.
 * Uso: npx tsx scripts/add-300-credits.ts [lojistaId]
 * Pierre Moda: npx tsx scripts/add-300-credits.ts hOQL4BaVY92787EjKVMt
 *
 * Requer .env.local com FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.
 */

import { config } from "dotenv";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });
config();

const AMOUNT = 300;

async function addCredits() {
  const lojistaId = process.env.LOJISTA_ID || process.argv[2];
  if (!lojistaId) {
    console.error("❌ Informe o lojistaId:");
    console.error("   npx tsx scripts/add-300-credits.ts <lojistaId>");
    console.error("   Pierre Moda: npx tsx scripts/add-300-credits.ts hOQL4BaVY92787EjKVMt");
    process.exit(1);
  }

  const { getAdminDb } = await import("../src/lib/firebaseAdmin");
  const db = getAdminDb();
  const lojaRef = db.collection("lojas").doc(lojistaId);
  const lojistaRef = db.collection("lojistas").doc(lojistaId);

  const lojaDoc = await lojaRef.get();
  if (!lojaDoc.exists) {
    console.error("❌ Loja não encontrada para lojistaId:", lojistaId);
    process.exit(1);
  }

  const lojaData = lojaDoc.data() || {};
  const currentLoja = lojaData.credits ?? lojaData.aiCredits ?? lojaData.saldo ?? 0;
  const newLojaCredits = currentLoja + AMOUNT;

  await lojaRef.update({
    credits: newLojaCredits,
    aiCredits: newLojaCredits,
    saldo: newLojaCredits,
    updatedAt: new Date().toISOString(),
  });
  console.log("✅ Coleção 'lojas':", currentLoja, "->", newLojaCredits, "créditos");

  let lojistaDoc = await lojistaRef.get();
  if (lojistaDoc.exists) {
    const lojistaData = lojistaDoc.data() || {};
    const currentLojista = lojistaData.aiCredits ?? lojistaData.saldo ?? 0;
    const newLojistaCredits = currentLojista + AMOUNT;
    await lojistaRef.update({
      aiCredits: newLojistaCredits,
      saldo: newLojistaCredits,
      lastCreditUpdate: new Date().toISOString(),
      totalCreditsAdded: (lojistaData.totalCreditsAdded || 0) + AMOUNT,
    });
    console.log("✅ Coleção 'lojistas':", currentLojista, "->", newLojistaCredits, "créditos");
  } else {
    await lojistaRef.set({
      lojistaId,
      aiCredits: AMOUNT,
      saldo: AMOUNT,
      totalCreditsAdded: AMOUNT,
      lastCreditUpdate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log("✅ Coleção 'lojistas': criado com", AMOUNT, "créditos");
  }

  console.log("\n✅ Total adicionado:", AMOUNT, "créditos para lojistaId:", lojistaId);
  console.log("   Atualize a página do painel para ver o novo saldo.");
}

addCredits().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
