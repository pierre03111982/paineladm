const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configurações
const BASE_URL_TEMPLATE = 'https://static.sizebay.technology/assets/shapes/v4/new/{SKIN_ID}/F/toggle-off/{FOLDER}/{FILENAME}';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'mannequins');
const FOLDERS = ['A', 'B', 'C', 'D', 'E']; // Pastas que representam diferentes características (altura/peso/idade)
const SKIN_TONES = [0, 1, 2, 3, 4, 5, 6]; // Tons de pele de 0 a 6
const CONCURRENCY_LIMIT = 20; // Máximo de downloads simultâneos

// Garantir que o diretório existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`✅ Diretório criado: ${OUTPUT_DIR}`);
}

// Sistema de fila para limitar concorrência
class ConcurrencyLimiter {
  constructor(limit) {
    this.limit = limit;
    this.running = 0;
    this.queue = [];
  }

  async execute(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.limit || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { fn, resolve, reject } = this.queue.shift();

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process();
    }
  }
}

// Função para baixar uma imagem de todas as pastas possíveis
async function downloadImage(skinId, busto, cintura, quadril) {
  const fileName = `${String(busto).padStart(2, '0')}${String(cintura).padStart(2, '0')}${String(quadril).padStart(2, '0')}.jpg`;
  
  let downloaded = 0;
  let foundFolders = [];

  // Tentar baixar de todas as pastas (cada uma pode ter uma variação diferente)
  for (const folder of FOLDERS) {
    const localFileName = `mannequin_s${skinId}_f${folder}_b${busto}_c${cintura}_q${quadril}.jpg`;
    const localPath = path.join(OUTPUT_DIR, localFileName);

    const remoteUrl = BASE_URL_TEMPLATE
      .replace('{SKIN_ID}', skinId)
      .replace('{FOLDER}', folder)
      .replace('{FILENAME}', fileName);

    try {
      const response = await axios({
        method: 'GET',
        url: remoteUrl,
        responseType: 'stream',
        timeout: 30000,
        validateStatus: (status) => status === 200,
      });

      const writer = fs.createWriteStream(localPath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
        response.data.on('error', reject);
      });

      downloaded++;
      foundFolders.push(folder);
    } catch (error) {
      // Se for 404, essa pasta não tem essa combinação (normal)
      if (error.response && error.response.status === 404) {
        continue;
      }
      // Outros erros, continua tentando outras pastas
    }
  }

  if (downloaded > 0) {
    return { success: true, skipped: false, folders: foundFolders, count: downloaded };
  } else {
    // Nenhuma pasta tinha essa combinação
    return { success: false, skipped: true, folders: [], count: 0 };
  }
}

// Função principal
async function downloadAllMannequins() {
  console.log('🚀 Iniciando download COMPLETO de manequins...\n');
  console.log(`📁 Diretório de destino: ${OUTPUT_DIR}`);
  console.log(`🎨 Tons de pele: ${SKIN_TONES.length} (${SKIN_TONES.join(', ')})`);
  console.log(`📐 Medidas: 5x5x5 = 125 combinações`);
  console.log(`📂 Pastas: ${FOLDERS.length} (${FOLDERS.join(', ')}) - Representam diferentes características físicas`);
  console.log(`⚡ Concorrência: ${CONCURRENCY_LIMIT} downloads simultâneos`);
  console.log(`📦 Total esperado: ${SKIN_TONES.length * 125 * FOLDERS.length} imagens possíveis\n`);
  console.log('='.repeat(70) + '\n');

  const limiter = new ConcurrencyLimiter(CONCURRENCY_LIMIT);
  const tasks = [];

  // Criar todas as tarefas
  for (const skinId of SKIN_TONES) {
    for (let busto = 1; busto <= 5; busto++) {
      for (let cintura = 1; cintura <= 5; cintura++) {
        for (let quadril = 1; quadril <= 5; quadril++) {
          tasks.push({ skinId, busto, cintura, quadril });
        }
      }
    }
  }

  let total = 0;
  let success = 0;
  let skipped = 0;
  let failed = 0;
  const totalExpected = tasks.length;

  console.log(`📋 Processando ${totalExpected} combinações...\n`);

  // Processar todas as tarefas com limite de concorrência
  const results = await Promise.all(
    tasks.map(({ skinId, busto, cintura, quadril }) =>
      limiter.execute(async () => {
        total++;
        const progress = `${total}/${totalExpected}`;

        try {
          const result = await downloadImage(skinId, busto, cintura, quadril);

          if (result.success) {
            success += result.count; // Contar cada pasta baixada
            if (total % 50 === 0 || total <= 10) {
              console.log(
                `✅ [${progress}] Pele ${skinId} - b${busto}_c${cintura}_q${quadril} → ${result.count} pasta(s) (${result.folders.join(',')}) | Total: ${success}, Pulados: ${skipped}`
              );
            }
          } else if (result.skipped) {
            skipped++;
            if (total % 100 === 0 || total <= 10) {
              console.log(
                `⏭️  [${progress}] Skipping invalid shape: Pele ${skinId} - b${busto}_c${cintura}_q${quadril} | Sucesso: ${success}, Pulados: ${skipped}`
              );
            }
          } else {
            failed++;
            if (total % 50 === 0) {
              console.log(
                `❌ [${progress}] Pele ${skinId} - b${busto}_c${cintura}_q${quadril} → Erro`
              );
            }
          }

          return result;
        } catch (error) {
          failed++;
          if (total % 50 === 0) {
            console.log(
              `❌ [${progress}] Pele ${skinId} - b${busto}_c${cintura}_q${quadril} → Erro: ${error.message}`
            );
          }
          return { success: false, skipped: false };
        }
      })
    )
  );

  console.log('\n' + '='.repeat(70));
  console.log('📊 RESUMO FINAL DO DOWNLOAD');
  console.log('='.repeat(70));
  console.log(`✅ Imagens baixadas: ${success}`);
  console.log(`⏭️  Combinações inválidas (nenhuma pasta tinha): ${skipped}`);
  console.log(`❌ Falhas: ${failed}`);
  console.log(`📦 Total de combinações processadas: ${total}/${totalExpected}`);
  console.log(`📁 Arquivos salvos em: ${OUTPUT_DIR}`);
  console.log(`📈 Taxa de sucesso: ${((success / (total * FOLDERS.length)) * 100).toFixed(2)}%`);
  console.log(`📊 Taxa de pulos: ${((skipped / total) * 100).toFixed(2)}%`);
  console.log(`\n💡 Nota: Cada combinação foi testada em ${FOLDERS.length} pastas (${FOLDERS.join(', ')}).`);
  console.log(`   As pastas representam diferentes características físicas (altura/peso/idade).`);
  console.log('='.repeat(70));
}

// Executar
downloadAllMannequins().catch((error) => {
  console.error('\n❌ Erro fatal:', error);
  process.exit(1);
});
