/**
 * Script para deletar as 500 composições mais antigas do banco de dados
 * 
 * ATENÇÃO: Esta ação é IRREVERSÍVEL!
 * 
 * USO:
 * npx tsx scripts/delete-old-compositions.ts <lojistaId>
 * 
 * Exemplo:
 * npx tsx scripts/delete-old-compositions.ts thais-moda
 */

// Carregar variáveis de ambiente do .env.local ANTES de qualquer import do Firebase
import { config } from "dotenv";
import { resolve } from "path";

// Carregar .env.local se existir
const envPath = resolve(process.cwd(), ".env.local");
console.log(`📁 Tentando carregar variáveis de ambiente de: ${envPath}`);
const envResult = config({ path: envPath });

if (envResult.error) {
  console.warn(`⚠️  Aviso ao carregar .env.local: ${envResult.error.message}`);
}

// Também tentar carregar .env se existir
const envResult2 = config({ path: resolve(process.cwd(), ".env") });
if (!envResult2.error) {
  console.log("✅ Variáveis de ambiente carregadas do .env");
}

// Verificar se as credenciais do Firebase foram carregadas
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

console.log(`🔍 Verificando credenciais do Firebase:`);
console.log(`   FIREBASE_PROJECT_ID: ${projectId ? '✅ Configurado' : '❌ Não encontrado'}`);
console.log(`   FIREBASE_CLIENT_EMAIL: ${clientEmail ? '✅ Configurado' : '❌ Não encontrado'}`);
console.log(`   FIREBASE_PRIVATE_KEY: ${privateKey ? '✅ Configurado' : '❌ Não encontrado'}`);

if (!projectId || !clientEmail || !privateKey) {
  console.error("\n❌ Erro: Credenciais do Firebase Admin não encontradas ou incompletas!");
  console.log("\n📝 Configure o arquivo .env.local na raiz do projeto com:");
  console.log("   FIREBASE_PROJECT_ID=seu-project-id");
  console.log("   FIREBASE_CLIENT_EMAIL=seu-service-account@...");
  console.log("   FIREBASE_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----...\"");
  console.log("\n💡 Veja scripts/INSTRUCOES_DELETAR_COMPOSICOES.md para mais detalhes.\n");
  process.exit(1);
}

console.log("✅ Todas as credenciais do Firebase foram encontradas!\n");

const NUM_TO_DELETE = 500;

async function deleteOldCompositions(lojistaId: string) {
  if (!lojistaId) {
    console.error("❌ Erro: lojistaId é obrigatório!");
    console.log("\nUso: npx tsx scripts/delete-old-compositions.ts <lojistaId>");
    console.log("Exemplo: npx tsx scripts/delete-old-compositions.ts thais-moda\n");
    process.exit(1);
  }

  console.log("=".repeat(80));
  console.log("🗑️  DELETAR COMPOSIÇÕES ANTIGAS");
  console.log("=".repeat(80));
  console.log(`📌 Lojista ID: ${lojistaId}`);
  console.log(`📊 Quantidade a deletar: ${NUM_TO_DELETE} composições mais antigas`);
  console.log("⚠️  ATENÇÃO: Esta ação é IRREVERSÍVEL!\n");

  try {
    // Importar getAdminDb DEPOIS que as variáveis de ambiente foram carregadas
    const { getAdminDb } = await import("../src/lib/firebaseAdmin");
    const db = getAdminDb();
    const compositionsRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("composicoes");

    // Buscar todas as composições com paginação
    console.log(`📥 Buscando todas as composições de: lojas/${lojistaId}/composicoes`);
    
    // Primeiro, tentar uma busca simples para ver se há documentos
    try {
      const testSnapshot = await compositionsRef.limit(1).get();
      console.log(`🔍 Teste inicial: ${testSnapshot.size} documento(s) encontrado(s) na subcoleção`);
      if (testSnapshot.empty) {
        console.log("⚠️  A subcoleção está vazia ou não existe.");
        console.log("💡 Verifique se o lojistaId está correto e se há composições salvas.");
        return;
      }
    } catch (error: any) {
      console.error("❌ Erro ao acessar a subcoleção:", error.message);
      return;
    }
    const allCompositions: Array<{ id: string; createdAt: Date; customerName?: string }> = [];
    
    let lastDoc: any = null;
    let batchCount = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore && batchCount < 50) {
      let query: any = compositionsRef.limit(batchSize);
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      batchCount++;

      snapshot.forEach((doc: any) => {
        const data = doc.data();
        let createdAt: Date;
        
        if (data?.createdAt) {
          if (data.createdAt.toDate) {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt instanceof Date) {
            createdAt = data.createdAt;
          } else if (typeof data.createdAt === 'string') {
            createdAt = new Date(data.createdAt);
          } else {
            createdAt = new Date();
          }
        } else {
          createdAt = new Date();
        }

        allCompositions.push({
          id: doc.id,
          createdAt,
          customerName: data?.customerName || data?.clienteNome || undefined,
        });
      });

      console.log(`  📦 Lote ${batchCount}: ${snapshot.size} composições encontradas (total: ${allCompositions.length})`);

      if (snapshot.docs.length < batchSize) {
        hasMore = false;
      } else {
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
      }
    }

    console.log(`\n✅ Total de composições encontradas: ${allCompositions.length}\n`);

    if (allCompositions.length === 0) {
      console.log("ℹ️  Nenhuma composição encontrada para deletar.");
      return;
    }

    // Ordenar por data (mais antigas primeiro)
    allCompositions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Pegar as 500 mais antigas
    const toDelete = allCompositions.slice(0, NUM_TO_DELETE);

    console.log("─".repeat(80));
    console.log(`📋 RESUMO DAS COMPOSIÇÕES A SEREM DELETADAS (${toDelete.length}):`);
    console.log("─".repeat(80));
    
    // Mostrar preview das 5 primeiras e 5 últimas
    console.log("\n🕐 Primeiras 5 (mais antigas):");
    toDelete.slice(0, 5).forEach((comp, idx) => {
      const dateStr = comp.createdAt.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      console.log(`   ${idx + 1}. ID: ${comp.id.substring(0, 25)}... | Cliente: ${comp.customerName || "N/A"} | Data: ${dateStr}`);
    });

    if (toDelete.length > 5) {
      console.log("\n🕐 Últimas 5 (menos antigas das que serão deletadas):");
      toDelete.slice(-5).forEach((comp, idx) => {
        const dateStr = comp.createdAt.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        console.log(`   ${toDelete.length - 4 + idx}. ID: ${comp.id.substring(0, 25)}... | Cliente: ${comp.customerName || "N/A"} | Data: ${dateStr}`);
      });
    }

    console.log("\n─".repeat(80));
    console.log(`🗑️  Data da mais antiga: ${toDelete[0].createdAt.toLocaleDateString("pt-BR")}`);
    console.log(`🗑️  Data da mais recente (a ser deletada): ${toDelete[toDelete.length - 1].createdAt.toLocaleDateString("pt-BR")}`);
    console.log(`\n⚠️  Você está prestes a DELETAR ${toDelete.length} composições!`);
    console.log("⚠️  Esta ação é IRREVERSÍVEL!\n");

    // Deletar em lotes (Firestore permite até 500 operações por batch)
    console.log("🗑️  Iniciando exclusão...\n");
    
    let deletedCount = 0;
    const batchSizeLimit = 500;

    for (let i = 0; i < toDelete.length; i += batchSizeLimit) {
      const batch = db.batch();
      const batchToDelete = toDelete.slice(i, i + batchSizeLimit);
      
      for (const comp of batchToDelete) {
        const docRef = compositionsRef.doc(comp.id);
        batch.delete(docRef);
      }

      await batch.commit();
      deletedCount += batchToDelete.length;
      
      const batchNumber = Math.floor(i / batchSizeLimit) + 1;
      console.log(`✅ Lote ${batchNumber}: ${batchToDelete.length} composições deletadas (total: ${deletedCount}/${toDelete.length})`);
      
      // Pequeno delay entre batches para evitar sobrecarga
      if (i + batchSizeLimit < toDelete.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log(`✅ CONCLUÍDO! ${deletedCount} composições deletadas com sucesso.`);
    console.log(`📊 Restam ${allCompositions.length - deletedCount} composições no banco.`);
    console.log("=".repeat(80));

  } catch (error) {
    console.error("\n❌ Erro ao deletar composições:", error);
    if (error instanceof Error) {
      console.error("Mensagem:", error.message);
    }
    process.exit(1);
  }
}

// Pegar lojistaId dos argumentos ou variável de ambiente
const lojistaId = process.argv[2] || process.env.LOJISTA_ID || process.env.NEXT_PUBLIC_LOJISTA_ID;

// Executar
deleteOldCompositions(lojistaId || "")
  .then(() => {
    console.log("\n✅ Script concluído!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erro fatal:", error);
    process.exit(1);
  });
