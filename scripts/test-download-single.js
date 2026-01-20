const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL_TEMPLATE = 'https://static.sizebay.technology/assets/shapes/v4/new/{SKIN_ID}/F/toggle-off/{FOLDER_LETTER}/{FILENAME}';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'mannequins');
const FOLDERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Testar uma combinação específica que sabemos que funciona
const skinId = 0;
const busto = 1;
const cintura = 1;
const quadril = 1;

const fileName = `${String(busto).padStart(2, '0')}${String(cintura).padStart(2, '0')}${String(quadril).padStart(2, '0')}.jpg`;
const localFileName = `mannequin_s${skinId}_b${busto}_c${cintura}_q${quadril}.jpg`;
const localPath = path.join(OUTPUT_DIR, localFileName);

console.log('🧪 Testando download de uma imagem...\n');
console.log(`Arquivo: ${fileName}`);
console.log(`Salvar como: ${localFileName}\n`);

// Criar todas as URLs
const urls = FOLDERS.map(folder =>
  BASE_URL_TEMPLATE
    .replace('{SKIN_ID}', skinId)
    .replace('{FOLDER_LETTER}', folder)
    .replace('{FILENAME}', fileName)
);

console.log('URLs a testar:');
urls.forEach((url, i) => console.log(`  ${i + 1}. ${url}`));
console.log('');

// Testar todas as URLs
async function test() {
  const testPromises = urls.map(async (url, index) => {
    try {
      console.log(`Testando pasta ${FOLDERS[index]}...`);
      const response = await axios.head(url, {
        timeout: 8000,
        validateStatus: (status) => status < 500,
      });
      
      if (response.status === 200) {
        console.log(`  ✅ Pasta ${FOLDERS[index]}: Status 200`);
        return { success: true, url, folder: FOLDERS[index] };
      } else {
        console.log(`  ❌ Pasta ${FOLDERS[index]}: Status ${response.status}`);
        return { success: false, url: null, folder: null };
      }
    } catch (error) {
      const status = error.response?.status || 'error';
      console.log(`  ❌ Pasta ${FOLDERS[index]}: ${status}`);
      return { success: false, url: null, folder: null };
    }
  });

  const results = await Promise.all(testPromises);
  const found = results.find(r => r.success);

  if (!found || !found.url) {
    console.log('\n❌ Nenhuma URL funcionou!');
    return;
  }

  console.log(`\n✅ Encontrada URL válida: ${found.url}`);
  console.log(`📥 Baixando...`);

  try {
    const response = await axios({
      method: 'GET',
      url: found.url,
      responseType: 'stream',
      timeout: 30000,
      validateStatus: (status) => status === 200,
    });

    if (response.status !== 200) {
      console.log(`❌ Status inválido: ${response.status}`);
      return;
    }

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const writer = fs.createWriteStream(localPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`✅ Download concluído!`);
        console.log(`📁 Arquivo salvo em: ${localPath}`);
        const stats = fs.statSync(localPath);
        console.log(`📊 Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);
        resolve();
      });
      writer.on('error', (err) => {
        console.log(`❌ Erro no writer: ${err.message}`);
        reject(err);
      });
      response.data.on('error', (err) => {
        console.log(`❌ Erro no stream: ${err.message}`);
        reject(err);
      });
    });
  } catch (error) {
    console.log(`❌ Erro ao baixar: ${error.message || error}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
    }
  }
}

test().catch(console.error);
