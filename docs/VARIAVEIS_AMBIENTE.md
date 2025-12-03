# Variáveis de Ambiente - Painel Adm

Este documento lista todas as variáveis de ambiente necessárias para o funcionamento do backend.

## 📋 Variáveis Obrigatórias

### Firebase Admin
```env
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
```

### Google Cloud / Vertex AI
```env
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# OU
GCP_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

### Gemini API (Chatbot Ana)
```env
# API Key direta do Gemini (para chatbot Ana)
# Obtenha em: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here
# OU (alternativa)
GOOGLE_API_KEY=your_gemini_api_key_here
```

### CORS e Segurança
```env
# Domínios permitidos para CORS (separados por vírgula)
ALLOWED_ORIGINS=http://localhost:3005,https://app-cliente.vercel.app

# Ambiente
NODE_ENV=production
```

## 🔒 Variáveis para Produção

### Vercel/Produção
```env
# Substituir localhost pelas URLs de produção
ALLOWED_ORIGINS=https://app-cliente.vercel.app,https://app-cliente-prod.vercel.app

# Firebase (mesmas chaves de desenvolvimento)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your_project.appspot.com

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your_project_id

# Gemini API (Chatbot Ana)
GEMINI_API_KEY=your_gemini_api_key_here
```

## ✅ Checklist de Verificação

### Antes do Deploy

- [ ] Todas as variáveis estão configuradas no Vercel
- [ ] `FIREBASE_PRIVATE_KEY` está com quebras de linha (`\n`) corretas
- [ ] `ALLOWED_ORIGINS` inclui todos os domínios de produção
- [ ] Chaves do Firebase são válidas
- [ ] Credenciais do Google Cloud estão configuradas
- [ ] `GEMINI_API_KEY` ou `GOOGLE_API_KEY` está configurada (para chatbot Ana)
- [ ] `NODE_ENV=production` está definido

### Verificação Local

1. Criar arquivo `.env.local` na raiz do projeto
2. Copiar todas as variáveis acima
3. Preencher com valores reais
4. Reiniciar servidor de desenvolvimento

### Verificação no Vercel

1. Acessar Settings > Environment Variables
2. Adicionar todas as variáveis
3. **IMPORTANTE:** `FIREBASE_PRIVATE_KEY` deve ter quebras de linha como `\n`
4. Verificar se estão marcadas para Production, Preview e Development
5. Fazer novo deploy após adicionar variáveis

## 🚨 Variáveis Sensíveis

**NUNCA** commitar no Git:
- `FIREBASE_PRIVATE_KEY`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `GEMINI_API_KEY` / `GOOGLE_API_KEY`
- Qualquer chave de API ou token

**SEMPRE** usar:
- `.env.local` para desenvolvimento local
- Variáveis de ambiente do Vercel para produção
- `.gitignore` deve incluir `.env.local` e `.env`

## 📝 Formato do FIREBASE_PRIVATE_KEY

A chave privada deve estar em uma única linha com `\n` para quebras:

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**NÃO** usar múltiplas linhas reais, apenas `\n` como string.

## 🔍 Verificação de Configuração

Execute este comando para verificar se as variáveis estão configuradas:

```bash
node -e "console.log('Firebase Project:', process.env.FIREBASE_PROJECT_ID); console.log('Allowed Origins:', process.env.ALLOWED_ORIGINS);"
```

Se retornar `undefined`, as variáveis não estão configuradas.

## 🔑 Como Obter a Gemini API Key

### Passo a Passo

1. **Acesse o Google AI Studio:**
   - URL: https://aistudio.google.com/app/apikey
   - Faça login com sua conta Google

2. **Criar Nova API Key:**
   - Clique em "Create API Key" ou "Criar chave de API"
   - Selecione o projeto Google Cloud (ou crie um novo)
   - A API key será gerada automaticamente

3. **Copiar a API Key:**
   - Copie a chave gerada (formato: `AIza...`)
   - ⚠️ **IMPORTANTE:** Guarde a chave com segurança, ela não será exibida novamente

4. **Adicionar nas Variáveis de Ambiente:**
   - **Local:** Adicione no arquivo `.env.local`:
     ```env
     GEMINI_API_KEY=AIzaSyC...
     ```
   - **Vercel:** Adicione em Settings > Environment Variables:
     - Key: `GEMINI_API_KEY`
     - Value: `AIzaSyC...`
     - Marque para Production, Preview e Development

5. **Reiniciar/Redepleyar:**
   - **Local:** Reinicie o servidor (`npm run dev`)
   - **Vercel:** Faça um novo deploy após adicionar a variável

### Verificação

Após configurar, teste o chatbot "Ana" no painel do lojista. Se funcionar, a API key está correta.

### Troubleshooting

- **Erro 401 (Unauthorized):** API key inválida ou expirada
- **Erro 403 (Forbidden):** API key não tem permissões ou projeto não tem acesso ao Gemini
- **Erro 404 (Not Found):** Modelo não encontrado (verifique se está usando `gemini-1.5-flash`)

### Limites e Custos

- A API key tem limites de uso (quota)
- Consulte: https://ai.google.dev/pricing
- Modelo `gemini-1.5-flash` é gratuito até certo limite















