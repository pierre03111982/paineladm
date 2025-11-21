# 🚀 Guia Passo a Passo: Configurar Modelos 1, 2 e 3 no Vercel

Este guia prático vai te ajudar a configurar os 3 modelos de apps cliente no Vercel com subdomínios profissionais.

## 📋 Pré-requisitos

- ✅ Conta no Vercel (https://vercel.com)
- ✅ Repositório Git com os 3 modelos (GitHub, GitLab, Bitbucket)
- ✅ Acesso ao provedor de DNS (Cloudflare, GoDaddy, Registro.br, etc.)
- ✅ Domínio `experimenteai.com.br` configurado

---

## 🎯 Passo 1: Preparar os Repositórios no Git

Certifique-se de que os 3 modelos estão no mesmo repositório ou em repositórios separados:

### Opção A: Repositório Único (Recomendado)
Se todos os modelos estão no mesmo repositório:
- Estrutura: `apps-cliente/modelo-1`, `apps-cliente/modelo-2`, `apps-cliente/modelo-3`

### Opção B: Repositórios Separados
Se cada modelo está em um repositório separado:
- `apps-cliente-modelo1`
- `apps-cliente-modelo2`
- `apps-cliente-modelo3`

---

## 🚀 Passo 2: Criar os 3 Projetos no Vercel

### 2.1. Acesse o Vercel Dashboard
1. Vá para https://vercel.com/new
2. Faça login na sua conta

### 2.2. Criar Projeto para Modelo 1

1. **Importar Repositório:**
   - Selecione o repositório que contém o modelo-1
   - Clique em **"Import"**

2. **Configurar Projeto:**
   - **Project Name**: `apps-cliente-modelo1` (ou o nome que preferir)
   - **Framework Preset**: Next.js (deve detectar automaticamente)
   - **Root Directory**: `apps-cliente/modelo-1` ⚠️ **IMPORTANTE!**
   - **Build Command**: (deixar padrão ou `npm run build`)
   - **Output Directory**: `.next` (padrão)
   - **Install Command**: `npm install`

3. **Environment Variables** (por enquanto, deixe vazio - vamos configurar depois)

4. **Clique em "Deploy"**

### 2.3. Criar Projeto para Modelo 2

Repita o processo acima, mas com:
- **Project Name**: `apps-cliente-modelo2`
- **Root Directory**: `apps-cliente/modelo-2` ⚠️ **IMPORTANTE!**

### 2.4. Criar Projeto para Modelo 3

Repita o processo acima, mas com:
- **Project Name**: `apps-cliente-modelo3`
- **Root Directory**: `apps-cliente/modelo-3` ⚠️ **IMPORTANTE!**

---

## 🌐 Passo 3: Configurar Subdomínios no Vercel

### 3.1. Configurar Subdomínio para Modelo 1

1. **No projeto `apps-cliente-modelo1` no Vercel:**
   - Vá em **Settings** → **Domains**
   - Clique em **"Add Domain"**
   - Digite: `app1.experimenteai.com.br`
   - Clique em **"Add"**

2. **Copie as instruções de DNS:**
   - O Vercel mostrará um registro CNAME
   - Anote o valor (geralmente algo como `cname.vercel-dns.com`)

### 3.2. Configurar Subdomínio para Modelo 2

1. **No projeto `apps-cliente-modelo2` no Vercel:**
   - Vá em **Settings** → **Domains**
   - Clique em **"Add Domain"**
   - Digite: `app2.experimenteai.com.br`
   - Clique em **"Add"**

### 3.3. Configurar Subdomínio para Modelo 3

1. **No projeto `apps-cliente-modelo3` no Vercel:**
   - Vá em **Settings** → **Domains**
   - Clique em **"Add Domain"**
   - Digite: `app3.experimenteai.com.br`
   - Clique em **"Add"**

---

## 🔧 Passo 4: Configurar DNS no Provedor

### 4.1. Se você usa Cloudflare:

1. **Acesse o Cloudflare Dashboard**
   - Vá para https://dash.cloudflare.com
   - Selecione o domínio `experimenteai.com.br`

2. **Adicionar Registros CNAME:**
   - Vá em **DNS** → **Records**
   - Clique em **"Add record"**

3. **Adicione os 3 registros:**

   **Registro 1:**
   ```
   Tipo: CNAME
   Nome: app1
   Conteúdo: cname.vercel-dns.com
   Proxy: Ativado (nuvem laranja) ✅
   TTL: Auto
   ```

   **Registro 2:**
   ```
   Tipo: CNAME
   Nome: app2
   Conteúdo: cname.vercel-dns.com
   Proxy: Ativado (nuvem laranja) ✅
   TTL: Auto
   ```

   **Registro 3:**
   ```
   Tipo: CNAME
   Nome: app3
   Conteúdo: cname.vercel-dns.com
   Proxy: Ativado (nuvem laranja) ✅
   TTL: Auto
   ```

4. **Salve os registros**

### 4.2. Se você usa outro provedor (GoDaddy, Registro.br, etc.):

1. **Acesse o painel de DNS do seu provedor**
2. **Adicione 3 registros CNAME:**
   - `app1` → `cname.vercel-dns.com`
   - `app2` → `cname.vercel-dns.com`
   - `app3` → `cname.vercel-dns.com`

3. **Siga as instruções específicas do Vercel** que aparecem ao adicionar o domínio

---

## ⏳ Passo 5: Aguardar Propagação DNS

- **Tempo estimado**: 5 minutos a 2 horas (geralmente 15-30 minutos)
- **Como verificar**: 
  - No Vercel: Settings → Domains → Verifique se o status mudou para "Valid"
  - Ou use: `nslookup app1.experimenteai.com.br` no terminal

---

## 🔐 Passo 6: Configurar Variáveis de Ambiente no Painel Adm

### 6.1. No Projeto Painel Adm no Vercel:

1. **Acesse o projeto `paineladm` no Vercel**
2. **Vá em Settings → Environment Variables**
3. **Adicione as seguintes variáveis para Production:**

```env
NEXT_PUBLIC_MODELO_1_URL=https://app1.experimenteai.com.br
NEXT_PUBLIC_MODELO_2_URL=https://app2.experimenteai.com.br
NEXT_PUBLIC_MODELO_3_URL=https://app3.experimenteai.com.br
```

4. **Para cada variável:**
   - Clique em **"Add New"**
   - Digite o nome da variável
   - Digite o valor
   - Selecione **"Production"** (e também "Preview" e "Development" se quiser)
   - Clique em **"Save"**

5. **Faça um novo deploy do paineladm:**
   - Vá em **Deployments**
   - Clique nos 3 pontos (⋯) do último deployment
   - Selecione **"Redeploy"**

---

## ✅ Passo 7: Verificação Final

### 7.1. Verificar Subdomínios:

Teste cada subdomínio no navegador:
- ✅ https://app1.experimenteai.com.br
- ✅ https://app2.experimenteai.com.br
- ✅ https://app3.experimenteai.com.br

Todos devem carregar sem erros.

### 7.2. Verificar no Painel Adm:

1. **Acesse o Painel Adm**
2. **Vá em "Aplicativo Cliente"**
3. **Verifique se os links aparecem corretamente:**
   - Deve mostrar: `https://app1.experimenteai.com.br/{lojistaId}/login`
   - Deve mostrar: `https://app2.experimenteai.com.br/{lojistaId}/login`
   - Deve mostrar: `https://app3.experimenteai.com.br/{lojistaId}/login`

4. **Teste cada link** clicando nele

---

## 🐛 Troubleshooting

### ❌ Erro: "Domain not found" no Vercel

**Solução:**
- Verifique se o DNS foi configurado corretamente
- Aguarde mais tempo para propagação (pode levar até 48h, mas geralmente é rápido)
- Verifique se o registro CNAME está correto

### ❌ Erro 404 ao acessar o subdomínio

**Solução:**
- Verifique se o projeto está deployado no Vercel
- Verifique se o domínio está conectado ao projeto correto
- Verifique se o Root Directory está configurado corretamente

### ❌ SSL não está funcionando

**Solução:**
- O Vercel configura SSL automaticamente, mas pode levar alguns minutos
- Verifique em Settings → Domains se "Force HTTPS" está ativado
- Aguarde 5-10 minutos após adicionar o domínio

### ❌ Links no Painel Adm ainda mostram localhost

**Solução:**
- Verifique se as variáveis de ambiente foram adicionadas corretamente
- Faça um novo deploy do paineladm
- Limpe o cache do navegador

---

## 📝 Checklist Final

Use este checklist para garantir que tudo está configurado:

- [ ] 3 projetos criados no Vercel (modelo-1, modelo-2, modelo-3)
- [ ] Root Directory configurado corretamente em cada projeto
- [ ] 3 subdomínios adicionados no Vercel (app1, app2, app3)
- [ ] 3 registros CNAME adicionados no DNS
- [ ] DNS propagado (status "Valid" no Vercel)
- [ ] Variáveis de ambiente configuradas no paineladm
- [ ] Novo deploy do paineladm realizado
- [ ] Todos os 3 subdomínios acessíveis no navegador
- [ ] Links aparecem corretamente no Painel Adm
- [ ] Teste de acesso com um lojistaId real

---

## 🎉 Pronto!

Agora você tem:
- ✅ `https://app1.experimenteai.com.br` → Modelo 1
- ✅ `https://app2.experimenteai.com.br` → Modelo 2
- ✅ `https://app3.experimenteai.com.br` → Modelo 3

Todos os links no Painel Adm agora usarão esses subdomínios profissionais!

---

**Última atualização**: $(date)

**Dúvidas?** Consulte a documentação oficial do Vercel: https://vercel.com/docs/concepts/projects/domains

