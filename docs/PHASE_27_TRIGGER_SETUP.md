# PHASE 27: Configuração de Trigger para Processamento Automático de Jobs

## Opções de Implementação

### Opção 1: Endpoint HTTP (Recomendado para Next.js/Vercel)

O endpoint `/api/triggers/process-pending-jobs` pode ser chamado de várias formas:

#### A. Via Vercel Cron Jobs

Adicione ao `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/triggers/process-pending-jobs",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

#### B. Via Cloud Function HTTP Trigger

Configure um Cloud Function que chama este endpoint periodicamente.

#### C. Via Webhook do Firestore (se disponível)

Configure um webhook no Firestore que chama este endpoint quando um Job é criado.

### Opção 2: Cloud Function Nativa (Firebase Functions)

Se você tem Firebase Functions configurado, use o arquivo `functions/onJobCreated.ts`.

#### Setup:

1. Instale Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Inicialize Functions:
```bash
firebase init functions
```

3. Configure o arquivo `functions/package.json`:
```json
{
  "dependencies": {
    "firebase-functions": "^4.0.0",
    "firebase-admin": "^11.0.0"
  }
}
```

4. Deploy:
```bash
firebase deploy --only functions:onJobCreated,functions:processPendingJobsCron
```

### Opção 3: Polling Manual (Fallback)

Se nenhuma das opções acima funcionar, o frontend pode fazer polling no endpoint `/api/jobs/[jobId]` e chamar manualmente `/api/triggers/process-pending-jobs` quando necessário.

## Variáveis de Ambiente Necessárias

```env
# URL do backend (para chamadas internas)
BACKEND_URL=https://your-backend.vercel.app
PAINELADM_URL=https://your-backend.vercel.app

# Secret para autenticação do trigger (opcional)
TRIGGER_SECRET=your-secret-key
```

## Testando o Trigger

### Teste Manual:

```bash
curl -X POST https://your-backend.vercel.app/api/triggers/process-pending-jobs \
  -H "Content-Type: application/json" \
  -H "X-Internal-Request: true" \
  -d '{"limit": 5}'
```

### Verificar Status:

```bash
curl https://your-backend.vercel.app/api/triggers/process-pending-jobs
```

## Monitoramento

O endpoint GET retorna estatísticas:
- `pending`: Jobs aguardando processamento
- `processing`: Jobs em processamento
- `failed`: Jobs que falharam

Use essas métricas para monitorar a saúde do sistema.

