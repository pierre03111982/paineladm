/**
 * Script para testar a busca de produtos para uma composição
 * Usa dados reais dos logs para diagnosticar o problema
 */

import { config } from "dotenv";
import { resolve } from "path";

// Carregar variáveis de ambiente
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });
config({ path: resolve(process.cwd(), ".env") });

async function testarBuscaProdutos() {
  // Dados reais dos logs
  const compositionId = "comp_1764956112133_jk86dtnaj";
  const lojistaId = "hOQL4BaVY92787EjKVMt";
  const imagemUrl = "https://storage.googleapis.com/paineladmexperimenteai.firebasestorage.app/generations/hOQL4BaVY92787EjKVMt/job-1764956110991-rfcvgv-1764956124036.png";

  console.log("=".repeat(80));
  console.log("🧪 TESTE DE BUSCA DE PRODUTOS");
  console.log("=".repeat(80));
  console.log(`📋 Parâmetros:`);
  console.log(`  - CompositionId: ${compositionId}`);
  console.log(`  - LojistaId: ${lojistaId}`);
  console.log(`  - ImagemUrl: ${imagemUrl}`);
  console.log("");

  try {
    const { getAdminDb } = await import("../src/lib/firebaseAdmin");
    const db = getAdminDb();
    console.log("✅ Firebase Admin inicializado\n");

    const lojaRef = db.collection("lojas").doc(lojistaId);
    let products: any[] = [];
    let productIds: string[] = [];

    // 1. Tentar buscar a composição diretamente
    console.log("1️⃣ Buscando composição diretamente pelo ID...");
    const composicaoDoc = await lojaRef
      .collection("composicoes")
      .doc(compositionId)
      .get();

    if (composicaoDoc.exists) {
      const composicaoData = composicaoDoc.data();
      console.log("✅ Composição encontrada!");
      
      if (composicaoData?.produtos && Array.isArray(composicaoData.produtos)) {
        const produtosSalvos = composicaoData.produtos;
        console.log(`   - Total de produtos: ${produtosSalvos.length}`);
        
        produtosSalvos.forEach((p: any, idx: number) => {
          console.log(`   ${idx + 1}. ${p.nome || "Sem nome"} (ID: ${p.id || "N/A"}) - R$ ${p.preco || 0}`);
        });
        
        if (produtosSalvos.length > 0) {
          products = produtosSalvos.map((p: any) => ({
            id: p.id || p.productId,
            nome: p.nome || "Produto",
            preco: p.preco || 0,
            imagemUrl: p.imagemUrl || p.imageUrl || null,
          }));
        }
      }
      
      if (composicaoData?.productIds) {
        productIds = composicaoData.productIds;
        console.log(`   - ProductIds: ${productIds.join(", ")}`);
      }
    } else {
      console.log("❌ Composição NÃO encontrada pelo ID\n");
    }

    // 2. Buscar na GENERATION pela imagemUrl
    if (products.length === 0 && productIds.length === 0) {
      console.log("\n2️⃣ Buscando na GENERATION pela imagemUrl...");
      
      const generationsRef = db.collection("generations");
      
      // Normalizar URL (sem query params)
      const imagemUrlNormalizada = imagemUrl.split('?')[0].trim();
      
      try {
        // Buscar todas as generations do lojista
        console.log("   🔍 Buscando TODAS as generations do lojista...");
        const allGenerationsQuery = await generationsRef
          .where("lojistaId", "==", lojistaId)
          .limit(2000)
          .get();

        console.log(`   📊 Total de generations encontradas: ${allGenerationsQuery.size}`);

        let generationEncontrada: any = null;
        
        for (const genDoc of allGenerationsQuery.docs) {
          const genData = genDoc.data();
          const genImagemUrl = genData.imagemUrl || genData.imageUrl;
          
          if (genImagemUrl) {
            // Comparação exata
            if (genImagemUrl === imagemUrl || genImagemUrl.trim() === imagemUrl.trim()) {
              generationEncontrada = genData;
              console.log(`\n   ✅ Generation encontrada (match exato)!`);
              console.log(`   - Generation ID: ${genDoc.id}`);
              console.log(`   - CompositionId: ${genData.compositionId}`);
              console.log(`   - ProductIds: ${genData.productIds?.length || 0}`);
              break;
            }
            
            // Comparação sem query params
            const genUrlNormalizada = genImagemUrl.split('?')[0].trim();
            if (genUrlNormalizada === imagemUrlNormalizada) {
              generationEncontrada = genData;
              console.log(`\n   ✅ Generation encontrada (match sem query params)!`);
              console.log(`   - Generation ID: ${genDoc.id}`);
              console.log(`   - CompositionId: ${genData.compositionId}`);
              console.log(`   - URL na generation: ${genImagemUrl.substring(0, 100)}...`);
              console.log(`   - ProductIds: ${genData.productIds?.length || 0}`);
              if (genData.productIds && genData.productIds.length > 0) {
                console.log(`     ${genData.productIds.join(", ")}`);
              }
              break;
            }
            
            // Comparação por nome do arquivo
            const buscaFileName = imagemUrlNormalizada.split('/').pop() || '';
            const genFileName = genUrlNormalizada.split('/').pop() || '';
            if (buscaFileName && genFileName && buscaFileName === genFileName) {
              generationEncontrada = genData;
              console.log(`\n   ✅ Generation encontrada (match por nome do arquivo: ${buscaFileName})!`);
              console.log(`   - Generation ID: ${genDoc.id}`);
              console.log(`   - CompositionId: ${genData.compositionId}`);
              console.log(`   - ProductIds: ${genData.productIds?.length || 0}`);
              if (genData.productIds && genData.productIds.length > 0) {
                console.log(`     ${genData.productIds.join(", ")}`);
              }
              break;
            }
          }
        }
        
        if (generationEncontrada) {
          const generationProductIds = generationEncontrada.productIds || [];
          
          if (generationProductIds.length > 0) {
            productIds = generationProductIds;
            console.log(`\n   ✅ ProductIds encontrados na generation: ${productIds.length}`);
            console.log(`     ${productIds.join(", ")}`);
          } else {
            console.log(`\n   ⚠️ Generation encontrada mas SEM productIds!`);
          }
        } else {
          console.log(`\n   ❌ Nenhuma generation encontrada após verificar ${allGenerationsQuery.size} documentos`);
          console.log(`   🔍 URL buscada: ${imagemUrlNormalizada.substring(0, 150)}...`);
          
          // Mostrar algumas URLs para comparação
          console.log(`\n   📋 Primeiras 5 URLs encontradas (para comparação):`);
          allGenerationsQuery.docs.slice(0, 5).forEach((doc, idx) => {
            const data = doc.data();
            const url = (data.imagemUrl || data.imageUrl || "SEM URL").substring(0, 120);
            console.log(`     ${idx + 1}. ${url}...`);
          });
        }
      } catch (error: any) {
        console.error(`   ❌ Erro ao buscar generations: ${error.message}`);
      }
    }

    // 3. Buscar produtos pelos productIds
    if (productIds.length > 0 && products.length === 0) {
      console.log(`\n3️⃣ Buscando produtos pelos productIds encontrados...`);
      
      for (const productId of productIds) {
        try {
          const produtoDoc = await lojaRef
            .collection("produtos")
            .doc(productId)
            .get();

          if (produtoDoc.exists) {
            const produtoData = produtoDoc.data();
            products.push({
              id: productId,
              nome: produtoData?.nome || "Produto",
              preco: produtoData?.preco || 0,
              imagemUrl: produtoData?.imagemUrl || produtoData?.productUrl || null,
              categoria: produtoData?.categoria || null,
              tamanhos: Array.isArray(produtoData?.tamanhos) 
                ? produtoData.tamanhos 
                : (produtoData?.tamanho ? [produtoData.tamanho] : []),
            });
            console.log(`   ✅ Produto encontrado: ${produtoData?.nome || "Sem nome"} (ID: ${productId})`);
          } else {
            console.log(`   ⚠️ Produto ${productId} NÃO encontrado no Firestore`);
          }
        } catch (error: any) {
          console.error(`   ❌ Erro ao buscar produto ${productId}: ${error.message}`);
        }
      }
    }

    // 4. Resultado final
    console.log("\n" + "=".repeat(80));
    console.log("📊 RESULTADO FINAL");
    console.log("=".repeat(80));
    
    if (products.length > 0) {
      console.log(`✅ ${products.length} produto(s) encontrado(s):`);
      products.forEach((p, idx) => {
        console.log(`\n   ${idx + 1}. ${p.nome}`);
        console.log(`      - ID: ${p.id}`);
        console.log(`      - Preço: R$ ${p.preco || 0}`);
        console.log(`      - Categoria: ${p.categoria || "N/A"}`);
        console.log(`      - Tamanhos: ${p.tamanhos?.join(", ") || "N/A"}`);
      });
    } else {
      console.log(`❌ NENHUM PRODUTO ENCONTRADO`);
      console.log(`\n   - ProductIds encontrados: ${productIds.length}`);
      if (productIds.length > 0) {
        console.log(`     ${productIds.join(", ")}`);
      }
    }

    console.log("\n✅ Teste concluído!");

  } catch (error: any) {
    console.error("\n❌ Erro no teste:", error);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

testarBuscaProdutos().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error("❌ Erro fatal:", error);
  process.exit(1);
});


