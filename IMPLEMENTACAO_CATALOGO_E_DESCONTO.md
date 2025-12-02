# 🎯 Implementação: Catálogo com IA e Desconto por Produto

## 📋 Funcionalidades a Implementar

### 1. Botão Gerar Catálogo
- ✅ Ao gerar, salvar automaticamente como imagem principal do catálogo
- ✅ Salvar foto original separadamente
- ✅ Padronizar tamanho da imagem gerada (800x1200px recomendado)
- ✅ A imagem gerada será exibida em todos os lugares do app

### 2. Formulário de Produto
- ✅ Mostrar foto original e foto gerada com IA lado a lado
- ✅ Adicionar campo de desconto específico do produto (%)
- ✅ Se houver desconto do produto, substitui o desconto universal

### 3. Tela de Configurações
- ✅ Informar que o desconto universal é para todos os produtos
- ✅ Informar que pode ter desconto diferenciado editando o produto

### 4. App Cliente
- ✅ Usar imagem de catálogo (IA) como principal
- ✅ Destacar "DESCONTO ESPECIAL" quando desconto do produto > desconto universal
- ✅ Mostrar o valor maior de desconto

---

## 🔧 Arquivos a Modificar

1. `src/lib/firestore/types.ts` - Adicionar campos ao ProdutoDoc
2. `src/app/(lojista)/produtos/products-table.tsx` - Modificar formulário
3. `src/app/api/ai/catalog/route.ts` - Salvar automaticamente após gerar
4. `src/app/api/lojista/products/[productId]/route.ts` - Suportar novos campos
5. `src/app/(lojista)/configuracoes/settings-form.tsx` - Atualizar texto
6. `apps-cliente/modelo-2/src/lib/types.ts` - Atualizar tipos
7. `apps-cliente/modelo-2/src/components/views/ExperimentarView.tsx` - Lógica de desconto

---

## 📝 Campos Adicionados ao Produto

```typescript
{
  imagemUrlOriginal: string,        // Foto original do produto
  imagemUrlCatalogo: string,        // Foto gerada com IA (principal)
  descontoProduto?: number,         // % de desconto específico (opcional)
  catalogGeneratedAt?: Date,        // Data de geração
}
```

---

## 🎨 Lógica de Desconto

```typescript
const descontoFinal = produto.descontoProduto ?? lojista.descontoRedesSociais ?? 0;
const precoComDesconto = preco * (1 - descontoFinal / 100);
const isDescontoEspecial = produto.descontoProduto > lojista.descontoRedesSociais;
```

---

## ✅ Checklist de Implementação

- [ ] 1. Atualizar tipos (ProdutoDoc)
- [ ] 2. Modificar botão de gerar catálogo
- [ ] 3. Adicionar campo desconto no formulário
- [ ] 4. Mostrar foto original e IA no formulário
- [ ] 5. Atualizar API para salvar automaticamente
- [ ] 6. Atualizar tela de configurações
- [ ] 7. Atualizar app cliente (lógica de desconto)
- [ ] 8. Destacar desconto especial no app cliente

















