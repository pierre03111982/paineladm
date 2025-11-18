# 🌐 Configurar Domínio Personalizado para appmelhorado

## 📋 Objetivo
Configurar um domínio personalizado (subdomínio) para o `appmelhorado` para resolver o problema do `X-Frame-Options: deny` e permitir que o app seja exibido em iframes.

## 🎯 Domínio Sugerido
- **Subdomínio:** `app.experimenteai.com.br` ou `cliente.experimenteai.com.br`
- **URL completa:** `https://app.experimenteai.com.br`

---

## 📝 Passo a Passo

### 1️⃣ Adicionar Domínio no Vercel (appmelhorado)

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **appmelhorado**
3. No menu lateral, clique em **Settings**
4. Clique em **Domains**
5. Clique no botão **Add Domain**
6. Digite o subdomínio: `app.experimenteai.com.br`
7. Clique em **Add**

A Vercel mostrará os registros DNS que você precisa configurar.

---

### 2️⃣ Configurar DNS no Vercel (IMPORTANTE!)

**⚠️ ATENÇÃO:** Como o domínio `experimenteai.com.br` está usando os nameservers do Vercel (`ns1.vercel-dns.com` e `ns2.vercel-dns.com`), os registros DNS devem ser gerenciados **no Vercel**, não na Hostinger!

1. Acesse o projeto **paineladm** no Vercel (ou qualquer projeto que tenha o domínio `experimenteai.com.br`)
2. Vá em **Settings** → **Domains**
3. Clique no domínio `experimenteai.com.br` (ou `www.experimenteai.com.br`)
4. Procure a seção **DNS Records** ou **DNS Configuration**
5. Clique em **Add Record** ou **Add DNS Record**
6. Adicione um novo registro **CNAME**:
   - **Type:** `CNAME`
   - **Name:** `app` (ou `cliente` se preferir)
   - **Value:** `cname.vercel-dns.com`
   - **TTL:** `3600` (ou padrão)
7. Clique em **Save** ou **Add**

**Alternativa:** Se não encontrar a opção de DNS no projeto, você pode:
- Acessar diretamente: https://vercel.com/dashboard/domains
- Selecionar o domínio `experimenteai.com.br`
- Adicionar o registro CNAME lá

**⚠️ Importante:** Pode levar até 24 horas para o DNS propagar, mas geralmente funciona em alguns minutos.

---

### 3️⃣ Verificar Configuração no Vercel

1. Volte ao projeto **appmelhorado** no Vercel
2. Vá em **Settings** → **Domains**
3. Aguarde até que o status do domínio mude para **Valid Configuration**
4. O domínio deve aparecer como **Verified** (verificado)

---

### 4️⃣ Atualizar Variável de Ambiente no paineladm

Após o domínio estar configurado e funcionando:

1. Acesse o projeto **paineladm** no Vercel
2. Vá em **Settings** → **Environment Variables**
3. Encontre ou adicione a variável:
   - **Key:** `NEXT_PUBLIC_CLIENT_APP_URL`
   - **Value:** `https://app.experimenteai.com.br` (ou o subdomínio que você escolheu)
4. Certifique-se de que está configurada para **Production**, **Preview** e **Development**
5. Clique em **Save**

---

### 5️⃣ Fazer Novo Deploy do paineladm

Após atualizar a variável de ambiente:

1. No projeto **paineladm** no Vercel
2. Vá em **Deployments**
3. Clique nos três pontos (⋯) da última implantação
4. Selecione **Redeploy**
5. Ou faça deploy via terminal:
   ```bash
   cd paineladm
   vercel --prod
   ```

---

### 6️⃣ Verificar se Funcionou

1. Acesse: `https://www.experimenteai.com.br/simulador`
2. O simulador deve carregar o `appmelhorado` sem erros
3. Verifique o console do navegador (F12) - não deve haver mais o erro `X-Frame-Options: deny`

---

## ✅ Checklist

- [ ] Domínio `app.experimenteai.com.br` adicionado no Vercel (projeto appmelhorado)
- [ ] Registro CNAME configurado na Hostinger
- [ ] Domínio verificado no Vercel (status: Valid Configuration)
- [ ] Variável `NEXT_PUBLIC_CLIENT_APP_URL` atualizada no paineladm
- [ ] Novo deploy do paineladm realizado
- [ ] Simulador testado e funcionando

---

## 🔍 Troubleshooting

### Domínio não está funcionando
- Aguarde alguns minutos para propagação do DNS
- **Verifique se o registro CNAME está correto no Vercel** (não na Hostinger, pois os nameservers estão no Vercel)
- Confirme que o domínio está verificado no Vercel

### Erro ao adicionar CNAME na Hostinger
- **Solução:** O domínio está usando nameservers do Vercel, então os registros DNS devem ser adicionados **no Vercel**, não na Hostinger
- Acesse o Vercel → Settings → Domains → Selecione o domínio → Adicione o registro CNAME lá

### Ainda aparece erro X-Frame-Options
- Limpe o cache do navegador (Ctrl+Shift+Delete)
- Verifique se a variável `NEXT_PUBLIC_CLIENT_APP_URL` está correta
- Confirme que o novo deploy do paineladm foi aplicado

### Erro 404 no appmelhorado
- Verifique se o domínio está apontando para o projeto correto no Vercel
- Confirme que o deploy do appmelhorado está em produção

---

## 📌 Notas Importantes

- O domínio personalizado resolve o problema do `X-Frame-Options` porque o Vercel não adiciona headers de segurança restritivos em domínios personalizados
- Use sempre HTTPS (o Vercel configura automaticamente)
- O subdomínio `app.experimenteai.com.br` é apenas uma sugestão - você pode usar qualquer subdomínio disponível

