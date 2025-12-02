# PHASE 27: Script de Teste para Vercel Cron Trigger (PowerShell)
# 
# Este script testa o endpoint de processamento de Jobs pendentes
# e verifica se está funcionando corretamente.

param(
    [string]$BackendUrl = "http://localhost:3000"
)

Write-Host "🧪 Testando Vercel Cron Trigger...`n" -ForegroundColor Yellow

if ($BackendUrl -eq "http://localhost:3000") {
    Write-Host "⚠️  Usando URL local. Para testar em produção, passe a URL como argumento:" -ForegroundColor Yellow
    Write-Host "   .\test-cron-trigger.ps1 -BackendUrl https://your-project.vercel.app`n" -ForegroundColor Green
}

Write-Host "📍 Backend URL: $BackendUrl`n" -ForegroundColor Yellow

# Teste 1: Verificar status do endpoint (GET)
Write-Host "1️⃣  Testando GET /api/triggers/process-pending-jobs (Status)" -ForegroundColor Yellow
try {
    $statusResponse = Invoke-RestMethod -Uri "$BackendUrl/api/triggers/process-pending-jobs" -Method Get -ErrorAction Stop
    Write-Host "✅ Status OK (200)" -ForegroundColor Green
    $statusResponse | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Erro ao buscar status: $_" -ForegroundColor Red
}

Write-Host ""

# Teste 2: Processar Jobs pendentes (POST)
Write-Host "2️⃣  Testando POST /api/triggers/process-pending-jobs (Processar Jobs)" -ForegroundColor Yellow
try {
    $headers = @{
        "Content-Type" = "application/json"
        "X-Internal-Request" = "true"
    }
    $body = @{
        limit = 5
    } | ConvertTo-Json
    
    $processResponse = Invoke-RestMethod -Uri "$BackendUrl/api/triggers/process-pending-jobs" -Method Post -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "✅ Processamento OK (200)" -ForegroundColor Green
    $processResponse | ConvertTo-Json -Depth 10
    
    if ($processResponse.processed -gt 0) {
        Write-Host "✅ $($processResponse.processed) Job(s) processado(s) com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  Nenhum Job pendente encontrado (isso é normal se não houver Jobs)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erro ao processar Jobs: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Resposta: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""

# Teste 3: Verificar se o endpoint aceita requisições do Vercel Cron
Write-Host "3️⃣  Testando autenticação do Vercel Cron (simulando header x-vercel-cron)" -ForegroundColor Yellow
try {
    $headers = @{
        "Content-Type" = "application/json"
        "x-vercel-cron" = "1"
    }
    $body = @{
        limit = 1
    } | ConvertTo-Json
    
    $vercelResponse = Invoke-RestMethod -Uri "$BackendUrl/api/triggers/process-pending-jobs" -Method Post -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "✅ Autenticação do Vercel Cron OK (200)" -ForegroundColor Green
    $vercelResponse | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Erro na autenticação do Vercel Cron: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Resposta: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📊 Resumo dos Testes:" -ForegroundColor Yellow
Write-Host "   ✅ Todos os testes executados. Verifique os resultados acima." -ForegroundColor Green
Write-Host ""
Write-Host "💡 Dica: Para ver os logs em tempo real no Vercel:" -ForegroundColor Yellow
Write-Host "   1. Acesse o painel da Vercel"
Write-Host "   2. Vá em Deployments → Seu deployment → Functions"
Write-Host "   3. Procure por '/api/triggers/process-pending-jobs'"
Write-Host ""

