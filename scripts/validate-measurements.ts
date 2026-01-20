/**
 * Script de Validação de Imagens de Medidas
 * Verifica se todas as 100 imagens estão presentes na pasta
 */

import { MEASUREMENTS_MANIFEST } from '../src/data/measurementsManifest';
import * as fs from 'fs';
import * as path from 'path';

const measurementsPath = path.join(process.cwd(), 'public', 'assets', 'measurements');

console.log('🔍 Validando imagens de medidas...\n');

// Obter lista de arquivos existentes
const existingFiles = fs.readdirSync(measurementsPath)
  .filter(file => file.endsWith('.png'))
  .map(file => file.toLowerCase());

// Verificar cada item do manifest
const missing: string[] = [];
const found: string[] = [];
const extra: string[] = [...existingFiles];

MEASUREMENTS_MANIFEST.forEach(item => {
  const filename = item.filename.toLowerCase();
  if (existingFiles.includes(filename)) {
    found.push(item.filename);
    const index = extra.indexOf(filename);
    if (index > -1) {
      extra.splice(index, 1);
    }
  } else {
    missing.push(item.filename);
  }
});

// Resultados
console.log(`✅ Imagens encontradas: ${found.length}/100`);
console.log(`❌ Imagens faltando: ${missing.length}`);
if (extra.length > 0) {
  console.log(`⚠️  Imagens extras (não no manifest): ${extra.length}`);
}

// Detalhar imagens faltando
if (missing.length > 0) {
  console.log('\n📋 Imagens faltando:');
  missing.forEach(filename => {
    const item = MEASUREMENTS_MANIFEST.find(m => m.filename === filename);
    console.log(`  - ${filename} (${item?.id || 'N/A'})`);
  });
}

// Detalhar imagens extras
if (extra.length > 0) {
  console.log('\n⚠️  Imagens extras (não mapeadas no manifest):');
  extra.forEach(filename => {
    console.log(`  - ${filename}`);
  });
}

// Resumo
console.log('\n📊 Resumo:');
console.log(`Total esperado: 100`);
console.log(`Total encontrado: ${found.length}`);
console.log(`Status: ${found.length === 100 ? '✅ COMPLETO' : '⚠️  INCOMPLETO'}`);

if (found.length === 100 && extra.length === 0) {
  console.log('\n🎉 Todas as imagens estão presentes e corretas!');
  process.exit(0);
} else {
  console.log('\n⚠️  Ação necessária: Verifique as imagens faltando ou extras.');
  process.exit(1);
}
