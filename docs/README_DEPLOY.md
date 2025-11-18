# 🚀 Guia Rápido de Deploy

## Deploy na Vercel (Recomendado)

### 1. Instalar Vercel CLI
```bash
npm i -g vercel
```

### 2. Login
```bash
vercel login
```

### 3. Deploy
```bash
vercel --prod
```

### 4. Configurar Variáveis de Ambiente
No painel da Vercel (https://vercel.com/dashboard):
1. Vá em Settings > Environment Variables
2. Adicione todas as variáveis do arquivo `.env.production.example`

---

## Deploy no Google Cloud Run

### 1. Build e Deploy
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/experimente-ai
gcloud run deploy experimente-ai --image gcr.io/PROJECT_ID/experimente-ai
```

### 2. Configurar Variáveis de Ambiente
```bash
gcloud run services update experimente-ai \
  --set-env-vars="FIREBASE_PROJECT_ID=...,FIREBASE_CLIENT_EMAIL=..."
```

---

## Verificar Configuração

Antes de fazer deploy, execute:

```bash
chmod +x scripts/check-env.sh
./scripts/check-env.sh
```

---

## Build Local de Teste

```bash
npm run build
npm run start
```

Acesse `http://localhost:3000` e teste todas as funcionalidades.

---

Para mais detalhes, consulte `DEPLOY.md`































