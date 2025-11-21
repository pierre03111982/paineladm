# ⚡ Guia Rápido: Configurar Subdomínios

## 🌐 Passo 1: Adicionar Subdomínios no Vercel

### Para cada um dos 3 projetos:

1. **Acesse o projeto no Vercel Dashboard**
2. **Vá em Settings → Domains**
3. **Clique em "Add Domain"**
4. **Digite o subdomínio:**
   - Projeto modelo-1: `app1.experimenteai.com.br`
   - Projeto modelo-2: `app2.experimenteai.com.br`
   - Projeto modelo-3: `app3.experimenteai.com.br`
5. **Clique em "Add"**

### ⚠️ O que vai acontecer:

- O Vercel vai mostrar uma mensagem dizendo que o domínio precisa ser verificado
- Ele vai mostrar instruções de DNS
- **Anote o valor CNAME** que ele mostrar (geralmente `cname.vercel-dns.com`)

---

## 🔧 Passo 2: Configurar DNS

### Se você usa Cloudflare:

1. **Acesse:** https://dash.cloudflare.com
2. **Selecione o domínio:** `experimenteai.com.br`
3. **Vá em:** DNS → Records
4. **Clique em:** "Add record"

5. **Adicione 3 registros CNAME:**

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

### Se você usa outro provedor (GoDaddy, Registro.br, etc.):

1. **Acesse o painel de DNS do seu provedor**
2. **Adicione 3 registros CNAME:**
   - `app1` → `cname.vercel-dns.com`
   - `app2` → `cname.vercel-dns.com`
   - `app3` → `cname.vercel-dns.com`

---

## ⏳ Passo 3: Aguardar Propagação

- **Tempo:** 5 minutos a 2 horas (geralmente 15-30 minutos)
- **Como verificar:** No Vercel, vá em Settings → Domains e veja se o status mudou para "Valid" ✅

---

## ✅ Passo 4: Verificar

Teste no navegador:
- https://app1.experimenteai.com.br
- https://app2.experimenteai.com.br
- https://app3.experimenteai.com.br

Todos devem carregar sem erros!

---

## 🎯 Próximo Passo

Depois que os subdomínios estiverem funcionando, você precisa:

1. **Configurar variáveis de ambiente no projeto `paineladm`:**
   - `NEXT_PUBLIC_MODELO_1_URL=https://app1.experimenteai.com.br`
   - `NEXT_PUBLIC_MODELO_2_URL=https://app2.experimenteai.com.br`
   - `NEXT_PUBLIC_MODELO_3_URL=https://app3.experimenteai.com.br`

2. **Fazer um novo deploy do paineladm**

---

**Dica:** Se o DNS demorar para propagar, seja paciente. Pode levar até 48 horas, mas geralmente é rápido (15-30 minutos).

