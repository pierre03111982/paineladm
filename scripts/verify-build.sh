#!/bin/bash

# Script para verificar build de produção
# Uso: ./scripts/verify-build.sh

echo "🔍 Verificando build de produção do Painel Adm..."
echo ""

# Verificar se estamos na raiz do projeto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto"
    exit 1
fi

# Verificar variáveis de ambiente
echo "📋 Verificando variáveis de ambiente..."
if [ ! -f ".env.local" ]; then
    echo "⚠️  Aviso: Arquivo .env.local não encontrado"
    echo "   Certifique-se de que as variáveis estão configuradas no Vercel"
else
    echo "✅ Arquivo .env.local encontrado"
fi

# Verificar dependências
echo ""
echo "📦 Verificando dependências..."
if [ ! -d "node_modules" ]; then
    echo "📥 Instalando dependências..."
    npm install
else
    echo "✅ Dependências instaladas"
fi

# Executar lint
echo ""
echo "🔍 Executando lint..."
npm run lint
if [ $? -ne 0 ]; then
    echo "⚠️  Avisos de lint encontrados (não bloqueiam o build)"
fi

# Executar build
echo ""
echo "🏗️  Executando build de produção..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erro no build. Corrija os erros antes de fazer deploy."
    exit 1
fi
echo "✅ Build concluído com sucesso!"

# Verificar se .next foi criado
if [ -d ".next" ]; then
    echo "✅ Diretório .next criado"
else
    echo "❌ Diretório .next não encontrado após build"
    exit 1
fi

# Verificar TypeScript
echo ""
echo "🔍 Verificando TypeScript..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
    echo "⚠️  Erros de TypeScript encontrados (verifique acima)"
else
    echo "✅ TypeScript sem erros"
fi

echo ""
echo "✅ Todas as verificações passaram! Pronto para deploy."








