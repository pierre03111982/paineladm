# 🌐 Configurar app.experimenteai.com.br no Vercel

## 📋 Passo a Passo Completo

### 1️⃣ Adicionar Domínio no Projeto appmelhorado

#### Opção A: Via Dashboard Vercel (Recomendado)

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **appmelhorado**
3. No menu lateral, clique em **Settings**
4. Clique em **Domains**
5. Clique no botão **Add Domain**
6. Digite: `app.experimenteai.com.br`
7. Clique em **Add**

A Vercel mostrará as instruções de configuração DNS.

#### Opção B: Via CLI

```bash
cd E:\projetos\appmelhorado
vercel domains add app.experimenteai.com.br
```

---

### 2️⃣ Configurar DNS no Vercel

**⚠️ IMPORTANTE:** Como o domínio `experimenteai.com.br` está usando os nameservers do Vercel, você deve configurar o DNS **no Vercel**, não na Hostinger!

#### Passo a Passo:

1. Acesse: https://vercel.com/dashboard/domains
2. Clique no domínio `experimenteai.com.br` (ou `www.experimenteai.com.br`)
3. Procure a seção **DNS Records** ou **Configuration**
4. Clique em **Add Record** ou **Add DNS Record**
5. Configure o registro:
   - **Type:** `CNAME`
   - **Name:** `app`
   - **Value:** `cname.vercel-dns.com` (ou o valor que a Vercel fornecer)
   - **TTL:** `3600` (ou padrão)
6. Clique em **Save**

**Alternativa:** Se o domínio já estiver no Vercel, você pode:
- Acessar o projeto que tem o domínio principal
- Settings → Domains → experimenteai.com.br → DNS Records
- Adicionar o CNAME para `app`

---

### 3️⃣ Verificar Status do Domínio

1. Volte ao projeto **appmelhorado** no Vercel
2. Settings → Domains
3. Aguarde até que o status de `app.experimenteai.com.br` mude para:
   - ✅ **Valid Configuration** (Configuração Válida)
   - ✅ **Verified** (Verificado)

**⏱️ Tempo de propagação:** Geralmente 5-30 minutos, mas pode levar até 24 horas.

---

### 4️⃣ Verificar se o DNS está Configurado Corretamente

Você pode verificar usando o comando:

```bash
nslookup app.experimenteai.com.br
```

Ou acesse: https://dnschecker.org/#CNAME/app.experimenteai.com.br

O resultado deve apontar para um servidor da Vercel.

---

### 5️⃣ Fazer Deploy do appmelhorado (se necessário)

Se você fez alterações recentes:

```bash
cd E:\projetos\appmelhorado
vercel --prod
```

---

### 6️⃣ Testar o Subdomínio

Após a configuração estar completa:

1. Acesse: `https://app.experimenteai.com.br`
2. O app deve carregar normalmente
3. Verifique se não há erros no console (F12)

---

## ✅ Checklist

- [ ] Domínio `app.experimenteai.com.br` adicionado no projeto appmelhorado no Vercel
- [ ] Registro CNAME configurado no Vercel (não na Hostinger)
- [ ] Status do domínio mostra "Valid Configuration" e "Verified"
- [ ] DNS propagado (verificado com nslookup ou dnschecker.org)
- [ ] Deploy do appmelhorado realizado (se necessário)
- [ ] Subdomínio testado e funcionando

---

## 🔍 Troubleshooting

### Domínio não aparece como "Valid Configuration"

- Aguarde alguns minutos para propagação do DNS
- Verifique se o registro CNAME está correto no Vercel
- Confirme que o domínio principal (`experimenteai.com.br`) está configurado no Vercel

### Erro ao adicionar domínio no Vercel

- Verifique se você tem permissões no projeto
- Confirme que o domínio principal está no mesmo time/account
- Tente adicionar via CLI: `vercel domains add app.experimenteai.com.br`

### DNS não está propagando

- Verifique se o registro CNAME está correto
- Confirme que os nameservers do domínio estão no Vercel
- Aguarde até 24 horas para propagação completa

### Erro 404 ao acessar app.experimenteai.com.br

- Verifique se o domínio está associado ao projeto correto
- Confirme que há um deploy em produção do appmelhorado
- Verifique se o domínio está "Verified" no Vercel

---

## 📌 Notas Importantes

- O domínio personalizado resolve problemas de CORS e X-Frame-Options
- Use sempre HTTPS (o Vercel configura automaticamente)
- O subdomínio `app.experimenteai.com.br` é uma sugestão - você pode usar qualquer subdomínio disponível
- Se o domínio principal estiver na Hostinger mas usando nameservers do Vercel, configure o DNS no Vercel, não na Hostinger

