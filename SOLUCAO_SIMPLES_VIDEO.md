# ✅ Solução Simples: Usar a Service Account Existente

## 🎯 Resposta Rápida

**SIM, a conta que você já tem na Vercel serve!** Você não precisa criar uma nova Service Account nem mudar a variável existente.

## 📋 O que fazer (2 passos simples):

### Passo 1: Adicionar Permissão à Service Account Existente

A Service Account `pierredesss@experimenta-ai.iam.gserviceaccount.com` que já está configurada na Vercel só precisa de uma permissão adicional:

1. Acesse: https://console.cloud.google.com/iam-admin/serviceaccounts?project=experimenta-ai
2. Encontre: `pierredesss@experimenta-ai.iam.gserviceaccount.com`
3. Clique nos **três pontos** (⋯) > **"Manage Permissions"** ou **"Edit"**
4. Clique em **"ADD ANOTHER ROLE"**
5. Selecione: **"Vertex AI User"** (`roles/aiplatform.user`)
6. Clique em **"SAVE"**

### Passo 2: Verificar Variáveis na Vercel

Certifique-se de ter estas variáveis na Vercel:

- ✅ `GOOGLE_CLOUD_PROJECT_ID` = `experimenta-ai`
- ✅ `GOOGLE_CLOUD_LOCATION` = `us-central1`
- ✅ `GOOGLE_APPLICATION_CREDENTIALS` = (já está configurada - **NÃO PRECISA MUDAR**)

## 🔒 Por que não vai quebrar nada?

1. ✅ O código já suporta múltiplas formas de autenticação
2. ✅ Adicionar uma role não remove as outras permissões existentes
3. ✅ A mesma Service Account pode ter múltiplas roles
4. ✅ Não estamos mudando a variável `GOOGLE_APPLICATION_CREDENTIALS` na Vercel

## 🎬 Como funciona agora:

O código tenta autenticar nesta ordem:
1. `GCP_SERVICE_ACCOUNT_KEY` (se existir)
2. `GOOGLE_APPLICATION_CREDENTIALS` (se for JSON direto)
3. `GOOGLE_APPLICATION_CREDENTIALS_JSON` (se existir)
4. Application Default Credentials (caminho de arquivo ou gcloud)

**A variável que já está na Vercel será usada automaticamente!**

## ✅ Checklist Final:

- [ ] Adicionar role `roles/aiplatform.user` à Service Account `pierredesss`
- [ ] Verificar se `GOOGLE_CLOUD_PROJECT_ID` está na Vercel
- [ ] Verificar se `GOOGLE_CLOUD_LOCATION` está na Vercel
- [ ] API do Vertex AI habilitada no projeto
- [ ] Fazer deploy/testar

## 💡 Sobre a Nova Service Account

Você criou `vertex-ai-video-generator`, mas **não precisa usar ela**. Pode:
- Deixar ela lá (não vai atrapalhar)
- Ou deletar se quiser manter organizado

**O importante é adicionar a permissão à Service Account que já está em uso!**
