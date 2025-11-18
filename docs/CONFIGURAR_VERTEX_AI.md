# Configuração do Vertex AI para Geração de Imagens Reais

Para gerar imagens reais usando o Vertex AI (Try-On e Imagen 3.0), você precisa configurar as seguintes variáveis de ambiente:

## Variáveis Obrigatórias

Adicione ao arquivo `.env.local` do projeto `paineladm`:

```env
# Firebase Admin (já configurado)
FIREBASE_PROJECT_ID=paineladmexperimenteai
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@paineladmexperimenteai.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_STORAGE_BUCKET=paineladmexperimenteai.firebasestorage.app

# Vertex AI Configuration
GOOGLE_CLOUD_PROJECT_ID=paineladmexperimenteai
GOOGLE_CLOUD_LOCATION=us-central1

# Opcional: Custos por requisição (em USD)
VERTEX_TRYON_COST=0.04
IMAGEN_COST=0.04

# Opcional: Versão do modelo Imagen (padrão: imagen-4.0-generate-001)
# Opções: imagen-4.0-generate-001 (recomendado) ou imagen-3.0-capability-001
IMAGEN_MODEL_VERSION=imagen-4.0-generate-001
```

## Passos para Configuração

### 1. Habilitar APIs Necessárias

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Selecione o projeto `paineladmexperimenteai`
3. Vá em **APIs & Services** > **Library**
4. Habilite as seguintes APIs:
   - **Vertex AI API**
   - **Vertex AI Generative AI API**
   - **Cloud Vision API** ⬅️ **NOVO** (para análise de imagens de óculos)

### 2. Verificar Permissões do Service Account

O Service Account do Firebase (`firebase-adminsdk-fbsvc@paineladmexperimenteai.iam.gserviceaccount.com`) precisa ter as seguintes permissões:

- **Vertex AI User** (`roles/aiplatform.user`)
- **Storage Object Admin** (já deve ter)

Para adicionar permissões:
1. Vá em **IAM & Admin** > **IAM**
2. Encontre o Service Account do Firebase
3. Clique em **Edit** e adicione a role `Vertex AI User`

### 3. Verificar Região

O Vertex AI Try-On está disponível nas seguintes regiões:
- `us-central1` (recomendado)
- `us-east1`
- `europe-west1`
- `asia-southeast1`

Certifique-se de que `GOOGLE_CLOUD_LOCATION` está configurado para uma dessas regiões.

### 4. Testar a Configuração

Após configurar as variáveis de ambiente:

1. Reinicie o servidor do `paineladm`:
   ```bash
   cd paineladm
   npm run dev
   ```

2. Acesse o simulador e tente gerar uma composição
3. Verifique os logs do servidor para ver se a autenticação está funcionando

## Troubleshooting

### Erro: "Falha na autenticação"
- Verifique se `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` estão configurados corretamente
- Verifique se o Service Account tem a role `Vertex AI User`

### Erro: "GOOGLE_CLOUD_PROJECT_ID não configurado"
- Adicione `GOOGLE_CLOUD_PROJECT_ID` ao `.env.local` (geralmente é o mesmo que `FIREBASE_PROJECT_ID`)

### Erro: "API não habilitada"
- Habilite as APIs do Vertex AI no Google Cloud Console

### Modo Mock
Se as credenciais não estiverem configuradas, o sistema usará imagens mock (placeholders) automaticamente.

## Custos

- **Vertex AI Try-On**: ~$0.04 por imagem
- **Imagen 3.0**: ~$0.04 por imagem
- **Total por composição completa** (2 looks): ~$0.12 USD

Consulte a [documentação oficial de preços](https://cloud.google.com/vertex-ai/generative-ai/pricing) para valores atualizados.











