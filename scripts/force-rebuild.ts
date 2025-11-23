/**
 * Script para forçar rebuild adicionando um timestamp
 * Execute: npx tsx scripts/force-rebuild.ts
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";

const BUILD_VERSION_FILE = resolve(process.cwd(), "public", "build-version.json");

// Criar arquivo com timestamp para forçar rebuild
const buildVersion = {
  timestamp: Date.now(),
  date: new Date().toISOString(),
  version: `build-${Date.now()}`,
};

writeFileSync(BUILD_VERSION_FILE, JSON.stringify(buildVersion, null, 2));

console.log("✅ Arquivo build-version.json criado:");
console.log(JSON.stringify(buildVersion, null, 2));
console.log("\n💡 Agora faça commit e push para forçar um novo build no Vercel:");
console.log("   git add .");
console.log("   git commit -m 'chore: force rebuild'");
console.log("   git push");


 * Script para forçar rebuild adicionando um timestamp
 * Execute: npx tsx scripts/force-rebuild.ts
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";

const BUILD_VERSION_FILE = resolve(process.cwd(), "public", "build-version.json");

// Criar arquivo com timestamp para forçar rebuild
const buildVersion = {
  timestamp: Date.now(),
  date: new Date().toISOString(),
  version: `build-${Date.now()}`,
};

writeFileSync(BUILD_VERSION_FILE, JSON.stringify(buildVersion, null, 2));

console.log("✅ Arquivo build-version.json criado:");
console.log(JSON.stringify(buildVersion, null, 2));
console.log("\n💡 Agora faça commit e push para forçar um novo build no Vercel:");
console.log("   git add .");
console.log("   git commit -m 'chore: force rebuild'");
console.log("   git push");

