#!/bin/bash

# Script para verificar se todas as variáveis de ambiente estão configuradas
# Uso: ./scripts/check-env.sh

set -e

echo "🔍 Verificando variáveis de ambiente..."

REQUIRED_VARS=(
    "FIREBASE_PROJECT_ID"
    "FIREBASE_CLIENT_EMAIL"
    "FIREBASE_PRIVATE_KEY"
    "FIREBASE_STORAGE_BUCKET"
    "GOOGLE_CLOUD_PROJECT_ID"
    "STABILITY_API_KEY"
    "NEXT_PUBLIC_APP_URL"
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    echo "✅ Todas as variáveis de ambiente obrigatórias estão configuradas!"
    exit 0
else
    echo "❌ Variáveis de ambiente faltando:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "💡 Configure essas variáveis no arquivo .env.production ou na plataforma de deploy"
    exit 1
fi






































































