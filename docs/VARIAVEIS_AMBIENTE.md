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
```

## ✅ Checklist de Verificação

### Antes do Deploy

- [ ] Todas as variáveis estão configuradas no Vercel
- [ ] `FIREBASE_PRIVATE_KEY` está com quebras de linha (`\n`) corretas
- [ ] `ALLOWED_ORIGINS` inclui todos os domínios de produção
- [ ] Chaves do Firebase são válidas
- [ ] Credenciais do Google Cloud estão configuradas
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





