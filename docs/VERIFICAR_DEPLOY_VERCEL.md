# 🔍 Verificar se o Deploy Está Correto no Vercel

Se você já fez redeploy sem cache e limpou o cache do navegador, mas ainda não está atualizado, siga estes passos:

## 1. Verificar Qual Deploy Está Ativo

### No Vercel Dashboard:
1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto `paineladm`
3. Vá em **"Deployments"**
4. **IMPORTANTE:** Verifique qual deploy está marcado como **"Production"** (verde)
5. Veja o **commit hash** do deploy ativo
6. Compare com o último commit no GitHub:
   ```bash
   git log -1 --oneline
   ```

### Se o Deploy Ativo NÃO é o Mais Recente:
1. Clique no deploy mais recente (com o commit correto)
2. Clique nos **três pontos (...)** → **"Promote to Production"**
3. Aguarde alguns minutos

## 2. Verificar Domínio Apontando para o Deploy Correto

### No Vercel Dashboard:
1. Vá em **Settings** → **Domains**
2. Verifique se `experimenteai.com.br` está listado
3. Clique no domínio
4. Verifique qual **deployment** está associado
5. Se estiver associado a um deploy antigo, mude para o mais recente

## 3. Verificar Build Logs

### No Vercel Dashboard:
1. Vá em **Deployments**
2. Clique no deploy mais recente
3. Vá na aba **"Build Logs"**
4. Verifique se:
   - O build foi bem-sucedido
   - Não há erros ou warnings
   - O commit hash está correto
   - O build incluiu os arquivos modificados

## 4. Forçar Invalidação do Cache do Next.js

O Next.js pode ter cache interno mesmo com headers de no-cache. Adicione isso temporariamente:

### No `next.config.mjs`:
```javascript
const finalConfig = {
  // ... outras configurações
  experimental: {
    // Forçar rebuild completo
    isrMemoryCacheSize: 0,
  },
  // Desabilitar cache de build
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
};
```

## 5. Verificar Variáveis de Ambiente no Deploy

### No Vercel Dashboard:
1. Vá em **Settings** → **Environment Variables**
2. Verifique se todas as variáveis estão configuradas
3. **IMPORTANTE:** Verifique se as variáveis estão aplicadas ao ambiente **Production**
4. Se alguma variável estiver faltando ou incorreta, adicione/corrija e faça redeploy

## 6. Verificar se Há Múltiplos Projetos

### Possível Problema:
- Pode haver múltiplos projetos no Vercel
- O domínio pode estar apontando para o projeto errado

### Como Verificar:
1. Vercel Dashboard → **Projects**
2. Liste todos os projetos
3. Verifique qual projeto tem o domínio `experimenteai.com.br`
4. Confirme que é o projeto `paineladm`

## 7. Solução Nuclear: Deletar e Recriar Deploy

Se nada funcionar:

1. **No Vercel Dashboard:**
   - Vá em **Deployments**
   - Encontre o deploy mais recente
   - Clique nos três pontos → **"Delete"**
   - Confirme a exclusão

2. **Forçar Novo Deploy:**
   ```bash
   cd E:\projetos\paineladm
   # Fazer uma mudança mínima
   echo "// Force deploy $(date)" >> src/app/(lojista)/produtos/page.tsx
   git add .
   git commit -m "chore: force new deploy"
   git push
   ```

3. **Aguardar Deploy Automático:**
   - O Vercel detectará o push
   - Criará um novo deploy do zero
   - Aguarde 3-5 minutos

## 8. Verificar no Navegador

### DevTools → Network:
1. Abra DevTools (`F12`)
2. Vá em **Network**
3. Marque **"Desativar cache"** (Disable cache)
4. Recarregue a página (`Ctrl + Shift + R`)
5. Verifique a requisição de `/produtos`
6. Veja os **Response Headers**:
   - Deve ter `Cache-Control: no-store, no-cache...`
   - Deve ter `X-Vercel-Cache: MISS` (não HIT)

### Se `X-Vercel-Cache: HIT`:
- O Vercel está servindo cache
- Faça um redeploy sem cache novamente
- Ou aguarde alguns minutos para o cache expirar

## 9. Verificar Timestamp do Build

### No código, adicione um timestamp visível:
```typescript
// Em src/app/(lojista)/produtos/page.tsx
export default async function ProdutosPage() {
  const buildTime = process.env.BUILD_TIME || new Date().toISOString();
  console.log('[ProdutosPage] Build time:', buildTime);
  // ...
}
```

### No Vercel, adicione variável:
- Settings → Environment Variables
- Adicione: `BUILD_TIME` = timestamp atual
- Faça redeploy

### No navegador:
- Veja o console
- Compare o timestamp com o esperado

## 10. Checklist Final

- [ ] Deploy ativo é o mais recente (commit hash correto)
- [ ] Domínio apontando para o deploy correto
- [ ] Build logs sem erros
- [ ] Variáveis de ambiente configuradas
- [ ] Cache do navegador desabilitado no DevTools
- [ ] Response headers mostram `no-cache`
- [ ] `X-Vercel-Cache: MISS` (não HIT)
- [ ] Testado em modo anônimo
- [ ] Testado em outro navegador

## 🚨 Se Ainda Não Funcionar

Pode ser um problema com:
1. **CDN do Vercel** - Pode levar até 5 minutos para propagar
2. **DNS** - Pode estar apontando para servidor antigo
3. **Service Workers** - Podem estar servindo versão antiga

**Solução temporária:**
- Use uma URL com timestamp: `https://www.experimenteai.com.br/produtos?v=1234567890`
- Isso força bypass de cache



Se você já fez redeploy sem cache e limpou o cache do navegador, mas ainda não está atualizado, siga estes passos:

## 1. Verificar Qual Deploy Está Ativo

### No Vercel Dashboard:
1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto `paineladm`
3. Vá em **"Deployments"**
4. **IMPORTANTE:** Verifique qual deploy está marcado como **"Production"** (verde)
5. Veja o **commit hash** do deploy ativo
6. Compare com o último commit no GitHub:
   ```bash
   git log -1 --oneline
   ```

### Se o Deploy Ativo NÃO é o Mais Recente:
1. Clique no deploy mais recente (com o commit correto)
2. Clique nos **três pontos (...)** → **"Promote to Production"**
3. Aguarde alguns minutos

## 2. Verificar Domínio Apontando para o Deploy Correto

### No Vercel Dashboard:
1. Vá em **Settings** → **Domains**
2. Verifique se `experimenteai.com.br` está listado
3. Clique no domínio
4. Verifique qual **deployment** está associado
5. Se estiver associado a um deploy antigo, mude para o mais recente

## 3. Verificar Build Logs

### No Vercel Dashboard:
1. Vá em **Deployments**
2. Clique no deploy mais recente
3. Vá na aba **"Build Logs"**
4. Verifique se:
   - O build foi bem-sucedido
   - Não há erros ou warnings
   - O commit hash está correto
   - O build incluiu os arquivos modificados

## 4. Forçar Invalidação do Cache do Next.js

O Next.js pode ter cache interno mesmo com headers de no-cache. Adicione isso temporariamente:

### No `next.config.mjs`:
```javascript
const finalConfig = {
  // ... outras configurações
  experimental: {
    // Forçar rebuild completo
    isrMemoryCacheSize: 0,
  },
  // Desabilitar cache de build
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
};
```

## 5. Verificar Variáveis de Ambiente no Deploy

### No Vercel Dashboard:
1. Vá em **Settings** → **Environment Variables**
2. Verifique se todas as variáveis estão configuradas
3. **IMPORTANTE:** Verifique se as variáveis estão aplicadas ao ambiente **Production**
4. Se alguma variável estiver faltando ou incorreta, adicione/corrija e faça redeploy

## 6. Verificar se Há Múltiplos Projetos

### Possível Problema:
- Pode haver múltiplos projetos no Vercel
- O domínio pode estar apontando para o projeto errado

### Como Verificar:
1. Vercel Dashboard → **Projects**
2. Liste todos os projetos
3. Verifique qual projeto tem o domínio `experimenteai.com.br`
4. Confirme que é o projeto `paineladm`

## 7. Solução Nuclear: Deletar e Recriar Deploy

Se nada funcionar:

1. **No Vercel Dashboard:**
   - Vá em **Deployments**
   - Encontre o deploy mais recente
   - Clique nos três pontos → **"Delete"**
   - Confirme a exclusão

2. **Forçar Novo Deploy:**
   ```bash
   cd E:\projetos\paineladm
   # Fazer uma mudança mínima
   echo "// Force deploy $(date)" >> src/app/(lojista)/produtos/page.tsx
   git add .
   git commit -m "chore: force new deploy"
   git push
   ```

3. **Aguardar Deploy Automático:**
   - O Vercel detectará o push
   - Criará um novo deploy do zero
   - Aguarde 3-5 minutos

## 8. Verificar no Navegador

### DevTools → Network:
1. Abra DevTools (`F12`)
2. Vá em **Network**
3. Marque **"Desativar cache"** (Disable cache)
4. Recarregue a página (`Ctrl + Shift + R`)
5. Verifique a requisição de `/produtos`
6. Veja os **Response Headers**:
   - Deve ter `Cache-Control: no-store, no-cache...`
   - Deve ter `X-Vercel-Cache: MISS` (não HIT)

### Se `X-Vercel-Cache: HIT`:
- O Vercel está servindo cache
- Faça um redeploy sem cache novamente
- Ou aguarde alguns minutos para o cache expirar

## 9. Verificar Timestamp do Build

### No código, adicione um timestamp visível:
```typescript
// Em src/app/(lojista)/produtos/page.tsx
export default async function ProdutosPage() {
  const buildTime = process.env.BUILD_TIME || new Date().toISOString();
  console.log('[ProdutosPage] Build time:', buildTime);
  // ...
}
```

### No Vercel, adicione variável:
- Settings → Environment Variables
- Adicione: `BUILD_TIME` = timestamp atual
- Faça redeploy

### No navegador:
- Veja o console
- Compare o timestamp com o esperado

## 10. Checklist Final

- [ ] Deploy ativo é o mais recente (commit hash correto)
- [ ] Domínio apontando para o deploy correto
- [ ] Build logs sem erros
- [ ] Variáveis de ambiente configuradas
- [ ] Cache do navegador desabilitado no DevTools
- [ ] Response headers mostram `no-cache`
- [ ] `X-Vercel-Cache: MISS` (não HIT)
- [ ] Testado em modo anônimo
- [ ] Testado em outro navegador

## 🚨 Se Ainda Não Funcionar

Pode ser um problema com:
1. **CDN do Vercel** - Pode levar até 5 minutos para propagar
2. **DNS** - Pode estar apontando para servidor antigo
3. **Service Workers** - Podem estar servindo versão antiga

**Solução temporária:**
- Use uma URL com timestamp: `https://www.experimenteai.com.br/produtos?v=1234567890`
- Isso força bypass de cache



