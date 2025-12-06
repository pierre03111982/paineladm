/**
 * Script para verificar composições recentes e diagnosticar problemas
 * Executar com: npx tsx scripts/verificar-composicoes-recentes.ts [lojistaId]
 */

// Carregar variáveis de ambiente do .env.local ANTES de qualquer import do Firebase
import { config } from "dotenv";
import { resolve } from "path";

// Carregar .env.local se existir
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });
// Também tentar carregar .env se existir
config({ path: resolve(process.cwd(), ".env") });

// Verificar se as credenciais do Firebase foram carregadas
const hasFirebaseCreds = 
  process.env.FIREBASE_PROJECT_ID || 
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!hasFirebaseCreds) {
  console.error("❌ Erro: Credenciais do Firebase Admin não encontradas!");
  console.log("\n📝 Configure o arquivo .env.local na raiz do projeto.\n");
  process.exit(1);
}

import { getAdminDb } from "../src/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

async function verificarComposicoesRecentes(lojistaId: string) {
  if (!lojistaId) {
    console.error("❌ Erro: lojistaId é obrigatório!");
    console.log("\nUso: npx tsx scripts/verificar-composicoes-recentes.ts <lojistaId>");
    console.log("Exemplo: npx tsx scripts/verificar-composicoes-recentes.ts hOQL4BaVY92787EjKVMt\n");
    process.exit(1);
  }

  console.log("=".repeat(80));
  console.log("🔍 VERIFICAR COMPOSIÇÕES RECENTES");
  console.log("=".repeat(80));
  console.log(`📌 Lojista ID: ${lojistaId}\n`);

  try {
    const db = getAdminDb();
    const subcollectionRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("composicoes");

    console.log(`📦 Buscando TODAS as composições da subcoleção: lojas/${lojistaId}/composicoes\n`);

    // Buscar TODAS as composições
    let allDocs: any[] = [];
    let lastDoc: any = null;
    const batchSize = 1000;
    let hasMore = true;
    let batchCount = 0;

    while (hasMore && batchCount < 50) {
      let query: any = subcollectionRef.limit(batchSize);
      
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }
      
      const batchSnapshot = await query.get();
      batchCount++;
      
      if (batchSnapshot.empty) {
        hasMore = false;
        break;
      }
      
      batchSnapshot.forEach((doc: any) => {
        allDocs.push(doc);
      });
      
      console.log(`  📦 Lote ${batchCount}: ${batchSnapshot.size} documentos (total: ${allDocs.length})`);
      
      if (batchSnapshot.docs.length < batchSize) {
        hasMore = false;
      } else {
        lastDoc = batchSnapshot.docs[batchSnapshot.docs.length - 1];
      }
    }

    console.log(`\n✅ Total de documentos encontrados: ${allDocs.length}\n`);

    if (allDocs.length === 0) {
      console.log("⚠️  Nenhuma composição encontrada na subcoleção.");
      return;
    }

    // Processar e ordenar por data
    const composicoes: Array<{
      id: string;
      createdAt: Date;
      customerName?: string;
      customerId?: string;
    }> = [];

    allDocs.forEach((doc: any) => {
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

      composicoes.push({
        id: doc.id,
        createdAt,
        customerName: data?.customerName || data?.clienteNome || undefined,
        customerId: data?.customerId || undefined,
      });
    });

    // Ordenar por data (mais recente primeiro)
    composicoes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    console.log("─".repeat(80));
    console.log("📅 COMPOSIÇÕES MAIS RECENTES (Top 20):");
    console.log("─".repeat(80));

    const top20 = composicoes.slice(0, 20);
    top20.forEach((comp, index) => {
      const dateStr = comp.createdAt.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      console.log(`  ${(index + 1).toString().padStart(2, "0")}. ${dateStr} | Cliente: ${comp.customerName || "N/A"} | ID: ${comp.id.substring(0, 25)}...`);
    });

    // Verificar composições dos dias 03, 04 e 05/12/2025
    console.log("\n─".repeat(80));
    console.log("📅 COMPOSIÇÕES DOS DIAS 03, 04 E 05/12/2025:");
    console.log("─".repeat(80));

    const data03 = new Date(2025, 11, 3, 0, 0, 0); // 03/12/2025 00:00:00
    const data06 = new Date(2025, 11, 6, 0, 0, 0); // 06/12/2025 00:00:00

    const composicoesRecentes = composicoes.filter(comp => {
      return comp.createdAt >= data03 && comp.createdAt < data06;
    });

    if (composicoesRecentes.length === 0) {
      console.log("⚠️  NENHUMA composição encontrada para os dias 03, 04 e 05/12/2025!");
      console.log(`\n💡 A composição mais recente encontrada é de: ${composicoes[0].createdAt.toLocaleDateString("pt-BR")} ${composicoes[0].createdAt.toLocaleTimeString("pt-BR")}`);
    } else {
      console.log(`✅ Encontradas ${composicoesRecentes.length} composições nos dias 03-05/12:\n`);
      composicoesRecentes.forEach((comp, index) => {
        const dateStr = comp.createdAt.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        console.log(`  ${(index + 1).toString().padStart(2, "0")}. ${dateStr} | Cliente: ${comp.customerName || "N/A"} | ID: ${comp.id.substring(0, 25)}...`);
      });
    }

    // Estatísticas gerais
    console.log("\n─".repeat(80));
    console.log("📊 ESTATÍSTICAS:");
    console.log("─".repeat(80));
    console.log(`Total de composições: ${composicoes.length}`);
    console.log(`Mais recente: ${composicoes[0].createdAt.toLocaleDateString("pt-BR")} ${composicoes[0].createdAt.toLocaleTimeString("pt-BR")}`);
    console.log(`Mais antiga: ${composicoes[composicoes.length - 1].createdAt.toLocaleDateString("pt-BR")} ${composicoes[composicoes.length - 1].createdAt.toLocaleTimeString("pt-BR")}`);

    // Verificar se há composições nas últimas 72 horas
    const agora = new Date();
    const horas72Atras = new Date(agora.getTime() - 72 * 60 * 60 * 1000);
    const ultimas72h = composicoes.filter(comp => comp.createdAt >= horas72Atras);
    console.log(`\nComposições nas últimas 72 horas: ${ultimas72h.length}`);

    console.log("\n" + "=".repeat(80));
    console.log("✅ Verificação concluída!");
    console.log("=".repeat(80) + "\n");

  } catch (error) {
    console.error("\n❌ Erro ao verificar composições:", error);
    if (error instanceof Error) {
      console.error("Mensagem:", error.message);
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

// Pegar lojistaId dos argumentos ou variável de ambiente
const lojistaId = process.argv[2] || process.env.LOJISTA_ID || process.env.NEXT_PUBLIC_LOJISTA_ID;

// Executar
verificarComposicoesRecentes(lojistaId || "")
  .then(() => {
    console.log("✅ Script concluído!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erro fatal:", error);
    process.exit(1);
  });


