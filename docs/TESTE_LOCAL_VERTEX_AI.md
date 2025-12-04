# 🧪 Como Testar Vertex AI Localmente

## ✅ Checklist Antes de Testar

1. **Verificar `.env.local`:**
   ```env
   GOOGLE_CLOUD_PROJECT_ID=experimenta-ai
   GOOGLE_CLOUD_LOCATION=us-central1
   GCP_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"experimenta-ai",...}
   ```

2. **Verificar se o JSON está em UMA LINHA:**
   - ❌ **ERRADO:** Com quebras de linha e espaços
   - ✅ **CORRETO:** Tudo em uma linha, sem espaços após `:`

3. **Reiniciar o servidor:**
   ```bash
   npm run dev
   ```

## 🔍 Logs Esperados (Sucesso)

Quando funcionar corretamente, você deve ver nos logs:

```
[VertexAgent] 🔧 Inicializando...
[VertexAgent] 📝 Parseando GCP_SERVICE_ACCOUNT_KEY...
[VertexAgent] ✅ Service Account válida detectada
[VertexAgent] 🔐 Configurando Vertex AI com Service Account explícita
[VertexAgent] ✅ Vertex AI inicializado com Service Account
[VertexAgent] 🔄 Tentando modelo: gemini-1.5-pro-002
[VertexAgent] ✅ Modelo gemini-1.5-pro-002 instanciado com sucesso
[VertexAgent] 📤 Enviando mensagem para gemini-1.5-pro-002...
[VertexAgent] 📥 Resposta recebida de gemini-1.5-pro-002
[VertexAgent] ✅ Texto extraído (resposta direta): XXX caracteres
```

## ❌ Logs de Erro

Se ainda houver erro de autenticação:

```
[VertexAgent] ❌ Erro ao usar modelo gemini-1.5-pro-002:
error: '[VertexAI.GoogleAuthError]: Unable to authenticate your request'
```

**Soluções:**
1. Verificar se `GCP_SERVICE_ACCOUNT_KEY` está no `.env.local`
2. Verificar se o JSON está em uma linha
3. Verificar se a Service Account tem role "Vertex AI User"
4. Verificar se a Vertex AI API está habilitada

## 🔧 Troubleshooting

### Erro: "Unable to authenticate your request"

**Causa:** Credenciais não estão sendo detectadas

**Solução:**
1. Verificar se `GCP_SERVICE_ACCOUNT_KEY` está no `.env.local`
2. Verificar formato do JSON (deve estar em uma linha)
3. Verificar se o arquivo temporário está sendo criado em `/tmp`

### Erro: "Service Account não contém project_id"

**Causa:** JSON inválido ou incompleto

**Solução:**
1. Verificar se o JSON está completo
2. Verificar se não há quebras de linha
3. Verificar se todas as aspas estão corretas

### Erro: "404 Not Found: Publisher Model was not found"

**Causa:** Modelo não disponível ou projeto sem acesso

**Solução:**
- O código já tem fallback automático (PRO → FLASH)
- Se ambos falharem, verificar se a Vertex AI API está habilitada

## 📝 Próximos Passos

Após testar localmente:

1. Se funcionar localmente, fazer deploy no Vercel
2. Configurar `GCP_SERVICE_ACCOUNT_KEY` no Vercel (mesmo formato)
3. Verificar logs do Vercel após deploy
4. Testar o chat em produção



