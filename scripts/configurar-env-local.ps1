# Script para configurar variáveis de ambiente localmente
# Execute: .\scripts\configurar-env-local.ps1

Write-Host "🔧 Configuração de Variáveis de Ambiente Local" -ForegroundColor Cyan
Write-Host ""

# Verificar se já existe .env.local
if (Test-Path ".env.local") {
    Write-Host "⚠️  Arquivo .env.local já existe!" -ForegroundColor Yellow
    $sobrescrever = Read-Host "Deseja sobrescrever? (s/N)"
    if ($sobrescrever -ne "s" -and $sobrescrever -ne "S") {
        Write-Host "❌ Operação cancelada." -ForegroundColor Red
        exit
    }
}

Write-Host "📝 Por favor, forneça as seguintes informações:" -ForegroundColor Yellow
Write-Host "   (Você pode encontrar essas informações no Vercel ou Firebase Console)" -ForegroundColor Gray
Write-Host ""

# Solicitar variáveis
$projectId = Read-Host "FIREBASE_PROJECT_ID (ou NEXT_PUBLIC_FIREBASE_PROJECT_ID)"
$clientEmail = Read-Host "FIREBASE_CLIENT_EMAIL"
Write-Host ""
Write-Host "⚠️  Para FIREBASE_PRIVATE_KEY, você precisa colar a chave completa." -ForegroundColor Yellow
Write-Host "   Ela deve começar com '-----BEGIN PRIVATE KEY-----'" -ForegroundColor Gray
Write-Host ""
$privateKey = Read-Host "FIREBASE_PRIVATE_KEY (cole a chave completa)"
$storageBucket = Read-Host "FIREBASE_STORAGE_BUCKET (ou NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)"

# Validar
if ([string]::IsNullOrWhiteSpace($projectId)) {
    Write-Host "❌ FIREBASE_PROJECT_ID é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($clientEmail)) {
    Write-Host "❌ FIREBASE_CLIENT_EMAIL é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($privateKey)) {
    Write-Host "❌ FIREBASE_PRIVATE_KEY é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($storageBucket)) {
    Write-Host "❌ FIREBASE_STORAGE_BUCKET é obrigatório!" -ForegroundColor Red
    exit 1
}

# Criar conteúdo do arquivo
$envContent = @"
# Firebase Admin SDK (obrigatório para scripts)
FIREBASE_PROJECT_ID=$projectId
FIREBASE_CLIENT_EMAIL=$clientEmail
FIREBASE_PRIVATE_KEY="$privateKey"
FIREBASE_STORAGE_BUCKET=$storageBucket
"@

# Salvar arquivo
try {
    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8 -NoNewline
    Write-Host ""
    Write-Host "✅ Arquivo .env.local criado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Execute: npm run convert-images" -ForegroundColor White
    Write-Host "   2. O script converterá todas as imagens de link externo para PNG" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ Erro ao criar arquivo: $_" -ForegroundColor Red
    exit 1
}


# Execute: .\scripts\configurar-env-local.ps1

Write-Host "🔧 Configuração de Variáveis de Ambiente Local" -ForegroundColor Cyan
Write-Host ""

# Verificar se já existe .env.local
if (Test-Path ".env.local") {
    Write-Host "⚠️  Arquivo .env.local já existe!" -ForegroundColor Yellow
    $sobrescrever = Read-Host "Deseja sobrescrever? (s/N)"
    if ($sobrescrever -ne "s" -and $sobrescrever -ne "S") {
        Write-Host "❌ Operação cancelada." -ForegroundColor Red
        exit
    }
}

Write-Host "📝 Por favor, forneça as seguintes informações:" -ForegroundColor Yellow
Write-Host "   (Você pode encontrar essas informações no Vercel ou Firebase Console)" -ForegroundColor Gray
Write-Host ""

# Solicitar variáveis
$projectId = Read-Host "FIREBASE_PROJECT_ID (ou NEXT_PUBLIC_FIREBASE_PROJECT_ID)"
$clientEmail = Read-Host "FIREBASE_CLIENT_EMAIL"
Write-Host ""
Write-Host "⚠️  Para FIREBASE_PRIVATE_KEY, você precisa colar a chave completa." -ForegroundColor Yellow
Write-Host "   Ela deve começar com '-----BEGIN PRIVATE KEY-----'" -ForegroundColor Gray
Write-Host ""
$privateKey = Read-Host "FIREBASE_PRIVATE_KEY (cole a chave completa)"
$storageBucket = Read-Host "FIREBASE_STORAGE_BUCKET (ou NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)"

# Validar
if ([string]::IsNullOrWhiteSpace($projectId)) {
    Write-Host "❌ FIREBASE_PROJECT_ID é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($clientEmail)) {
    Write-Host "❌ FIREBASE_CLIENT_EMAIL é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($privateKey)) {
    Write-Host "❌ FIREBASE_PRIVATE_KEY é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($storageBucket)) {
    Write-Host "❌ FIREBASE_STORAGE_BUCKET é obrigatório!" -ForegroundColor Red
    exit 1
}

# Criar conteúdo do arquivo
$envContent = @"
# Firebase Admin SDK (obrigatório para scripts)
FIREBASE_PROJECT_ID=$projectId
FIREBASE_CLIENT_EMAIL=$clientEmail
FIREBASE_PRIVATE_KEY="$privateKey"
FIREBASE_STORAGE_BUCKET=$storageBucket
"@

# Salvar arquivo
try {
    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8 -NoNewline
    Write-Host ""
    Write-Host "✅ Arquivo .env.local criado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Execute: npm run convert-images" -ForegroundColor White
    Write-Host "   2. O script converterá todas as imagens de link externo para PNG" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ Erro ao criar arquivo: $_" -ForegroundColor Red
    exit 1
}



# Execute: .\scripts\configurar-env-local.ps1

Write-Host "🔧 Configuração de Variáveis de Ambiente Local" -ForegroundColor Cyan
Write-Host ""

# Verificar se já existe .env.local
if (Test-Path ".env.local") {
    Write-Host "⚠️  Arquivo .env.local já existe!" -ForegroundColor Yellow
    $sobrescrever = Read-Host "Deseja sobrescrever? (s/N)"
    if ($sobrescrever -ne "s" -and $sobrescrever -ne "S") {
        Write-Host "❌ Operação cancelada." -ForegroundColor Red
        exit
    }
}

Write-Host "📝 Por favor, forneça as seguintes informações:" -ForegroundColor Yellow
Write-Host "   (Você pode encontrar essas informações no Vercel ou Firebase Console)" -ForegroundColor Gray
Write-Host ""

# Solicitar variáveis
$projectId = Read-Host "FIREBASE_PROJECT_ID (ou NEXT_PUBLIC_FIREBASE_PROJECT_ID)"
$clientEmail = Read-Host "FIREBASE_CLIENT_EMAIL"
Write-Host ""
Write-Host "⚠️  Para FIREBASE_PRIVATE_KEY, você precisa colar a chave completa." -ForegroundColor Yellow
Write-Host "   Ela deve começar com '-----BEGIN PRIVATE KEY-----'" -ForegroundColor Gray
Write-Host ""
$privateKey = Read-Host "FIREBASE_PRIVATE_KEY (cole a chave completa)"
$storageBucket = Read-Host "FIREBASE_STORAGE_BUCKET (ou NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)"

# Validar
if ([string]::IsNullOrWhiteSpace($projectId)) {
    Write-Host "❌ FIREBASE_PROJECT_ID é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($clientEmail)) {
    Write-Host "❌ FIREBASE_CLIENT_EMAIL é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($privateKey)) {
    Write-Host "❌ FIREBASE_PRIVATE_KEY é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($storageBucket)) {
    Write-Host "❌ FIREBASE_STORAGE_BUCKET é obrigatório!" -ForegroundColor Red
    exit 1
}

# Criar conteúdo do arquivo
$envContent = @"
# Firebase Admin SDK (obrigatório para scripts)
FIREBASE_PROJECT_ID=$projectId
FIREBASE_CLIENT_EMAIL=$clientEmail
FIREBASE_PRIVATE_KEY="$privateKey"
FIREBASE_STORAGE_BUCKET=$storageBucket
"@

# Salvar arquivo
try {
    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8 -NoNewline
    Write-Host ""
    Write-Host "✅ Arquivo .env.local criado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Execute: npm run convert-images" -ForegroundColor White
    Write-Host "   2. O script converterá todas as imagens de link externo para PNG" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ Erro ao criar arquivo: $_" -ForegroundColor Red
    exit 1
}


# Execute: .\scripts\configurar-env-local.ps1

Write-Host "🔧 Configuração de Variáveis de Ambiente Local" -ForegroundColor Cyan
Write-Host ""

# Verificar se já existe .env.local
if (Test-Path ".env.local") {
    Write-Host "⚠️  Arquivo .env.local já existe!" -ForegroundColor Yellow
    $sobrescrever = Read-Host "Deseja sobrescrever? (s/N)"
    if ($sobrescrever -ne "s" -and $sobrescrever -ne "S") {
        Write-Host "❌ Operação cancelada." -ForegroundColor Red
        exit
    }
}

Write-Host "📝 Por favor, forneça as seguintes informações:" -ForegroundColor Yellow
Write-Host "   (Você pode encontrar essas informações no Vercel ou Firebase Console)" -ForegroundColor Gray
Write-Host ""

# Solicitar variáveis
$projectId = Read-Host "FIREBASE_PROJECT_ID (ou NEXT_PUBLIC_FIREBASE_PROJECT_ID)"
$clientEmail = Read-Host "FIREBASE_CLIENT_EMAIL"
Write-Host ""
Write-Host "⚠️  Para FIREBASE_PRIVATE_KEY, você precisa colar a chave completa." -ForegroundColor Yellow
Write-Host "   Ela deve começar com '-----BEGIN PRIVATE KEY-----'" -ForegroundColor Gray
Write-Host ""
$privateKey = Read-Host "FIREBASE_PRIVATE_KEY (cole a chave completa)"
$storageBucket = Read-Host "FIREBASE_STORAGE_BUCKET (ou NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)"

# Validar
if ([string]::IsNullOrWhiteSpace($projectId)) {
    Write-Host "❌ FIREBASE_PROJECT_ID é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($clientEmail)) {
    Write-Host "❌ FIREBASE_CLIENT_EMAIL é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($privateKey)) {
    Write-Host "❌ FIREBASE_PRIVATE_KEY é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($storageBucket)) {
    Write-Host "❌ FIREBASE_STORAGE_BUCKET é obrigatório!" -ForegroundColor Red
    exit 1
}

# Criar conteúdo do arquivo
$envContent = @"
# Firebase Admin SDK (obrigatório para scripts)
FIREBASE_PROJECT_ID=$projectId
FIREBASE_CLIENT_EMAIL=$clientEmail
FIREBASE_PRIVATE_KEY="$privateKey"
FIREBASE_STORAGE_BUCKET=$storageBucket
"@

# Salvar arquivo
try {
    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8 -NoNewline
    Write-Host ""
    Write-Host "✅ Arquivo .env.local criado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Execute: npm run convert-images" -ForegroundColor White
    Write-Host "   2. O script converterá todas as imagens de link externo para PNG" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ Erro ao criar arquivo: $_" -ForegroundColor Red
    exit 1
}



# Execute: .\scripts\configurar-env-local.ps1

Write-Host "🔧 Configuração de Variáveis de Ambiente Local" -ForegroundColor Cyan
Write-Host ""

# Verificar se já existe .env.local
if (Test-Path ".env.local") {
    Write-Host "⚠️  Arquivo .env.local já existe!" -ForegroundColor Yellow
    $sobrescrever = Read-Host "Deseja sobrescrever? (s/N)"
    if ($sobrescrever -ne "s" -and $sobrescrever -ne "S") {
        Write-Host "❌ Operação cancelada." -ForegroundColor Red
        exit
    }
}

Write-Host "📝 Por favor, forneça as seguintes informações:" -ForegroundColor Yellow
Write-Host "   (Você pode encontrar essas informações no Vercel ou Firebase Console)" -ForegroundColor Gray
Write-Host ""

# Solicitar variáveis
$projectId = Read-Host "FIREBASE_PROJECT_ID (ou NEXT_PUBLIC_FIREBASE_PROJECT_ID)"
$clientEmail = Read-Host "FIREBASE_CLIENT_EMAIL"
Write-Host ""
Write-Host "⚠️  Para FIREBASE_PRIVATE_KEY, você precisa colar a chave completa." -ForegroundColor Yellow
Write-Host "   Ela deve começar com '-----BEGIN PRIVATE KEY-----'" -ForegroundColor Gray
Write-Host ""
$privateKey = Read-Host "FIREBASE_PRIVATE_KEY (cole a chave completa)"
$storageBucket = Read-Host "FIREBASE_STORAGE_BUCKET (ou NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)"

# Validar
if ([string]::IsNullOrWhiteSpace($projectId)) {
    Write-Host "❌ FIREBASE_PROJECT_ID é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($clientEmail)) {
    Write-Host "❌ FIREBASE_CLIENT_EMAIL é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($privateKey)) {
    Write-Host "❌ FIREBASE_PRIVATE_KEY é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($storageBucket)) {
    Write-Host "❌ FIREBASE_STORAGE_BUCKET é obrigatório!" -ForegroundColor Red
    exit 1
}

# Criar conteúdo do arquivo
$envContent = @"
# Firebase Admin SDK (obrigatório para scripts)
FIREBASE_PROJECT_ID=$projectId
FIREBASE_CLIENT_EMAIL=$clientEmail
FIREBASE_PRIVATE_KEY="$privateKey"
FIREBASE_STORAGE_BUCKET=$storageBucket
"@

# Salvar arquivo
try {
    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8 -NoNewline
    Write-Host ""
    Write-Host "✅ Arquivo .env.local criado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Execute: npm run convert-images" -ForegroundColor White
    Write-Host "   2. O script converterá todas as imagens de link externo para PNG" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ Erro ao criar arquivo: $_" -ForegroundColor Red
    exit 1
}


# Execute: .\scripts\configurar-env-local.ps1

Write-Host "🔧 Configuração de Variáveis de Ambiente Local" -ForegroundColor Cyan
Write-Host ""

# Verificar se já existe .env.local
if (Test-Path ".env.local") {
    Write-Host "⚠️  Arquivo .env.local já existe!" -ForegroundColor Yellow
    $sobrescrever = Read-Host "Deseja sobrescrever? (s/N)"
    if ($sobrescrever -ne "s" -and $sobrescrever -ne "S") {
        Write-Host "❌ Operação cancelada." -ForegroundColor Red
        exit
    }
}

Write-Host "📝 Por favor, forneça as seguintes informações:" -ForegroundColor Yellow
Write-Host "   (Você pode encontrar essas informações no Vercel ou Firebase Console)" -ForegroundColor Gray
Write-Host ""

# Solicitar variáveis
$projectId = Read-Host "FIREBASE_PROJECT_ID (ou NEXT_PUBLIC_FIREBASE_PROJECT_ID)"
$clientEmail = Read-Host "FIREBASE_CLIENT_EMAIL"
Write-Host ""
Write-Host "⚠️  Para FIREBASE_PRIVATE_KEY, você precisa colar a chave completa." -ForegroundColor Yellow
Write-Host "   Ela deve começar com '-----BEGIN PRIVATE KEY-----'" -ForegroundColor Gray
Write-Host ""
$privateKey = Read-Host "FIREBASE_PRIVATE_KEY (cole a chave completa)"
$storageBucket = Read-Host "FIREBASE_STORAGE_BUCKET (ou NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)"

# Validar
if ([string]::IsNullOrWhiteSpace($projectId)) {
    Write-Host "❌ FIREBASE_PROJECT_ID é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($clientEmail)) {
    Write-Host "❌ FIREBASE_CLIENT_EMAIL é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($privateKey)) {
    Write-Host "❌ FIREBASE_PRIVATE_KEY é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($storageBucket)) {
    Write-Host "❌ FIREBASE_STORAGE_BUCKET é obrigatório!" -ForegroundColor Red
    exit 1
}

# Criar conteúdo do arquivo
$envContent = @"
# Firebase Admin SDK (obrigatório para scripts)
FIREBASE_PROJECT_ID=$projectId
FIREBASE_CLIENT_EMAIL=$clientEmail
FIREBASE_PRIVATE_KEY="$privateKey"
FIREBASE_STORAGE_BUCKET=$storageBucket
"@

# Salvar arquivo
try {
    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8 -NoNewline
    Write-Host ""
    Write-Host "✅ Arquivo .env.local criado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Execute: npm run convert-images" -ForegroundColor White
    Write-Host "   2. O script converterá todas as imagens de link externo para PNG" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ Erro ao criar arquivo: $_" -ForegroundColor Red
    exit 1
}



# Execute: .\scripts\configurar-env-local.ps1

Write-Host "🔧 Configuração de Variáveis de Ambiente Local" -ForegroundColor Cyan
Write-Host ""

# Verificar se já existe .env.local
if (Test-Path ".env.local") {
    Write-Host "⚠️  Arquivo .env.local já existe!" -ForegroundColor Yellow
    $sobrescrever = Read-Host "Deseja sobrescrever? (s/N)"
    if ($sobrescrever -ne "s" -and $sobrescrever -ne "S") {
        Write-Host "❌ Operação cancelada." -ForegroundColor Red
        exit
    }
}

Write-Host "📝 Por favor, forneça as seguintes informações:" -ForegroundColor Yellow
Write-Host "   (Você pode encontrar essas informações no Vercel ou Firebase Console)" -ForegroundColor Gray
Write-Host ""

# Solicitar variáveis
$projectId = Read-Host "FIREBASE_PROJECT_ID (ou NEXT_PUBLIC_FIREBASE_PROJECT_ID)"
$clientEmail = Read-Host "FIREBASE_CLIENT_EMAIL"
Write-Host ""
Write-Host "⚠️  Para FIREBASE_PRIVATE_KEY, você precisa colar a chave completa." -ForegroundColor Yellow
Write-Host "   Ela deve começar com '-----BEGIN PRIVATE KEY-----'" -ForegroundColor Gray
Write-Host ""
$privateKey = Read-Host "FIREBASE_PRIVATE_KEY (cole a chave completa)"
$storageBucket = Read-Host "FIREBASE_STORAGE_BUCKET (ou NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)"

# Validar
if ([string]::IsNullOrWhiteSpace($projectId)) {
    Write-Host "❌ FIREBASE_PROJECT_ID é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($clientEmail)) {
    Write-Host "❌ FIREBASE_CLIENT_EMAIL é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($privateKey)) {
    Write-Host "❌ FIREBASE_PRIVATE_KEY é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($storageBucket)) {
    Write-Host "❌ FIREBASE_STORAGE_BUCKET é obrigatório!" -ForegroundColor Red
    exit 1
}

# Criar conteúdo do arquivo
$envContent = @"
# Firebase Admin SDK (obrigatório para scripts)
FIREBASE_PROJECT_ID=$projectId
FIREBASE_CLIENT_EMAIL=$clientEmail
FIREBASE_PRIVATE_KEY="$privateKey"
FIREBASE_STORAGE_BUCKET=$storageBucket
"@

# Salvar arquivo
try {
    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8 -NoNewline
    Write-Host ""
    Write-Host "✅ Arquivo .env.local criado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Execute: npm run convert-images" -ForegroundColor White
    Write-Host "   2. O script converterá todas as imagens de link externo para PNG" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ Erro ao criar arquivo: $_" -ForegroundColor Red
    exit 1
}


# Execute: .\scripts\configurar-env-local.ps1

Write-Host "🔧 Configuração de Variáveis de Ambiente Local" -ForegroundColor Cyan
Write-Host ""

# Verificar se já existe .env.local
if (Test-Path ".env.local") {
    Write-Host "⚠️  Arquivo .env.local já existe!" -ForegroundColor Yellow
    $sobrescrever = Read-Host "Deseja sobrescrever? (s/N)"
    if ($sobrescrever -ne "s" -and $sobrescrever -ne "S") {
        Write-Host "❌ Operação cancelada." -ForegroundColor Red
        exit
    }
}

Write-Host "📝 Por favor, forneça as seguintes informações:" -ForegroundColor Yellow
Write-Host "   (Você pode encontrar essas informações no Vercel ou Firebase Console)" -ForegroundColor Gray
Write-Host ""

# Solicitar variáveis
$projectId = Read-Host "FIREBASE_PROJECT_ID (ou NEXT_PUBLIC_FIREBASE_PROJECT_ID)"
$clientEmail = Read-Host "FIREBASE_CLIENT_EMAIL"
Write-Host ""
Write-Host "⚠️  Para FIREBASE_PRIVATE_KEY, você precisa colar a chave completa." -ForegroundColor Yellow
Write-Host "   Ela deve começar com '-----BEGIN PRIVATE KEY-----'" -ForegroundColor Gray
Write-Host ""
$privateKey = Read-Host "FIREBASE_PRIVATE_KEY (cole a chave completa)"
$storageBucket = Read-Host "FIREBASE_STORAGE_BUCKET (ou NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)"

# Validar
if ([string]::IsNullOrWhiteSpace($projectId)) {
    Write-Host "❌ FIREBASE_PROJECT_ID é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($clientEmail)) {
    Write-Host "❌ FIREBASE_CLIENT_EMAIL é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($privateKey)) {
    Write-Host "❌ FIREBASE_PRIVATE_KEY é obrigatório!" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($storageBucket)) {
    Write-Host "❌ FIREBASE_STORAGE_BUCKET é obrigatório!" -ForegroundColor Red
    exit 1
}

# Criar conteúdo do arquivo
$envContent = @"
# Firebase Admin SDK (obrigatório para scripts)
FIREBASE_PROJECT_ID=$projectId
FIREBASE_CLIENT_EMAIL=$clientEmail
FIREBASE_PRIVATE_KEY="$privateKey"
FIREBASE_STORAGE_BUCKET=$storageBucket
"@

# Salvar arquivo
try {
    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8 -NoNewline
    Write-Host ""
    Write-Host "✅ Arquivo .env.local criado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Execute: npm run convert-images" -ForegroundColor White
    Write-Host "   2. O script converterá todas as imagens de link externo para PNG" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "❌ Erro ao criar arquivo: $_" -ForegroundColor Red
    exit 1
}















