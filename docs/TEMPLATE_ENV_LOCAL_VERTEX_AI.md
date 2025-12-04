# Template Correto para .env.local (Linhas 62-75)

## ✅ Formato Correto

```env
# ============================================
# GOOGLE CLOUD / VERTEX AI (Agente Ana)
# ============================================

# Seu Project ID do Google Cloud (você já tem!)
GOOGLE_CLOUD_PROJECT_ID=experimenta-ai

# Região do Vertex AI (normalmente us-central1)
GOOGLE_CLOUD_LOCATION=us-central1

# Service Account JSON (para autenticação Vertex AI)
# IMPORTANTE: Cole o JSON completo em UMA LINHA, sem quebras
# Obtenha o JSON em: https://console.cloud.google.com/iam-admin/serviceaccounts?project=experimenta-ai
GCP_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"experimenta-ai","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@experimenta-ai.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}

# Custo por requisição em USD (opcional)
VERTEX_TRYON_COST=0.04
IMAGEN_COST=0.04
```

## ❌ Erros Comuns a Evitar

### 1. **Duplicação de Variáveis**
❌ **ERRADO:**
```env
GOOGLE_CLOUD_PROJECT_ID=experimenta-ai
GOOGLE_CLOUD_LOCATION=us-central1
VERTEX_TRYON_COST=0.04

# Duplicado - REMOVER!
GOOGLE_CLOUD_PROJECT_ID=experimenta-ai
GOOGLE_CLOUD_LOCATION=us-central1
VERTEX_TRYON_COST=0.04
```

✅ **CORRETO:**
```env
GOOGLE_CLOUD_PROJECT_ID=experimenta-ai
GOOGLE_CLOUD_LOCATION=us-central1
VERTEX_TRYON_COST=0.04
```

### 2. **GCP_SERVICE_ACCOUNT_KEY com Quebras de Linha**
❌ **ERRADO:**
```env
GCP_SERVICE_ACCOUNT_KEY={
  "type": "service_account",
  "project_id": "experimenta-ai",
  ...
}
```

✅ **CORRETO:**
```env
GCP_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"experimenta-ai",...}
```

### 3. **Aspas Simples em vez de Duplas**
❌ **ERRADO:**
```env
GCP_SERVICE_ACCOUNT_KEY={'type':'service_account',...}
```

✅ **CORRETO:**
```env
GCP_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

## 📝 Como Obter o GCP_SERVICE_ACCOUNT_KEY

1. Acesse: https://console.cloud.google.com/iam-admin/serviceaccounts?project=experimenta-ai
2. Selecione a Service Account (ou crie uma nova)
3. Vá na aba **"Chaves"**
4. Clique em **"Adicionar chave"** → **"Criar nova chave"**
5. Selecione **JSON**
6. Baixe o arquivo JSON
7. Abra o arquivo JSON
8. Copie TODO o conteúdo
9. Cole no `.env.local` como `GCP_SERVICE_ACCOUNT_KEY={...}` (em uma linha só)

## 🔍 Verificação

Após configurar, verifique se:

- ✅ Não há variáveis duplicadas
- ✅ `GCP_SERVICE_ACCOUNT_KEY` está em uma única linha
- ✅ `GOOGLE_CLOUD_PROJECT_ID=experimenta-ai`
- ✅ `GOOGLE_CLOUD_LOCATION=us-central1` (opcional, tem padrão)

