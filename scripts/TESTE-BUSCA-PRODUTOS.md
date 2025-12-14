# Script de Teste - Busca de Produtos

Este script testa a busca de produtos para uma composição específica usando dados reais dos logs.

## Como executar

```bash
cd E:\projetos\paineladm
npx tsx scripts/testar-busca-produtos.ts
```

## O que o script faz

1. **Busca a composição diretamente** pelo `compositionId`
2. **Busca na GENERATION** pela `imagemUrl` (método mais confiável)
3. **Busca produtos no Firestore** usando os `productIds` encontrados
4. **Exibe o resultado final** com todos os produtos encontrados

## Dados de teste utilizados

- **CompositionId**: `comp_1764956112133_jk86dtnaj`
- **LojistaId**: `hOQL4BaVY92787EjKVMt`
- **ImagemUrl**: `https://storage.googleapis.com/paineladmexperimenteai.firebasestorage.app/generations/hOQL4BaVY92787EjKVMt/job-1764956110991-rfcvgv-1764956124036.png`

## Saída esperada

O script mostrará:
- Se a composição foi encontrada
- Se a generation foi encontrada e quais `productIds` ela contém
- Lista de produtos encontrados com seus detalhes
- Ou mensagem de erro se nada for encontrado

## Testando com outros dados

Para testar com outros dados, edite o arquivo `scripts/testar-busca-produtos.ts` e altere as variáveis no início da função `testarBuscaProdutos()`:

```typescript
const compositionId = "SEU_COMPOSITION_ID_AQUI";
const lojistaId = "SEU_LOJISTA_ID_AQUI";
const imagemUrl = "SUA_IMAGEM_URL_AQUI";
```


