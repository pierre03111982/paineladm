# 🎬 Passo a Passo: Configurar Geração de Vídeo

## ✅ O que você JÁ TEM configurado:

- ✅ **Project ID**: `experimenta-ai`
- ✅ **Location**: `us-central1`
- ✅ **Service Account Key**: Já está no `.env.local` como `GCP_SERVICE_ACCOUNT_KEY`

## 🔧 O que você PRECISA fazer:

### Passo 1: Habilitar a API do Vertex AI

1. Acesse: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=experimenta-ai
2. Clique em **"ENABLE"** (Habilitar)
3. Aguarde alguns minutos

### Passo 2: Verificar Permissões da Service Account

A Service Account `pierredesss@experimenta-ai.iam.gserviceaccount.com` precisa ter a role:

1. Acesse: https://console.cloud.google.com/iam-admin/iam?project=experimenta-ai
2. Procure por: `pierredesss@experimenta-ai.iam.gserviceaccount.com`
3. Verifique se tem a role: **"Vertex AI User"** (`roles/aiplatform.user`)
4. Se não tiver, clique em **"Edit"** e adicione essa role

### Passo 3: Reiniciar o Servidor

```bash
# Pare o servidor (Ctrl+C) e inicie novamente:
npm run dev
```

### Passo 4: Testar

1. Abra a página de adicionar produto
2. Gere a imagem "Modelo Frente" no Estúdio Criativo
3. Vá para a caixa 4 (Estúdio Cinematográfico)
4. Clique em "Gerar Vídeo"

## 🐛 Se ainda der erro "Failed to fetch":

### Verificar Logs do Servidor

Olhe o terminal onde está rodando `npm run dev` e procure por erros como:
- "Erro ao obter token"
- "Permission denied"
- "API not enabled"

### Verificar se a API está habilitada:

Execute no terminal:
```bash
gcloud services list --enabled --project=experimenta-ai | grep aiplatform
```

Se não aparecer `aiplatform.googleapis.com`, habilite manualmente:
```bash
gcloud services enable aiplatform.googleapis.com --project=experimenta-ai
```

### Verificar Permissões:

Execute no terminal:
```bash
gcloud projects get-iam-policy experimenta-ai --flatten="bindings[].members" --filter="bindings.members:pierredesss@experimenta-ai.iam.gserviceaccount.com"
```

Deve mostrar `roles/aiplatform.user` ou similar.

## 📝 Checklist Final:

- [ ] API do Vertex AI habilitada
- [ ] Service Account tem role `roles/aiplatform.user`
- [ ] Variáveis de ambiente configuradas no `.env.local`
- [ ] Servidor reiniciado após mudanças
- [ ] Imagem "Modelo Frente" gerada antes de tentar gerar vídeo

## 💡 Dica:

Se você estiver usando Vercel ou outro serviço de deploy, certifique-se de adicionar as variáveis de ambiente também lá:
- `GOOGLE_CLOUD_PROJECT_ID=experimenta-ai`
- `GOOGLE_CLOUD_LOCATION=us-central1`
- `GCP_SERVICE_ACCOUNT_KEY={seu JSON completo}`
