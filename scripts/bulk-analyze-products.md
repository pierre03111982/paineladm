# Script de Atualização em Massa de Análises de Produtos

## Como usar:

### Opção 1: Via API (Recomendado)

Faça uma requisição POST para:

```
POST /api/lojista/products/bulk-analyze
Content-Type: application/json

{
  "lojistaId": "ID_DA_LOJA",
  "limit": 100,  // opcional, padrão: 100
  "skip": 0      // opcional, padrão: 0
}
```

### Opção 2: Via cURL

```bash
curl -X POST http://localhost:3000/api/lojista/products/bulk-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "lojistaId": "SEU_LOJISTA_ID",
    "limit": 100
  }'
```

### Opção 3: Via JavaScript/TypeScript

```typescript
const response = await fetch('/api/lojista/products/bulk-analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    lojistaId: 'SEU_LOJISTA_ID',
    limit: 100,
    skip: 0
  })
});

const result = await response.json();
console.log(result);
```

## Resposta:

```json
{
  "success": true,
  "processed": 50,
  "updated": 45,
  "errors": 2,
  "skipped": 3,
  "message": "Processados 50 produtos. 45 atualizados, 2 erros, 3 pulados.",
  "details": [
    {
      "produtoId": "abc123",
      "nome": "Vestido Floral",
      "status": "updated"
    },
    {
      "produtoId": "def456",
      "nome": "Produto sem imagem",
      "status": "skipped",
      "error": "Sem imagem"
    }
  ]
}
```

## Notas:

- O script processa produtos em lotes (padrão: 100 por vez)
- Use `skip` para processar em páginas (ex: skip: 0, skip: 100, skip: 200...)
- Produtos sem imagem são pulados automaticamente
- A análise foca APENAS na roupa, ignorando acessórios
- Campos vazios são preenchidos, campos existentes são mesclados (tags, cores)
- Um delay de 500ms entre produtos evita rate limiting

## Campos atualizados:

- `nome` (se vazio)
- `categoria` (se vazia)
- `tags` (mesclado com tags existentes)
- `cores` (mesclado com cores existentes)
- `obs` / `observacoes` (adiciona descrição SEO)
- `analiseIA` (metadados da análise: tecido, detalhes, data)

