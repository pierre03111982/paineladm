const axios = require('axios');

// Testar diferentes estruturas de URL
async function testUrl(url, description) {
  try {
    const response = await axios.head(url, {
      timeout: 5000,
      validateStatus: (status) => status < 500,
    });
    return { url, description, status: response.status, exists: response.status === 200 };
  } catch (error) {
    return { url, description, status: error.response?.status || 'error', exists: false };
  }
}

async function investigateVariations() {
  console.log('🔍 Investigando variações de manequins...\n');

  const baseUrl = 'https://static.sizebay.technology/assets/shapes/v4/new';
  const skinId = 0;
  const fileName = '010101.jpg';

  // Testar diferentes estruturas
  const tests = [];

  // 1. Testar diferentes pastas (A, B, C, D, E, F)
  console.log('📁 Testando diferentes pastas (A-F):');
  for (const folder of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const url = `${baseUrl}/${skinId}/F/toggle-off/${folder}/${fileName}`;
    tests.push(testUrl(url, `Pasta ${folder}`));
  }

  // 2. Testar diferentes valores no segundo parâmetro (atualmente F)
  console.log('\n🔢 Testando diferentes valores no segundo parâmetro:');
  for (const param of ['A', 'B', 'C', 'D', 'E', 'F', '0', '1', '2', '3', '4', '5']) {
    const url = `${baseUrl}/${skinId}/${param}/toggle-off/E/${fileName}`;
    tests.push(testUrl(url, `Parâmetro ${param}`));
  }

  // 3. Testar com altura/peso/idade (se houver na URL)
  console.log('\n📏 Testando possíveis parâmetros de altura/peso/idade:');
  // Possíveis formatos: /new/{SKIN}/{HEIGHT}/{toggle-off}/{FOLDER}/{FILE}
  // ou /new/{SKIN}/{WEIGHT}/{toggle-off}/{FOLDER}/{FILE}
  // ou /new/{SKIN}/{AGE}/{toggle-off}/{FOLDER}/{FILE}
  
  // Testar se o segundo parâmetro pode ser altura (ex: 150-200)
  for (const height of ['150', '160', '170', '180']) {
    const url = `${baseUrl}/${skinId}/${height}/toggle-off/E/${fileName}`;
    tests.push(testUrl(url, `Altura ${height}`));
  }

  // Testar se o segundo parâmetro pode ser peso (ex: 50-100)
  for (const weight of ['50', '60', '70', '80']) {
    const url = `${baseUrl}/${skinId}/${weight}/toggle-off/E/${fileName}`;
    tests.push(testUrl(url, `Peso ${weight}`));
  }

  // 4. Testar estrutura alternativa: /new/{SKIN}/{PARAM1}/{PARAM2}/toggle-off/{FOLDER}/{FILE}
  console.log('\n🔄 Testando estrutura alternativa:');
  for (const param1 of ['F', 'A', '0']) {
    for (const param2 of ['toggle-off', 'toggle-on']) {
      const url = `${baseUrl}/${skinId}/${param1}/${param2}/E/${fileName}`;
      tests.push(testUrl(url, `${param1}/${param2}`));
    }
  }

  // Executar todos os testes
  const results = await Promise.all(tests);

  console.log('\n' + '='.repeat(80));
  console.log('📊 RESULTADOS DOS TESTES');
  console.log('='.repeat(80));

  // Agrupar por categoria
  const byCategory = {};
  results.forEach(result => {
    const category = result.description.split(' ')[0];
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(result);
  });

  // Mostrar resultados
  Object.keys(byCategory).forEach(category => {
    console.log(`\n${category}:`);
    byCategory[category].forEach(result => {
      const icon = result.exists ? '✅' : '❌';
      console.log(`  ${icon} ${result.description}: Status ${result.status}`);
      if (result.exists) {
        console.log(`     URL: ${result.url}`);
      }
    });
  });

  // Resumo
  const existing = results.filter(r => r.exists);
  console.log('\n' + '='.repeat(80));
  console.log('📈 RESUMO');
  console.log('='.repeat(80));
  console.log(`✅ URLs que existem: ${existing.length}/${results.length}`);
  console.log(`❌ URLs que não existem: ${results.length - existing.length}/${results.length}`);
  
  if (existing.length > 0) {
    console.log('\n🎯 URLs VÁLIDAS ENCONTRADAS:');
    existing.forEach(result => {
      console.log(`  ${result.url}`);
    });
  }
}

investigateVariations().catch(console.error);
