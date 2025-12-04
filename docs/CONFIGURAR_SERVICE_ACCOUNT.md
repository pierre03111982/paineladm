# 🔐 Como Configurar Service Account para Vertex AI

## 📋 Passo a Passo

### 1. Obter a Chave JSON da Service Account

1. Acesse: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Selecione o projeto `experimenta-ai`
3. Selecione a Service Account (ex: `PIERREDESSS`)
4. Vá na aba **"Chaves"**
5. Clique em **"Adicionar chave"** → **"Criar nova chave"**
6. Selecione **JSON**
7. Baixe o arquivo JSON

### 2. Adicionar no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto `paineladm`
3. Vá em **Settings** → **Environment Variables**
4. Clique em **"Add New"**
5. Preencha:
   - **Key:** `GCP_SERVICE_ACCOUNT_KEY`
   - **Value:** Cole o conteúdo completo do arquivo JSON (uma linha só, sem quebras)
   - **Environments:** Marque todas (Production, Preview, Development)
6. Clique em **"Save"**

### 3. Adicionar no .env.local (Desenvolvimento Local)

Abra o arquivo `.env.local` e adicione:

```env
# Google Cloud / Vertex AI
GCP_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"experimenta-ai","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@experimenta-ai.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}

GOOGLE_CLOUD_PROJECT_ID=experimenta-ai
GOOGLE_CLOUD_LOCATION=us-central1
```

**⚠️ IMPORTANTE:**
- Cole o JSON completo em **uma única linha** (sem quebras de linha)
- Mantenha todas as aspas duplas (`"`)
- O `\n` dentro de `private_key` deve ser mantido literalmente

### 4. Verificar Permissões da Service Account

A Service Account precisa ter a role:
- **Vertex AI User** ou
- **AI Platform Developer**

Para adicionar:
1. Vá em: https://console.cloud.google.com/iam-admin/iam
2. Encontre a Service Account
3. Clique no ícone de editar (lápis)
4. Adicione a role **"Vertex AI User"**
5. Salve

### 5. Fazer Redeploy

Após adicionar a variável no Vercel:
1. Vá em **Deployments**
2. Clique nos **3 pontos** do último deployment
3. Selecione **"Redeploy"**

## 🔍 Verificação

Após o deploy, verifique os logs do Vercel. Você deve ver:
```
[VertexAgent] ✅ Service Account detectada do GCP_SERVICE_ACCOUNT_KEY
[VertexAgent] 🔐 Usando autenticação com Service Account explícita
```

## ❌ Troubleshooting

### Erro: "Erro ao parsear GCP_SERVICE_ACCOUNT_KEY"
- Verifique se o JSON está completo e em uma única linha
- Verifique se todas as aspas estão corretas
- Não adicione quebras de linha no JSON

### Erro: "Permission denied" ou "403 Forbidden"
- Verifique se a Service Account tem a role **Vertex AI User**
- Verifique se o projeto está correto (`experimenta-ai`)

### Erro: "Project not found"
- Verifique se `GOOGLE_CLOUD_PROJECT_ID=experimenta-ai` está configurado
- Verifique se o projeto existe no Google Cloud



