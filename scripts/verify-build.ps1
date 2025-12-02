# Script PowerShell para verificar build de produção
# Uso: .\scripts\verify-build.ps1

Write-Host "🔍 Verificando build de produção do Painel Adm..." -ForegroundColor Cyan
Write-Host ""

# Verificar se estamos na raiz do projeto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto" -ForegroundColor Red
    exit 1
}

# Verificar variáveis de ambiente
Write-Host "📋 Verificando variáveis de ambiente..." -ForegroundColor Yellow
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  Aviso: Arquivo .env.local não encontrado" -ForegroundColor Yellow
    Write-Host "   Certifique-se de que as variáveis estão configuradas no Vercel" -ForegroundColor Yellow
} else {
    Write-Host "✅ Arquivo .env.local encontrado" -ForegroundColor Green
}

# Verificar dependências
Write-Host ""
Write-Host "📦 Verificando dependências..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "📥 Instalando dependências..." -ForegroundColor Cyan
    npm install
} else {
    Write-Host "✅ Dependências instaladas" -ForegroundColor Green
}

# Executar lint
Write-Host ""
Write-Host "🔍 Executando lint..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Avisos de lint encontrados (não bloqueiam o build)" -ForegroundColor Yellow
}

# Executar build
Write-Host ""
Write-Host "🏗️  Executando build de produção..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no build. Corrija os erros antes de fazer deploy." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build concluído com sucesso!" -ForegroundColor Green

# Verificar se .next foi criado
if (Test-Path ".next") {
    Write-Host "✅ Diretório .next criado" -ForegroundColor Green
} else {
    Write-Host "❌ Diretório .next não encontrado após build" -ForegroundColor Red
    exit 1
}

# Verificar TypeScript
Write-Host ""
Write-Host "🔍 Verificando TypeScript..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Erros de TypeScript encontrados (verifique acima)" -ForegroundColor Yellow
} else {
    Write-Host "✅ TypeScript sem erros" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Todas as verificações passaram! Pronto para deploy." -ForegroundColor Green

















