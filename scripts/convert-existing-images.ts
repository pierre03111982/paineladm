/**
 * Script para converter imagens existentes de link para PNG
 * Execute com: npx tsx scripts/convert-existing-images.ts
 */

// Carregar variáveis de ambiente do .env.local
import { config } from "dotenv";
import { resolve } from "path";

// Carregar .env.local se existir
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });

// Também tentar carregar .env se existir
config();

import { getAdminDb, getAdminStorage } from "../src/lib/firebaseAdmin";
import { convertImageUrlToPng } from "../src/lib/utils/image-converter";

async function convertExistingImages() {
  try {
    console.log("🔄 Iniciando conversão de imagens existentes...\n");

    const db = getAdminDb();
    const lojasSnapshot = await db.collection("lojas").get();

    let totalConverted = 0;
    let totalErrors = 0;

    for (const lojaDoc of lojasSnapshot.docs) {
      const lojistaId = lojaDoc.id;
      console.log(`\n📦 Processando loja: ${lojistaId}`);

      const produtosSnapshot = await lojaDoc.ref.collection("produtos").get();
      console.log(`   Encontrados ${produtosSnapshot.size} produtos`);

      for (const produtoDoc of produtosSnapshot.docs) {
        const produtoData = produtoDoc.data();
        const productId = produtoDoc.id;
        const imagemUrl = produtoData.imagemUrl;

        // Verificar se tem imagem e se não é do Firebase Storage
        if (
          imagemUrl &&
          typeof imagemUrl === "string" &&
          imagemUrl.trim() &&
          !imagemUrl.includes("storage.googleapis.com") &&
          !imagemUrl.includes("firebasestorage.googleapis.com")
        ) {
          try {
            console.log(`   🔄 Convertendo imagem do produto ${productId}: ${imagemUrl.substring(0, 50)}...`);

            const novaUrl = await convertImageUrlToPng(imagemUrl, lojistaId, productId);

            // Atualizar produto com nova URL
            await produtoDoc.ref.update({ imagemUrl: novaUrl });

            console.log(`   ✅ Convertido: ${novaUrl.substring(0, 50)}...`);
            totalConverted++;
          } catch (error: any) {
            console.error(`   ❌ Erro ao converter produto ${productId}:`, error.message);
            totalErrors++;
          }
        }
      }
    }

    console.log(`\n✅ Conversão concluída!`);
    console.log(`   Total convertido: ${totalConverted}`);
    console.log(`   Total de erros: ${totalErrors}`);
  } catch (error: any) {
    console.error("❌ Erro geral:", error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  convertExistingImages()
    .then(() => {
      console.log("\n✅ Script finalizado com sucesso!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Erro ao executar script:", error);
      process.exit(1);
    });
}

export { convertExistingImages };

