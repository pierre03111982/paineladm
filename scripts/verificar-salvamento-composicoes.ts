/**
 * Script para verificar o processo de salvamento de composições
 * 
 * Este script verifica:
 * - Composições mais recentes no banco
 * - Últimas composições salvas
 * - Possíveis problemas no processo de salvamento
 * - Composições por cliente
 * 
 * USO:
 * npx tsx scripts/verificar-salvamento-composicoes.ts [lojistaId|nome-loja]
 * 
 * Exemplos:
 * npx tsx scripts/verificar-salvamento-composicoes.ts
 *   (usa Thais Moda como padrão)
 * 
 * npx tsx scripts/verificar-salvamento-composicoes.ts thais-moda
 *   (usa Thais Moda)
 * 
 * npx tsx scripts/verificar-salvamento-composicoes.ts hOQL4BaVY92787EjKVMt
 *   (usa ID específico)
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

console.log(`\n🔍 Verificando processo de salvamento de composições`);
console.log(`   Loja: ${lojistaIdArg}`);
console.log(`   lojistaId: ${lojistaId}\n`);

async function verificarSalvamento() {
  try {
    // Import dinâmico para garantir que as variáveis de ambiente já foram carregadas
    const { getAdminDb } = await import("../src/lib/firebaseAdmin");
    
    const db = getAdminDb();
    console.log(`✅ Firebase Admin inicializado\n`);
    
    const subcollectionRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("composicoes");
    
    // Buscar todas as composições
    console.log(`📡 Buscando composições da subcoleção...`);
    const snapshot = await subcollectionRef.get();
    
    console.log(`✅ Total de composições encontradas: ${snapshot.size}\n`);
    
    if (snapshot.empty) {
      console.log(`⚠️  Nenhuma composição encontrada no banco de dados!`);
      return;
    }
    
    // Processar todas as composições
    interface ComposicaoInfo {
      id: string;
      createdAt: Date;
      customerId: string;
      customerName: string;
      produtoNome?: string;
      imagemUrl?: string;
      hasImage: boolean;
    }
    
    const composicoes: ComposicaoInfo[] = [];
    const agora = new Date();
    
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
      
      // A imagem pode estar no nível raiz ou dentro de looks[0]
      let imagemUrl = data.imagemUrl || data.imageUrl || "";
      
      // Se não encontrou no nível raiz, tentar em looks (como o Radar faz)
      if (!imagemUrl || imagemUrl.trim() === "") {
        const firstLook = data.looks && Array.isArray(data.looks) && data.looks.length > 0 ? data.looks[0] : null;
        if (firstLook) {
          imagemUrl = firstLook?.imagemUrl || firstLook?.imageUrl || firstLook?.url || "";
        }
      }
      
      const hasImage = imagemUrl && imagemUrl.trim() !== "";
      
      composicoes.push({
        id: doc.id,
        createdAt,
        customerId: data.customerId || "",
        customerName: data.customerName || data.clienteNome || "Cliente Anônimo",
        produtoNome: data.primaryProductName || data.produtoNome || data.productName,
        imagemUrl,
        hasImage,
      });
    });
    
    // Ordenar por data (mais recente primeiro)
    composicoes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // 1. MOSTRAR COMPOSIÇÕES MAIS RECENTES
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`📋 ÚLTIMAS 20 COMPOSIÇÕES SALVAS`);
    console.log(`═══════════════════════════════════════════════════════════\n`);
    
    composicoes.slice(0, 20).forEach((comp, idx) => {
      const dataStr = comp.createdAt.toLocaleDateString("pt-BR");
      const horaStr = comp.createdAt.toLocaleTimeString("pt-BR");
      const horasAtras = Math.floor((agora.getTime() - comp.createdAt.getTime()) / (1000 * 60 * 60));
      
      const statusImagem = comp.hasImage ? "✅" : "❌";
      const tempoAtras = horasAtras < 1 
        ? `${Math.floor((agora.getTime() - comp.createdAt.getTime()) / (1000 * 60))} minutos atrás`
        : horasAtras < 24 
        ? `${horasAtras} horas atrás`
        : `${Math.floor(horasAtras / 24)} dias atrás`;
      
      console.log(`${idx + 1}. ${statusImagem} ${dataStr} ${horaStr} (${tempoAtras})`);
      console.log(`   Cliente: ${comp.customerName} | ID: ${comp.id.substring(0, 12)}...`);
      if (comp.produtoNome) {
        console.log(`   Produto: ${comp.produtoNome}`);
      }
      console.log();
    });
    
    // 2. ESTATÍSTICAS GERAIS
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`📊 ESTATÍSTICAS GERAIS`);
    console.log(`═══════════════════════════════════════════════════════════\n`);
    
    const maisRecente = composicoes[0];
    const maisAntiga = composicoes[composicoes.length - 1];
    
    const horasDesdeUltima = (agora.getTime() - maisRecente.createdAt.getTime()) / (1000 * 60 * 60);
    const diasDesdeUltima = horasDesdeUltima / 24;
    
    console.log(`📅 Mais recente: ${maisRecente.createdAt.toLocaleDateString("pt-BR")} ${maisRecente.createdAt.toLocaleTimeString("pt-BR")}`);
    console.log(`   Há ${Math.floor(horasDesdeUltima)} horas (${diasDesdeUltima.toFixed(2)} dias)`);
    console.log(`📅 Mais antiga: ${maisAntiga.createdAt.toLocaleDateString("pt-BR")} ${maisAntiga.createdAt.toLocaleTimeString("pt-BR")}`);
    console.log();
    
    // Compositions com imagem vs sem imagem
    const comImagem = composicoes.filter(c => c.hasImage).length;
    const semImagem = composicoes.length - comImagem;
    console.log(`🖼️  Com imagem: ${comImagem} (${((comImagem / composicoes.length) * 100).toFixed(1)}%)`);
    console.log(`❌ Sem imagem: ${semImagem} (${((semImagem / composicoes.length) * 100).toFixed(1)}%)`);
    console.log();
    
    // 3. COMPOSIÇÕES POR CLIENTE
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`👥 COMPOSIÇÕES POR CLIENTE (Top 10)`);
    console.log(`═══════════════════════════════════════════════════════════\n`);
    
    const composicoesPorCliente = new Map<string, { nome: string; count: number; ultima: Date }>();
    
    composicoes.forEach(comp => {
      const key = comp.customerId || comp.customerName;
      if (!composicoesPorCliente.has(key)) {
        composicoesPorCliente.set(key, {
          nome: comp.customerName,
          count: 0,
          ultima: comp.createdAt,
        });
      }
      
      const cliente = composicoesPorCliente.get(key)!;
      cliente.count++;
      if (comp.createdAt > cliente.ultima) {
        cliente.ultima = comp.createdAt;
      }
    });
    
    const clientesOrdenados = Array.from(composicoesPorCliente.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);
    
    clientesOrdenados.forEach(([customerId, info], idx) => {
      const dataStr = info.ultima.toLocaleDateString("pt-BR");
      console.log(`${idx + 1}. ${info.nome}: ${info.count} composições (última: ${dataStr})`);
    });
    console.log();
    
    // 4. VERIFICAR COMPOSIÇÕES DOS ÚLTIMOS 7 DIAS
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`📅 COMPOSIÇÕES DOS ÚLTIMOS 7 DIAS`);
    console.log(`═══════════════════════════════════════════════════════════\n`);
    
    const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const composicoesRecentes = composicoes.filter(c => c.createdAt >= seteDiasAtras);
    
    // Agrupar por dia
    const porDia = new Map<string, number>();
    composicoesRecentes.forEach(comp => {
      const dataStr = comp.createdAt.toLocaleDateString("pt-BR");
      porDia.set(dataStr, (porDia.get(dataStr) || 0) + 1);
    });
    
    const diasOrdenados = Array.from(porDia.entries())
      .sort((a, b) => {
        const dateA = new Date(a[0].split("/").reverse().join("-"));
        const dateB = new Date(b[0].split("/").reverse().join("-"));
        return dateB.getTime() - dateA.getTime();
      });
    
    diasOrdenados.forEach(([data, count]) => {
      const isHoje = data === agora.toLocaleDateString("pt-BR");
      const marcador = isHoje ? "🟢" : "";
      console.log(`${marcador} ${data}: ${count} composições`);
    });
    console.log();
    
    // 5. VERIFICAR COMPOSIÇÕES DE 03-05/12 ESPECIFICAMENTE
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`🔍 VERIFICAÇÃO ESPECÍFICA: 03-05/12/2025`);
    console.log(`═══════════════════════════════════════════════════════════\n`);
    
    const data03 = new Date(2025, 11, 3, 0, 0, 0); // 03/12/2025 00:00:00
    const data06 = new Date(2025, 11, 6, 0, 0, 0); // 06/12/2025 00:00:00
    
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
      console.log(`\n💡 Possíveis causas:`);
      console.log(`   - As composições não foram geradas nesses dias`);
      console.log(`   - As composições foram geradas mas não foram salvas`);
      console.log(`   - As composições foram salvas com data diferente`);
      console.log(`   - As composições estão em outro lojistaId`);
    }
    console.log();
    
    // 6. ALERTAS E PROBLEMAS POTENCIAIS
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`⚠️  ALERTAS E PROBLEMAS POTENCIAIS`);
    console.log(`═══════════════════════════════════════════════════════════\n`);
    
    const alertas: string[] = [];
    
    // Verificar se a última composição é muito antiga
    if (horasDesdeUltima > 48) {
      alertas.push(`⚠️  Última composição salva há mais de 48 horas (${Math.floor(horasDesdeUltima)} horas)`);
    }
    
    // Verificar composições sem imagem
    if (semImagem > 0) {
      alertas.push(`⚠️  ${semImagem} composições sem imagem (podem não estar completas)`);
    }
    
    // Verificar composições com data no futuro
    const composicoesFuturas = composicoes.filter(c => c.createdAt > agora);
    if (composicoesFuturas.length > 0) {
      alertas.push(`⚠️  ${composicoesFuturas.length} composições com data no futuro (possível problema de timezone)`);
    }
    
    // Verificar se não há composições de 03-05/12
    if (composicoes0305.length === 0) {
      alertas.push(`⚠️  Nenhuma composição encontrada para 03-05/12/2025`);
    }
    
    if (alertas.length > 0) {
      alertas.forEach(alerta => console.log(alerta));
    } else {
      console.log(`✅ Nenhum problema detectado!`);
    }
    console.log();
    
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

verificarSalvamento().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(`\n❌ Erro fatal:`, error);
  process.exit(1);
});

