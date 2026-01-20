const axios = require('axios');

// Testar diferentes combinações de altura/peso/idade para entender a lógica
async function testCombination(skinId, folder, fileName, description) {
  try {
    const url = `https://static.sizebay.technology/assets/shapes/v4/new/${skinId}/F/toggle-off/${folder}/${fileName}`;
    const response = await axios.head(url, {
      timeout: 5000,
      validateStatus: (status) => status < 500,
    });
    return {
      description,
      folder,
      exists: response.status === 200,
      url: response.status === 200 ? url : null
    };
  } catch (error) {
    return {
      description,
      folder,
      exists: false,
      url: null
    };
  }
}

async function investigateFolderLogic() {
  console.log('🔍 Investigando a lógica de seleção de pastas (A-E)...\n');
  console.log('Testando diferentes combinações para entender o padrão...\n');

  const skinId = 0;
  const fileName = '010101.jpg'; // Usar uma combinação que sabemos que existe
  const folders = ['A', 'B', 'C', 'D', 'E'];

  // Testar a mesma combinação em todas as pastas para ver se todas têm
  console.log('📋 Teste 1: Verificando se todas as pastas têm a mesma combinação (010101):');
  const test1 = await Promise.all(
    folders.map(folder => testCombination(skinId, folder, fileName, `Pasta ${folder}`))
  );
  
  test1.forEach(result => {
    console.log(`  ${result.exists ? '✅' : '❌'} ${result.description}: ${result.exists ? 'Existe' : 'Não existe'}`);
  });

  // Testar diferentes combinações de medidas para ver padrões
  console.log('\n📋 Teste 2: Testando diferentes combinações de medidas em cada pasta:');
  const testCombinations = [
    { b: 1, c: 1, q: 1, desc: 'Magra (1-1-1)' },
    { b: 3, c: 3, q: 3, desc: 'Média (3-3-3)' },
    { b: 5, c: 5, q: 5, desc: 'Plus Size (5-5-5)' },
    { b: 1, c: 5, q: 1, desc: 'Cintura grande (1-5-1)' },
    { b: 5, c: 1, q: 5, desc: 'Cintura pequena (5-1-5)' },
  ];

  for (const combo of testCombinations) {
    const file = `${String(combo.b).padStart(2, '0')}${String(combo.c).padStart(2, '0')}${String(combo.quadril).padStart(2, '0')}.jpg`;
    console.log(`\n  Testando: ${combo.desc} (${file})`);
    
    const results = await Promise.all(
      folders.map(folder => testCombination(skinId, folder, file, folder))
    );
    
    const existing = results.filter(r => r.exists);
    if (existing.length > 0) {
      console.log(`    ✅ Encontrado em: ${existing.map(r => r.folder).join(', ')}`);
    } else {
      console.log(`    ❌ Não encontrado em nenhuma pasta`);
    }
  }

  // Analisar padrões baseado nos arquivos já baixados
  console.log('\n📊 Teste 3: Analisando padrões dos arquivos já baixados...');
  const fs = require('fs');
  const path = require('path');
  const mannequinsDir = path.join(__dirname, '..', 'public', 'assets', 'mannequins');
  
  if (fs.existsSync(mannequinsDir)) {
    const files = fs.readdirSync(mannequinsDir).filter(f => f.endsWith('.jpg'));
    
    // Agrupar por pasta e medidas
    const byFolderAndMeasures = {};
    
    files.forEach(file => {
      const match = file.match(/mannequin_s(\d+)_f([A-E])_b(\d+)_c(\d+)_q(\d+)\.jpg/);
      if (match) {
        const [, skin, folder, b, c, q] = match;
        const key = `b${b}_c${c}_q${q}`;
        if (!byFolderAndMeasures[key]) {
          byFolderAndMeasures[key] = {};
        }
        if (!byFolderAndMeasures[key][folder]) {
          byFolderAndMeasures[key][folder] = 0;
        }
        byFolderAndMeasures[key][folder]++;
      }
    });

    console.log('\n  Distribuição de pastas por combinação de medidas (primeiras 10):');
    const keys = Object.keys(byFolderAndMeasures).slice(0, 10);
    keys.forEach(key => {
      const folders = byFolderAndMeasures[key];
      const foldersList = Object.keys(folders).sort().join(', ');
      console.log(`    ${key}: Pastas ${foldersList}`);
    });

    // Verificar se há padrão: todas as combinações têm as mesmas pastas?
    console.log('\n  Verificando se há padrão consistente...');
    const allCombinations = Object.keys(byFolderAndMeasures);
    const firstFolders = Object.keys(byFolderAndMeasures[allCombinations[0]]).sort().join(',');
    let consistent = true;
    
    for (const key of allCombinations) {
      const currentFolders = Object.keys(byFolderAndMeasures[key]).sort().join(',');
      if (currentFolders !== firstFolders) {
        consistent = false;
        break;
      }
    }

    if (consistent) {
      console.log(`    ✅ Padrão consistente: Todas as combinações têm as mesmas pastas (${firstFolders})`);
      console.log(`    💡 Isso significa que as pastas NÃO dependem das medidas (busto/cintura/quadril)`);
      console.log(`    💡 As pastas provavelmente dependem de altura/peso/idade do usuário`);
    } else {
      console.log(`    ⚠️  Padrão inconsistente: Diferentes combinações têm diferentes pastas`);
      console.log(`    💡 Isso significa que as pastas podem depender das medidas também`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📝 CONCLUSÃO');
  console.log('='.repeat(80));
  console.log('As pastas A-E representam diferentes características físicas do USUÁRIO');
  console.log('(altura, peso, idade), não das medidas do manequim (busto/cintura/quadril).');
  console.log('\n💡 LÓGICA DE USO:');
  console.log('1. O usuário informa altura, peso e idade');
  console.log('2. O sistema calcula qual pasta (A-E) usar baseado nessas características');
  console.log('3. O usuário ajusta as medidas (busto/cintura/quadril) de 1 a 5');
  console.log('4. O sistema monta a URL: mannequin_s{SKIN}_f{FOLDER}_b{BUSTO}_c{CINTURA}_q{QUADRIL}.jpg');
  console.log('\n⚠️  PRÓXIMO PASSO:');
  console.log('Precisamos descobrir a fórmula que mapeia altura/peso/idade → pasta (A-E)');
}

investigateFolderLogic().catch(console.error);
