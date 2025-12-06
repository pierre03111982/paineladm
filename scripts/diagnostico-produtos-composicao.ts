/**
 * Script para diagnosticar produtos salvos em uma composição
 * Uso: npx tsx scripts/diagnostico-produtos-composicao.ts <compositionId> <lojistaId>
 */

import * as dotenv from "dotenv";
import * as path from "path";

// Carregar variáveis de ambiente ANTES de importar Firebase
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { getAdminDb } from "../src/lib/firebaseAdmin";

async function diagnosticarComposicao(compositionId: string, lojistaId: string) {
  try {
    console.log(`\n🔍 DIAGNÓSTICO DE COMPOSIÇÃO`);
    console.log(`================================`);
    console.log(`Composição ID: ${compositionId}`);
    console.log(`Lojista ID: ${lojistaId}\n`);

    const db = getAdminDb();
    const lojaRef = db.collection("lojas").doc(lojistaId);

    // Buscar composição
    const composicaoDoc = await lojaRef
      .collection("composicoes")
      .doc(compositionId)
      .get();

    if (!composicaoDoc.exists) {
      console.error(`❌ Composição não encontrada!`);
      return;
    }

    const composicaoData = composicaoDoc.data();
    console.log(`✅ Composição encontrada!\n`);

    // Verificar produtos
    console.log(`📦 PRODUTOS SALVOS NA COMPOSIÇÃO:`);
    console.log(`-----------------------------------`);
    
    if (composicaoData?.produtos && Array.isArray(composicaoData.produtos)) {
      console.log(`Total de produtos: ${composicaoData.produtos.length}\n`);
      
      composicaoData.produtos.forEach((prod: any, index: number) => {
        console.log(`Produto ${index + 1}:`);
        console.log(`  ID: ${prod.id || prod.productId || "NÃO ENCONTRADO"}`);
        console.log(`  Nome: ${prod.nome || "NÃO ENCONTRADO"}`);
        console.log(`  Preço: R$ ${prod.preco || 0}`);
        console.log(`  Imagem URL: ${prod.imagemUrl ? "SIM" : "NÃO"}`);
        console.log(`  Tamanhos: ${Array.isArray(prod.tamanhos) ? prod.tamanhos.join(", ") : prod.tamanho || "NÃO INFORMADO"}`);
        console.log(`  Desconto: ${prod.desconto || 0}%`);
        console.log(``);
      });
    } else {
      console.log(`❌ Campo 'produtos' não existe ou não é um array\n`);
    }

    // Verificar productIds
    console.log(`🆔 PRODUCT IDS:`);
    console.log(`---------------`);
    if (composicaoData?.productIds && Array.isArray(composicaoData.productIds)) {
      console.log(`Total de IDs: ${composicaoData.productIds.length}`);
      console.log(`IDs: ${composicaoData.productIds.join(", ")}\n`);
    } else {
      console.log(`❌ Campo 'productIds' não existe ou não é um array\n`);
    }

    // Verificar primaryProductId
    if (composicaoData?.primaryProductId) {
      console.log(`⭐ Produto Principal ID: ${composicaoData.primaryProductId}\n`);
    }

    // Buscar products do Firestore
    console.log(`🔎 VERIFICANDO PRODUTOS NO FIRESTORE:`);
    console.log(`--------------------------------------`);
    
    const productIds = composicaoData?.productIds || 
                      (composicaoData?.produtos ? composicaoData.produtos.map((p: any) => p.id || p.productId).filter(Boolean) : []) ||
                      (composicaoData?.primaryProductId ? [composicaoData.primaryProductId] : []);

    if (productIds.length === 0) {
      console.log(`❌ Nenhum productId encontrado para buscar!\n`);
      return;
    }

    console.log(`Buscando ${productIds.length} produtos...\n`);

    for (const productId of productIds) {
      try {
        const produtoDoc = await lojaRef
          .collection("produtos")
          .doc(productId)
          .get();

        if (produtoDoc.exists) {
          const produtoData = produtoDoc.data();
          console.log(`✅ Produto ${productId} encontrado:`);
          console.log(`   Nome: ${produtoData?.nome}`);
          console.log(`   Preço: R$ ${produtoData?.preco}`);
          console.log(`   Tem Imagem: ${!!produtoData?.imagemUrl || !!produtoData?.productUrl}`);
          console.log(`   Tamanhos: ${Array.isArray(produtoData?.tamanhos) ? produtoData.tamanhos.join(", ") : "N/A"}`);
          console.log(``);
        } else {
          console.log(`❌ Produto ${productId} NÃO encontrado no Firestore\n`);
        }
      } catch (error) {
        console.error(`❌ Erro ao buscar produto ${productId}:`, error);
      }
    }

    // Verificar generation
    console.log(`\n📊 VERIFICANDO GENERATION:`);
    console.log(`---------------------------`);
    
    try {
      const generationsRef = db.collection("generations");
      const generationQuery = await generationsRef
        .where("lojistaId", "==", lojistaId)
        .where("compositionId", "==", compositionId)
        .limit(1)
        .get();

      if (!generationQuery.empty) {
        const generationData = generationQuery.docs[0].data();
        console.log(`✅ Generation encontrada!`);
        console.log(`   ProductIds: ${generationData.productIds?.join(", ") || "Nenhum"}`);
        console.log(`   Imagem URL: ${generationData.imagemUrl ? "SIM" : "NÃO"}\n`);
      } else {
        console.log(`❌ Generation não encontrada\n`);
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar generation:`, error);
    }

  } catch (error) {
    console.error(`❌ Erro no diagnóstico:`, error);
  }
}

// Executar
const compositionId = process.argv[2];
const lojistaId = process.argv[3];

if (!compositionId || !lojistaId) {
  console.error("❌ Uso: npx tsx scripts/diagnostico-produtos-composicao.ts <compositionId> <lojistaId>");
  process.exit(1);
}

diagnosticarComposicao(compositionId, lojistaId).then(() => {
  console.log("\n✅ Diagnóstico concluído!");
  process.exit(0);
}).catch((error) => {
  console.error("\n❌ Erro fatal:", error);
  process.exit(1);
});


