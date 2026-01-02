# Script para limpar cache e reiniciar o servidor Next.js

Write-Host "🔧 Limpando cache do Next.js..." -ForegroundColor Yellow

# Remove a pasta .next (cache do Next.js)
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "✅ Cache .next removido" -ForegroundColor Green
} else {
    Write-Host "ℹ️ Pasta .next não existe" -ForegroundColor Cyan
}

# Remove node_modules/.cache se existir
if (Test-Path "node_modules/.cache") {
    Remove-Item -Recurse -Force "node_modules/.cache"
    Write-Host "✅ Cache do node_modules removido" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Iniciando servidor de desenvolvimento..." -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️ IMPORTANTE: Após o servidor iniciar, pressione Ctrl+F5 no navegador para fazer hard refresh!" -ForegroundColor Red
Write-Host ""

# Inicia o servidor
npm run dev

