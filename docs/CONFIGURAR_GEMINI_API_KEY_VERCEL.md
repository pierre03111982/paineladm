# 🔑 Como Configurar GEMINI_API_KEY no Vercel

## ⚠️ Erro Atual

Se você está vendo o erro:
```
API Key do Gemini não encontrada. Configure GEMINI_API_KEY ou GOOGLE_API_KEY nas variáveis de ambiente.
```

Isso significa que a variável `GEMINI_API_KEY` não está configurada no ambiente de produção (Vercel).

---

## 📋 Passo a Passo para Configurar no Vercel

### 1. Obter a API Key do Gemini

1. Acesse: **https://aistudio.google.com/app/apikey**
2. Faça login com sua conta Google
3. Clique em **"Create API Key"** ou **"Criar chave de API"**
4. Selecione o projeto Google Cloud (ou crie um novo)
5. **Copie a chave gerada** (formato: `AIzaSyC...`)
   - ⚠️ **IMPORTANTE:** Guarde a chave com segurança, ela não será exibida novamente

### 2. Adicionar no Vercel

1. Acesse o **Vercel Dashboard**: https://vercel.com/dashboard
2. Selecione o projeto **`paineladm`**
3. Vá em **Settings** → **Environment Variables**
4. Clique em **"Add New"**
5. Preencha:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** `AIzaSyC...` (cole a chave que você copiou)
   - **Environments:** Marque todas as opções:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
6. Clique em **"Save"**

### 3. Fazer Novo Deploy

Após adicionar a variável, você precisa fazer um novo deploy:

**Opção 1: Deploy Automático (Recomendado)**
- Faça um commit e push para o repositório
- O Vercel fará deploy automaticamente

**Opção 2: Deploy Manual**
- No Vercel Dashboard, vá em **Deployments**
- Clique nos **3 pontos** do último deployment
- Selecione **"Redeploy"**

### 4. Verificar se Funcionou

1. Aguarde o deploy terminar
2. Acesse o painel: `https://paineladm.experimenteai.com.br/dashboard`
3. Abra o chatbot "Ana"
4. Envie uma mensagem de teste (ex: "oi")
5. Se funcionar, a configuração está correta! ✅

---

## 🔍 Verificação de Configuração

### Verificar se a Variável Está Configurada

No Vercel Dashboard:
1. Settings → Environment Variables
2. Procure por `GEMINI_API_KEY`
3. Deve aparecer com o valor mascarado (ex: `AIza...`)

### Verificar nos Logs do Vercel

1. Vá em **Deployments** → Selecione o último deployment
2. Clique em **"Build Logs"**
3. Procure por mensagens relacionadas a `GEMINI_API_KEY`
4. Não deve aparecer erros sobre "API Key não encontrada"

---

## 🚨 Troubleshooting

### Erro: "API Key do Gemini não encontrada"

**Causa:** A variável não está configurada ou o deploy foi feito antes de adicionar a variável.

**Solução:**
1. Verifique se `GEMINI_API_KEY` está em **Settings → Environment Variables**
2. Verifique se está marcada para **Production**
3. Faça um **novo deploy** após adicionar a variável

### Erro: "401 Unauthorized"

**Causa:** API key inválida ou expirada.

**Solução:**
1. Gere uma nova API key em https://aistudio.google.com/app/apikey
2. Atualize a variável no Vercel
3. Faça um novo deploy

### Erro: "403 Forbidden"

**Causa:** API key não tem permissões ou projeto não tem acesso ao Gemini.

**Solução:**
1. Verifique se a API key foi criada no projeto correto
2. Verifique se o projeto tem acesso ao Gemini API
3. Tente criar uma nova API key

### Erro: "404 Not Found" (Vertex AI)

**Causa:** O modelo não está disponível no Vertex AI do projeto.

**Solução:**
- Isso é normal! O sistema faz **fallback automático** para API direta
- Certifique-se apenas de que `GEMINI_API_KEY` está configurada
- O chatbot funcionará usando a API direta

---

## 📝 Checklist Rápido

- [ ] API key criada em https://aistudio.google.com/app/apikey
- [ ] Variável `GEMINI_API_KEY` adicionada no Vercel
- [ ] Variável marcada para Production, Preview e Development
- [ ] Novo deploy realizado após adicionar a variável
- [ ] Teste do chatbot funcionando

---

## 🔗 Links Úteis

- **Criar API Key:** https://aistudio.google.com/app/apikey
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Documentação Gemini:** https://ai.google.dev/docs
- **Preços Gemini:** https://ai.google.dev/pricing

---

**Última atualização:** 03 de Dezembro de 2025

