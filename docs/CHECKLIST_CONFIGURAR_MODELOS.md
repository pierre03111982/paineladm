# ✅ Checklist: Configurar Modelos 1, 2 e 3 no Vercel

Use este checklist para garantir que todos os passos foram concluídos corretamente.

---

## 📦 Fase 1: Preparação

- [ ] Repositório Git está atualizado com os 3 modelos
- [ ] Tenho acesso ao Vercel Dashboard
- [ ] Tenho acesso ao provedor de DNS
- [ ] Domínio `experimenteai.com.br` está ativo

---

## 🚀 Fase 2: Deploy no Vercel

### Modelo 1
- [ ] Projeto `apps-cliente-modelo1` criado no Vercel
- [ ] Root Directory configurado: `apps-cliente/modelo-1`
- [ ] Framework Preset: Next.js
- [ ] Deploy realizado com sucesso
- [ ] URL do Vercel funcionando (ex: `apps-cliente-modelo1.vercel.app`)

### Modelo 2
- [ ] Projeto `apps-cliente-modelo2` criado no Vercel
- [ ] Root Directory configurado: `apps-cliente/modelo-2`
- [ ] Framework Preset: Next.js
- [ ] Deploy realizado com sucesso
- [ ] URL do Vercel funcionando (ex: `apps-cliente-modelo2.vercel.app`)

### Modelo 3
- [ ] Projeto `apps-cliente-modelo3` criado no Vercel
- [ ] Root Directory configurado: `apps-cliente/modelo-3`
- [ ] Framework Preset: Next.js
- [ ] Deploy realizado com sucesso
- [ ] URL do Vercel funcionando (ex: `apps-cliente-modelo3.vercel.app`)

---

## 🌐 Fase 3: Configurar Subdomínios

### No Vercel
- [ ] Subdomínio `app1.experimenteai.com.br` adicionado ao projeto modelo-1
- [ ] Subdomínio `app2.experimenteai.com.br` adicionado ao projeto modelo-2
- [ ] Subdomínio `app3.experimenteai.com.br` adicionado ao projeto modelo-3
- [ ] Instruções de DNS copiadas do Vercel

### No Provedor de DNS
- [ ] Registro CNAME `app1` → `cname.vercel-dns.com` criado
- [ ] Registro CNAME `app2` → `cname.vercel-dns.com` criado
- [ ] Registro CNAME `app3` → `cname.vercel-dns.com` criado
- [ ] Proxy ativado (se Cloudflare) - nuvem laranja

---

## ⏳ Fase 4: Aguardar Propagação

- [ ] Aguardei pelo menos 15 minutos após configurar DNS
- [ ] Status dos domínios no Vercel mudou para "Valid"
- [ ] Testei `nslookup app1.experimenteai.com.br` (opcional)
- [ ] Testei `nslookup app2.experimenteai.com.br` (opcional)
- [ ] Testei `nslookup app3.experimenteai.com.br` (opcional)

---

## 🔐 Fase 5: Variáveis de Ambiente

### No Projeto Painel Adm (Vercel)
- [ ] Variável `NEXT_PUBLIC_MODELO_1_URL=https://app1.experimenteai.com.br` adicionada (Production)
- [ ] Variável `NEXT_PUBLIC_MODELO_2_URL=https://app2.experimenteai.com.br` adicionada (Production)
- [ ] Variável `NEXT_PUBLIC_MODELO_3_URL=https://app3.experimenteai.com.br` adicionada (Production)
- [ ] Novo deploy do paineladm realizado após adicionar variáveis

---

## ✅ Fase 6: Testes Finais

### Testes de Acesso Direto
- [ ] ✅ https://app1.experimenteai.com.br carrega corretamente
- [ ] ✅ https://app2.experimenteai.com.br carrega corretamente
- [ ] ✅ https://app3.experimenteai.com.br carrega corretamente
- [ ] ✅ SSL/HTTPS está funcionando (cadeado verde no navegador)

### Testes no Painel Adm
- [ ] Acessei o Painel Adm
- [ ] Fui em "Aplicativo Cliente"
- [ ] Verifiquei que os links mostram os subdomínios corretos:
  - [ ] Link Modelo 1: `https://app1.experimenteai.com.br/{lojistaId}/login`
  - [ ] Link Modelo 2: `https://app2.experimenteai.com.br/{lojistaId}/login`
  - [ ] Link Modelo 3: `https://app3.experimenteai.com.br/{lojistaId}/login`
- [ ] Testei clicar em cada link e todos funcionam
- [ ] Testei com um lojistaId real e acessou corretamente

### Testes de Funcionalidade
- [ ] Testei login em um app cliente (Modelo 1)
- [ ] Testei login em um app cliente (Modelo 2)
- [ ] Testei login em um app cliente (Modelo 3)
- [ ] QR Codes estão sendo gerados corretamente
- [ ] Links de compartilhamento funcionam

---

## 🎯 Resultado Final

- [ ] **TODOS os itens acima foram concluídos**
- [ ] **Todos os 3 modelos estão acessíveis via subdomínios profissionais**
- [ ] **Painel Adm está mostrando os links corretos**
- [ ] **Sistema está pronto para uso em produção**

---

## 📝 Notas Adicionais

**Data de conclusão**: _______________

**Problemas encontrados e soluções**:
- 
- 
- 

**Observações**:
- 
- 
- 

---

**Status Final**: ⬜ Pendente | ⬜ Em Progresso | ⬜ Concluído ✅

