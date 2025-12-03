# 🔐 Guia Completo: Configurar Vertex AI para Agente Ana

## 📋 Checklist de Configuração

### ✅ 1. Variáveis de Ambiente no Vercel

Verifique se estas variáveis estão configuradas:

- ✅ `GOOGLE_CLOUD_PROJECT_ID` = `experimenta-ai`
- ✅ `GOOGLE_CLOUD_LOCATION` = `us-central1` (opcional, tem padrão)
- ✅ `GCP_SERVICE_ACCOUNT_KEY` = `{JSON completo da Service Account}`

### ✅ 2. Service Account no Google Cloud

#### 2.1. Criar ou Verificar Service Account

1. Acesse: https://console.cloud.google.com/iam-admin/serviceaccounts?project=experimenta-ai
2. Verifique se existe uma Service Account (ex: `PIERREDESSS`)
3. Se não existir, crie uma:
   - Clique em **"Criar conta de serviço"**
   - Nome: `vertex-ai-agent` (ou qualquer nome)
   - Clique em **"Criar e continuar"**

#### 2.2. Adicionar Permissões (ROLES)

A Service Account precisa ter estas permissões:

1. **Vertex AI User** (Obrigatório)
   - Permite usar modelos do Vertex AI (Gemini)
   - Acesse: https://console.cloud.google.com/iam-admin/iam?project=experimenta-ai
   - Encontre a Service Account
   - Clique no ícone de editar (lápis)
   - Clique em **"Adicionar outra função"**
   - Procure por **"Vertex AI User"**
   - Selecione e salve

2. **Firestore User** (Opcional, mas recomendado)
   - Se o Agente Ana precisar ler dados do Firestore
   - Adicione a role **"Cloud Datastore User"**

#### 2.3. Gerar Chave JSON

1. Acesse: https://console.cloud.google.com/iam-admin/serviceaccounts?project=experimenta-ai
2. Selecione a Service Account
3. Vá na aba **"Chaves"**
4. Clique em **"Adicionar chave"** → **"Criar nova chave"**
5. Selecione **JSON**
6. Baixe o arquivo JSON

### ✅ 3. Configurar no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto `paineladm`
3. Vá em **Settings** → **Environment Variables**
4. Adicione/Verifique:

   **Variável 1:**
   - Key: `GOOGLE_CLOUD_PROJECT_ID`
   - Value: `experimenta-ai`
   - Environments: ✅ Production, ✅ Preview, ✅ Development

   **Variável 2:**
   - Key: `GCP_SERVICE_ACCOUNT_KEY`
   - Value: Cole o conteúdo completo do arquivo JSON (uma linha só, sem quebras)
   - Environments: ✅ Production, ✅ Preview, ✅ Development

   **Variável 3 (Opcional):**
   - Key: `GOOGLE_CLOUD_LOCATION`
   - Value: `us-central1`
   - Environments: ✅ Production, ✅ Preview, ✅ Development

### ✅ 4. Habilitar APIs do Google Cloud

Verifique se estas APIs estão habilitadas:

1. **Vertex AI API**
   - Acesse: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=experimenta-ai
   - Se não estiver habilitada, clique em **"Habilitar"**

2. **Firestore API** (se usar dados do Firestore)
   - Acesse: https://console.cloud.google.com/apis/library/firestore.googleapis.com?project=experimenta-ai
   - Se não estiver habilitada, clique em **"Habilitar"**

### ✅ 5. Verificar Billing (Faturamento)

O Vertex AI requer faturamento ativo:

1. Acesse: https://console.cloud.google.com/billing?project=experimenta-ai
2. Verifique se há uma conta de faturamento vinculada
3. Se não houver, adicione uma conta de faturamento

## 🔍 Verificação de Configuração

### Teste 1: Verificar Variáveis no Vercel

1. Vá em **Settings** → **Environment Variables**
2. Procure por `GCP_SERVICE_ACCOUNT_KEY`
3. Verifique se o valor começa com `{"type":"service_account",...`

### Teste 2: Verificar Logs após Deploy

Após fazer deploy, verifique os logs do Vercel. Você deve ver:

**✅ Sucesso:**
```
[VertexAgent] ✅ Service Account válida detectada
[VertexAgent] 🔐 Configurando Vertex AI com Service Account explícita
[VertexAgent] ✅ Vertex AI inicializado com sucesso
```

**❌ Erro:**
```
[VertexAgent] ❌ Erro ao parsear GCP_SERVICE_ACCOUNT_KEY
```
ou
```
[VertexAgent] ❌ Erro ao inicializar Vertex AI: Unable to authenticate
```

### Teste 3: Verificar Permissões da Service Account

1. Acesse: https://console.cloud.google.com/iam-admin/iam?project=experimenta-ai
2. Encontre a Service Account
3. Verifique se tem a role **"Vertex AI User"**

## 🚨 Troubleshooting

### Erro: "Unable to authenticate your request"

**Causa:** Service Account não configurada ou sem permissões

**Solução:**
1. Verifique se `GCP_SERVICE_ACCOUNT_KEY` está no Vercel
2. Verifique se a Service Account tem a role **"Vertex AI User"**
3. Verifique se o JSON está completo e em uma linha

### Erro: "404 Not Found: Publisher Model was not found"

**Causa:** Modelo não disponível ou projeto sem acesso

**Solução:**
- O código já tem fallback automático (PRO → FLASH)
- Se ambos falharem, verifique se a API do Vertex AI está habilitada

### Erro: "403 Forbidden"

**Causa:** Service Account sem permissões

**Solução:**
- Adicione a role **"Vertex AI User"** na Service Account

### Erro: "Billing not enabled"

**Causa:** Projeto sem conta de faturamento

**Solução:**
- Vincule uma conta de faturamento ao projeto `experimenta-ai`

## 📝 Formato Correto do GCP_SERVICE_ACCOUNT_KEY

O JSON deve estar em **uma única linha**, sem quebras:

```json
{"type":"service_account","project_id":"experimenta-ai","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@experimenta-ai.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

**⚠️ IMPORTANTE:**
- Mantenha todas as aspas duplas (`"`)
- Mantenha o `\n` dentro de `private_key` literalmente
- Não adicione quebras de linha extras

## ✅ Checklist Final

Antes de testar, verifique:

- [ ] `GOOGLE_CLOUD_PROJECT_ID` configurado no Vercel
- [ ] `GCP_SERVICE_ACCOUNT_KEY` configurado no Vercel (JSON completo)
- [ ] Service Account tem role **"Vertex AI User"**
- [ ] Vertex AI API está habilitada
- [ ] Projeto tem conta de faturamento vinculada
- [ ] Novo deploy realizado após configurar variáveis

## 🔗 Links Úteis

- **Service Accounts:** https://console.cloud.google.com/iam-admin/serviceaccounts?project=experimenta-ai
- **IAM (Permissões):** https://console.cloud.google.com/iam-admin/iam?project=experimenta-ai
- **Vertex AI API:** https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=experimenta-ai
- **Billing:** https://console.cloud.google.com/billing?project=experimenta-ai

