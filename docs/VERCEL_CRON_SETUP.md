# Configuração do Vercel Cron para Processamento de Jobs

## ✅ Arquivo `vercel.json` Configurado

O arquivo `vercel.json` já está configurado com o cron job:

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

**Configuração:**
- **Path**: `/api/triggers/process-pending-jobs`
- **Schedule**: `*/1 * * * *` (executa a cada 1 minuto)
- **Formato Cron**: `minuto hora dia mês dia-da-semana`

## 📋 Configurações no Painel da Vercel

### 1. Deploy do Projeto

Após fazer commit e push do `vercel.json` atualizado:

```bash
git add vercel.json
git commit -m "feat: Adiciona Vercel Cron para processar Jobs pendentes"
git push
```

O Vercel detectará automaticamente o `vercel.json` e configurará o cron job.

### 2. Verificar Cron Jobs no Painel

1. Acesse o painel da Vercel: https://vercel.com/dashboard
2. Selecione seu projeto `paineladm`
3. Vá em **Settings** → **Cron Jobs**
4. Você deve ver o cron job listado:
   - **Path**: `/api/triggers/process-pending-jobs`
   - **Schedule**: `*/1 * * * *`
   - **Status**: Ativo

### 3. Variáveis de Ambiente (Opcional)

Se você quiser adicionar autenticação extra via Bearer token:

1. Vá em **Settings** → **Environment Variables**
2. Adicione (se ainda não existir):
   - `TRIGGER_SECRET`: Uma string secreta para autenticação
   - `NEXT_PUBLIC_BACKEND_URL`: URL do seu backend (se necessário)
   - `NEXT_PUBLIC_PAINELADM_URL`: URL do paineladm (se necessário)

**Nota**: O endpoint já aceita requisições do Vercel Cron automaticamente (via header `x-vercel-cron`), então o `TRIGGER_SECRET` é opcional.

### 4. Logs e Monitoramento

Para ver os logs do cron job:

1. Vá em **Deployments**
2. Clique no deployment mais recente
3. Vá em **Functions** → Procure por `/api/triggers/process-pending-jobs`
4. Você verá os logs de cada execução do cron

Ou use o endpoint GET para verificar status:

```bash
curl https://your-project.vercel.app/api/triggers/process-pending-jobs
```

## 🧪 Testando o Cron Job

### Teste Manual (Imediato)

Você pode testar manualmente chamando o endpoint:

```bash
# Teste local (se estiver rodando localmente)
curl -X POST http://localhost:3000/api/triggers/process-pending-jobs \
  -H "Content-Type: application/json" \
  -H "X-Internal-Request: true"

# Teste em produção
curl -X POST https://your-project.vercel.app/api/triggers/process-pending-jobs \
  -H "Content-Type: application/json"
```

### Verificar Status

```bash
# Ver estatísticas de Jobs
curl https://your-project.vercel.app/api/triggers/process-pending-jobs
```

Resposta esperada:
```json
{
  "status": "ok",
  "stats": {
    "pending": 0,
    "processing": 0,
    "failed": 0
  }
}
```

### Teste Completo do Fluxo

1. **Criar um Job** (via frontend ou API):
   ```bash
   curl -X POST https://your-frontend.vercel.app/api/generate-looks \
     -H "Content-Type: application/json" \
     -d '{
       "lojistaId": "test-loja-id",
       "productIds": ["produto-1"],
       "personImageUrl": "https://example.com/photo.jpg"
     }'
   ```

2. **Aguardar até 1 minuto** (ou chamar manualmente o trigger)

3. **Verificar se o Job foi processado**:
   ```bash
   curl https://your-frontend.vercel.app/api/jobs/JOB_ID_AQUI
   ```

## ⚠️ Observações Importantes

1. **Primeira Execução**: O cron pode levar alguns minutos para ser ativado após o deploy
2. **Timezone**: O Vercel usa UTC para os cron jobs
3. **Limite de Execuções**: O Vercel tem limites de execuções por plano:
   - Hobby: 100 execuções/dia
   - Pro: 1000 execuções/dia
   - Enterprise: Ilimitado
4. **Timeout**: Cada execução tem timeout de 10 segundos (Pro) ou 60 segundos (Enterprise)

## 🔍 Troubleshooting

### Cron não está executando

1. Verifique se o `vercel.json` está no repositório
2. Verifique se o deploy foi feito após adicionar o cron
3. Verifique os logs no painel da Vercel
4. Teste manualmente o endpoint para verificar se está funcionando

### Erro 401 Unauthorized

O endpoint aceita automaticamente requisições do Vercel Cron. Se estiver recebendo 401:
- Verifique se o header `x-vercel-cron` está sendo enviado
- Verifique os logs para ver qual validação está falhando

### Jobs não estão sendo processados

1. Verifique se há Jobs com status `PENDING` no Firestore
2. Verifique os logs do endpoint `/api/triggers/process-pending-jobs`
3. Verifique se o endpoint `/api/internal/process-job` está funcionando
4. Verifique se há erros no console do Vercel

## 📊 Monitoramento

Para monitorar o sistema:

1. **Endpoint de Status**: `GET /api/triggers/process-pending-jobs`
2. **Logs do Vercel**: Painel → Deployments → Functions
3. **Firestore**: Coleção `generation_jobs` para ver status dos Jobs

