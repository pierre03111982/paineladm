# 🔧 Adicionar Variável NEXT_PUBLIC_BACKEND_URL nos Modelos 1, 2 e 3

## 📋 Informações dos Projetos

- **Modelo 1:** `apps-cliente-modelo01` → `app1.experimenteai.com.br`
- **Modelo 2:** `apps-cliente-modelo02` → `app2.experimenteai.com.br`
- **Modelo 3:** `apps-cliente-modelo03` → `app3.experimenteai.com.br`

## 🎯 Variável a Adicionar

**Nome:** `NEXT_PUBLIC_BACKEND_URL`  
**Valor:** `https://www.experimenteai.com.br`  
**Ambientes:** Production, Preview, Development

## 📝 Passo a Passo para Cada Projeto

### 1. Modelo 1 (app1.experimenteai.com.br)

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **`apps-cliente-modelo01`**
3. Vá em **Settings** → **Environment Variables**
4. Clique em **"Add New"**
5. Preencha:
   - **Key:** `NEXT_PUBLIC_BACKEND_URL`
   - **Value:** `https://www.experimenteai.com.br`
   - **Environments:** Marque todas (Production, Preview, Development)
6. Clique em **"Save"**
7. Vá em **Deployments** → Clique nos três pontos do último deploy → **"Redeploy"** (sem cache)

### 2. Modelo 2 (app2.experimenteai.com.br)

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **`apps-cliente-modelo02`**
3. Vá em **Settings** → **Environment Variables**
4. Clique em **"Add New"**
5. Preencha:
   - **Key:** `NEXT_PUBLIC_BACKEND_URL`
   - **Value:** `https://www.experimenteai.com.br`
   - **Environments:** Marque todas (Production, Preview, Development)
6. Clique em **"Save"**
7. Vá em **Deployments** → Clique nos três pontos do último deploy → **"Redeploy"** (sem cache)

### 3. Modelo 3 (app3.experimenteai.com.br)

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **`apps-cliente-modelo03`**
3. Vá em **Settings** → **Environment Variables**
4. Clique em **"Add New"**
5. Preencha:
   - **Key:** `NEXT_PUBLIC_BACKEND_URL`
   - **Value:** `https://www.experimenteai.com.br`
   - **Environments:** Marque todas (Production, Preview, Development)
6. Clique em **"Save"**
7. Vá em **Deployments** → Clique nos três pontos do último deploy → **"Redeploy"** (sem cache)

## ✅ Verificação

Após adicionar a variável e fazer redeploy em cada projeto:

1. Acesse cada app:
   - https://app1.experimenteai.com.br
   - https://app2.experimenteai.com.br
   - https://app3.experimenteai.com.br

2. Teste os botões de like/dislike (se aplicável)

3. Verifique no console do navegador se não há erros relacionados a `NEXT_PUBLIC_BACKEND_URL`

## 🔍 Alternativa: Usar NEXT_PUBLIC_PAINELADM_URL

Se preferir usar um nome diferente, você pode adicionar:

**Nome:** `NEXT_PUBLIC_PAINELADM_URL`  
**Valor:** `https://www.experimenteai.com.br`

O código já suporta ambas as variáveis, então qualquer uma funciona.

## 📝 Nota Importante

- A variável `NEXT_PUBLIC_*` é pública e acessível no cliente
- Ela será usada para fazer requisições ao backend (paineladm)
- Após adicionar, é necessário fazer **redeploy** para a variável ter efeito
- Sem essa variável, os apps tentarão usar `http://localhost:3000` (que não funciona em produção)



## 📋 Informações dos Projetos

- **Modelo 1:** `apps-cliente-modelo01` → `app1.experimenteai.com.br`
- **Modelo 2:** `apps-cliente-modelo02` → `app2.experimenteai.com.br`
- **Modelo 3:** `apps-cliente-modelo03` → `app3.experimenteai.com.br`

## 🎯 Variável a Adicionar

**Nome:** `NEXT_PUBLIC_BACKEND_URL`  
**Valor:** `https://www.experimenteai.com.br`  
**Ambientes:** Production, Preview, Development

## 📝 Passo a Passo para Cada Projeto

### 1. Modelo 1 (app1.experimenteai.com.br)

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **`apps-cliente-modelo01`**
3. Vá em **Settings** → **Environment Variables**
4. Clique em **"Add New"**
5. Preencha:
   - **Key:** `NEXT_PUBLIC_BACKEND_URL`
   - **Value:** `https://www.experimenteai.com.br`
   - **Environments:** Marque todas (Production, Preview, Development)
6. Clique em **"Save"**
7. Vá em **Deployments** → Clique nos três pontos do último deploy → **"Redeploy"** (sem cache)

### 2. Modelo 2 (app2.experimenteai.com.br)

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **`apps-cliente-modelo02`**
3. Vá em **Settings** → **Environment Variables**
4. Clique em **"Add New"**
5. Preencha:
   - **Key:** `NEXT_PUBLIC_BACKEND_URL`
   - **Value:** `https://www.experimenteai.com.br`
   - **Environments:** Marque todas (Production, Preview, Development)
6. Clique em **"Save"**
7. Vá em **Deployments** → Clique nos três pontos do último deploy → **"Redeploy"** (sem cache)

### 3. Modelo 3 (app3.experimenteai.com.br)

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **`apps-cliente-modelo03`**
3. Vá em **Settings** → **Environment Variables**
4. Clique em **"Add New"**
5. Preencha:
   - **Key:** `NEXT_PUBLIC_BACKEND_URL`
   - **Value:** `https://www.experimenteai.com.br`
   - **Environments:** Marque todas (Production, Preview, Development)
6. Clique em **"Save"**
7. Vá em **Deployments** → Clique nos três pontos do último deploy → **"Redeploy"** (sem cache)

## ✅ Verificação

Após adicionar a variável e fazer redeploy em cada projeto:

1. Acesse cada app:
   - https://app1.experimenteai.com.br
   - https://app2.experimenteai.com.br
   - https://app3.experimenteai.com.br

2. Teste os botões de like/dislike (se aplicável)

3. Verifique no console do navegador se não há erros relacionados a `NEXT_PUBLIC_BACKEND_URL`

## 🔍 Alternativa: Usar NEXT_PUBLIC_PAINELADM_URL

Se preferir usar um nome diferente, você pode adicionar:

**Nome:** `NEXT_PUBLIC_PAINELADM_URL`  
**Valor:** `https://www.experimenteai.com.br`

O código já suporta ambas as variáveis, então qualquer uma funciona.

## 📝 Nota Importante

- A variável `NEXT_PUBLIC_*` é pública e acessível no cliente
- Ela será usada para fazer requisições ao backend (paineladm)
- Após adicionar, é necessário fazer **redeploy** para a variável ter efeito
- Sem essa variável, os apps tentarão usar `http://localhost:3000` (que não funciona em produção)



