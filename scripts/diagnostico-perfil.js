const admin = require('firebase-admin');
const path = require('path');

// Inicializar Firebase Admin
// Ajustado para procurar na raiz do projeto paineladm (um nível acima de scripts/)
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const lojistaId = 'hOQL4BaVY92787EjKVMt'; // ID pego do log da imagem

async function checkPerfil() {
  console.log(`\n🔍 DIAGNÓSTICO DE PERFIL PARA: ${lojistaId}\n`);

  // 1. Verificar documento raiz
  const docRaiz = await db.collection('lojas').doc(lojistaId).get();
  console.log('📁 Documento Raiz (lojas/{id}):');
  if (docRaiz.exists) {
    console.log('   ✅ Existe');
    console.log('   🔑 appModel:', docRaiz.data().appModel);
    console.log('   🔑 modeloApp:', docRaiz.data().modeloApp);
  } else {
    console.log('   ❌ Não existe');
  }

  // 2. Verificar subcoleção perfil/dados
  const docDados = await db.collection('lojas').doc(lojistaId).collection('perfil').doc('dados').get();
  console.log('\n📁 Subcoleção Dados (lojas/{id}/perfil/dados):');
  if (docDados.exists) {
    console.log('   ✅ Existe');
    console.log('   🔑 appModel:', docDados.data().appModel);
    console.log('   🔑 modeloApp:', docDados.data().modeloApp);
    console.log('   📄 Dados completos:', JSON.stringify(docDados.data(), null, 2));
  } else {
    console.log('   ❌ Não existe');
  }

  // 3. Verificar subcoleção perfil/publico
  const docPublico = await db.collection('lojas').doc(lojistaId).collection('perfil').doc('publico').get();
  console.log('\n📁 Subcoleção Público (lojas/{id}/perfil/publico):');
  if (docPublico.exists) {
    console.log('   ✅ Existe');
    console.log('   🔑 appModel:', docPublico.data().appModel);
  } else {
    console.log('   ❌ Não existe');
  }
}

checkPerfil().catch(console.error);
