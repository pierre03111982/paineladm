/**
 * Script completo para diagnosticar o problema de produtos não encontrados
 */

import { config } from "dotenv";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });
config({ path: resolve(process.cwd(), ".env") });

async function diagnosticar() {
  const compositionId = process.argv[2] || "comp_1764956112133_jk86dtnaj";
  const lojistaId = process.argv[3] || "hOQL4BaVY92787EjKVMt";
  const imagemUrl = process.argv[4] || "https://storage.googleapis.com/paineladmexperimenteai.firebasestorage.app/generations/hOQL4BaVY92787EjKVMt/job-1764956110991-rfcvgv-1764956124036.png";

  console.log("=".repeat(80));
  console.log("🔍 DIAGNÓSTICO COMPLETO DO PROBLEMA");
  console.log("=".repeat(80));
  console.log(`📋 CompositionId: ${compositionId}`);
  console.log(`📋 LojistaId: ${lojistaId}`);
  console.log(`📋 ImagemUrl: ${imagemUrl.substring(0, 80)}...\n`);

  try {
    const { getAdminDb } = await import("../src/lib/firebaseAdmin");
    const db = getAdminDb();
    const lojaRef = db.collection("lojas").doc(lojistaId);

    // 1. Verificar se a composição existe
    console.log("1️⃣ Verificando se a composição existe...");
    const composicaoDoc = await lojaRef
      .collection("composicoes")
      .doc(compositionId)
      .get();

    if (composicaoDoc.exists) {
      const compData = composicaoDoc.data();
      console.log("✅ Composição encontrada!");
      console.log(`   - Tem customerId: ${!!compData?.customerId}`);
      console.log(`   - CustomerId: ${compData?.customerId || "NÃO TEM"}`);
      console.log(`   - Tem productIds: ${!!compData?.productIds}`);
      console.log(`   - ProductIds: ${compData?.productIds?.length || 0}`);
      console.log(`   - Tem produtos: ${!!compData?.produtos}`);
      console.log(`   - Produtos: ${compData?.produtos?.length || 0}`);
      
      if (compData?.produtos && compData.produtos.length > 0) {
        console.log("\n   📦 Produtos salvos na composição:");
        compData.produtos.forEach((p: any, idx: number) => {
          console.log(`      ${idx + 1}. ${p.nome || p.id || "Sem nome"} (ID: ${p.id || "N/A"})`);
        });
      }
    } else {
      console.log("❌ Composição NÃO encontrada pelo ID!\n");
    }

    // 2. Verificar se há generation
    console.log("\n2️⃣ Verificando generations...");
    const generationsRef = db.collection("generations");
    
    // Buscar todas as generations (sem filtro primeiro)
    const allGenerations = await generationsRef.limit(5).get();
    console.log(`   📊 Total de generations na coleção: ${allGenerations.size > 0 ? "HÁ GENERATIONS" : "VAZIA (0 generations)"}`);
    
    if (allGenerations.size === 0) {
      console.log("\n   ⚠️  PROBLEMA ENCONTRADO: A coleção 'generations' está VAZIA!");
      console.log("   💡 Isso significa que:");
      console.log("      - As generations não estão sendo salvas quando as composições são criadas");
      console.log("      - Ou o customerId está null/vazio, impedindo o salvamento");
      console.log("      - Ou há um erro silencioso no salvamento");
    }

    // 3. Buscar composição pela imagemUrl
    console.log("\n3️⃣ Buscando composição pela imagemUrl...");
    const imagemUrlNormalizada = imagemUrl.split('?')[0].trim();
    
    const composicoesSnapshot = await lojaRef
      .collection("composicoes")
      .limit(100)
      .get();

    let composicaoEncontrada = false;
    for (const doc of composicoesSnapshot.docs) {
      const compData = doc.data();
      const compImagemUrl = compData?.imagemUrl || compData?.looks?.[0]?.imagemUrl;
      
      if (compImagemUrl) {
        const compUrlNormalizada = compImagemUrl.split('?')[0].trim();
        
        if (compImagemUrl === imagemUrl || compUrlNormalizada === imagemUrlNormalizada) {
          composicaoEncontrada = true;
          console.log(`\n   ✅ Composição encontrada pela imagemUrl!`);
          console.log(`   - ID: ${doc.id}`);
          console.log(`   - Tem produtos: ${!!compData?.produtos}`);
          console.log(`   - Produtos: ${compData?.produtos?.length || 0}`);
          console.log(`   - Tem productIds: ${!!compData?.productIds}`);
          console.log(`   - ProductIds: ${compData?.productIds?.length || 0}`);
          
          if (compData?.produtos && compData.produtos.length > 0) {
            console.log("\n   📦 Produtos encontrados:");
            compData.produtos.forEach((p: any, idx: number) => {
              console.log(`      ${idx + 1}. ${p.nome || "Sem nome"} (ID: ${p.id || "N/A"}) - R$ ${p.preco || 0}`);
            });
          }
          break;
        }
      }
    }
    
    if (!composicaoEncontrada) {
      console.log("   ❌ Composição NÃO encontrada pela imagemUrl");
    }

    // 4. Verificar composições recentes
    console.log("\n4️⃣ Verificando composições recentes (últimas 5)...");
    const recentComposicoes = await lojaRef
      .collection("composicoes")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    console.log(`   📊 Composições recentes: ${recentComposicoes.size}`);
    
    if (recentComposicoes.size > 0) {
      console.log("\n   📋 Análise das composições recentes:");
      recentComposicoes.docs.forEach((doc, idx) => {
        const data = doc.data();
        console.log(`\n   ${idx + 1}. ID: ${doc.id}`);
        console.log(`      - Tem customerId: ${!!data?.customerId} ${!data?.customerId ? "⚠️" : "✅"}`);
        console.log(`      - Tem productIds: ${!!data?.productIds} ${!data?.productIds ? "⚠️" : "✅"}`);
        console.log(`      - Tem produtos: ${!!data?.produtos} ${!data?.produtos ? "⚠️" : "✅"}`);
        console.log(`      - Quantidade de produtos: ${data?.produtos?.length || 0}`);
      });
    }

    console.log("\n" + "=".repeat(80));
    console.log("📊 RESUMO DO DIAGNÓSTICO");
    console.log("=".repeat(80));
    
    console.log("\n💡 POSSÍVEIS SOLUÇÕES:");
    console.log("\n1. Se a composição EXISTE mas NÃO tem produtos salvos:");
    console.log("   → Os produtos precisam ser salvos no momento da criação da composição");
    console.log("   → Verificar se o array 'produtos' está sendo preenchido corretamente");
    
    console.log("\n2. Se a composição NÃO existe:");
    console.log("   → A composição pode ter sido criada com um ID diferente");
    console.log("   → Buscar pela imagemUrl pode encontrar a composição real");
    
    console.log("\n3. Se NÃO há generations salvas:");
    console.log("   → As generations só são salvas quando há customerId");
    console.log("   → Verificar se o customerId está sendo passado corretamente");
    
    console.log("\n4. SOLUÇÃO IMEDIATA:");
    console.log("   → Buscar produtos DIRETAMENTE na composição (sem depender da generation)");
    console.log("   → Se a composição existir, extrair produtos do array 'produtos'");
    console.log("   → Se não existir, buscar pela imagemUrl");

  } catch (error: any) {
    console.error("\n❌ Erro:", error);
    process.exit(1);
  }
}

diagnosticar().then(() => process.exit(0)).catch((error) => {
  console.error("❌ Erro fatal:", error);
  process.exit(1);
});

