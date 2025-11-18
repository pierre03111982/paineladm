/**
 * Script para corrigir o nome da loja em TODOS os lugares possíveis
 * Corrige "Moda Tailandesa" para "THAIS MODA"
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Configurar Firebase Admin
const serviceAccount = require('../firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const lojistaId = "hOQL4BaVY92787EjKVMt";

async function fixNomeCompleto() {
  try {
    console.log("🔍 Corrigindo nome da loja em todos os lugares...");
    console.log("lojistaId:", lojistaId);
    
    const lojaRef = db.collection("lojas").doc(lojistaId);
    
    // 1. Verificar e corrigir no documento principal da loja
    const lojaDoc = await lojaRef.get();
    if (lojaDoc.exists) {
      const lojaData = lojaDoc.data();
      if (lojaData.nome === "Moda Tailandesa" || lojaData.nome === "moda tailandesa" || lojaData.nome === "MODA TAILANDESA") {
        console.log("📝 Corrigindo nome no documento principal da loja...");
        await lojaRef.update({ nome: "THAIS MODA" });
        console.log("✅ Nome corrigido no documento principal");
      } else {
        console.log("ℹ️  Nome no documento principal:", lojaData.nome);
      }
    }
    
    // 2. Verificar e corrigir em perfil/dados
    const perfilDadosRef = lojaRef.collection("perfil").doc("dados");
    const perfilDadosDoc = await perfilDadosRef.get();
    if (perfilDadosDoc.exists) {
      const perfilData = perfilDadosDoc.data();
      if (perfilData.nome === "Moda Tailandesa" || perfilData.nome === "moda tailandesa" || perfilData.nome === "MODA TAILANDESA") {
        console.log("📝 Corrigindo nome em perfil/dados...");
        await perfilDadosRef.update({ nome: "THAIS MODA" });
        console.log("✅ Nome corrigido em perfil/dados");
      } else {
        console.log("ℹ️  Nome em perfil/dados:", perfilData.nome);
      }
    }
    
    // 3. Verificar e corrigir em perfil/publico
    const perfilPublicoRef = lojaRef.collection("perfil").doc("publico");
    const perfilPublicoDoc = await perfilPublicoRef.get();
    if (perfilPublicoDoc.exists) {
      const perfilPublicoData = perfilPublicoDoc.data();
      if (perfilPublicoData.nome === "Moda Tailandesa" || perfilPublicoData.nome === "moda tailandesa" || perfilPublicoData.nome === "MODA TAILANDESA") {
        console.log("📝 Corrigindo nome em perfil/publico...");
        await perfilPublicoRef.update({ nome: "THAIS MODA" });
        console.log("✅ Nome corrigido em perfil/publico");
      } else {
        console.log("ℹ️  Nome em perfil/publico:", perfilPublicoData.nome);
      }
    }
    
    console.log("✅ Verificação completa!");
    
  } catch (error) {
    console.error("❌ Erro:", error);
  }
}

fixNomeCompleto().then(() => {
  console.log("Script finalizado");
  process.exit(0);
}).catch((error) => {
  console.error("Erro fatal:", error);
  process.exit(1);
});

