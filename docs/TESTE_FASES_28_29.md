# Guia de Testes - Fases 28 e 29

**Data:** 2025-01-06  
**Fases:** PHASE 28 (Auto-Tagging) e PHASE 29 (Deep Customer Profiling)

---

## 📋 Pré-requisitos

1. **Variáveis de Ambiente Configuradas:**
   ```env
   GOOGLE_CLOUD_PROJECT_ID=seu-projeto-id
   GOOGLE_CLOUD_LOCATION=us-central1
   FIREBASE_PROJECT_ID=seu-projeto-id
   FIREBASE_CLIENT_EMAIL=seu-email@projeto.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
   ```

2. **Servidor em Execução:**
   ```bash
   cd paineladm
   npm run dev
   ```

3. **Acesso ao Painel:**
   - Login como lojista
   - Acesso à página de produtos

---

## 🧪 TESTE 1: FASE 28 - Análise Automática de Produto

### 1.1 Teste Básico: Upload de Imagem

**Passos:**
1. Acesse: `http://localhost:3000/produtos/novo?lojistaId=SEU_LOJISTA_ID`
2. Clique em "Selecionar Imagem"
3. Faça upload de uma foto de produto (ex: vestido, biquíni, casaco)

**Resultado Esperado:**
- ✅ Após o upload, aparece mensagem: "✨ IA analisando produto..."
- ✅ Após alguns segundos, campos são preenchidos automaticamente:
  - **Nome**: Preenchido com título comercial
  - **Categoria**: Selecionada automaticamente
  - **Tags**: Preenchidas com tags relevantes (incluindo tags de contexto)
  - **Cores**: Preenchida com cor predominante
  - **Observações**: Preenchida com descrição SEO
- ✅ Ícones mágicos (✨) aparecem ao lado dos campos preenchidos
- ✅ Mensagem de sucesso: "✨ Produto analisado automaticamente pela IA! Campos preenchidos."

**Verificar no Console do Navegador:**
```javascript
// Deve aparecer:
[ManualProductForm] 🔍 Iniciando análise automática de produto...
[ProductAnalyzer] 🔍 Iniciando análise de produto: ...
[ProductAnalyzer] ✅ Análise concluída em X ms
[ManualProductForm] ✅ Análise automática concluída: { nome_sugerido: "...", tags: [...] }
```

---

### 1.2 Teste: Upload de Biquíni (Verificar Tags de Cenário)

**Passos:**
1. Faça upload de uma foto de biquíni ou maiô
2. Aguarde a análise automática

**Resultado Esperado:**
- ✅ Campo **Tags** deve conter: `praia` ou `swimwear`
- ✅ Isso ativa a regra "Bikini Law" no `scenarioMatcher`

**Verificar:**
- Abra o campo Tags e confirme que contém palavras-chave de praia

---

### 1.3 Teste: Upload de Casaco de Inverno

**Passos:**
1. Faça upload de uma foto de casaco, sobretudo ou roupa de frio
2. Aguarde a análise automática

**Resultado Esperado:**
- ✅ Campo **Tags** deve conter: `inverno` ou `winter`
- ✅ Isso ativa a regra "Winter Rule" no `scenarioMatcher`

---

### 1.4 Teste: Upload de Roupa de Academia

**Passos:**
1. Faça upload de uma foto de legging, top ou roupa de ginástica
2. Aguarde a análise automática

**Resultado Esperado:**
- ✅ Campo **Tags** deve conter: `fitness` ou `gym`
- ✅ Isso ativa a regra "Gym Integrity" no `scenarioMatcher`

---

### 1.5 Teste: Botão "Regenerar com IA"

**Passos:**
1. Após upload e análise automática
2. Clique no botão "✨ Regenerar com IA"

**Resultado Esperado:**
- ✅ Análise é executada novamente
- ✅ Campos são atualizados com novos valores (pode variar)
- ✅ Mensagem de sucesso aparece novamente

---

### 1.6 Teste: URL Manual

**Passos:**
1. No campo "Ou adicione a imagem por URL"
2. Cole uma URL de imagem (ex: `https://exemplo.com/produto.jpg`)
3. Clique fora do campo (onBlur)

**Resultado Esperado:**
- ✅ Análise automática é disparada
- ✅ Campos são preenchidos

**Alternativa:**
- Clique no botão ✨ ao lado do campo URL para forçar análise

---

### 1.7 Teste: Edição Manual de Campos Preenchidos

**Passos:**
1. Após análise automática
2. Edite manualmente um campo que tinha ícone ✨

**Resultado Esperado:**
- ✅ Ícone ✨ desaparece quando você começa a editar
- ✅ Campo volta a ser "manual"

---

### 1.8 Teste: Erro na Análise (Fallback)

**Cenário:** Simular erro na API do Gemini

**Como Simular:**
- Desligue temporariamente a internet
- Ou use uma URL de imagem inválida

**Resultado Esperado:**
- ✅ Erro não quebra o formulário
- ✅ Usuário pode preencher manualmente
- ✅ Mensagem de erro não aparece (erro suave)

---

## 🧪 TESTE 2: FASE 29 - Deep Customer Profiling

### 2.1 Teste: Try-On Atualiza DNA

**Passos:**
1. No app modelo-2, faça login como cliente
2. Selecione uma foto
3. Selecione produtos (com tags, cores, tecidos preenchidos pela FASE 28)
4. Clique em "Criar Look"
5. Aguarde a geração

**Resultado Esperado:**
- ✅ Look é gerado com sucesso
- ✅ DNA do cliente é atualizado em background (peso 1 para Try-on)

**Verificar no Firestore:**
```
/lojas/{lojistaId}/clientes/{clienteId}
  → dnaEstilo: {
      coresPreferidas: { "preto": 1, ... },
      tecidosPreferidos: { "algodão": 1, ... },
      tagsInteresse: { "festa": 1, ... },
      faixaPrecoMedia: 299.90,
      tamanhosProvados: { "M": 1, ... }
    }
```

**Verificar no Console do Backend:**
```javascript
[API] ✅ DNA de Estilo atualizado (Try-on)
[client-profiling] ✅ DNA de Estilo atualizado: { clienteId, interactionType: "try-on", weight: 1, ... }
```

---

### 2.2 Teste: Like Atualiza DNA (Peso 3)

**Passos:**
1. Após gerar look no app modelo-2
2. Clique em "Curtir" (👍) na tela de resultado

**Resultado Esperado:**
- ✅ DNA é atualizado com peso 3 (maior que Try-on)
- ✅ Valores das preferências aumentam

**Verificar no Firestore:**
```
dnaEstilo: {
  coresPreferidas: { "preto": 4, ... },  // 1 (try-on) + 3 (like) = 4
  tecidosPreferidos: { "algodão": 4, ... },
  tagsInteresse: { "festa": 4, ... }
}
```

**Verificar no Console:**
```javascript
[api/actions] ✅ DNA de Estilo atualizado (Like)
[client-profiling] ✅ DNA de Estilo atualizado: { interactionType: "like", weight: 3, ... }
```

---

### 2.3 Teste: Múltiplas Interações Acumulam

**Passos:**
1. Gere 3 looks diferentes (Try-on)
2. Curta 2 deles (Like)
3. Verifique o DNA acumulado

**Resultado Esperado:**
- ✅ DNA reflete todas as interações
- ✅ Produtos mais curtidos têm maior peso
- ✅ Faixa de preço média é calculada corretamente

**Exemplo de Cálculo:**
```
Try-on 1: Produto Preto, Algodão, Festa → peso 1
Like 1:   Produto Preto, Algodão, Festa → peso 3
Try-on 2: Produto Azul, Linho, Casual → peso 1
Like 2:   Produto Azul, Linho, Casual → peso 3
Try-on 3: Produto Preto, Couro, Inverno → peso 1

Resultado:
coresPreferidas: { "preto": 5, "azul": 4 }  // preto ganha
tecidosPreferidos: { "algodão": 4, "linho": 4, "couro": 1 }
tagsInteresse: { "festa": 4, "casual": 4, "inverno": 1 }
```

---

### 2.4 Teste: Visualização no Painel do Lojista

**Passos:**
1. Acesse: `http://localhost:3000/clientes/{clienteId}?lojistaId={lojistaId}`
2. Role até a seção "DNA de Estilo (IA)"

**Resultado Esperado:**
- ✅ Seção aparece se o cliente tem `dnaEstilo` preenchido
- ✅ **Top Cores**: Bolinhas coloridas com as 5 cores mais pontuadas
- ✅ **Tecidos Favoritos**: Tags com tecidos e pontuações
- ✅ **Nuvem de Interesse**: Tags de contexto (festa, inverno, etc.)
- ✅ **Faixa de Preço Média**: Valor em R$
- ✅ **Tamanhos Mais Provados**: Tags com tamanhos
- ✅ **Sugestão de Abordagem**: Texto gerado automaticamente

**Exemplo de Sugestão:**
> "Este cliente prefere tons de preto e azul. Gosta de tecidos como algodão e linho. Interesse em looks de festa, casual. Faixa de preço média: R$ 299,90. Ofereça produtos alinhados a essas preferências."

---

### 2.5 Teste: Cliente Sem DNA (Primeira Interação)

**Passos:**
1. Crie um novo cliente (ou use um sem interações)
2. Gere um look (Try-on)

**Resultado Esperado:**
- ✅ DNA é criado automaticamente na primeira interação
- ✅ Todos os campos são inicializados corretamente

---

### 2.6 Teste: Produto Sem Tags/Cores (Fallback)

**Passos:**
1. Use um produto antigo (sem tags da FASE 28)
2. Gere look e curta

**Resultado Esperado:**
- ✅ DNA ainda é atualizado (usa categoria como tag)
- ✅ Sistema não quebra se produto não tem todos os campos

---

## 🔍 Verificações Técnicas

### Verificar API de Análise

**Teste Manual via cURL:**
```bash
curl -X POST http://localhost:3000/api/lojista/products/analyze \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=SEU_TOKEN" \
  -d '{
    "imageUrl": "https://exemplo.com/produto.jpg"
  }'
```

**Resposta Esperada:**
```json
{
  "success": true,
  "data": {
    "nome_sugerido": "Vestido Longo Floral de Verão",
    "descricao_seo": "Descrição persuasiva...",
    "categoria_sugerida": "Vestidos",
    "tags": ["praia", "verão", "floral", "vestido", "casual"],
    "cor_predominante": "Azul",
    "tecido_estimado": "Algodão",
    "detalhes": ["decote em V", "manga curta"]
  },
  "processingTime": 1234
}
```

---

### Verificar DNA no Firestore

**Query no Firestore Console:**
```javascript
// Coleção: lojas/{lojistaId}/clientes/{clienteId}
// Campo: dnaEstilo

// Exemplo de documento:
{
  id: "cliente123",
  nome: "Maria Silva",
  dnaEstilo: {
    coresPreferidas: {
      "preto": 15,
      "azul": 4,
      "branco": 2
    },
    tecidosPreferidos: {
      "algodão": 8,
      "linho": 2
    },
    tagsInteresse: {
      "festa": 10,
      "inverno": 5,
      "decote-v": 3
    },
    faixaPrecoMedia: 299.90,
    tamanhosProvados: {
      "M": 10,
      "G": 2
    },
    ultimaAtualizacao: "2025-01-06T12:00:00.000Z"
  }
}
```

---

## 🐛 Troubleshooting

### Problema: Análise não dispara automaticamente

**Soluções:**
1. Verifique se a imagem foi enviada com sucesso (deve aparecer no preview)
2. Verifique o console do navegador para erros
3. Verifique se `lojistaId` está presente na URL
4. Verifique se a API `/api/lojista/products/analyze` está acessível

---

### Problema: Campos não são preenchidos

**Soluções:**
1. Verifique o console do navegador:
   ```javascript
   [ManualProductForm] ✅ Análise automática concluída: { ... }
   ```
2. Verifique se a resposta da API contém `success: true`
3. Verifique se os campos estão sendo atualizados no estado React

---

### Problema: DNA não é atualizado

**Soluções:**
1. Verifique se `customerId` está presente na requisição
2. Verifique se o produto tem dados (tags, cores, etc.)
3. Verifique o console do backend:
   ```javascript
   [client-profiling] ✅ DNA de Estilo atualizado
   ```
4. Verifique se o documento do cliente existe no Firestore

---

### Problema: Erro "Serviço não configurado"

**Soluções:**
1. Verifique variáveis de ambiente:
   ```bash
   echo $GOOGLE_CLOUD_PROJECT_ID
   echo $GOOGLE_CLOUD_LOCATION
   ```
2. Reinicie o servidor após configurar variáveis
3. Verifique se o Firebase Admin está inicializado

---

### Problema: Gemini retorna erro 429 (Rate Limit)

**Soluções:**
1. Aguarde alguns minutos (limite de 5 RPM)
2. Implemente retry automático (já está no código)
3. Use cache para evitar análises repetidas

---

## 📊 Checklist de Validação

### FASE 28 ✅
- [ ] Upload de imagem dispara análise automática
- [ ] Campos são preenchidos automaticamente
- [ ] Ícones mágicos aparecem nos campos preenchidos
- [ ] Botão "Regenerar com IA" funciona
- [ ] Tags incluem palavras-chave de cenário (praia, inverno, fitness)
- [ ] URL manual também dispara análise
- [ ] Erro na análise não quebra o formulário

### FASE 29 ✅
- [ ] Try-on atualiza DNA (peso 1)
- [ ] Like atualiza DNA (peso 3)
- [ ] Múltiplas interações acumulam corretamente
- [ ] DNA aparece no perfil do cliente
- [ ] Top cores são exibidas corretamente
- [ ] Tecidos favoritos são exibidos
- [ ] Nuvem de interesse mostra tags relevantes
- [ ] Sugestão de abordagem é gerada

---

## 🎯 Testes de Integração End-to-End

### Fluxo Completo: Upload → Análise → Try-on → Like → Visualização

**Passos:**
1. **Upload e Análise (FASE 28):**
   - Faça upload de foto de biquíni
   - Verifique que tags incluem "praia"
   - Salve o produto

2. **Try-on (FASE 29):**
   - No app modelo-2, selecione o produto criado
   - Gere look
   - Verifique no Firestore que DNA foi atualizado (peso 1)

3. **Like (FASE 29):**
   - Curta o look gerado
   - Verifique no Firestore que DNA foi atualizado (peso 3)

4. **Visualização (FASE 29):**
   - Acesse perfil do cliente no painel
   - Verifique seção "DNA de Estilo (IA)"
   - Confirme que mostra preferências corretas

---

## 📝 Logs para Monitorar

### Backend (Node.js)
```bash
# Análise de Produto
[ProductAnalyzer] 🔍 Iniciando análise de produto
[ProductAnalyzer] ✅ Análise concluída em X ms

# Profiling de Cliente
[client-profiling] ✅ DNA de Estilo atualizado
[API] ✅ DNA de Estilo atualizado (Try-on)
[api/actions] ✅ DNA de Estilo atualizado (Like)
```

### Frontend (Navegador)
```javascript
// Abra DevTools → Console
[ManualProductForm] 🔍 Iniciando análise automática de produto...
[ManualProductForm] ✅ Análise automática concluída: { ... }
```

---

## 🚀 Próximos Passos Após Testes

1. **Validar Tags de Cenário:**
   - Teste com diferentes tipos de produtos
   - Verifique se cenários corretos são ativados no `scenarioMatcher`

2. **Otimizar Performance:**
   - Cache de análises (evitar reanalisar mesma imagem)
   - Debounce no botão "Regenerar"

3. **Melhorar Sugestões:**
   - Ajustar prompt do Gemini para descrições mais persuasivas
   - Adicionar mais contexto sobre a loja no prompt

4. **Integrar Checkout:**
   - Adicionar atualização de DNA quando cliente compra (peso 10)

---

**Boa sorte com os testes! 🎉**

