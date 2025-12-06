/**
 * Script para comparar o que o Radar mostra vs o que está no banco
 * 
 * O Radar mostra composições das últimas 72h agrupadas por cliente.
 * Este script verifica se há diferenças entre o que o Radar deve mostrar
 * e o que realmente está no banco.
 * 
 * USO:
 * npx tsx scripts/comparar-radar-vs-banco.ts [lojistaId|nome-loja]
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

// IDs das lojas conhecidas
const LOJISTA_IDS = {
  "thais-moda": "hOQL4BaVY92787EjKVMt",
  "thais moda": "hOQL4BaVY92787EjKVMt",
  "thaismoda": "hOQL4BaVY92787EjKVMt",
} as const;

// Obter lojistaId do argumento ou usar padrão (Thais Moda)
const lojistaIdArg = process.argv[2] || "thais-moda";
const lojistaId = LOJISTA_IDS[lojistaIdArg.toLowerCase() as keyof typeof LOJISTA_IDS] || lojistaIdArg;

console.log(`\n🔍 Comparando Radar vs Banco de Dados`);
console.log(`   Loja: ${lojistaIdArg}`);
console.log(`   lojistaId: ${lojistaId}\n`);

async function comparar() {
  try {
    // Import dinâmico
    const { getAdminDb } = await import("../src/lib/firebaseAdmin");
    
    const db = getAdminDb();
    console.log(`✅ Firebase Admin inicializado\n`);
    
    // EXATAMENTE como o Radar faz
    const cutoffDate = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72 horas atrás
    
    console.log(`📅 Data de corte (últimas 72h): ${cutoffDate.toLocaleDateString("pt-BR")} ${cutoffDate.toLocaleTimeString("pt-BR")}`);
    console.log(`📅 Data/hora atual: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}\n`);
    
    const subcollectionRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("composicoes");
    
    // Buscar todas (sem limit para comparação completa)
    console.log(`📡 Buscando TODAS as composições da subcoleção...`);
    
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
      
      if (batchSnapshot.docs.length < batchSize) {
        hasMore = false;
      } else {
        lastDoc = batchSnapshot.docs[batchSnapshot.docs.length - 1];
      }
    }
    
    console.log(`✅ Total de documentos encontrados: ${allDocs.length} (${batchCount} lotes)\n`);
    
    // Processar composições
    interface ComposicaoInfo {
      id: string;
      createdAt: Date;
      customerId: string;
      customerName: string;
      produtoNome?: string;
      imagemUrl?: string;
      dentro72h: boolean;
      isRemix: boolean;
    }
    
    const composicoes: ComposicaoInfo[] = [];
    
    allDocs.forEach((doc) => {
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
      
      // Pegar URL da imagem - EXATAMENTE como o Radar faz
      let imagemUrl = data.imagemUrl || data.imageUrl || "";
      
      // Excluir remixes explícitos (igual ao Radar)
      const isRemix = data.isRemix === true;
      
      const dentro72h = createdAt >= cutoffDate;
      
      const comp: ComposicaoInfo = {
        id: doc.id,
        createdAt,
        customerId: data.customerId || "",
        customerName: data.customerName || data.clienteNome || "Cliente Anônimo",
        produtoNome: data.primaryProductName || data.produtoNome || data.productName,
        imagemUrl,
        dentro72h,
        isRemix,
      };
      
      composicoes.push(comp);
    });
    
    // Filtrar como o Radar faz
    const composicoesRadar = composicoes.filter(comp => {
      // Excluir remixes
      if (comp.isRemix) {
        return false;
      }
      
      // Filtrar apenas das últimas 72h
      if (!comp.dentro72h) {
        return false;
      }
      
      return true;
    });
    
    // Agrupar por cliente (como o Radar faz)
    const porCliente = new Map<string, {
      nome: string;
      count: number;
      composicoes: ComposicaoInfo[];
    }>();
    
    composicoesRadar.forEach(comp => {
      const key = comp.customerId || comp.customerName;
      if (!porCliente.has(key)) {
        porCliente.set(key, {
          nome: comp.customerName,
          count: 0,
          composicoes: [],
        });
      }
      
      const cliente = porCliente.get(key)!;
      cliente.count++;
      cliente.composicoes.push(comp);
    });
    
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`📊 RESULTADO: O QUE O RADAR DEVE MOSTRAR`);
    console.log(`═══════════════════════════════════════════════════════════\n`);
    
    console.log(`📦 Total de composições no banco: ${composicoes.length}`);
    console.log(`⏰ Composições das últimas 72h (filtradas): ${composicoesRadar.length}`);
    console.log(`👥 Clientes ativos (com composições nas últimas 72h): ${porCliente.size}\n`);
    
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`👥 CLIENTES NO RADAR (últimas 72h)`);
    console.log(`═══════════════════════════════════════════════════════════\n`);
    
    const clientesOrdenados = Array.from(porCliente.entries())
      .sort((a, b) => b[1].count - a[1].count);
    
    clientesOrdenados.forEach(([customerId, info], idx) => {
      const maisRecente = info.composicoes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      const dataStr = maisRecente.createdAt.toLocaleDateString("pt-BR");
      const horaStr = maisRecente.createdAt.toLocaleTimeString("pt-BR");
      
      console.log(`${idx + 1}. ${info.nome}: ${info.count} composições nas últimas 72h`);
      console.log(`   Última composição: ${dataStr} ${horaStr}`);
      
      // Mostrar total de composições desse cliente (todas, não só 72h)
      const todasComposicoesCliente = composicoes.filter(c => 
        (c.customerId || c.customerName) === customerId && !c.isRemix
      );
      console.log(`   Total no banco: ${todasComposicoesCliente.length} composições`);
      console.log();
    });
    
    // Verificar PIERRE especificamente
    const pierreComposicoes72h = composicoesRadar.filter(c => 
      c.customerName === "PIERRE"
    );
    const pierreComposicoesTotal = composicoes.filter(c => 
      c.customerName === "PIERRE" && !c.isRemix
    );
    
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`🔍 ANÁLISE: PIERRE`);
    console.log(`═══════════════════════════════════════════════════════════\n`);
    
    console.log(`📊 Composições nas últimas 72h: ${pierreComposicoes72h.length}`);
    console.log(`📊 Total de composições no banco: ${pierreComposicoesTotal.length}`);
    console.log(`\n💡 O Radar mostra ${pierreComposicoes72h.length} composições do PIERRE nas últimas 72h.`);
    console.log(`   No histórico visual, ele pode mostrar mais composições (todas do cliente).\n`);
    
    // Verificar composições de 03-05/12
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`🔍 VERIFICAÇÃO: 03-05/12/2025`);
    console.log(`═══════════════════════════════════════════════════════════\n`);
    
    const data03 = new Date(2025, 11, 3, 0, 0, 0);
    const data06 = new Date(2025, 11, 6, 0, 0, 0);
    
    const composicoes0305 = composicoes.filter(c => 
      c.createdAt >= data03 && c.createdAt < data06 && !c.isRemix
    );
    
    console.log(`📅 Período: ${data03.toLocaleDateString("pt-BR")} até ${data06.toLocaleDateString("pt-BR")}`);
    console.log(`📊 Composições encontradas: ${composicoes0305.length}\n`);
    
    if (composicoes0305.length > 0) {
      console.log(`✅ Composições encontradas:\n`);
      composicoes0305.forEach((comp, idx) => {
        const dataStr = comp.createdAt.toLocaleDateString("pt-BR");
        const horaStr = comp.createdAt.toLocaleTimeString("pt-BR");
        console.log(`${idx + 1}. ${dataStr} ${horaStr} | ${comp.customerName} | ${comp.id.substring(0, 12)}...`);
      });
    } else {
      console.log(`⚠️  Nenhuma composição encontrada para esse período.`);
      console.log(`\n💡 CONCLUSÃO: As composições de 03-05/12 realmente NÃO estão no banco de dados.`);
      console.log(`   O que você está vendo no Radar pode ser:`);
      console.log(`   1. Cache do navegador`);
      console.log(`   2. Composições de outro cliente/período`);
      console.log(`   3. Composições que ainda não foram salvas permanentemente`);
    }
    console.log();
    
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`✅ Comparação concluída!`);
    console.log(`═══════════════════════════════════════════════════════════\n`);
    
  } catch (error) {
    console.error(`\n❌ Erro durante a comparação:`, error);
    if (error instanceof Error) {
      console.error(`Mensagem: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
    }
  }
}

comparar().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(`\n❌ Erro fatal:`, error);
  process.exit(1);
});


