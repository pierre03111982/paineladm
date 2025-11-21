# ✅ Verificação Final: Configuração dos Modelos

## 🎉 O que você já configurou:

### ✅ Projetos no Vercel
- [x] `apps-cliente-modelo01` → `app1.experimenteai.com.br`
- [x] `apps-cliente-modelo02` → `app2.experimenteai.com.br`
- [x] `apps-cliente-modelo03` → `app3.experimenteai.com.br`

### ✅ Variáveis de Ambiente no Painel Adm
- [x] `NEXT_PUBLIC_MODELO_1_URL=https://app1.experimenteai.com.br`
- [x] `NEXT_PUBLIC_MODELO_2_URL=https://app2.experimenteai.com.br`
- [x] `NEXT_PUBLIC_MODELO_3_URL=https://app3.experimenteai.com.br`

---

## 🔍 Verificações Finais

### 1. Testar os Subdomínios

Abra no navegador e teste cada um:

- [ ] https://app1.experimenteai.com.br
  - Deve carregar a página do Modelo 1
  - Deve ter SSL/HTTPS (cadeado verde)

- [ ] https://app2.experimenteai.com.br
  - Deve carregar a página do Modelo 2
  - Deve ter SSL/HTTPS (cadeado verde)

- [ ] https://app3.experimenteai.com.br
  - Deve carregar a página do Modelo 3
  - Deve ter SSL/HTTPS (cadeado verde)

### 2. Fazer Novo Deploy do Painel Adm

⚠️ **IMPORTANTE:** As variáveis de ambiente só funcionam após um novo deploy!

1. **No projeto `paineladm` no Vercel:**
   - Vá em **Deployments**
   - Clique nos 3 pontos (⋯) do último deployment
   - Selecione **"Redeploy"**
   - Ou faça um novo commit/push para trigger automático

2. **Aguarde o deploy terminar** (1-2 minutos)

### 3. Verificar no Painel Adm

1. **Acesse o Painel Adm:**
   - https://www.experimenteai.com.br (ou o domínio que você usa)

2. **Faça login**

3. **Vá em "Aplicativo Cliente"** (ou a seção onde mostra os links)

4. **Verifique se os links aparecem corretamente:**
   - Deve mostrar: `https://app1.experimenteai.com.br/{lojistaId}/login`
   - Deve mostrar: `https://app2.experimenteai.com.br/{lojistaId}/login`
   - Deve mostrar: `https://app3.experimenteai.com.br/{lojistaId}/login`

5. **Teste cada link:**
   - Clique em cada um
   - Deve abrir a página de login do modelo correspondente
   - Deve funcionar com um lojistaId real

### 4. Verificar QR Codes

- [ ] Os QR Codes estão sendo gerados corretamente?
- [ ] Os QR Codes apontam para os subdomínios corretos?
- [ ] Teste escanear um QR Code com o celular

---

## 🐛 Se algo não estiver funcionando:

### ❌ Subdomínio não carrega (404 ou erro)

**Solução:**
1. Verifique no Vercel → Projeto → Settings → Domains
2. O domínio deve estar com status "Valid" ✅
3. Se não estiver, verifique o DNS (pode levar alguns minutos)

### ❌ Links no Painel Adm ainda mostram localhost ou URL antiga

**Solução:**
1. Verifique se fez o novo deploy do paineladm
2. Limpe o cache do navegador (Ctrl+Shift+R)
3. Verifique se as variáveis de ambiente estão em "Production"

### ❌ SSL não está funcionando

**Solução:**
1. Aguarde 5-10 minutos após adicionar o domínio
2. O Vercel configura SSL automaticamente
3. Verifique em Settings → Domains se "Force HTTPS" está ativado

---

## 📊 Status dos Projetos

Verifique no Vercel Dashboard se todos os projetos estão:

- [ ] **Deployados com sucesso** (status "Ready")
- [ ] **Domínios configurados** (status "Valid")
- [ ] **SSL ativo** (HTTPS funcionando)

---

## 🎯 Próximos Passos (Opcional)

Depois que tudo estiver funcionando:

1. **Testar com lojistas reais**
2. **Compartilhar os links com clientes**
3. **Monitorar os deployments** no Vercel
4. **Configurar alertas** (se necessário)

---

## ✅ Checklist Final

- [ ] Todos os 3 subdomínios carregam no navegador
- [ ] SSL/HTTPS está funcionando em todos
- [ ] Novo deploy do paineladm foi feito
- [ ] Links aparecem corretamente no Painel Adm
- [ ] Testei cada link e todos funcionam
- [ ] QR Codes estão sendo gerados corretamente
- [ ] Testei com um lojistaId real

---

## 🎉 Tudo Pronto!

Se todos os itens acima estão ✅, sua configuração está completa!

Agora você tem:
- ✅ `https://app1.experimenteai.com.br` → Modelo 1
- ✅ `https://app2.experimenteai.com.br` → Modelo 2
- ✅ `https://app3.experimenteai.com.br` → Modelo 3

Todos os links no Painel Adm agora usam esses subdomínios profissionais! 🚀

---

**Data de configuração:** $(date)

