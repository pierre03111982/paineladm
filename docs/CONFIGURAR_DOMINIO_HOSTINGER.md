# 🌐 Como Configurar Domínio da Hostinger na Vercel

## 📋 Passo a Passo Completo

### 1️⃣ Acesse o Painel da Vercel

1. Acesse: https://vercel.com/dashboard
2. Faça login na sua conta
3. Selecione o projeto **paineladm**

### 2️⃣ Adicione o Domínio na Vercel

1. No menu lateral, clique em **Settings**
2. Clique em **Domains**
3. Clique no botão **Add Domain**
4. Digite seu domínio (ex: `painel.experimenteai.com` ou `experimenteai.com`)
5. Clique em **Add**

### 3️⃣ Configure os DNS na Hostinger

A Vercel mostrará os registros DNS que você precisa configurar. Siga estes passos:

#### **Opção A: Subdomínio (Recomendado)**
Exemplo: `painel.experimenteai.com` ou `app.experimenteai.com`

1. Acesse o painel da Hostinger: https://www.hostinger.com.br/hpanel
2. Vá em **Domínios** → Selecione seu domínio
3. Clique em **Gerenciar DNS** ou **Zona DNS**
4. Adicione um novo registro:
   - **Tipo:** `CNAME`
   - **Nome/Host:** `painel` (ou o subdomínio que você escolheu)
   - **Valor/Destino:** `cname.vercel-dns.com`
   - **TTL:** `3600` (ou padrão)
5. Clique em **Salvar**

#### **Opção B: Domínio Raiz**
Exemplo: `experimenteai.com`

1. Acesse o painel da Hostinger
2. Vá em **Domínios** → Selecione seu domínio
3. Clique em **Gerenciar DNS**
4. Adicione um novo registro:
   - **Tipo:** `A`
   - **Nome/Host:** `@` ou deixe em branco
   - **Valor/Destino:** `76.76.21.21`
   - **TTL:** `3600`
5. Clique em **Salvar**

**OU** use CNAME (se a Hostinger permitir):
   - **Tipo:** `CNAME`
   - **Nome/Host:** `@`
   - **Valor/Destino:** `cname.vercel-dns.com`
   - **TTL:** `3600`

### 4️⃣ Aguarde a Propagação DNS

- Pode levar de **5 minutos a 48 horas**
- Geralmente leva entre **15 minutos a 2 horas**
- A Vercel mostrará o status do domínio:
  - ⏳ **Pending** = Aguardando propagação
  - ✅ **Valid Configuration** = Configurado corretamente
  - ❌ **Invalid Configuration** = Verifique os DNS

### 5️⃣ Verificar Status

1. Volte ao painel da Vercel
2. Vá em **Settings** → **Domains**
3. Você verá o status do domínio
4. Quando aparecer "Valid Configuration", está pronto!

### 6️⃣ Atualizar Variáveis de Ambiente

Após o domínio estar funcionando:

1. Vá em **Settings** → **Environment Variables**
2. Atualize ou adicione:
   - `NEXT_PUBLIC_APP_URL` = `https://seu-dominio.com`
   - Exemplo: `NEXT_PUBLIC_APP_URL=https://painel.experimenteai.com`
3. Clique em **Save**

### 7️⃣ Fazer Novo Deploy

Após atualizar as variáveis:

```bash
cd E:\projetos\paineladm
vercel --prod
```

Ou faça um novo deploy pelo painel da Vercel.

---

## 🔍 Como Verificar se os DNS Estão Corretos

### Via Terminal (Windows PowerShell):

```powershell
# Para subdomínio (CNAME)
nslookup painel.experimenteai.com

# Para domínio raiz (A)
nslookup experimenteai.com
```

### Via Site Online:

1. Acesse: https://dnschecker.org
2. Digite seu domínio
3. Selecione o tipo de registro (CNAME ou A)
4. Verifique se aparece o valor correto em todos os servidores

---

## ⚠️ Problemas Comuns

### ❌ Domínio não está funcionando após 24h

**Soluções:**
1. Verifique se os DNS estão corretos na Hostinger
2. Limpe o cache DNS do seu computador:
   ```powershell
   ipconfig /flushdns
   ```
3. Verifique se não há outros registros conflitantes
4. Aguarde mais algumas horas (propagação pode demorar)

### ❌ Erro "Invalid Configuration"

**Soluções:**
1. Verifique se digitou o domínio corretamente na Vercel
2. Confirme que os DNS estão apontando para os valores corretos
3. Remova e adicione o domínio novamente na Vercel
4. Verifique se não há registros duplicados na Hostinger

### ❌ SSL não está funcionando

**Solução:**
- A Vercel configura SSL automaticamente
- Aguarde alguns minutos após o DNS propagar
- Se não funcionar após 1 hora, entre em contato com o suporte da Vercel

---

## 📝 Exemplo Prático

### Se seu domínio é: `experimenteai.com`

**Na Hostinger:**
- Tipo: `CNAME`
- Nome: `painel`
- Valor: `cname.vercel-dns.com`

**Na Vercel:**
- Domínio: `painel.experimenteai.com`

**Resultado:**
- Acesse: `https://painel.experimenteai.com`

---

## ✅ Checklist Final

- [ ] Domínio adicionado na Vercel
- [ ] DNS configurados na Hostinger
- [ ] Status na Vercel mostra "Valid Configuration"
- [ ] Variável `NEXT_PUBLIC_APP_URL` atualizada
- [ ] Novo deploy realizado
- [ ] Testado acesso pelo novo domínio
- [ ] SSL funcionando (https://)

---

**💡 Dica:** Use um subdomínio (ex: `painel.experimenteai.com`) ao invés do domínio raiz. É mais fácil de configurar e não interfere com outros serviços que você possa ter no domínio principal.



