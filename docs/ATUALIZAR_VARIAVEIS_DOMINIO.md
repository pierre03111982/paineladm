# 🔧 Atualizar Variáveis de Ambiente Após Configurar Domínio

## 📋 Passo a Passo

### 1. Acesse o Painel da Vercel

1. Vá para: https://vercel.com/dashboard
2. Selecione o projeto **paineladm**
3. Clique em **Settings** → **Environment Variables**

### 2. Adicione/Atualize as Variáveis

Adicione ou atualize estas variáveis:

#### Variável Principal:
- **Nome:** `NEXT_PUBLIC_APP_URL`
- **Valor:** `https://www.experimenteai.com.br`
- **Environment:** Selecione todas (Production, Preview, Development)

#### Outras Variáveis (se necessário):
- **Nome:** `NEXT_PUBLIC_CLIENT_APP_URL`
- **Valor:** `https://www.experimenteai.com.br` (ou outro subdomínio se tiver)
- **Environment:** Todas

### 3. Salvar e Fazer Deploy

Após salvar as variáveis:

1. Vá em **Deployments**
2. Clique nos três pontos (...) do último deploy
3. Clique em **Redeploy**
4. Ou faça um novo deploy via CLI:
   ```bash
   cd E:\projetos\paineladm
   vercel --prod
   ```

### 4. Verificar

Após o deploy:

1. Acesse: `https://www.experimenteai.com.br/login`
2. Teste fazer login
3. Verifique se tudo está funcionando

---

## ⚠️ Importante

- As variáveis de ambiente são aplicadas no próximo deploy
- Certifique-se de selecionar todos os ambientes (Production, Preview, Development)
- Após atualizar, sempre faça um novo deploy

---

## 🔍 Como Verificar se Está Funcionando

1. Acesse o domínio: `https://www.experimenteai.com.br`
2. Deve carregar a página de login
3. Teste fazer login com suas credenciais
4. Verifique se o redirecionamento funciona corretamente



