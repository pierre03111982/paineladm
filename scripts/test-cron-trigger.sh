#!/bin/bash

# PHASE 27: Script de Teste para Vercel Cron Trigger
# 
# Este script testa o endpoint de processamento de Jobs pendentes
# e verifica se está funcionando corretamente.

set -e

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 Testando Vercel Cron Trigger...${NC}\n"

# Verificar se a URL do backend foi fornecida
BACKEND_URL="${1:-http://localhost:3000}"

if [ "$BACKEND_URL" = "http://localhost:3000" ]; then
  echo -e "${YELLOW}⚠️  Usando URL local. Para testar em produção, passe a URL como argumento:${NC}"
  echo -e "   ${GREEN}./test-cron-trigger.sh https://your-project.vercel.app${NC}\n"
fi

echo -e "${YELLOW}📍 Backend URL: ${BACKEND_URL}${NC}\n"

# Teste 1: Verificar status do endpoint (GET)
echo -e "${YELLOW}1️⃣  Testando GET /api/triggers/process-pending-jobs (Status)${NC}"
STATUS_RESPONSE=$(curl -s -w "\n%{http_code}" "${BACKEND_URL}/api/triggers/process-pending-jobs")
STATUS_CODE=$(echo "$STATUS_RESPONSE" | tail -n1)
STATUS_BODY=$(echo "$STATUS_RESPONSE" | sed '$d')

if [ "$STATUS_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Status OK (200)${NC}"
  echo "$STATUS_BODY" | jq '.' 2>/dev/null || echo "$STATUS_BODY"
else
  echo -e "${RED}❌ Erro ao buscar status (${STATUS_CODE})${NC}"
  echo "$STATUS_BODY"
fi

echo ""

# Teste 2: Processar Jobs pendentes (POST)
echo -e "${YELLOW}2️⃣  Testando POST /api/triggers/process-pending-jobs (Processar Jobs)${NC}"
PROCESS_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/triggers/process-pending-jobs" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Request: true" \
  -d '{"limit": 5}')
PROCESS_CODE=$(echo "$PROCESS_RESPONSE" | tail -n1)
PROCESS_BODY=$(echo "$PROCESS_RESPONSE" | sed '$d')

if [ "$PROCESS_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Processamento OK (200)${NC}"
  echo "$PROCESS_BODY" | jq '.' 2>/dev/null || echo "$PROCESS_BODY"
  
  # Extrair número de Jobs processados
  PROCESSED=$(echo "$PROCESS_BODY" | jq -r '.processed // 0' 2>/dev/null || echo "0")
  if [ "$PROCESSED" -gt 0 ]; then
    echo -e "${GREEN}✅ ${PROCESSED} Job(s) processado(s) com sucesso!${NC}"
  else
    echo -e "${YELLOW}ℹ️  Nenhum Job pendente encontrado (isso é normal se não houver Jobs)${NC}"
  fi
else
  echo -e "${RED}❌ Erro ao processar Jobs (${PROCESS_CODE})${NC}"
  echo "$PROCESS_BODY"
fi

echo ""

# Teste 3: Verificar se o endpoint aceita requisições do Vercel Cron
echo -e "${YELLOW}3️⃣  Testando autenticação do Vercel Cron (simulando header x-vercel-cron)${NC}"
VERCEL_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/triggers/process-pending-jobs" \
  -H "Content-Type: application/json" \
  -H "x-vercel-cron: 1" \
  -d '{"limit": 1}')
VERCEL_CODE=$(echo "$VERCEL_RESPONSE" | tail -n1)
VERCEL_BODY=$(echo "$VERCEL_RESPONSE" | sed '$d')

if [ "$VERCEL_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Autenticação do Vercel Cron OK (200)${NC}"
  echo "$VERCEL_BODY" | jq '.' 2>/dev/null || echo "$VERCEL_BODY"
else
  echo -e "${RED}❌ Erro na autenticação do Vercel Cron (${VERCEL_CODE})${NC}"
  echo "$VERCEL_BODY"
fi

echo ""

# Resumo
echo -e "${YELLOW}📊 Resumo dos Testes:${NC}"
echo -e "   Status Endpoint: $([ "$STATUS_CODE" = "200" ] && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}")"
echo -e "   Process Endpoint: $([ "$PROCESS_CODE" = "200" ] && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}")"
echo -e "   Vercel Cron Auth: $([ "$VERCEL_CODE" = "200" ] && echo -e "${GREEN}✅${NC}" || echo -e "${RED}❌${NC}")"

echo ""
echo -e "${YELLOW}💡 Dica: Para ver os logs em tempo real no Vercel:${NC}"
echo -e "   1. Acesse o painel da Vercel"
echo -e "   2. Vá em Deployments → Seu deployment → Functions"
echo -e "   3. Procure por '/api/triggers/process-pending-jobs'"
echo ""

