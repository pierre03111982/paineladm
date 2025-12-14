# Debug: Produtos não aparecendo

## Passos para debug:

### 1. Verificar logs ao gerar composição

Quando você gerar uma nova composição, procure por estes logs no console do servidor:

1. **`[API] 📊 Resumo da busca de produtos:`** - Quantos produtos foram encontrados?
2. **`[API] 🔍 DEBUG: Preparando produtos para salvar:`** - Quantos produtos estão sendo preparados?
3. **`[API] 📦 Produtos mapeados para salvar na composição:`** - Quantos produtos foram mapeados?
4. **`[API] 📦 DADOS DA COMPOSIÇÃO QUE SERÁ SALVA:`** - Quantos produtos estão no array `produtos`?
5. **`[API] ✅ Composição salva no Firestore:`** - A composição foi salva?

### 2. Verificar logs ao abrir o modal

Quando você abrir o modal do "Cockpit de Vendas", procure por:

1. **`[API] 🔍 Tentando buscar composição com ID:`** - A composição está sendo buscada?
2. **`[API] 📄 Composição encontrada diretamente!`** - A composição foi encontrada?
3. **`[API] 📦 Produtos salvos na composição:`** - Quantos produtos foram encontrados?
4. **`[API] ✅ Produtos processados da composição:`** - Quantos produtos foram processados?
5. **`[ClientSalesCockpitModal] ✅ Resposta da API:`** - Quantos produtos foram retornados?

### 3. Possíveis problemas

#### Problema 1: Produtos não sendo salvos
- **Sintoma**: Log mostra `[API] 📦 Produtos mapeados para salvar:` com 0 produtos
- **Causa**: `productsData` está vazio ou `productIds` está vazio
- **Solução**: Verificar se os produtos estão sendo buscados do Firestore corretamente

#### Problema 2: Produtos salvos mas não encontrados
- **Sintoma**: Log mostra que produtos foram salvos, mas não são encontrados na busca
- **Causa**: A composição não está sendo encontrada ou os produtos não estão no formato correto
- **Solução**: Verificar se a composição está sendo buscada pelo ID correto

#### Problema 3: Produtos encontrados mas vazios
- **Sintoma**: Log mostra que produtos foram encontrados, mas aparecem como vazios no modal
- **Causa**: Os produtos não têm dados completos (nome, preço, imagem)
- **Solução**: Verificar se os produtos no Firestore têm todas as informações necessárias

## Próximos passos

1. Gere uma nova composição
2. Copie os logs do console do servidor
3. Envie os logs para análise

Ou posso criar um script para verificar diretamente no Firestore o que foi salvo.


