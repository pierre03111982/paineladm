/**
 * Script para verificar modelos Imagen disponíveis no Vertex AI
 * 
 * Execute: node scripts/verificar-imagen-models.js
 */

const { execSync } = require('child_process');

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || 'paineladmexperimenteai';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

console.log('🔍 Verificando modelos Imagen disponíveis no Vertex AI...\n');
console.log(`Projeto: ${PROJECT_ID}`);
console.log(`Região: ${LOCATION}\n`);

try {
  // Obter token de acesso
  console.log('📝 Obtendo token de acesso...');
  const accessToken = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
  
  // Endpoint para listar modelos do publisher Google
  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models`;
  
  console.log(`🌐 Consultando: ${endpoint}\n`);
  
  // Fazer requisição
  const response = execSync(
    `curl -s -X GET "${endpoint}" -H "Authorization: Bearer ${accessToken}" -H "Content-Type: application/json"`,
    { encoding: 'utf-8' }
  );
  
  const data = JSON.parse(response);
  
  if (!data.models || data.models.length === 0) {
    console.log('❌ Nenhum modelo encontrado.');
    console.log('\n💡 Tente verificar manualmente no Console:');
    console.log('   https://console.cloud.google.com/vertex-ai/model-garden');
    return;
  }
  
  // Filtrar modelos Imagen
  const imagenModels = data.models.filter(model => 
    model.name?.toLowerCase().includes('imagen') ||
    model.displayName?.toLowerCase().includes('imagen')
  );
  
  console.log(`✅ Encontrados ${imagenModels.length} modelo(s) Imagen:\n`);
  
  imagenModels.forEach((model, index) => {
    console.log(`${index + 1}. ${model.displayName || model.name}`);
    console.log(`   Nome: ${model.name}`);
    if (model.description) {
      console.log(`   Descrição: ${model.description.substring(0, 100)}...`);
    }
    console.log('');
  });
  
  // Verificar especificamente por Imagen 4.0
  const imagen4 = imagenModels.find(model => 
    model.name?.includes('4') || 
    model.displayName?.includes('4')
  );
  
  if (imagen4) {
    console.log('🎉 Imagen 4.0 encontrado!');
    console.log(`   Nome: ${imagen4.name}`);
    console.log(`   Display: ${imagen4.displayName}`);
    console.log('\n📖 Próximos passos:');
    console.log('   1. Acesse o Model Garden no Console');
    console.log('   2. Clique no modelo para ver detalhes');
    console.log('   3. Verifique se suporta múltiplas imagens');
  } else {
    console.log('⚠️  Imagen 4.0 não encontrado na lista.');
    console.log('   Apenas Imagen 3.0 está disponível.');
  }
  
  console.log('\n📚 Para mais detalhes, acesse:');
  console.log('   https://console.cloud.google.com/vertex-ai/model-garden');
  
} catch (error) {
  console.error('❌ Erro ao verificar modelos:', error.message);
  console.log('\n💡 Alternativas:');
  console.log('   1. Verifique manualmente no Console');
  console.log('   2. Certifique-se de que o gcloud CLI está instalado');
  console.log('   3. Execute: gcloud auth login');
}


 * Script para verificar modelos Imagen disponíveis no Vertex AI
 * 
 * Execute: node scripts/verificar-imagen-models.js
 */

const { execSync } = require('child_process');

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || 'paineladmexperimenteai';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

console.log('🔍 Verificando modelos Imagen disponíveis no Vertex AI...\n');
console.log(`Projeto: ${PROJECT_ID}`);
console.log(`Região: ${LOCATION}\n`);

try {
  // Obter token de acesso
  console.log('📝 Obtendo token de acesso...');
  const accessToken = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
  
  // Endpoint para listar modelos do publisher Google
  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models`;
  
  console.log(`🌐 Consultando: ${endpoint}\n`);
  
  // Fazer requisição
  const response = execSync(
    `curl -s -X GET "${endpoint}" -H "Authorization: Bearer ${accessToken}" -H "Content-Type: application/json"`,
    { encoding: 'utf-8' }
  );
  
  const data = JSON.parse(response);
  
  if (!data.models || data.models.length === 0) {
    console.log('❌ Nenhum modelo encontrado.');
    console.log('\n💡 Tente verificar manualmente no Console:');
    console.log('   https://console.cloud.google.com/vertex-ai/model-garden');
    return;
  }
  
  // Filtrar modelos Imagen
  const imagenModels = data.models.filter(model => 
    model.name?.toLowerCase().includes('imagen') ||
    model.displayName?.toLowerCase().includes('imagen')
  );
  
  console.log(`✅ Encontrados ${imagenModels.length} modelo(s) Imagen:\n`);
  
  imagenModels.forEach((model, index) => {
    console.log(`${index + 1}. ${model.displayName || model.name}`);
    console.log(`   Nome: ${model.name}`);
    if (model.description) {
      console.log(`   Descrição: ${model.description.substring(0, 100)}...`);
    }
    console.log('');
  });
  
  // Verificar especificamente por Imagen 4.0
  const imagen4 = imagenModels.find(model => 
    model.name?.includes('4') || 
    model.displayName?.includes('4')
  );
  
  if (imagen4) {
    console.log('🎉 Imagen 4.0 encontrado!');
    console.log(`   Nome: ${imagen4.name}`);
    console.log(`   Display: ${imagen4.displayName}`);
    console.log('\n📖 Próximos passos:');
    console.log('   1. Acesse o Model Garden no Console');
    console.log('   2. Clique no modelo para ver detalhes');
    console.log('   3. Verifique se suporta múltiplas imagens');
  } else {
    console.log('⚠️  Imagen 4.0 não encontrado na lista.');
    console.log('   Apenas Imagen 3.0 está disponível.');
  }
  
  console.log('\n📚 Para mais detalhes, acesse:');
  console.log('   https://console.cloud.google.com/vertex-ai/model-garden');
  
} catch (error) {
  console.error('❌ Erro ao verificar modelos:', error.message);
  console.log('\n💡 Alternativas:');
  console.log('   1. Verifique manualmente no Console');
  console.log('   2. Certifique-se de que o gcloud CLI está instalado');
  console.log('   3. Execute: gcloud auth login');
}

