# 🚀 Guia Completo de Deploy

Este guia explica como fazer o deploy do `paineladm` e do `appmelhorado` para produção.

## 📋 Pré-requisitos

1. Conta no Vercel (https://vercel.com)
2. Projetos conectados ao GitHub/GitLab
3. Domínios configurados:
   - `experimenteai.com.br` (ou subdomínio) para o paineladm
   - `app.experimenteai.com.br` para o appmelhorado

## 🔧 Passo 1: Deploy do paineladm

### 1.1. Preparar o projeto

```bash
cd E:\projetos\paineladm
npm install
npm run build
```

### 1.2. Fazer deploy no Vercel

**Opção A: Via CLI do Vercel**

```bash
# Instalar Vercel CLI (se ainda não tiver)
npm i -g vercel

# Fazer login
vercel login

# Deploy de produção
cd E:\projetos\paineladm
vercel --prod
```

**Opção B: Via Dashboard do Vercel**

1. Acesse https://vercel.com
2. Clique em "Add New Project"
3. Conecte o repositório do `paineladm`
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `npm run vercel-build`
   - **Output Directory:** `.next`
5. Clique em "Deploy"

### 1.3. Configurar Variáveis de Ambiente no Vercel

No projeto `paineladm` no Vercel, vá em **Settings** → **Environment Variables** e adicione:

```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=paineladmexperimenteai
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@paineladmexperimenteai.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=paineladmexperimenteai.firebasestorage.app

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=paineladmexperimenteai

# Stability.ai
STABILITY_API_KEY=sk-bJazZ2NCpURUUjF28T1qs37czYiq7onWUNS2TAzZ8Kc8zkXy

# URLs de Produção
NEXT_PUBLIC_APP_URL=https://experimenteai.com.br
NEXT_PUBLIC_CLIENT_APP_URL=https://app.experimenteai.com.br
NEXT_PUBLIC_FIREBASE_PROJECT_ID=paineladmexperimenteai

# Firebase Client (Frontend)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=paineladmexperimenteai.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=paineladmexperimenteai.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Subdomínio do app (novo)
NEXT_PUBLIC_APP_SUBDOMAIN=app.experimenteai.com.br
NEXT_PUBLIC_APP_PROTOCOL=https
```

⚠️ **IMPORTANTE:** Substitua os valores `...` pelos valores reais do seu Firebase.

### 1.4. Configurar Domínio

1. No Vercel, vá em **Settings** → **Domains**
2. Adicione o domínio: `experimenteai.com.br` (ou seu subdomínio)
3. Configure o DNS conforme instruções do Vercel

## 🔧 Passo 2: Deploy do appmelhorado

### 2.1. Preparar o projeto

```bash
cd E:\projetos\appmelhorado
npm install
npm run build
```

### 2.2. Fazer deploy no Vercel

**Opção A: Via CLI do Vercel**

```bash
cd E:\projetos\appmelhorado
vercel --prod
```

**Opção B: Via Dashboard do Vercel**

1. Acesse https://vercel.com
2. Clique em "Add New Project"
3. Conecte o repositório do `appmelhorado`
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
5. Clique em "Deploy"

### 2.3. Configurar Variáveis de Ambiente no Vercel

No projeto `appmelhorado` no Vercel, vá em **Settings** → **Environment Variables** e adicione:

```env
# URL do backend (paineladm)
NEXT_PUBLIC_BACKEND_URL=https://experimenteai.com.br

# Firebase Client (se necessário)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=paineladmexperimenteai.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=paineladmexperimenteai
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=paineladmexperimenteai.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 2.4. Configurar Domínio

1. No Vercel, vá em **Settings** → **Domains**
2. Adicione o domínio: `app.experimenteai.com.br`
3. Configure o DNS conforme instruções do Vercel

## 🔍 Passo 3: Verificar Deploy

### 3.1. Testar paineladm

1. Acesse `https://experimenteai.com.br`
2. Faça login
3. Acesse o simulador de uma loja
4. Verifique se a URL gerada é: `https://app.experimenteai.com.br/{lojistaId}`

### 3.2. Testar appmelhorado

1. Acesse `https://app.experimenteai.com.br/{lojistaId}`
2. Verifique se os produtos da loja aparecem corretamente
3. Teste o fluxo completo: upload de foto → seleção de produtos → geração de looks

## 🐛 Troubleshooting

### Erro: "Module not found"

- Verifique se todas as dependências estão no `package.json`
- Execute `npm install` novamente
- Limpe o cache: `rm -rf .next node_modules && npm install`

### Erro: "Environment variable not found"

- Verifique se todas as variáveis estão configuradas no Vercel
- Certifique-se de que as variáveis estão marcadas para "Production"
- Faça um novo deploy após adicionar variáveis

### URLs não estão usando o subdomínio

- Verifique se `NODE_ENV=production` está definido no Vercel
- Verifique se `NEXT_PUBLIC_APP_SUBDOMAIN` está configurado
- Limpe o cache do Next.js e faça novo deploy

### CORS ou erros de API

- Verifique se `NEXT_PUBLIC_BACKEND_URL` está correto no `appmelhorado`
- Verifique se as rotas de API estão configuradas corretamente
- Verifique os logs do Vercel para erros específicos

## 📝 Checklist Final

- [ ] paineladm deployado e funcionando
- [ ] appmelhorado deployado e funcionando
- [ ] Domínios configurados corretamente
- [ ] Variáveis de ambiente configuradas
- [ ] Simulador gerando URLs com subdomínio
- [ ] Links de compartilhamento funcionando
- [ ] QR Codes gerando URLs corretas
- [ ] Display funcionando corretamente

## 🎉 Pronto!

Após completar todos os passos, seus projetos estarão em produção e todos os links usarão o subdomínio `app.experimenteai.com.br` automaticamente!


