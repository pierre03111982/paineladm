const axios = require('axios');

async function testUrl(url) {
  try {
    const response = await axios.head(url, {
      timeout: 5000,
      validateStatus: (status) => status < 500,
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

async function investigate() {
  console.log('🔍 Investigando variações do segundo parâmetro...\n');
  console.log('A URL atual é: /new/{SKIN_ID}/F/toggle-off/{FOLDER}/{FILE}');
  console.log('Vamos testar se o segundo parâmetro (F) pode variar...\n');

  const baseUrl = 'https://static.sizebay.technology/assets/shapes/v4/new';
  const skinId = 0;
  const fileName = '010101.jpg';
  const folder = 'E'; // Usar E como referência

  const results = [];

  // Testar letras A-Z
  console.log('📝 Testando letras A-Z:');
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i); // A-Z
    const url = `${baseUrl}/${skinId}/${letter}/toggle-off/${folder}/${fileName}`;
    const exists = await testUrl(url);
    if (exists) {
      results.push({ param: letter, url, type: 'letra' });
      console.log(`  ✅ ${letter}: Existe`);
    }
    // Pequeno delay
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Testar números 0-9
  console.log('\n🔢 Testando números 0-9:');
  for (let i = 0; i < 10; i++) {
    const url = `${baseUrl}/${skinId}/${i}/toggle-off/${folder}/${fileName}`;
    const exists = await testUrl(url);
    if (exists) {
      results.push({ param: i, url, type: 'numero' });
      console.log(`  ✅ ${i}: Existe`);
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Testar combinações possíveis (altura, peso, idade)
  console.log('\n📏 Testando valores de altura (140-200):');
  for (let height = 140; height <= 200; height += 10) {
    const url = `${baseUrl}/${skinId}/${height}/toggle-off/${folder}/${fileName}`;
    const exists = await testUrl(url);
    if (exists) {
      results.push({ param: height, url, type: 'altura' });
      console.log(`  ✅ Altura ${height}: Existe`);
    }
    await new Promise(resolve => setTimeout(resolve, 30));
  }

  console.log('\n⚖️  Testando valores de peso (40-120):');
  for (let weight = 40; weight <= 120; weight += 10) {
    const url = `${baseUrl}/${skinId}/${weight}/toggle-off/${folder}/${fileName}`;
    const exists = await testUrl(url);
    if (exists) {
      results.push({ param: weight, url, type: 'peso' });
      console.log(`  ✅ Peso ${weight}: Existe`);
    }
    await new Promise(resolve => setTimeout(resolve, 30));
  }

  console.log('\n🎂 Testando valores de idade (15-80):');
  for (let age = 15; age <= 80; age += 5) {
    const url = `${baseUrl}/${skinId}/${age}/toggle-off/${folder}/${fileName}`;
    const exists = await testUrl(url);
    if (exists) {
      results.push({ param: age, url, type: 'idade' });
      console.log(`  ✅ Idade ${age}: Existe`);
    }
    await new Promise(resolve => setTimeout(resolve, 30));
  }

  // Resumo
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMO FINAL');
  console.log('='.repeat(80));
  console.log(`✅ Total de variações encontradas: ${results.length}`);
  
  if (results.length > 0) {
    console.log('\n🎯 VARIAÇÕES VÁLIDAS:');
    results.forEach(r => {
      console.log(`  ${r.type.toUpperCase()} ${r.param}: ${r.url}`);
    });
  } else {
    console.log('\n⚠️  Nenhuma variação adicional encontrada.');
    console.log('O segundo parâmetro parece ser fixo como "F".');
    console.log('As variações estão apenas nas pastas A-E.');
  }
}

investigate().catch(console.error);
