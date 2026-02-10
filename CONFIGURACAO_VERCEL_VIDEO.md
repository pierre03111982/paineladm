# 🚀 Configuração na Vercel para Geração de Vídeo

## Situação Atual

Você já tem uma variável `GOOGLE_APPLICATION_CREDENTIALS` na Vercel e criou uma nova Service Account (`vertex-ai-video-generator`) para geração de vídeo.

## ✅ Solução Recomendada

### Opção 1: Editar a Variável Existente (Mais Simples)

1. Acesse: **Settings** > **Environment Variables** no seu projeto Vercel
2. Encontre a variável `GOOGLE_APPLICATION_CREDENTIALS`
3. Clique nos **três pontos** (⋯) ao lado dela
4. Selecione **"Edit"**
5. **Substitua** o valor pelo conteúdo completo do arquivo JSON da nova Service Account (`vertex-ai-video-generator`)
6. Clique em **"Save"**

**Vantagem**: Usa a variável que o código já suporta.

### Opção 2: Criar Nova Variável (Mais Organizado)

1. Acesse: **Settings** > **Environment Variables**
2. Clique em **"Add New"**
3. Configure:
   - **Name**: `GCP_SERVICE_ACCOUNT_KEY`
   - **Value**: Cole o conteúdo completo do arquivo JSON da Service Account `vertex-ai-video-generator`
   - **Environments**: Selecione **"All Environments"**
   - **Sensitive**: ✅ Marque como sensível
4. Clique em **"Save"**

**Vantagem**: Mantém a variável antiga intacta e organiza melhor.

## 📋 Variáveis Necessárias na Vercel

Certifique-se de ter estas variáveis configuradas:

| Variável | Valor | Obrigatório |
|----------|-------|-------------|
| `GOOGLE_CLOUD_PROJECT_ID` | `experimenta-ai` | ✅ Sim |
| `GOOGLE_CLOUD_LOCATION` | `us-central1` | ✅ Sim |
| `GOOGLE_APPLICATION_CREDENTIALS` OU `GCP_SERVICE_ACCOUNT_KEY` | Conteúdo JSON da Service Account | ✅ Sim |

## 🔍 Como Obter o Conteúdo do JSON

1. Abra o arquivo JSON que você baixou da Service Account `vertex-ai-video-generator`
2. Copie **TODO** o conteúdo (incluindo as chaves `{}`)
3. Cole na variável de ambiente na Vercel

**Exemplo de formato:**
```json
{
  "type": "service_account",
  "project_id": "experimenta-ai",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "vertex-ai-video-generator@experimenta-ai.iam.gserviceaccount.com",
  ...
}
```

## ⚠️ Importante

- ✅ Marque a variável como **"Sensitive"** para ocultar o valor
- ✅ Configure para **"All Environments"** (Production, Preview, Development)
- ✅ Após adicionar/editar, faça um novo deploy para aplicar as mudanças

## 🔄 Após Configurar

1. Faça um novo deploy na Vercel (ou aguarde o próximo deploy automático)
2. Teste a geração de vídeo pela interface
3. Verifique os logs da Vercel se houver erros

## 🐛 Troubleshooting

### Erro: "Variable already exists"
- Use a **Opção 1** (editar a existente) OU
- Delete a variável antiga primeiro e crie uma nova

### Erro: "Invalid JSON"
- Certifique-se de copiar o JSON completo, incluindo todas as chaves
- Não adicione quebras de linha extras
- O JSON deve começar com `{` e terminar com `}`

### Erro: "Permission denied" após deploy
- Verifique se a Service Account `vertex-ai-video-generator` tem a role `roles/aiplatform.user`
- Verifique se a API do Vertex AI está habilitada no projeto
