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
    const errors: Array<{ lojistaId: string; productId: string; nome: string; imagemUrl: string; erro: string }> = [];

    for (const lojaDoc of lojasSnapshot.docs) {
      const lojistaId = lojaDoc.id;
      console.log(`\n📦 Processando loja: ${lojistaId}`);

      const produtosSnapshot = await lojaDoc.ref.collection("produtos").get();
      console.log(`   Encontrados ${produtosSnapshot.size} produtos`);

      for (const produtoDoc of produtosSnapshot.docs) {
        const produtoData = produtoDoc.data();
        const productId = produtoDoc.id;
        const imagemUrl = produtoData.imagemUrl;
        const nomeProduto = produtoData.nome || "Sem nome";

        // Verificar se tem imagem e se não é do Firebase Storage
        if (
          imagemUrl &&
          typeof imagemUrl === "string" &&
          imagemUrl.trim() &&
          !imagemUrl.includes("storage.googleapis.com") &&
          !imagemUrl.includes("firebasestorage.googleapis.com")
        ) {
          try {
            console.log(`   🔄 Convertendo imagem do produto ${productId} (${nomeProduto}): ${imagemUrl.substring(0, 60)}...`);

            const novaUrl = await convertImageUrlToPng(imagemUrl, lojistaId, productId);

            // Atualizar produto com nova URL
            await produtoDoc.ref.update({ imagemUrl: novaUrl });

            console.log(`   ✅ Convertido: ${novaUrl.substring(0, 60)}...`);
            totalConverted++;
          } catch (error: any) {
            const errorMessage = error.message || "Erro desconhecido";
            console.error(`   ❌ Erro ao converter produto ${productId} (${nomeProduto}): ${errorMessage}`);
            console.error(`      URL: ${imagemUrl.substring(0, 80)}...`);
            errors.push({
              lojistaId,
              productId,
              nome: nomeProduto,
              imagemUrl,
              erro: errorMessage,
            });
            totalErrors++;
          }
        }
      }
    }

    console.log(`\n✅ Conversão concluída!`);
    console.log(`   Total convertido: ${totalConverted}`);
    console.log(`   Total de erros: ${totalErrors}`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Produtos com erro:`);
      errors.forEach((err, index) => {
        console.log(`   ${index + 1}. Loja: ${err.lojistaId} | Produto: ${err.nome} (${err.productId})`);
        console.log(`      URL: ${err.imagemUrl.substring(0, 80)}...`);
        console.log(`      Erro: ${err.erro}`);
      });
      console.log(`\n💡 Dica: Imagens com erro 404 podem ter sido removidas ou mudado de URL.`);
      console.log(`   Você pode atualizar manualmente esses produtos no painel admin.`);
    }
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
