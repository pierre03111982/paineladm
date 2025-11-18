# 🚀 Guia de Deploy - Experimente AI

Este guia fornece instruções passo a passo para fazer o deploy da aplicação em produção.

---

## 📋 Pré-requisitos

- Conta no Firebase (já configurada)
- Conta no Google Cloud (para Vertex AI)
- Conta na Stability.ai (para geração de imagens)
- Repositório Git (GitHub, GitLab, etc.)
- Domínio (opcional, mas recomendado)

---

## 🔧 Passo 1: Configurar Variáveis de Ambiente

### 1.1 Criar arquivo `.env.production`

Crie um arquivo `.env.production` na raiz do projeto com todas as variáveis necessárias:

```env
# Firebase Admin SDK (Server-side)
FIREBASE_PROJECT_ID=paineladmexperimenteai
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@paineladmexperimenteai.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=paineladmexperimenteai.firebasestorage.app

# Google Cloud (Vertex AI)
GOOGLE_CLOUD_PROJECT_ID=paineladmexperimenteai
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Stability.ai
STABILITY_API_KEY=sk-your-api-key-here

# URLs de Produção
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
NEXT_PUBLIC_CLIENT_APP_URL=https://app.seu-dominio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=paineladmexperimenteai

# Firebase Client (Frontend)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=paineladmexperimenteai.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=paineladmexperimenteai.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Lojista ID (se aplicável)
NEXT_PUBLIC_LOJISTA_ID=default-lojista-id
```

### 1.2 ⚠️ IMPORTANTE: Segurança

- **NUNCA** commite o arquivo `.env.production` no Git
- Adicione `.env*` ao `.gitignore`
- Use as variáveis de ambiente da plataforma de deploy

---

## 🌐 Passo 2: Escolher Plataforma de Deploy

### Opção A: Vercel (Recomendado) ⭐

**Vantagens:**
- Deploy automático via Git
- SSL automático
- CDN global
- Otimizado para Next.js
- Grátis para projetos pessoais

**Passos:**

1. **Instalar Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Configurar Variáveis de Ambiente:**
   - Acesse o painel da Vercel
   - Vá em Settings > Environment Variables
   - Adicione todas as variáveis do `.env.production`

5. **Conectar Repositório Git (Opcional):**
   - No painel da Vercel, conecte seu repositório
   - Cada push na branch `main` fará deploy automático

### Opção B: Google Cloud Run

**Passos:**

1. **Criar Dockerfile:**
   ```dockerfile
   FROM node:20-alpine AS base
   RUN apk add --no-cache libc6-compat
   WORKDIR /app

   FROM base AS deps
   COPY package*.json ./
   RUN npm ci

   FROM base AS builder
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   RUN npm run build

   FROM base AS runner
   ENV NODE_ENV production
   COPY --from=builder /app/public ./public
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static

   EXPOSE 3000
   ENV PORT 3000
   CMD ["node", "server.js"]
   ```

2. **Build e Deploy:**
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT_ID/experimente-ai
   gcloud run deploy experimente-ai --image gcr.io/PROJECT_ID/experimente-ai
   ```

### Opção C: AWS (EC2/ECS)

**Passos:**

1. **Criar instância EC2 ou cluster ECS**
2. **Instalar Node.js e dependências**
3. **Configurar PM2 ou similar para gerenciar o processo**
4. **Configurar Nginx como reverse proxy**
5. **Configurar SSL com Let's Encrypt**

---

## 🧪 Passo 3: Testar Build Localmente

Antes de fazer deploy, teste o build de produção localmente:

```bash
# Limpar cache
rm -rf .next

# Build de produção
npm run build

# Iniciar servidor de produção
npm run start
```

Acesse `http://localhost:3000` e teste todas as funcionalidades.

---

## ✅ Passo 4: Checklist de Deploy

Antes de fazer deploy em produção, verifique:

- [ ] Build de produção funciona localmente
- [ ] Todas as variáveis de ambiente configuradas
- [ ] Firebase configurado e testado
- [ ] Vertex AI configurado e testado
- [ ] Stability.ai API key válida
- [ ] Testes de API realizados
- [ ] Domínio configurado (se aplicável)
- [ ] SSL/HTTPS configurado
- [ ] CORS configurado corretamente
- [ ] Backup do Firestore configurado

---

## 🔒 Passo 5: Segurança em Produção

### 5.1 Variáveis de Ambiente
- ✅ Nunca commite arquivos `.env*`
- ✅ Use variáveis de ambiente da plataforma
- ✅ Rotacione chaves regularmente

### 5.2 HTTPS
- ✅ Configure SSL/HTTPS (obrigatório)
- ✅ Vercel faz isso automaticamente
- ✅ Para outros serviços, use Let's Encrypt

### 5.3 CORS
- ✅ Configure CORS apenas para domínios permitidos
- ✅ Não use `*` em produção

### 5.4 Rate Limiting
- ✅ Configure rate limiting nas APIs (recomendado)
- ✅ Use serviços como Cloudflare ou similar

---

## 📊 Passo 6: Monitoramento

### 6.1 Métricas Básicas
- Uptime da aplicação
- Tempo de resposta das APIs
- Erros e exceções
- Uso de recursos

### 6.2 Ferramentas Recomendadas
- **Vercel Analytics** (se usar Vercel)
- **Google Cloud Monitoring**
- **Sentry** (para tracking de erros)
- **LogRocket** (para sessões de usuário)

### 6.3 Alertas
Configure alertas para:
- Aplicação offline
- Taxa de erro alta
- Tempo de resposta alto
- Quota de API próxima do limite

---

## 🔄 Passo 7: Backup

### 7.1 Firestore
- Configure backup automático no Firebase Console
- Frequência recomendada: Diária
- Retenção: 30 dias

### 7.2 Código
- Use Git para versionamento
- Configure backup automático do repositório

---

## 🚨 Troubleshooting

### Erro: "Firebase Admin SDK não configurado"
- Verifique se todas as variáveis do Firebase estão configuradas
- Verifique se `FIREBASE_PRIVATE_KEY` está com `\n` preservados

### Erro: "Vertex AI não autorizado"
- Verifique `GOOGLE_CLOUD_PROJECT_ID`
- Verifique se a service account tem permissões corretas

### Erro: "CORS"
- Verifique configuração de CORS nas APIs
- Verifique se o domínio está na lista de origens permitidas

### Build falha
- Limpe o cache: `rm -rf .next`
- Verifique se todas as dependências estão instaladas
- Verifique logs de erro do build

---

## 📝 Notas Finais

- O deploy real deve ser feito pelo administrador do projeto
- Teste sempre em ambiente de staging antes de produção
- Mantenha backups regulares
- Monitore custos de API (Vertex AI, Stability.ai)
- Configure alertas para problemas críticos

---

## 🆘 Suporte

Em caso de problemas:
1. Verifique os logs da aplicação
2. Verifique os logs do Firebase
3. Verifique os logs da plataforma de deploy
4. Consulte a documentação específica da plataforma escolhida

---

*Última atualização: $(date)*































