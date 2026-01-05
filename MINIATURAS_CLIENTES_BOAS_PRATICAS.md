# 📋 Boas Práticas: Miniaturas de Clientes

## ✅ Estrutura Correta Implementada

### 1. **API Route: `/api/lojista/clientes/last-composition-images`**

**Princípios:**
- ✅ **Busca todas as composições de uma vez** (não individualmente)
- ✅ **Processa no servidor** (não no cliente)
- ✅ **Usa a mesma função do dashboard** (`fetchComposicoesRecentes`)
- ✅ **Mesma lógica de processamento** (`buildActiveCustomers`)

**Código Base:**
```typescript
// ✅ CORRETO: Busca todas de uma vez
const composicoes = await fetchComposicoesRecentes(lojistaId, 1000);

// ✅ CORRETO: Processa no servidor
const lastCompositionByCustomer = new Map<string, { imageUrl: string | null; createdAt: Date }>();

// ✅ CORRETO: Mesma ordem de verificação de campos
const imageUrl = 
  comp.imagemUrl || 
  (comp as any).imageUrl || 
  (comp as any).final_image_url ||
  (comp as any).looks?.[0]?.imagemUrl ||
  (comp as any).looks?.[0]?.imageUrl ||
  (comp as any).generation?.imagemUrl ||
  null;
```

**❌ ERRADO (evitar):**
```typescript
// ❌ ERRADO: Buscar individualmente para cada cliente
for (const cliente of clientes) {
  const image = await fetch(`/api/lojista/clientes/${cliente.id}/last-liked-image`);
}
```

---

### 2. **Componente: `clientes-table.tsx`**

**Princípios:**
- ✅ **Uma única chamada de API** para todas as imagens
- ✅ **API busca `lojistaId` do auth** se não vier na URL
- ✅ **Usa `Object.assign`** para preencher o mapa de imagens
- ✅ **Passa `lastLikedImageUrl` diretamente** para o `ClienteCard`

**Código Base:**
```typescript
// ✅ CORRETO: Uma chamada para todas as imagens
const imagesUrl = lojistaIdFromUrl 
  ? `/api/lojista/clientes/last-composition-images?lojistaId=${encodeURIComponent(lojistaIdFromUrl)}`
  : `/api/lojista/clientes/last-composition-images`; // API busca do auth

const imagesResponse = await fetch(imagesUrl);
const imagesData = await imagesResponse.json();

if (imagesData.images) {
  Object.assign(images, imagesData.images);
}

// ✅ CORRETO: Passar diretamente para o card
<ClienteCard
  lastLikedImageUrl={lastLikedImages[cliente.id] || null}
  // ...
/>
```

**❌ ERRADO (evitar):**
```typescript
// ❌ ERRADO: Múltiplas chamadas
const promises = clientes.map(cliente => 
  fetch(`/api/lojista/clientes/${cliente.id}/last-liked-image`)
);
```

---

### 3. **Componente: `ClienteCard.tsx`**

**Princípios:**
- ✅ **Código idêntico ao dashboard** (`DashboardContent.tsx`)
- ✅ **Mesma estrutura HTML/CSS**
- ✅ **Mesmo tratamento de erro** com fallback dinâmico
- ✅ **`useEffect` simples** (apenas resetar estados)

**Código Base:**
```typescript
// ✅ CORRETO: Código idêntico ao dashboard
{lastLikedImageUrl ? (
  <img
    src={lastLikedImageUrl}
    alt={`Última composição de ${cliente.nome}`}
    className="w-full h-full object-contain"
    loading="lazy"
    onError={(e) => {
      const target = e.target as HTMLImageElement;
      target.style.display = 'none';
      const parent = target.parentElement;
      if (parent && !parent.querySelector('.fallback-avatar')) {
        const fallback = document.createElement('div');
        fallback.className = 'fallback-avatar w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100';
        fallback.innerHTML = `<span class="text-xs font-semibold text-slate-700">${initials}</span>`;
        parent.appendChild(fallback);
      }
    }}
  />
) : cliente.totalComposicoes > 0 ? (
  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
    <ShoppingCart className="h-5 w-5 text-emerald-400" />
  </div>
) : (
  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
    <span className="text-xs font-semibold text-slate-700">{initials}</span>
  </div>
)}
```

---

## 🔍 Checklist de Verificação

Antes de fazer alterações, verifique:

- [ ] A API busca **todas as composições de uma vez**?
- [ ] O processamento é feito **no servidor** (não no cliente)?
- [ ] A lógica é **idêntica ao dashboard** (`buildActiveCustomers`)?
- [ ] O componente faz **uma única chamada de API**?
- [ ] O `ClienteCard` usa o **mesmo código do dashboard**?
- [ ] Os campos de imagem são verificados na **mesma ordem**?
- [ ] O fallback funciona **dinamicamente** (cria elemento no `onError`)?

---

## 🚨 Problemas Comuns e Soluções

### Problema 1: Imagens não aparecem
**Causa:** Múltiplas chamadas de API ou processamento no cliente
**Solução:** Usar `/api/lojista/clientes/last-composition-images` (uma chamada)

### Problema 2: `lojistaId` vazio
**Causa:** Dependência de `lojistaId` na URL
**Solução:** API busca do auth automaticamente se não vier na URL

### Problema 3: Código diferente do dashboard
**Causa:** Lógica duplicada ou divergente
**Solução:** Reutilizar a mesma função (`fetchComposicoesRecentes`) e lógica

### Problema 4: Performance ruim
**Causa:** N chamadas de API (N = número de clientes)
**Solução:** 1 chamada de API para todos os clientes

---

## 📚 Referências

- **Dashboard:** `src/app/dashboard/components/DashboardContent.tsx` (linha 525-567)
- **Build Logic:** `src/lib/dashboard/build.ts` (função `buildActiveCustomers`, linha 182-257)
- **API Route:** `src/app/api/lojista/clientes/last-composition-images/route.ts`
- **Componente:** `src/app/(lojista)/clientes/ClienteCard.tsx` (linha 114-140)

---

## 💡 Regra de Ouro

> **"Se funciona no dashboard, deve funcionar na tela de clientes usando a mesma lógica."**

Sempre que precisar implementar algo relacionado a imagens de composições:
1. Verifique como o dashboard faz
2. Reutilize a mesma função/API
3. Mantenha a mesma ordem de verificação de campos
4. Use a mesma estrutura HTML/CSS

