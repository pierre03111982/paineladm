/**
 * Script para diagnosticar composições por data
 * Verifica todas as composições e mostra as datas reais
 */

// Carregar variáveis de ambiente do .env.local ANTES de qualquer import do Firebase
import { config } from "dotenv";
import { resolve } from "path";

// Carregar .env.local se existir
const envPath = resolve(process.cwd(), ".env.local");
console.log(`[Diagnóstico] 📁 Tentando carregar variáveis de ambiente de: ${envPath}`);
const envResult = config({ path: envPath });

if (envResult.error) {
  console.warn(`[Diagnóstico] ⚠️  Aviso ao carregar .env.local: ${envResult.error.message}`);
}

// Também tentar carregar .env se existir
const envResult2 = config({ path: resolve(process.cwd(), ".env") });
if (!envResult2.error) {
  console.log("[Diagnóstico] ✅ Variáveis de ambiente carregadas do .env");
}

const lojistaId = process.argv[2] || "hOQL4BaVY92787EjKVMt";

console.log(`[Diagnóstico] 🔍 Iniciando diagnóstico de composições por data para lojistaId: ${lojistaId}`);

// Importar Firebase Admin APÓS carregar variáveis (import dinâmico)
async function diagnosticar() {
  try {
    // Import dinâmico para garantir que as variáveis de ambiente já foram carregadas
    const { getAdminDb } = await import("../src/lib/firebaseAdmin");
    
    const db = getAdminDb();
    console.log(`[Diagnóstico] ✅ Firebase Admin inicializado`);
    
    const subcollectionRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("composicoes");
    
    // Buscar todas as composições
    const snapshot = await subcollectionRef.get();
    
    console.log(`[Diagnóstico] ✅ Total de documentos encontrados: ${snapshot.size}`);
    
    // Agrupar por data
    const composicoesPorData = new Map<string, Array<{ id: string; createdAt: Date; customerName: string }>>();
    const todasAsDatas: Date[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // Converter data
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
      
      const dataStr = createdAt.toLocaleDateString("pt-BR");
      
      if (!composicoesPorData.has(dataStr)) {
        composicoesPorData.set(dataStr, []);
      }
      
      const customerName = data.customerName || data.clienteNome || "Cliente Anônimo";
      
      composicoesPorData.get(dataStr)!.push({
        id: doc.id,
        createdAt,
        customerName,
      });
      
      todasAsDatas.push(createdAt);
    });
    
    // Ordenar datas
    todasAsDatas.sort((a, b) => b.getTime() - a.getTime());
    
    // Mostrar resumo por data
    console.log(`\n[Diagnóstico] 📊 Composições por data (últimas 20):`);
    const datasOrdenadas = Array.from(composicoesPorData.keys()).sort((a, b) => {
      const dateA = new Date(a.split("/").reverse().join("-"));
      const dateB = new Date(b.split("/").reverse().join("-"));
      return dateB.getTime() - dateA.getTime();
    });
    
    datasOrdenadas.slice(0, 20).forEach((dataStr) => {
      const comps = composicoesPorData.get(dataStr)!;
      console.log(`  ${dataStr}: ${comps.length} composições`);
      
      // Mostrar alguns exemplos
      comps.slice(0, 2).forEach((comp) => {
        const hora = comp.createdAt.toLocaleTimeString("pt-BR");
        console.log(`    - ${comp.id.substring(0, 12)}... | ${comp.customerName} | ${hora}`);
      });
    });
    
    // Verificar especificamente 03-05/12
    console.log(`\n[Diagnóstico] 🔍 Verificando composições de 03-05/12:`);
    const data03 = new Date(2025, 11, 3, 0, 0, 0);
    const data06 = new Date(2025, 11, 6, 0, 0, 0);
    
    console.log(`[Diagnóstico] 📅 Data de busca: ${data03.toLocaleDateString("pt-BR")} até ${data06.toLocaleDateString("pt-BR")}`);
    
    const composicoesRecentes: Array<{ id: string; createdAt: Date; customerName: string }> = [];
    
    snapshot.forEach((doc) => {
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
          return;
        }
      } else {
        return;
      }
      
      if (createdAt >= data03 && createdAt < data06) {
        const customerName = data.customerName || data.clienteNome || "Cliente Anônimo";
        composicoesRecentes.push({
          id: doc.id,
          createdAt,
          customerName,
        });
      }
    });
    
    console.log(`[Diagnóstico] 📅 Composições encontradas de 03-05/12: ${composicoesRecentes.length}`);
    
    if (composicoesRecentes.length > 0) {
      composicoesRecentes.forEach((comp) => {
        const dataStr = comp.createdAt.toLocaleDateString("pt-BR");
        const horaStr = comp.createdAt.toLocaleTimeString("pt-BR");
        console.log(`  ✅ ${comp.id} | ${comp.customerName} | ${dataStr} ${horaStr}`);
      });
    } else {
      console.log(`  ⚠️  Nenhuma composição encontrada para 03-05/12`);
    }
    
    // Mostrar as 10 mais recentes
    console.log(`\n[Diagnóstico] 📋 10 composições mais recentes:`);
    todasAsDatas.slice(0, 10).forEach((date, idx) => {
      const dataStr = date.toLocaleDateString("pt-BR");
      const horaStr = date.toLocaleTimeString("pt-BR");
      console.log(`  ${idx + 1}. ${dataStr} ${horaStr}`);
    });
    
    // Verificar se há composições com data no futuro ou suspeita
    const agora = new Date();
    const composicoesFuturas = todasAsDatas.filter(d => d > agora);
    if (composicoesFuturas.length > 0) {
      console.log(`\n[Diagnóstico] ⚠️  ATENÇÃO: ${composicoesFuturas.length} composições com data no futuro!`);
    }
    
  } catch (error) {
    console.error("[Diagnóstico] ❌ Erro:", error);
    if (error instanceof Error) {
      console.error("[Diagnóstico] Mensagem:", error.message);
      console.error("[Diagnóstico] Stack:", error.stack);
    }
  }
}

diagnosticar().then(() => {
  console.log("\n[Diagnóstico] ✅ Diagnóstico concluído");
  process.exit(0);
}).catch((error) => {
  console.error("[Diagnóstico] ❌ Erro fatal:", error);
  process.exit(1);
});
