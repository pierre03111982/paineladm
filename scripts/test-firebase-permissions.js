/**
 * Script para testar se o Firebase Admin SDK tem permissões no Firestore
 * 
 * Execute: node scripts/test-firebase-permissions.js
 */

// Tentar carregar dotenv se disponível (opcional)
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv não instalado, usar variáveis de ambiente do sistema
}

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function testFirebasePermissions() {
  console.log('🔍 Testando permissões do Firebase Admin SDK...\n');

  // Verificar variáveis de ambiente
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  console.log('📋 Variáveis de ambiente:');
  console.log(`  - FIREBASE_PROJECT_ID: ${projectId ? '✅' : '❌'} ${projectId || 'NÃO ENCONTRADO'}`);
  console.log(`  - FIREBASE_CLIENT_EMAIL: ${clientEmail ? '✅' : '❌'} ${clientEmail ? clientEmail.substring(0, 30) + '...' : 'NÃO ENCONTRADO'}`);
  console.log(`  - FIREBASE_PRIVATE_KEY: ${privateKey ? '✅' : '❌'} ${privateKey ? `(${privateKey.length} caracteres)` : 'NÃO ENCONTRADO'}`);
  console.log('');

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Variáveis de ambiente faltando! Configure no .env.local');
    process.exit(1);
  }

  try {
    // Inicializar Firebase Admin
    console.log('🔧 Inicializando Firebase Admin SDK...');
    
    let app;
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
      console.log('  ✅ Usando app existente');
    } else {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
      console.log('  ✅ Firebase Admin inicializado');
    }

    // Testar acesso ao Firestore
    console.log('\n📊 Testando acesso ao Firestore...');
    const db = getFirestore(app);

    // Teste 1: Ler uma coleção (qualquer uma)
    console.log('  - Teste 1: Lendo coleção "lojas"...');
    try {
      const lojasRef = db.collection('lojas');
      const snapshot = await lojasRef.limit(1).get();
      console.log(`    ✅ Leitura OK (${snapshot.size} documentos encontrados)`);
    } catch (error) {
      console.error(`    ❌ Erro ao ler: ${error.message}`);
      throw error;
    }

    // Teste 2: Escrever um documento de teste
    console.log('  - Teste 2: Escrevendo documento de teste...');
    try {
      const testRef = db.collection('_test_permissions').doc('test-' + Date.now());
      await testRef.set({
        test: true,
        timestamp: new Date(),
        message: 'Teste de permissões do Service Account',
      });
      console.log('    ✅ Escrita OK');

      // Limpar documento de teste
      await testRef.delete();
      console.log('    ✅ Limpeza OK (documento de teste removido)');
    } catch (error) {
      console.error(`    ❌ Erro ao escrever: ${error.message}`);
      throw error;
    }

    // Teste 3: Verificar acesso a subcoleções
    console.log('  - Teste 3: Verificando acesso a subcoleções...');
    try {
      // Pegar primeiro lojistaId disponível
      const lojasSnapshot = await db.collection('lojas').limit(1).get();
      if (!lojasSnapshot.empty) {
        const lojistaId = lojasSnapshot.docs[0].id;
        const codesRef = db
          .collection('lojas')
          .doc(lojistaId)
          .collection('verificationCodes');
        const codesSnapshot = await codesRef.limit(1).get();
        console.log(`    ✅ Acesso a subcoleções OK (lojistaId: ${lojistaId.substring(0, 10)}...)`);
      } else {
        console.log('    ⚠️  Nenhuma loja encontrada para testar subcoleções');
      }
    } catch (error) {
      console.error(`    ❌ Erro ao acessar subcoleções: ${error.message}`);
      throw error;
    }

    console.log('\n✅ TODOS OS TESTES PASSARAM!');
    console.log('   O Service Account tem permissões corretas no Firestore.\n');
    
  } catch (error) {
    console.error('\n❌ ERRO NOS TESTES:');
    console.error(`   Mensagem: ${error.message}`);
    console.error(`   Código: ${error.code || 'N/A'}`);
    
    if (error.code === 'PERMISSION_DENIED') {
      console.error('\n💡 SOLUÇÃO:');
      console.error('   1. Acesse: https://console.cloud.google.com/iam-admin/iam');
      console.error('   2. Procure pelo Service Account:', clientEmail);
      console.error('   3. Adicione a role: "Cloud Datastore User"');
      console.error('   4. Ou adicione: "Firebase Admin SDK Administrator Service Agent"');
    } else if (error.message.includes('private key')) {
      console.error('\n💡 SOLUÇÃO:');
      console.error('   Verifique se FIREBASE_PRIVATE_KEY está completa e correta');
      console.error('   A chave deve incluir -----BEGIN PRIVATE KEY----- e -----END PRIVATE KEY-----');
    }
    
    process.exit(1);
  }
}

// Executar teste
testFirebasePermissions().catch(console.error);

