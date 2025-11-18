# 🔧 Como Adicionar CNAME no Vercel

## 📋 Situação
O domínio `experimenteai.com.br` está usando os nameservers do Vercel (`ns1.vercel-dns.com` e `ns2.vercel-dns.com`), então **todos os registros DNS devem ser gerenciados no Vercel**, não na Hostinger.

---

## 🎯 Objetivo
Adicionar um registro CNAME para `app.experimenteai.com.br` apontando para `cname.vercel-dns.com` no Vercel.

---

## 📝 Passo a Passo

### Opção 1: Via Dashboard do Vercel (Recomendado)

1. **Acesse o Dashboard do Vercel:**
   - Vá para: https://vercel.com/dashboard
   - Faça login na sua conta

2. **Acesse a seção de Domínios:**
   - No menu lateral, clique em **Settings** (ou vá diretamente para: https://vercel.com/dashboard/domains)
   - Clique em **Domains** no menu lateral

3. **Selecione o domínio:**
   - Encontre e clique no domínio `experimenteai.com.br` (ou `www.experimenteai.com.br`)

4. **Adicione o registro CNAME:**
   - Procure a seção **DNS Records** ou **DNS Configuration**
   - Clique em **Add Record** ou **Add DNS Record**
   - Preencha:
     - **Type:** Selecione `CNAME`
     - **Name:** Digite `app` (sem o domínio, apenas `app`)
     - **Value:** Digite `cname.vercel-dns.com`
     - **TTL:** Deixe `3600` ou padrão
   - Clique em **Save** ou **Add**

5. **Verifique:**
   - O registro deve aparecer na lista de DNS Records
   - Aguarde alguns minutos para propagação

---

### Opção 2: Via CLI do Vercel

Se preferir usar o terminal:

```bash
# Instalar Vercel CLI (se ainda não tiver)
npm i -g vercel

# Fazer login
vercel login

# Adicionar o registro CNAME
# Nota: O Vercel CLI não tem comando direto para DNS, então use a Opção 1
```

---

### Opção 3: Se não encontrar a opção de DNS

Se você não encontrar a seção de DNS Records no projeto:

1. Acesse diretamente: https://vercel.com/dashboard/domains
2. Clique no domínio `experimenteai.com.br`
3. Procure por **DNS Records** ou **DNS Configuration**
4. Adicione o registro CNAME conforme descrito acima

---

## ✅ Verificação

Após adicionar o registro:

1. **No Vercel:**
   - O registro deve aparecer na lista de DNS Records
   - Status deve ser "Active" ou similar

2. **Teste de propagação:**
   - Aguarde 5-10 minutos
   - Use um verificador DNS online: https://dnschecker.org
   - Digite: `app.experimenteai.com.br`
   - Verifique se o CNAME está apontando para `cname.vercel-dns.com`

3. **No projeto appmelhorado:**
   - Vá em Settings → Domains
   - Adicione o domínio `app.experimenteai.com.br`
   - O Vercel deve detectar automaticamente o registro CNAME

---

## 🔍 Troubleshooting

### Não encontro a opção de DNS Records
- Certifique-se de que está logado na conta correta do Vercel
- Verifique se o domínio está realmente usando nameservers do Vercel
- Tente acessar diretamente: https://vercel.com/dashboard/domains

### O registro não aparece
- Aguarde alguns minutos (propagação DNS)
- Verifique se digitou corretamente: `app` (sem domínio) e `cname.vercel-dns.com`
- Tente remover e adicionar novamente

### Erro ao adicionar no Vercel
- Verifique se o nome `app` não está sendo usado por outro registro
- Tente usar outro nome, como `cliente` ou `app-cliente`
- Certifique-se de que o domínio está verificado no Vercel

---

## 📌 Notas Importantes

- **Nameservers no Vercel = DNS gerenciado no Vercel**
- Não tente adicionar registros DNS na Hostinger quando os nameservers estão no Vercel
- O registro CNAME deve ser adicionado **antes** de adicionar o domínio no projeto appmelhorado
- Após adicionar o CNAME, aguarde alguns minutos antes de adicionar o domínio no projeto


