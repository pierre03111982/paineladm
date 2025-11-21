# 📸 Guia Visual: Configurar DNS na Tela do Vercel

## 🎯 O que você está vendo

Você está na tela de **DNS Records** do domínio `experimenteai.com.br` no Vercel. Como o domínio usa os nameservers do Vercel, você pode adicionar os registros aqui mesmo!

---

## 📝 Passo a Passo na Tela

### 🔵 PRIMEIRO REGISTRO: app1

1. **No campo "Name":**
   - Digite: `app1`
   - ⚠️ **NÃO** digite `app1.experimenteai.com.br`, apenas `app1`

2. **No campo "Type":**
   - Deixe como está: `CNAME` (já está selecionado)

3. **No campo "Value":**
   - Digite: `cname.vercel-dns.com`
   - Ou use o valor que o Vercel mostrou quando você adicionou o domínio no projeto modelo-1

4. **No campo "TTL":**
   - Deixe: `60` (está perfeito!)
   - **O que é TTL?** = Tempo de vida do registro DNS
   - `60` = 60 segundos (1 minuto) - mudanças propagam rápido
   - Valores comuns: 60 (rápido), 300 (5 min), 3600 (1 hora)

5. **No campo "Priority":**
   - Deixe vazio (não é necessário para CNAME)

6. **No campo "Comment" (opcional):**
   - Você pode digitar: `Modelo 1 - App Cliente`

7. **Clique no botão "Add"** (canto inferior direito)

---

### 🟢 SEGUNDO REGISTRO: app2

1. **Clique novamente para adicionar outro registro** (ou recarregue a página)

2. **Preencha:**
   - **Name:** `app2`
   - **Type:** `CNAME`
   - **Value:** `cname.vercel-dns.com`
   - **TTL:** `60`
   - **Priority:** (vazio)
   - **Comment:** `Modelo 2 - App Cliente` (opcional)

3. **Clique em "Add"**

---

### 🟡 TERCEIRO REGISTRO: app3

1. **Adicione mais um registro**

2. **Preencha:**
   - **Name:** `app3`
   - **Type:** `CNAME`
   - **Value:** `cname.vercel-dns.com`
   - **TTL:** `60`
   - **Priority:** (vazio)
   - **Comment:** `Modelo 3 - App Cliente` (opcional)

3. **Clique em "Add"**

---

## ✅ Resultado Final

Depois de adicionar os 3 registros, você verá uma tabela com:

| Name | Type | Value | TTL | Priority | Age | Comment |
|------|------|-------|-----|----------|-----|---------|
| app1 | CNAME | cname.vercel-dns.com | 60 | - | - | Modelo 1 |
| app2 | CNAME | cname.vercel-dns.com | 60 | - | - | Modelo 2 |
| app3 | CNAME | cname.vercel-dns.com | 60 | - | - | Modelo 3 |

---

## ⏰ Sobre o TTL

**TTL = Time To Live (Tempo de Vida)**

- **60 segundos** = Mudanças propagam rápido (ótimo para desenvolvimento/teste)
- **300 segundos** = 5 minutos (comum em produção)
- **3600 segundos** = 1 hora (mais estável, mas mudanças demoram mais)

**Recomendação:** Deixe `60` por enquanto. Se quiser mudar depois, pode editar os registros.

---

## 🔗 Importante: Conectar aos Projetos

Depois de adicionar os registros DNS aqui, você ainda precisa:

1. **Ir em cada projeto no Vercel** (apps-cliente-modelo1, modelo2, modelo3)
2. **Settings → Domains**
3. **Adicionar o subdomínio correspondente:**
   - Projeto modelo-1: `app1.experimenteai.com.br`
   - Projeto modelo-2: `app2.experimenteai.com.br`
   - Projeto modelo-3: `app3.experimenteai.com.br`

O Vercel vai verificar automaticamente se o DNS está configurado e ativar o domínio!

---

## ⏳ Aguardar Ativação

- **Tempo:** 1-5 minutos geralmente
- **Como verificar:** Vá em cada projeto → Settings → Domains
- **Status deve mudar para:** "Valid" ✅

---

## 🎯 Próximos Passos

Depois que os 3 subdomínios estiverem "Valid" no Vercel:

1. ✅ Teste no navegador: https://app1.experimenteai.com.br
2. ✅ Configure variáveis de ambiente no projeto `paineladm`
3. ✅ Faça um novo deploy do paineladm

---

**Dica:** Se o valor "cname.vercel-dns.com" não funcionar, verifique qual valor o Vercel mostrou quando você adicionou o domínio em cada projeto. Pode variar dependendo da configuração.

