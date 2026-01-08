# 🧪 Como Testar o Gemini 2.5 Flash

Este guia mostra como testar se a migração do `gemini-2.0-flash` para `gemini-2.5-flash` foi bem-sucedida.

---

## 📋 Pré-requisitos

1. **Servidor Next.js rodando**: `npm run dev` ou `yarn dev`
2. **Variáveis de ambiente configuradas**:
   ```env
   GOOGLE_CLOUD_PROJECT_ID=seu-project-id
   GOOGLE_CLOUD_LOCATION=us-central1
   GCP_SERVICE_ACCOUNT_KEY={...} # ou GOOGLE_APPLICATION_CREDENTIALS
   ```
3. **Autenticação**: Você precisa estar logado como lojista ou ter um `lojistaId` válido

---

## 🚀 Método 1: Script Automatizado (Recomendado)

### Passo 1: Instalar dependências (se necessário)
```bash
npm install tsx --save-dev
# ou
yarn add -D tsx
```

### Passo 2: Executar o script de teste
```bash
npx tsx scripts/test-gemini-2.5-flash.ts
```

### O que o script testa:
- ✅ Configuração do Product Analyzer (`gemini-2.5-flash-exp`)
- ✅ Análise de produto com imagem real
- ✅ Configuração do Vertex Agent (`gemini-2.5-flash-001`)
- ✅ Chat do Agente Ana
- ✅ Verificação dos nomes dos modelos no código

---

## 🔧 Método 2: Teste Manual via API

### Teste 1: Análise de Produto (gemini-2.5-flash-exp)

**Endpoint:** `POST /api/lojista/products/analyze`

**Exemplo com cURL:**
```bash
curl -X POST "http://localhost:3000/api/lojista/products/analyze?lojistaId=SEU_LOJISTA_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400"
  }'
```

**Exemplo com fetch (JavaScript):**
```javascript
const response = await fetch('/api/lojista/products/analyze?lojistaId=SEU_LOJISTA_ID', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400'
  })
});

const result = await response.json();
console.log(result);
```

**Resposta esperada (sucesso):**
```json
{
  "success": true,
  "data": {
    "nome_sugerido": "Vestido Longo Floral",
    "descricao_seo": "Vestido longo com estampa floral...",
    "suggested_category": "Vestidos",
    "product_type": "Vestido",
    "detected_fabric": "Algodão",
    "dominant_colors": [
      { "hex": "#FF5733", "name": "Vermelho Coral" }
    ],
    "tags": ["festa", "verão", "casual"]
  },
  "processingTime": 1234
}
```

**Verificações:**
- ✅ `success: true`
- ✅ Todos os campos obrigatórios presentes
- ✅ `processingTime` registrado
- ✅ Sem erros relacionados ao modelo

---

### Teste 2: Chat do Agente Ana (gemini-2.5-flash-001)

**Endpoint:** `POST /api/ai/chat`

**Exemplo com cURL:**
```bash
curl -X POST "http://localhost:3000/api/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Olá! Você está funcionando corretamente?",
    "lojistaId": "SEU_LOJISTA_ID"
  }'
```

**Exemplo com fetch (JavaScript):**
```javascript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Olá! Você está funcionando corretamente?',
    lojistaId: 'SEU_LOJISTA_ID'
  })
});

const result = await response.json();
console.log(result);
```

**Resposta esperada (sucesso):**
```json
{
  "text": "Olá! Sim, estou funcionando perfeitamente...",
  "groundingMetadata": {
    "webSearchQueries": []
  }
}
```

**Verificações:**
- ✅ `text` presente e não vazio
- ✅ Resposta coerente e contextualizada
- ✅ Sem erros relacionados ao modelo

---

## 🖥️ Método 3: Teste via Interface do Painel

### Teste de Análise de Produto:

1. **Acesse:** `/produtos/novo` ou `/produtos/[id]/editar`
2. **Faça upload de uma imagem** de produto
3. **Clique em "Analisar com IA"** (se disponível)
4. **Verifique se os campos são preenchidos automaticamente:**
   - Nome do produto
   - Descrição SEO
   - Categoria
   - Tipo de produto
   - Tecido
   - Cores predominantes

### Teste do Chat (Agente Ana):

1. **Acesse o chat** no painel administrativo
2. **Envie uma mensagem de teste:** "Olá, você está funcionando?"
3. **Verifique se recebe uma resposta coerente**

---

## 🔍 Método 4: Verificação no Código

### Verificar se os modelos estão corretos:

**1. Product Analyzer:**
```bash
grep -n "gemini-2.5-flash-exp" src/lib/ai-services/product-analyzer.ts
```
**Deve mostrar:** `modelId: "gemini-2.5-flash-exp"`

**2. Vertex Agent:**
```bash
grep -n "gemini-2.5-flash-001" src/lib/ai-services/vertex-agent.ts
```
**Deve mostrar:** `private modelName = "gemini-2.5-flash-001"`

**3. Verificar se não há referências ao modelo antigo:**
```bash
grep -r "gemini-2.0-flash" src/
```
**Deve retornar:** Nada (nenhuma ocorrência)

---

## ⚠️ Problemas Comuns e Soluções

### Erro: "Model not found" ou "404"
**Causa:** O modelo `gemini-2.5-flash-exp` ou `gemini-2.5-flash-001` pode não estar disponível na sua região.

**Solução:**
1. Verifique se o modelo está disponível na sua região no [Console do Vertex AI](https://console.cloud.google.com/vertex-ai)
2. Tente usar `us-central1` ou `us-east1`
3. Verifique se a API Vertex AI está habilitada no seu projeto

### Erro: "Permission denied" ou "403"
**Causa:** Credenciais inválidas ou sem permissões.

**Solução:**
1. Verifique se `GOOGLE_CLOUD_PROJECT_ID` está correto
2. Verifique se a Service Account tem permissões de Vertex AI User
3. Verifique se `GCP_SERVICE_ACCOUNT_KEY` está configurado corretamente

### Erro: "Invalid model name"
**Causa:** Nome do modelo incorreto ou não migrado.

**Solução:**
1. Verifique se a migração foi concluída (veja Método 4)
2. Reinicie o servidor Next.js após a migração
3. Limpe o cache: `rm -rf .next`

### Resposta vazia ou "No content"
**Causa:** Problema com o prompt ou configuração do modelo.

**Solução:**
1. Verifique os logs do servidor para mais detalhes
2. Teste com uma mensagem mais simples
3. Verifique se há filtros de segurança bloqueando a resposta

---

## 📊 Checklist de Validação

Marque cada item após testar:

- [ ] Script automatizado executado com sucesso
- [ ] Análise de produto retorna dados estruturados
- [ ] Chat do Agente Ana responde corretamente
- [ ] Nenhuma referência ao modelo antigo (`gemini-2.0-flash`)
- [ ] Logs não mostram erros relacionados ao modelo
- [ ] Tempo de resposta aceitável (< 5 segundos)
- [ ] Campos obrigatórios presentes nas respostas

---

## 📝 Logs para Monitorar

Durante os testes, monitore os logs do servidor:

**Logs esperados (sucesso):**
```
[ProductAnalyzer] 🔍 Iniciando análise de produto...
[ProductAnalyzer] 📤 Enviando requisição para Gemini...
[ProductAnalyzer] ✅ Resposta recebida
[ProductAnalyzer] ✅ Análise concluída em 1234 ms

[VertexAgent] 📤 Enviando mensagem para Gemini 2.5 Flash...
[VertexAgent] 📥 Resposta recebida de gemini-2.5-flash-001
[VertexAgent] ✅ Texto extraído: 150 caracteres
```

**Logs de erro (problema):**
```
[ProductAnalyzer] ❌ Erro da API: 404 Not Found
[VertexAgent] ❌ Erro Crítico: Model 'gemini-2.5-flash-001' not found
```

---

## 🎯 Resultado Esperado

Após todos os testes, você deve ter:

1. ✅ **Análise de produtos funcionando** com `gemini-2.5-flash-exp`
2. ✅ **Chat funcionando** com `gemini-2.5-flash-001`
3. ✅ **Sem erros** relacionados aos modelos
4. ✅ **Performance adequada** (respostas em < 5 segundos)
5. ✅ **Código limpo** sem referências ao modelo antigo

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do servidor
2. Confirme que as variáveis de ambiente estão corretas
3. Teste com o script automatizado primeiro
4. Verifique a documentação do [Vertex AI Gemini 2.5 Flash](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini)

---

**Última atualização:** 08/01/2026  
**Versão:** 1.0
