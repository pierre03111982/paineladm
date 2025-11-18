# 🌐 Configurar app.experimenteai.com.br para appmelhorado

## ⚠️ Situação Atual

O domínio `app.experimenteai.com.br` já está atribuído a outro projeto no Vercel. Precisamos movê-lo ou reconfigurá-lo.

## 📋 Solução: Configurar via Dashboard Vercel

### Passo 1: Verificar qual projeto tem o domínio

1. Acesse: https://vercel.com/dashboard
2. Vá em **Settings** → **Domains** (menu lateral)
3. Procure por `app.experimenteai.com.br`
4. Veja qual projeto está associado

### Passo 2: Remover do projeto atual (se necessário)

Se o domínio estiver em outro projeto:

1. Acesse o projeto que tem o domínio
2. Vá em **Settings** → **Domains**
3. Encontre `app.experimenteai.com.br`
4. Clique nos três pontos (⋯) ao lado
5. Selecione **Remove** ou **Unassign**

### Passo 3: Adicionar ao projeto appmelhorado

1. Acesse o projeto **appmelhorado** no Vercel
2. Vá em **Settings** → **Domains**
3. Clique em **Add Domain**
4. Digite: `app.experimenteai.com.br`
5. Clique em **Add**

### Passo 4: Configurar DNS (se necessário)

Se o Vercel pedir para configurar DNS:

1. Acesse: https://vercel.com/dashboard/domains
2. Clique no domínio `experimenteai.com.br`
3. Vá em **DNS Records** ou **Configuration**
4. Adicione um registro CNAME:
   - **Name:** `app`
   - **Value:** `cname.vercel-dns.com` (ou o valor fornecido pela Vercel)
   - **TTL:** `3600`
5. Salve

**Nota:** Como o domínio está usando nameservers do Vercel, configure o DNS no Vercel, não na Hostinger.

### Passo 5: Aguardar verificação

1. Volte ao projeto **appmelhorado**
2. Settings → Domains
3. Aguarde até que `app.experimenteai.com.br` apareça como:
   - ✅ **Valid Configuration**
   - ✅ **Verified**

⏱️ **Tempo:** Geralmente 5-30 minutos, mas pode levar até 24 horas.

### Passo 6: Fazer deploy (se necessário)

Se você fez alterações recentes no appmelhorado:

```bash
cd E:\projetos\appmelhorado
vercel --prod
```

### Passo 7: Testar

1. Acesse: `https://app.experimenteai.com.br`
2. O app deve carregar normalmente

---

## 🔄 Alternativa: Usar CLI para mover o domínio

Se você souber qual projeto tem o domínio, pode tentar:

```bash
# 1. Remover do projeto atual (substitua PROJECT_NAME pelo nome do projeto)
cd E:\projetos\paineladm
vercel domains rm app.experimenteai.com.br --project PROJECT_NAME

# 2. Adicionar ao appmelhorado
cd E:\projetos\appmelhorado
vercel domains add app.experimenteai.com.br
```

---

## ✅ Checklist

- [ ] Identificado qual projeto tem `app.experimenteai.com.br`
- [ ] Domínio removido do projeto anterior (se necessário)
- [ ] Domínio adicionado ao projeto appmelhorado
- [ ] DNS configurado (se necessário)
- [ ] Domínio verificado no Vercel
- [ ] Deploy do appmelhorado realizado
- [ ] Subdomínio testado e funcionando

---

## 🔍 Troubleshooting

### "Domain already assigned to another project"

- Acesse o dashboard do Vercel
- Encontre qual projeto tem o domínio
- Remova o domínio daquele projeto
- Adicione ao projeto appmelhorado

### DNS não está propagando

- Verifique se o registro CNAME está correto
- Confirme que os nameservers estão no Vercel
- Aguarde até 24 horas

### Erro 404 ao acessar

- Verifique se o domínio está "Verified" no Vercel
- Confirme que há um deploy em produção
- Verifique se o domínio está no projeto correto

