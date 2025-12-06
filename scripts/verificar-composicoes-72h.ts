/**
 * Script para verificar composições das últimas 72 horas (igual ao Radar)
 * 
 * Este script busca EXATAMENTE como o Radar busca:
 * - Apenas composições das últimas 72 horas
 * - Busca da subcoleção lojas/{lojistaId}/composicoes
 * - Limit de 1000 composições
 * 
 * USO:
 * npx tsx scripts/verificar-composicoes-72h.ts [lojistaId|nome-loja]
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

console.log(`\n🔍 Verificando composições das últimas 72 horas (igual ao Radar)`);
console.log(`   Loja: ${lojistaIdArg}`);
console.log(`   lojistaId: ${lojistaId}\n`);

async function verificar72Horas() {
  try {
    // Import dinâmico para garantir que as variáveis de ambiente já foram carregadas
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
    
    // EXATAMENTE como o Radar faz: limit(1000)
    console.log(`📡 Buscando composições da subcoleção (limit 1000, igual ao Radar)...`);
    const subcollectionSnapshot = await subcollectionRef.limit(1000).get();
    
    console.log(`✅ Total de documentos encontrados: ${subcollectionSnapshot.size}\n`);
    
    if (subcollectionSnapshot.empty) {
      console.log(`⚠️  Nenhuma composição encontrada!`);
      return;
    }
    
    // Processar composições (EXATAMENTE como o Radar faz)
    interface ComposicaoInfo {
      id: string;
      createdAt: Date;
      customerId: string;
      customerName: string;
      produtoNome?: string;
      imagemUrl?: string;
      dentro72h: boolean;
    }
    
    const composicoes: ComposicaoInfo[] = [];
    const composicoes72h: ComposicaoInfo[] = [];
    
    subcollectionSnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Converter data - EXATAMENTE como o Radar faz
      let createdAt: Date;
      if (data?.createdAt) {
        if (data.createdAt.toDate) {
          createdAt = data.createdAt.toDate();
        } else if (typeof data.createdAt === "string") {
          createdAt = new Date(data.createdAt);
        } else {
          createdAt = new Date();
        }
      } else {
        createdAt = new Date();
      }
      
      // Pegar URL da imagem - EXATAMENTE como o Radar faz
      let imagemUrl = data.imagemUrl || data.imageUrl || "";
      
      // Se não tem imagem no nível raiz, tentar em looks
      if (!imagemUrl || imagemUrl.trim() === "") {
        const firstLook = data.looks && Array.isArray(data.looks) && data.looks.length > 0 ? data.looks[0] : null;
        if (firstLook) {
          imagemUrl = firstLook?.imagemUrl || firstLook?.imageUrl || firstLook?.url || "";
        }
      }
      
      // Excluir remixes explícitos (igual ao Radar)
      const isRemix = data.isRemix === true;
      if (isRemix) {
        return; // Não incluir remixes explícitos
      }
      
      const dentro72h = createdAt >= cutoffDate;
      
      const comp: ComposicaoInfo = {
        id: doc.id,
        createdAt,
        customerId: data.customerId || "",
        customerName: data.customerName || data.clienteNome || "Cliente Anônimo",
        produtoNome: data.primaryProductName || data.produtoNome || data.productName,
        imagemUrl,
        dentro72h,
      };
      
      composicoes.push(comp);
      
      if (dentro72h) {
        composicoes72h.push(comp);
      }
    });
    
    // Ordenar por data (mais recente primeiro)
    composicoes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    composicoes72h.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`📊 RESUMO GERAL`);
    console.log(`═══════════════════════════════════════════════════════════\n`);
    
    console.log(`📦 Total de documentos retornados: ${subcollectionSnapshot.size}`);
    console.log(`✅ Composições válidas (após filtros): ${composicoes.length}`);
    console.log(`⏰ Composições das últimas 72 horas: ${composicoes72h.length}\n`);
    
    // Agrupar por cliente (igual ao Radar)
    const porCliente = new Map<string, {
      nome: string;
      count: number;
      composicoes: ComposicaoInfo[];
    }>();
    
    composicoes72h.forEach(comp => {
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
    console.log(`👥 COMPOSIÇÕES POR CLIENTE (últimas 72h - igual ao Radar)`);
    console.log(`═══════════════════════════════════════════════════════════\n`);
    
    const clientesOrdenados = Array.from(porCliente.entries())
      .sort((a, b) => b[1].count - a[1].count);
    
    clientesOrdenados.forEach(([customerId, info], idx) => {
      const maisRecente = info.composicoes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      const dataStr = maisRecente.createdAt.toLocaleDateString("pt-BR");
      const horaStr = maisRecente.createdAt.toLocaleTimeString("pt-BR");
      
      console.log(`${idx + 1}. ${info.nome}: ${info.count} composições`);
      console.log(`   Última: ${dataStr} ${horaStr}`);
      console.log();
    });
    
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`📋 ÚLTIMAS 20 COMPOSIÇÕES (das últimas 72h)`);
    console.log(`═══════════════════════════════════════════════════════════\n`);
    
    composicoes72h.slice(0, 20).forEach((comp, idx) => {
      const dataStr = comp.createdAt.toLocaleDateString("pt-BR");
      const horaStr = comp.createdAt.toLocaleTimeString("pt-BR");
      const horasAtras = Math.floor((Date.now() - comp.createdAt.getTime()) / (1000 * 60 * 60));
      
      const tempoAtras = horasAtras < 1 
        ? `${Math.floor((Date.now() - comp.createdAt.getTime()) / (1000 * 60))} minutos atrás`
        : `${horasAtras} horas atrás`;
      
      const statusImagem = comp.imagemUrl && comp.imagemUrl.trim() !== "" ? "✅" : "❌";
      
      console.log(`${idx + 1}. ${statusImagem} ${dataStr} ${horaStr} (${tempoAtras})`);
      console.log(`   Cliente: ${comp.customerName} | ID: ${comp.id.substring(0, 12)}...`);
      if (comp.produtoNome) {
        console.log(`   Produto: ${comp.produtoNome}`);
      }
      console.log();
    });
    
    // Verificar especificamente 03-05/12
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`🔍 VERIFICAÇÃO ESPECÍFICA: 03-05/12/2025`);
    console.log(`═══════════════════════════════════════════════════════════\n`);
    
    const data03 = new Date(2025, 11, 3, 0, 0, 0);
    const data06 = new Date(2025, 11, 6, 0, 0, 0);
    
    const composicoes0305 = composicoes.filter(c => 
      c.createdAt >= data03 && c.createdAt < data06
    );
    
    console.log(`📅 Período: ${data03.toLocaleDateString("pt-BR")} até ${data06.toLocaleDateString("pt-BR")}`);
    console.log(`📊 Composições encontradas: ${composicoes0305.length}`);
    
    if (composicoes0305.length > 0) {
      console.log(`\n✅ Composições encontradas nesse período:\n`);
      composicoes0305.forEach((comp, idx) => {
        const dataStr = comp.createdAt.toLocaleDateString("pt-BR");
        const horaStr = comp.createdAt.toLocaleTimeString("pt-BR");
        console.log(`${idx + 1}. ${dataStr} ${horaStr} | ${comp.customerName} | ${comp.id.substring(0, 12)}...`);
      });
    } else {
      console.log(`\n⚠️  Nenhuma composição encontrada para esse período.`);
    }
    console.log();
    
    // Verificar se estão dentro das 72h
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`⏰ COMPOSIÇÕES DENTRO DAS ÚLTIMAS 72 HORAS`);
    console.log(`═══════════════════════════════════════════════════════════\n`);
    
    if (composicoes72h.length > 0) {
      console.log(`✅ ${composicoes72h.length} composições estão dentro das últimas 72 horas`);
      console.log(`   Essas são as composições que o Radar deve mostrar.\n`);
      
      // Mostrar distribuição por hora
      const agora = new Date();
      const ultimas24h = composicoes72h.filter(c => 
        c.createdAt >= new Date(agora.getTime() - 24 * 60 * 60 * 1000)
      );
      const entre24e48h = composicoes72h.filter(c => {
        const data24h = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
        const data48h = new Date(agora.getTime() - 48 * 60 * 60 * 1000);
        return c.createdAt >= data48h && c.createdAt < data24h;
      });
      const entre48e72h = composicoes72h.filter(c => {
        const data48h = new Date(agora.getTime() - 48 * 60 * 60 * 1000);
        const data72h = new Date(agora.getTime() - 72 * 60 * 60 * 1000);
        return c.createdAt >= data72h && c.createdAt < data48h;
      });
      
      console.log(`📊 Distribuição:`);
      console.log(`   Últimas 24h: ${ultimas24h.length} composições`);
      console.log(`   Entre 24h e 48h: ${entre24e48h.length} composições`);
      console.log(`   Entre 48h e 72h: ${entre48e72h.length} composições\n`);
    } else {
      console.log(`⚠️  Nenhuma composição está dentro das últimas 72 horas!`);
      console.log(`   O Radar não deve mostrar nenhuma composição.\n`);
    }
    
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`✅ Verificação concluída!`);
    console.log(`═══════════════════════════════════════════════════════════\n`);
    
  } catch (error) {
    console.error(`\n❌ Erro durante a verificação:`, error);
    if (error instanceof Error) {
      console.error(`Mensagem: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
    }
  }
}

verificar72Horas().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(`\n❌ Erro fatal:`, error);
  process.exit(1);
});


