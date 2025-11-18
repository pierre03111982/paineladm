# 🌐 Como Configurar Domínio Customizado na Vercel

## ⚠️ Pré-requisitos

Antes de configurar o domínio, você precisa:

1. ✅ **Deploy bem-sucedido** - A aplicação deve estar funcionando
2. ✅ **Variáveis de ambiente configuradas** - Todas as variáveis devem estar no painel da Vercel
3. ✅ **Domínio próprio** - Você precisa ter um domínio registrado

---

## 📋 Passo a Passo

### 1. Acesse o Painel da Vercel
- Vá para: https://vercel.com/dashboard
- Selecione o projeto `paineladm`

### 2. Vá em Settings > Domains
- No menu lateral, clique em **Settings**
- Clique em **Domains**

### 3. Adicione seu Domínio
- Clique em **Add Domain**
- Digite seu domínio (ex: `experimenteai.com` ou `app.experimenteai.com`)
- Clique em **Add**

### 4. Configure os DNS
A Vercel fornecerá instruções específicas. Geralmente você precisa:

**Opção A: Domínio raiz (ex: experimenteai.com)**
- Adicione um registro `A` apontando para: `76.76.21.21`
- Ou adicione um registro `CNAME` apontando para: `cname.vercel-dns.com`

**Opção B: Subdomínio (ex: app.experimenteai.com)**
- Adicione um registro `CNAME` apontando para: `cname.vercel-dns.com`

### 5. Aguarde a Propagação DNS
- Pode levar de alguns minutos a 48 horas
- A Vercel mostrará o status: "Valid Configuration" quando estiver pronto

### 6. SSL Automático
- A Vercel configura SSL/HTTPS automaticamente
- Não é necessário configurar certificados manualmente

---

## ⚠️ Importante

### Antes de Configurar o Domínio:

1. **Certifique-se que o deploy está funcionando**
   - Acesse a URL temporária da Vercel
   - Teste se a aplicação carrega corretamente
   - Verifique se as APIs funcionam

2. **Configure as variáveis de ambiente**
   - Vá em Settings > Environment Variables
   - Atualize `NEXT_PUBLIC_APP_URL` com seu domínio customizado
   - Exemplo: `NEXT_PUBLIC_APP_URL=https://app.experimenteai.com`

3. **Teste tudo primeiro**
   - Use a URL temporária da Vercel para testar
   - Só configure o domínio quando tudo estiver funcionando

---

## 🔄 Após Configurar o Domínio

1. **Atualize variáveis de ambiente**
   - `NEXT_PUBLIC_APP_URL` → seu domínio customizado
   - `NEXT_PUBLIC_CLIENT_APP_URL` → se aplicável

2. **Faça um novo deploy**
   - Isso garante que todas as URLs internas usem o novo domínio

3. **Teste novamente**
   - Acesse pelo novo domínio
   - Verifique se tudo funciona

---

## 📝 Notas

- A Vercel oferece domínios gratuitos `.vercel.app` que já funcionam
- Domínios customizados são opcionais, mas recomendados para produção
- SSL é automático e gratuito na Vercel
- Você pode ter múltiplos domínios apontando para o mesmo projeto

---

*Configure o domínio apenas após o deploy estar funcionando perfeitamente!*































