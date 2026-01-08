/**
 * Script para análise automática em massa de todos os produtos do catálogo
 * 
 * Uso: 
 * npx tsx scripts/bulk-analyze-products.ts <lojistaId> [limit] [skip]
 * 
 * Exemplo:
 * npx tsx scripts/bulk-analyze-products.ts hOQL4BaVY92787EjKVMt 100 0
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { ProductAnalyzerService } from "../src/lib/ai-services/product-analyzer";

// Inicializar Firebase Admin
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT || "{}"
  );

  if (!serviceAccount.private_key) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT não configurado. Defina a variável de ambiente com o JSON da service account."
    );
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  });
}

const db = getFirestore();
const productAnalyzerService = new ProductAnalyzerService();

async function bulkAnalyzeProducts(
  lojistaId: string,
  limit: number = 1000,
  skip: number = 0
) {
  console.log(`\n🔄 Iniciando análise em massa para lojista: ${lojistaId}`);
  console.log(`📊 Limite: ${limit}, Pular: ${skip}\n`);

  const produtosRef = db.collection("lojas").doc(lojistaId).collection("produtos");
  
  // Buscar todos os produtos (sem limite se limit = 0)
  let produtosSnapshot;
  if (limit > 0) {
    produtosSnapshot = await produtosRef
      .limit(limit)
      .offset(skip)
      .get();
  } else {
    produtosSnapshot = await produtosRef.get();
  }

  if (produtosSnapshot.empty) {
    console.log("❌ Nenhum produto encontrado.");
    return;
  }

  const total = produtosSnapshot.size;
  console.log(`📦 Total de produtos encontrados: ${total}\n`);

  const results = {
    processed: 0,
    updated: 0,
    errors: 0,
    skipped: 0,
  };

  let currentIndex = 0;

  for (const produtoDoc of produtosSnapshot.docs) {
    currentIndex++;
    const produtoId = produtoDoc.id;
    const produtoData = produtoDoc.data();
    
    results.processed++;

    try {
      // Verificar se tem imagem
      const imagemUrl = produtoData.imagemUrlOriginal || produtoData.imagemUrl;
      
      if (!imagemUrl) {
        results.skipped++;
        console.log(
          `⏭️  [${currentIndex}/${total}] Produto ${produtoId} (${produtoData.nome || "Sem nome"}): Sem imagem`
        );
        continue;
      }

      console.log(
        `🔍 [${currentIndex}/${total}] Analisando: ${produtoData.nome || produtoId}...`
      );

      // Analisar produto com IA
      const analysisResult = await productAnalyzerService.analyzeProductImage(imagemUrl);

      if (!analysisResult.success || !analysisResult.data) {
        results.errors++;
        console.error(
          `❌ [${currentIndex}/${total}] Erro ao analisar ${produtoId}: ${analysisResult.error}`
        );
        continue;
      }

      const analysis = analysisResult.data;

      // Preparar atualização
      const updateData: any = {};

      // Atualizar nome
      if (analysis.nome_sugerido) {
        updateData.nome = analysis.nome_sugerido;
      }

      // Adicionar descrição SEO
      if (analysis.descricao_seo) {
        const observacoesAtuais = produtoData.obs || produtoData.observacoes || "";
        const observacoesSemAnaliseAnterior = observacoesAtuais
          .split("\n\n[Análise IA -")
          .filter((part: string, index: number) => index === 0 || !part.includes("]"))
          .join("\n\n")
          .trim();
        
        const novaObservacao = observacoesSemAnaliseAnterior
          ? `${observacoesSemAnaliseAnterior}\n\n[Análise IA - ${new Date().toLocaleDateString("pt-BR")}]\n${analysis.descricao_seo}`
          : `[Análise IA - ${new Date().toLocaleDateString("pt-BR")}]\n${analysis.descricao_seo}`;
        updateData.obs = novaObservacao;
        updateData.observacoes = novaObservacao;
      }

      // Atualizar categoria
      if (analysis.categoria_sugerida) {
        updateData.categoria = analysis.categoria_sugerida;
      }

      // Atualizar tags
      if (analysis.tags && Array.isArray(analysis.tags) && analysis.tags.length > 0) {
        const tagsExistentes = produtoData.tags || [];
        const tagsDaAnalise = analysis.tags;
        const tagsFinais = [...new Set([...tagsDaAnalise, ...tagsExistentes])];
        updateData.tags = tagsFinais;
      }

      // Atualizar cores
      if (analysis.cor_predominante) {
        const coresExistentes = Array.isArray(produtoData.cores) 
          ? produtoData.cores 
          : (typeof produtoData.cores === "string" 
            ? produtoData.cores.split("-").map((c: string) => c.trim())
            : []);
        const novaCor = analysis.cor_predominante;
        if (coresExistentes.length === 0) {
          updateData.cores = [novaCor];
        } else if (!coresExistentes.includes(novaCor)) {
          updateData.cores = [novaCor, ...coresExistentes.filter((c: string) => c !== novaCor)];
        }
      }

      // Adicionar metadados da análise
      updateData.analiseIA = {
        nome_sugerido: analysis.nome_sugerido,
        descricao_seo: analysis.descricao_seo,
        tags: analysis.tags,
        categoria_sugerida: analysis.categoria_sugerida,
        cor_predominante: analysis.cor_predominante,
        tecido_estimado: analysis.tecido_estimado,
        detalhes: analysis.detalhes,
        ultimaAtualizacao: new Date().toISOString(),
      };

      // Atualizar produto no Firestore
      await produtosRef.doc(produtoId).update(updateData);

      results.updated++;
      console.log(
        `✅ [${currentIndex}/${total}] Atualizado: ${updateData.nome || produtoData.nome || produtoId}`
      );

      // Delay para evitar rate limiting (500ms entre cada produto)
      await new Promise((resolve) => setTimeout(resolve, 500));

    } catch (error: any) {
      results.errors++;
      console.error(
        `❌ [${currentIndex}/${total}] Erro ao processar ${produtoId}:`,
        error.message
      );
    }
  }

  console.log(`\n📊 RESULTADO FINAL:`);
  console.log(`   ✅ Processados: ${results.processed}`);
  console.log(`   ✨ Atualizados: ${results.updated}`);
  console.log(`   ⏭️  Pulados: ${results.skipped}`);
  console.log(`   ❌ Erros: ${results.errors}`);
  console.log(`\n🎉 Análise em massa concluída!\n`);
}

// Executar script
const args = process.argv.slice(2);
const lojistaId = args[0];
const limit = args[1] ? parseInt(args[1], 10) : 1000;
const skip = args[2] ? parseInt(args[2], 10) : 0;

if (!lojistaId) {
  console.error("❌ Erro: lojistaId é obrigatório");
  console.log("\nUso: npx tsx scripts/bulk-analyze-products.ts <lojistaId> [limit] [skip]");
  console.log("\nExemplo:");
  console.log("  npx tsx scripts/bulk-analyze-products.ts hOQL4BaVY92787EjKVMt 100 0");
  process.exit(1);
}

bulkAnalyzeProducts(lojistaId, limit, skip)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Erro fatal:", error);
    process.exit(1);
  });

