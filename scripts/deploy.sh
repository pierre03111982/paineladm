#!/bin/bash

# Script de deploy para produção
# Uso: ./scripts/deploy.sh [vercel|cloud-run|aws]

set -e

DEPLOY_TARGET=${1:-vercel}

echo "🚀 Iniciando deploy para: $DEPLOY_TARGET"

# Verificar se as variáveis de ambiente estão configuradas
if [ ! -f .env.production ]; then
    echo "❌ Erro: Arquivo .env.production não encontrado"
    echo "📝 Crie o arquivo .env.production baseado em .env.production.example"
    exit 1
fi

# Limpar cache
echo "🧹 Limpando cache..."
rm -rf .next
rm -rf node_modules/.cache

# Instalar dependências
echo "📦 Instalando dependências..."
npm ci

# Executar lint
echo "🔍 Executando lint..."
npm run lint || echo "⚠️  Lint encontrou problemas, mas continuando..."

# Build de produção
echo "🏗️  Fazendo build de produção..."
npm run build

# Deploy baseado na plataforma
case $DEPLOY_TARGET in
    vercel)
        echo "🌐 Fazendo deploy na Vercel..."
        if command -v vercel &> /dev/null; then
            vercel --prod
        else
            echo "❌ Vercel CLI não encontrado. Instale com: npm i -g vercel"
            exit 1
        fi
        ;;
    cloud-run)
        echo "☁️  Fazendo deploy no Google Cloud Run..."
        if command -v gcloud &> /dev/null; then
            PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID:-paineladmexperimenteai}
            gcloud builds submit --tag gcr.io/$PROJECT_ID/experimente-ai
            gcloud run deploy experimente-ai \
                --image gcr.io/$PROJECT_ID/experimente-ai \
                --platform managed \
                --region us-central1 \
                --allow-unauthenticated
        else
            echo "❌ Google Cloud SDK não encontrado"
            exit 1
        fi
        ;;
    *)
        echo "❌ Plataforma de deploy desconhecida: $DEPLOY_TARGET"
        echo "💡 Use: vercel, cloud-run ou aws"
        exit 1
        ;;
esac

echo "✅ Deploy concluído com sucesso!"






































































