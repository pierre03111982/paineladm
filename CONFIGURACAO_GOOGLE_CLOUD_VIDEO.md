# Configuração do Google Cloud para Geração de Vídeo (Vertex AI Veo)

## Informações do Projeto
- **Project ID**: `experimenta-ai`
- **Project Number**: `765142471279`
- **Location**: `us-central1` (padrão)

## Passo 1: Habilitar a API do Vertex AI

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Certifique-se de que o projeto **EXPERIMENTA AI** está selecionado
3. Vá para: **APIs & Services** > **Library**
4. Procure por: **"Vertex AI API"**
5. Clique em **"Enable"** (Habilitar)
6. Aguarde alguns minutos para a ativação

## Passo 2: Criar uma Service Account

1. No Google Cloud Console, vá para: **IAM & Admin** > **Service Accounts**
2. Clique em **"Create Service Account"**
3. Preencha:
   - **Service account name**: `vertex-ai-video-generator`
   - **Service account ID**: será gerado automaticamente
   - **Description**: "Service account para geração de vídeos com Vertex AI Veo"
4. Clique em **"Create and Continue"**

## Passo 3: Conceder Permissões

1. Na tela de **Grant this service account access to project**:
   - Adicione a role: **"Vertex AI User"** (`roles/aiplatform.user`)
   - Opcionalmente: **"Storage Object Viewer"** se precisar acessar buckets do GCS
2. Clique em **"Continue"** e depois **"Done"**

## Passo 4: Criar e Baixar a Chave JSON

1. Na lista de Service Accounts, clique na conta criada (`vertex-ai-video-generator`)
2. Vá para a aba **"Keys"**
3. Clique em **"Add Key"** > **"Create new key"**
4. Selecione **JSON**
5. Clique em **"Create"**
6. O arquivo JSON será baixado automaticamente
7. **IMPORTANTE**: Guarde este arquivo em local seguro (não commite no Git!)

## Passo 5: Configurar Variáveis de Ambiente

### Para Desenvolvimento Local (.env.local)

Adicione as seguintes variáveis no arquivo `.env.local`:

```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=experimenta-ai
GOOGLE_CLOUD_LOCATION=us-central1

# Service Account Key (caminho para o arquivo JSON baixado)
GOOGLE_APPLICATION_CREDENTIALS=/caminho/completo/para/seu/arquivo-service-account.json

# OU se preferir usar variável de ambiente com o conteúdo JSON (mais seguro para produção):
# GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"experimenta-ai",...}
```

### Para Produção (Vercel/Cloud Run/etc)

1. **Opção 1: Variável de Ambiente com Caminho**
   - Faça upload do arquivo JSON para seu servidor
   - Configure: `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`

2. **Opção 2: Variável de Ambiente com JSON (Recomendado para Vercel)**
   - No painel da Vercel, vá em **Settings** > **Environment Variables**
   - Adicione: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - Cole o conteúdo completo do arquivo JSON (como string)
   - Atualize o código para ler desta variável

## Passo 6: Atualizar o Código para Suportar JSON em Variável de Ambiente

Se você preferir usar `GOOGLE_APPLICATION_CREDENTIALS_JSON`, atualize as funções `getAccessToken()`:

```typescript
async function getAccessToken(): Promise<string | null> {
  try {
    // Se tiver JSON em variável de ambiente
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      const auth = new GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();
      return accessToken.token || null;
    }
    
    // Caso contrário, usa Application Default Credentials
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    return accessToken.token || null;
  } catch (error) {
    console.error("[generate-video] Erro ao obter token:", error);
    return null;
  }
}
```

## Passo 7: Testar a Configuração

1. Reinicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Tente gerar um vídeo pela interface
3. Verifique os logs do servidor para erros de autenticação

## Troubleshooting

### Erro: "Failed to fetch"
- Verifique se as variáveis de ambiente estão configuradas corretamente
- Verifique se o arquivo JSON da Service Account existe e está acessível
- Verifique se a API do Vertex AI está habilitada

### Erro: "Permission denied"
- Verifique se a Service Account tem a role `roles/aiplatform.user`
- Verifique se o projeto está correto

### Erro: "API not enabled"
- Certifique-se de que a Vertex AI API está habilitada no projeto

### Erro: "The input image contains content that has been blocked by your current safety settings for person/face generation"
- A API Veo usa o parâmetro **`personGeneration`** (não `safetySettings`). No código já está configurado `personGeneration: "allow_all"` para permitir geração com pessoas de todas as idades.
- **Importante**: o valor `"allow_all"` pode exigir que o projeto esteja na **allowlist** do Google. Se aparecer erro ao usar `allow_all`, você pode:
  1. Solicitar à Google Cloud que o projeto seja incluído na allowlist para "person generation - allow all", ou
  2. Alterar temporariamente em `src/app/api/lojista/products/generate-video/route.ts` para `personGeneration: "allow_adult"` e usar apenas imagens de modelo adulto para gerar vídeo.

Valores aceitos por `personGeneration` (Vertex AI Veo):
- `"allow_adult"` (padrão): apenas adultos
- `"dont_allow"`: não gera pessoas/rostos
- `"allow_all"`: todas as idades (projeto pode precisar de allowlist)

## Verificação Rápida

Execute este comando no terminal para verificar se as credenciais estão funcionando:

```bash
# Se você tem gcloud CLI instalado:
gcloud auth application-default login
gcloud config set project experimenta-ai

# Testar acesso:
gcloud ai operations list --region=us-central1
```

## Próximos Passos

Após configurar as credenciais:
1. Teste a geração de vídeo pela interface
2. Configure um bucket do Cloud Storage para armazenar os vídeos gerados (opcional)
3. Configure billing alerts no Google Cloud para monitorar custos

## Custos

⚠️ **Atenção**: A geração de vídeo com Vertex AI Veo tem custos. Verifique os preços em:
https://cloud.google.com/vertex-ai/pricing

O modelo `veo-3.1-fast-generate-001` sem áudio é mais econômico que a versão com áudio.
