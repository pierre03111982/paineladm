# 🔍 Como Diagnosticar Problemas com Vertex AI

## 📋 Passo a Passo para Verificar os Logs

### 1. Acessar os Logs do Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto `paineladm`
3. Vá em **Deployments**
4. Clique no último deployment
5. Vá na aba **"Logs"** ou **"Functions"**

### 2. Procurar por Logs do VertexAgent

Procure por estas mensagens nos logs:

#### ✅ Logs de Sucesso (Esperados):
```
[VertexAgent] 🔧 Inicializando...
[VertexAgent] ✅ Service Account válida detectada
[VertexAgent] 🔐 Configurando Vertex AI com Service Account explícita
[VertexAgent] ✅ Vertex AI inicializado com sucesso
[VertexAgent] 💬 Iniciando chat...
```

#### ❌ Logs de Erro (Problemas):

**Erro 1: Service Account não encontrada**
```
[VertexAgent] ⚠️ GCP_SERVICE_ACCOUNT_KEY não encontrada, tentando ADC
```
**Solução:** Verifique se a variável `GCP_SERVICE_ACCOUNT_KEY` está configurada no Vercel.

**Erro 2: JSON inválido**
```
[VertexAgent] ❌ Erro ao parsear GCP_SERVICE_ACCOUNT_KEY: ...
```
**Solução:** 
- Verifique se o JSON está completo
- Verifique se está em uma única linha (sem quebras)
- Verifique se todas as aspas estão corretas

**Erro 3: Service Account inválida**
```
[VertexAgent] ❌ Erro ao processar GCP_SERVICE_ACCOUNT_KEY: GCP_SERVICE_ACCOUNT_KEY não contém project_id
```
**Solução:** Verifique se o JSON da Service Account está completo e válido.

**Erro 4: Erro de autenticação**
```
[VertexAgent] ❌ Erro no chat: ... (Código: 403)
```
**Solução:** 
- Verifique se a Service Account tem a role **"Vertex AI User"**
- Verifique se o projeto está correto (`experimenta-ai`)

**Erro 5: Projeto não encontrado**
```
[VertexAgent] ❌ Erro ao inicializar Vertex AI: Project not found
```
**Solução:** Verifique se `GOOGLE_CLOUD_PROJECT_ID=experimenta-ai` está configurado.

### 3. Verificar Variáveis de Ambiente no Vercel

1. Vá em **Settings** → **Environment Variables**
2. Verifique se estas variáveis existem:
   - ✅ `GOOGLE_CLOUD_PROJECT_ID` = `experimenta-ai`
   - ✅ `GOOGLE_CLOUD_LOCATION` = `us-central1` (opcional)
   - ✅ `GCP_SERVICE_ACCOUNT_KEY` = `{JSON completo}`

### 4. Testar a Service Account

Para verificar se a Service Account está funcionando, você pode testar localmente:

1. Adicione no `.env.local`:
```env
GCP_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
GOOGLE_CLOUD_PROJECT_ID=experimenta-ai
```

2. Execute:
```bash
npm run dev
```

3. Tente usar o chat e verifique os logs no terminal.

### 5. Verificar Permissões da Service Account

1. Acesse: https://console.cloud.google.com/iam-admin/iam
2. Selecione o projeto `experimenta-ai`
3. Encontre a Service Account (ex: `PIERREDESSS`)
4. Verifique se tem a role:
   - ✅ **Vertex AI User** ou
   - ✅ **AI Platform Developer**

Se não tiver, adicione:
1. Clique no ícone de editar (lápis)
2. Clique em **"Adicionar outra função"**
3. Procure por **"Vertex AI User"**
4. Salve

### 6. Verificar se o Projeto Tem Vertex AI Habilitado

1. Acesse: https://console.cloud.google.com/vertex-ai
2. Selecione o projeto `experimenta-ai`
3. Se aparecer uma tela de "Enable API", clique em **"Enable"**

## 🚨 Erros Comuns e Soluções

### Erro: "403 Forbidden"
**Causa:** Service Account não tem permissões
**Solução:** Adicione a role "Vertex AI User"

### Erro: "404 Not Found"
**Causa:** Projeto não encontrado ou API não habilitada
**Solução:** 
- Verifique `GOOGLE_CLOUD_PROJECT_ID`
- Habilite a API do Vertex AI

### Erro: "Invalid JSON"
**Causa:** JSON da Service Account está mal formatado
**Solução:** 
- Cole o JSON completo em uma única linha
- Verifique se todas as aspas estão corretas
- Não adicione quebras de linha

### Erro: "Authentication failed"
**Causa:** Credenciais inválidas ou expiradas
**Solução:** 
- Gere uma nova chave JSON da Service Account
- Atualize `GCP_SERVICE_ACCOUNT_KEY` no Vercel

## 📞 Próximos Passos

Após verificar os logs:
1. Identifique o erro específico
2. Siga a solução correspondente acima
3. Faça um redeploy no Vercel
4. Teste novamente

Se o problema persistir, compartilhe os logs específicos do Vercel para análise mais detalhada.

