/**
 * Script para diagnosticar se a generation está sendo salva corretamente
 * e verificar os dados salvos, incluindo productIds e imagemUrl
 */

import * as dotenv from "dotenv";
import path from "path";

// Carregar variáveis de ambiente
const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

console.log("🔍 [DIAGNÓSTICO] Verificando generation para composição...");

const compositionId = process.argv[2] || "comp_1764956112133_jk86dtnaj";
const lojistaId = process.argv[3] || "hOQL4BaVY92787EjKVMt";
const imagemUrl = process.argv[4] || "https://storage.googleapis.com/paineladmexperimenteai.firebasestorage.app/generations/hOQL4BaVY92787EjKVMt/job-1764956110991-rfcvgv-1764956124036.png";

console.log(`📋 Parâmetros:`);
console.log(`  - CompositionId: ${compositionId}`);
console.log(`  - LojistaId: ${lojistaId}`);
console.log(`  - ImagemUrl: ${imagemUrl.substring(0, 100)}...`);

async function diagnosticar() {
  try {
    // Verificar se as credenciais do Firebase estão configuradas
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!serviceAccountPath) {
      console.error("❌ GOOGLE_APPLICATION_CREDENTIALS não configurado!");
      console.log("💡 Configure a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS com o caminho do arquivo JSON de credenciais.");
      process.exit(1);
    }

    console.log(`✅ Credenciais do Firebase encontradas: ${serviceAccountPath}`);

    // Importar Firebase Admin usando a estrutura padrão do projeto
    const { getAdminDb } = await import("../src/lib/firebaseAdmin");
    const db = getAdminDb();
    console.log("✅ Firebase Admin inicializado\n");

    // 1. Buscar a composição diretamente
    console.log("1️⃣ Buscando composição diretamente...");
    const composicaoDoc = await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("composicoes")
      .doc(compositionId)
      .get();

    if (composicaoDoc.exists) {
      const composicaoData = composicaoDoc.data();
      console.log("✅ Composição encontrada!");
      console.log(`   - ID: ${composicaoDoc.id}`);
      console.log(`   - ImagemUrl: ${composicaoData?.imagemUrl || composicaoData?.looks?.[0]?.imagemUrl || "NÃO ENCONTRADA"}`);
      console.log(`   - ProductIds: ${composicaoData?.productIds?.length || 0} encontrados`);
      if (composicaoData?.productIds) {
        console.log(`     ${composicaoData.productIds.join(", ")}`);
      }
      console.log(`   - Produtos: ${composicaoData?.produtos?.length || 0} encontrados`);
      if (composicaoData?.produtos) {
        composicaoData.produtos.forEach((p: any, idx: number) => {
          console.log(`     ${idx + 1}. ${p.nome || p.id || "Sem nome"} (ID: ${p.id || "N/A"})`);
        });
      }
    } else {
      console.log("❌ Composição NÃO encontrada pelo ID\n");
    }

    // 2. Buscar na generation pela compositionId
    console.log("\n2️⃣ Buscando na GENERATION pela compositionId...");
    const generationsByComposition = await db
      .collection("generations")
      .where("compositionId", "==", compositionId)
      .where("lojistaId", "==", lojistaId)
      .limit(5)
      .get();

    if (!generationsByComposition.empty) {
      console.log(`✅ ${generationsByComposition.size} generation(s) encontrada(s)!`);
      generationsByComposition.docs.forEach((doc, idx) => {
        const data = doc.data();
        console.log(`\n   Generation ${idx + 1}:`);
        console.log(`   - ID: ${doc.id}`);
        console.log(`   - CompositionId: ${data.compositionId}`);
        console.log(`   - ImagemUrl: ${data.imagemUrl || "NÃO ENCONTRADA"}`);
        console.log(`   - ProductIds: ${data.productIds?.length || 0} encontrados`);
        if (data.productIds && data.productIds.length > 0) {
          console.log(`     ${data.productIds.join(", ")}`);
        }
        console.log(`   - Status: ${data.status || "N/A"}`);
        console.log(`   - ShowInRadar: ${data.showInRadar || false}`);
      });
    } else {
      console.log("❌ Nenhuma generation encontrada pela compositionId\n");
    }

    // 3. Buscar na generation pela imagemUrl
    console.log("\n3️⃣ Buscando na GENERATION pela imagemUrl...");
    
    // Normalizar a URL (sem query params)
    const imagemUrlNormalizada = imagemUrl.split('?')[0].trim();
    
    try {
      const generationsByImageUrl = await db
        .collection("generations")
        .where("lojistaId", "==", lojistaId)
        .where("imagemUrl", "==", imagemUrl)
        .limit(5)
        .get();

      if (!generationsByImageUrl.empty) {
        console.log(`✅ ${generationsByImageUrl.size} generation(s) encontrada(s) pela imagemUrl exata!`);
        generationsByImageUrl.docs.forEach((doc, idx) => {
          const data = doc.data();
          console.log(`\n   Generation ${idx + 1}:`);
          console.log(`   - ID: ${doc.id}`);
          console.log(`   - CompositionId: ${data.compositionId}`);
          console.log(`   - ProductIds: ${data.productIds?.length || 0} encontrados`);
          if (data.productIds && data.productIds.length > 0) {
            console.log(`     ${data.productIds.join(", ")}`);
          }
        });
      } else {
        console.log("❌ Nenhuma generation encontrada pela imagemUrl exata");
        
        // Tentar buscar todas e filtrar
        console.log("\n   🔍 Buscando todas as generations do lojista para comparar...");
        const allGenerations = await db
          .collection("generations")
          .where("lojistaId", "==", lojistaId)
          .limit(100)
          .get();

        console.log(`   📊 Total de generations encontradas: ${allGenerations.size}`);
        
        let encontradas = 0;
        allGenerations.docs.forEach((doc) => {
          const data = doc.data();
          const genImagemUrl = data.imagemUrl || data.imageUrl;
          
          if (genImagemUrl) {
            const genUrlNormalizada = genImagemUrl.split('?')[0].trim();
            
            if (genImagemUrl === imagemUrl || genImagemUrl.trim() === imagemUrl.trim()) {
              encontradas++;
              console.log(`\n   ✅ Match EXATO encontrado (Generation ${encontradas}):`);
              console.log(`   - ID: ${doc.id}`);
              console.log(`   - CompositionId: ${data.compositionId}`);
              console.log(`   - ProductIds: ${data.productIds?.length || 0}`);
              if (data.productIds && data.productIds.length > 0) {
                console.log(`     ${data.productIds.join(", ")}`);
              }
            } else if (genUrlNormalizada === imagemUrlNormalizada) {
              encontradas++;
              console.log(`\n   ✅ Match SEM QUERY encontrado (Generation ${encontradas}):`);
              console.log(`   - ID: ${doc.id}`);
              console.log(`   - CompositionId: ${data.compositionId}`);
              console.log(`   - ImagemUrl na generation: ${genImagemUrl.substring(0, 100)}...`);
              console.log(`   - ProductIds: ${data.productIds?.length || 0}`);
              if (data.productIds && data.productIds.length > 0) {
                console.log(`     ${data.productIds.join(", ")}`);
              }
            }
          }
        });
        
        if (encontradas === 0) {
          console.log(`   ❌ Nenhuma generation encontrada mesmo após comparar ${allGenerations.size} documentos`);
          console.log(`   🔍 URL buscada: ${imagemUrlNormalizada.substring(0, 150)}...`);
          
          // Mostrar algumas URLs para comparação
          console.log(`\n   📋 Primeiras 5 URLs encontradas (para comparação):`);
          allGenerations.docs.slice(0, 5).forEach((doc, idx) => {
            const data = doc.data();
            const url = (data.imagemUrl || data.imageUrl || "SEM URL").substring(0, 120);
            console.log(`     ${idx + 1}. ${url}...`);
          });
        }
      }
    } catch (error: any) {
      console.log(`❌ Erro ao buscar pela imagemUrl: ${error.message}`);
      console.log("   (Pode ser que não haja índice para essa query)\n");
    }

    // 4. Buscar em favoritos
    console.log("\n4️⃣ Buscando em favoritos...");
    const lojaRef = db.collection("lojas").doc(lojistaId);
    const clientesSnapshot = await lojaRef.collection("clientes").get();
    
    let favoritosEncontrados = 0;
    for (const clienteDoc of clientesSnapshot.docs) {
      const favoritosRef = lojaRef
        .collection("clientes")
        .doc(clienteDoc.id)
        .collection("favoritos");
      
      const favoritosSnapshot = await favoritosRef
        .where("action", "==", "like")
        .where("compositionId", "==", compositionId)
        .limit(5)
        .get();

      if (!favoritosSnapshot.empty) {
        favoritosEncontrados += favoritosSnapshot.size;
        favoritosSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          console.log(`\n   ✅ Favorito encontrado:`);
          console.log(`   - ID: ${doc.id}`);
          console.log(`   - Cliente: ${clienteDoc.id}`);
          console.log(`   - CompositionId: ${data.compositionId}`);
          console.log(`   - ImagemUrl: ${data.imagemUrl || data.imageUrl || "NÃO ENCONTRADA"}`);
          console.log(`   - ProdutoNome: ${data.produtoNome || data.productName || "NÃO ENCONTRADO"}`);
        });
      }
    }
    
    if (favoritosEncontrados === 0) {
      console.log("❌ Nenhum favorito encontrado com esse compositionId");
    } else {
      console.log(`\n✅ Total de ${favoritosEncontrados} favorito(s) encontrado(s)`);
    }

    console.log("\n✅ Diagnóstico concluído!");
  } catch (error: any) {
    console.error("❌ Erro no diagnóstico:", error);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

diagnosticar().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error("❌ Erro fatal:", error);
  process.exit(1);
});

