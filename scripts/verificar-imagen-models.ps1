# Script PowerShell para verificar modelos Imagen disponíveis no Vertex AI
# Execute: .\scripts\verificar-imagen-models.ps1

$PROJECT_ID = $env:GOOGLE_CLOUD_PROJECT_ID
if (-not $PROJECT_ID) {
    $PROJECT_ID = "paineladmexperimenteai"
}

$LOCATION = $env:GOOGLE_CLOUD_LOCATION
if (-not $LOCATION) {
    $LOCATION = "us-central1"
}

Write-Host "🔍 Verificando modelos Imagen disponíveis no Vertex AI..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Projeto: $PROJECT_ID"
Write-Host "Região: $LOCATION"
Write-Host ""

try {
    # Obter token de acesso
    Write-Host "📝 Obtendo token de acesso..." -ForegroundColor Yellow
    $accessToken = (gcloud auth print-access-token 2>&1)
    
    if ($LASTEXITCODE -ne 0) {
        throw "Erro ao obter token. Execute: gcloud auth login"
    }
    
    $accessToken = $accessToken.Trim()
    
    # Endpoint para listar modelos
    $endpoint = "https://$LOCATION-aiplatform.googleapis.com/v1/projects/$PROJECT_ID/locations/$LOCATION/publishers/google/models"
    
    Write-Host "🌐 Consultando: $endpoint" -ForegroundColor Yellow
    Write-Host ""
    
    # Fazer requisição
    $headers = @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri $endpoint -Method Get -Headers $headers
    
    if (-not $response.models -or $response.models.Count -eq 0) {
        Write-Host "❌ Nenhum modelo encontrado." -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Tente verificar manualmente no Console:" -ForegroundColor Yellow
        Write-Host "   https://console.cloud.google.com/vertex-ai/model-garden" -ForegroundColor Blue
        return
    }
    
    # Filtrar modelos Imagen
    $imagenModels = $response.models | Where-Object {
        $_.name -match "imagen" -or $_.displayName -match "imagen"
    }
    
    Write-Host "✅ Encontrados $($imagenModels.Count) modelo(s) Imagen:" -ForegroundColor Green
    Write-Host ""
    
    $index = 1
    foreach ($model in $imagenModels) {
        Write-Host "$index. $($model.displayName)" -ForegroundColor Cyan
        Write-Host "   Nome: $($model.name)"
        if ($model.description) {
            $desc = $model.description.Substring(0, [Math]::Min(100, $model.description.Length))
            Write-Host "   Descrição: $desc..."
        }
        Write-Host ""
        $index++
    }
    
    # Verificar especificamente por Imagen 4.0
    $imagen4 = $imagenModels | Where-Object {
        $_.name -match "4" -or $_.displayName -match "4"
    } | Select-Object -First 1
    
    if ($imagen4) {
        Write-Host "🎉 Imagen 4.0 encontrado!" -ForegroundColor Green
        Write-Host "   Nome: $($imagen4.name)"
        Write-Host "   Display: $($imagen4.displayName)"
        Write-Host ""
        Write-Host "📖 Próximos passos:" -ForegroundColor Yellow
        Write-Host "   1. Acesse o Model Garden no Console"
        Write-Host "   2. Clique no modelo para ver detalhes"
        Write-Host "   3. Verifique se suporta múltiplas imagens"
    } else {
        Write-Host "⚠️  Imagen 4.0 não encontrado na lista." -ForegroundColor Yellow
        Write-Host "   Apenas Imagen 3.0 está disponível."
    }
    
    Write-Host ""
    Write-Host "📚 Para mais detalhes, acesse:" -ForegroundColor Yellow
    Write-Host "   https://console.cloud.google.com/vertex-ai/model-garden" -ForegroundColor Blue
    
} catch {
    Write-Host "❌ Erro ao verificar modelos: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Alternativas:" -ForegroundColor Yellow
    Write-Host "   1. Verifique manualmente no Console"
    Write-Host "   2. Certifique-se de que o gcloud CLI está instalado"
    Write-Host "   3. Execute: gcloud auth login"
}


# Execute: .\scripts\verificar-imagen-models.ps1

$PROJECT_ID = $env:GOOGLE_CLOUD_PROJECT_ID
if (-not $PROJECT_ID) {
    $PROJECT_ID = "paineladmexperimenteai"
}

$LOCATION = $env:GOOGLE_CLOUD_LOCATION
if (-not $LOCATION) {
    $LOCATION = "us-central1"
}

Write-Host "🔍 Verificando modelos Imagen disponíveis no Vertex AI..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Projeto: $PROJECT_ID"
Write-Host "Região: $LOCATION"
Write-Host ""

try {
    # Obter token de acesso
    Write-Host "📝 Obtendo token de acesso..." -ForegroundColor Yellow
    $accessToken = (gcloud auth print-access-token 2>&1)
    
    if ($LASTEXITCODE -ne 0) {
        throw "Erro ao obter token. Execute: gcloud auth login"
    }
    
    $accessToken = $accessToken.Trim()
    
    # Endpoint para listar modelos
    $endpoint = "https://$LOCATION-aiplatform.googleapis.com/v1/projects/$PROJECT_ID/locations/$LOCATION/publishers/google/models"
    
    Write-Host "🌐 Consultando: $endpoint" -ForegroundColor Yellow
    Write-Host ""
    
    # Fazer requisição
    $headers = @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri $endpoint -Method Get -Headers $headers
    
    if (-not $response.models -or $response.models.Count -eq 0) {
        Write-Host "❌ Nenhum modelo encontrado." -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Tente verificar manualmente no Console:" -ForegroundColor Yellow
        Write-Host "   https://console.cloud.google.com/vertex-ai/model-garden" -ForegroundColor Blue
        return
    }
    
    # Filtrar modelos Imagen
    $imagenModels = $response.models | Where-Object {
        $_.name -match "imagen" -or $_.displayName -match "imagen"
    }
    
    Write-Host "✅ Encontrados $($imagenModels.Count) modelo(s) Imagen:" -ForegroundColor Green
    Write-Host ""
    
    $index = 1
    foreach ($model in $imagenModels) {
        Write-Host "$index. $($model.displayName)" -ForegroundColor Cyan
        Write-Host "   Nome: $($model.name)"
        if ($model.description) {
            $desc = $model.description.Substring(0, [Math]::Min(100, $model.description.Length))
            Write-Host "   Descrição: $desc..."
        }
        Write-Host ""
        $index++
    }
    
    # Verificar especificamente por Imagen 4.0
    $imagen4 = $imagenModels | Where-Object {
        $_.name -match "4" -or $_.displayName -match "4"
    } | Select-Object -First 1
    
    if ($imagen4) {
        Write-Host "🎉 Imagen 4.0 encontrado!" -ForegroundColor Green
        Write-Host "   Nome: $($imagen4.name)"
        Write-Host "   Display: $($imagen4.displayName)"
        Write-Host ""
        Write-Host "📖 Próximos passos:" -ForegroundColor Yellow
        Write-Host "   1. Acesse o Model Garden no Console"
        Write-Host "   2. Clique no modelo para ver detalhes"
        Write-Host "   3. Verifique se suporta múltiplas imagens"
    } else {
        Write-Host "⚠️  Imagen 4.0 não encontrado na lista." -ForegroundColor Yellow
        Write-Host "   Apenas Imagen 3.0 está disponível."
    }
    
    Write-Host ""
    Write-Host "📚 Para mais detalhes, acesse:" -ForegroundColor Yellow
    Write-Host "   https://console.cloud.google.com/vertex-ai/model-garden" -ForegroundColor Blue
    
} catch {
    Write-Host "❌ Erro ao verificar modelos: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Alternativas:" -ForegroundColor Yellow
    Write-Host "   1. Verifique manualmente no Console"
    Write-Host "   2. Certifique-se de que o gcloud CLI está instalado"
    Write-Host "   3. Execute: gcloud auth login"
}

