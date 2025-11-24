# Converter Imagens Existentes para PNG

## Problema
As imagens dos produtos que foram adicionadas via link externo não estão aparecendo no modelo-2. Precisamos converter todas essas imagens para PNG e fazer upload para o Firebase Storage.

## Solução

### 1. Executar o Script de Conversão

No diretório `paineladm`, execute:

```bash
cd E:\projetos\paineladm
npx tsx scripts/convert-existing-images.ts
```

### 2. O que o Script Faz

- Itera por todas as lojas no Firestore
- Para cada produto, verifica se a `imagemUrl` é um link externo (não do Firebase Storage)
- Se for link externo:
  - Baixa a imagem
  - Converte para PNG usando `sharp`
  - Faz upload para Firebase Storage
  - Atualiza o produto com a nova URL do Firebase Storage

### 3. Verificar Resultado

Após executar o script, verifique:
- Console mostra quantas imagens foram convertidas
- No painel admin, os produtos devem mostrar URLs do Firebase Storage
- No modelo-2, as imagens devem aparecer corretamente

### 4. Se o Script Falhar

Se houver erros:
- Verifique se `sharp` está instalado: `npm install sharp`
- Verifique se as variáveis de ambiente do Firebase estão configuradas
- Verifique se o Firebase Storage está acessível

## Nota Importante

**Novas imagens adicionadas via link já são convertidas automaticamente** nas rotas:
- `POST /api/lojista/products` (criar produto)
- `PATCH /api/lojista/products/[productId]` (atualizar produto)

Este script é apenas para converter imagens existentes que foram adicionadas antes dessa funcionalidade.



## Problema
As imagens dos produtos que foram adicionadas via link externo não estão aparecendo no modelo-2. Precisamos converter todas essas imagens para PNG e fazer upload para o Firebase Storage.

## Solução

### 1. Executar o Script de Conversão

No diretório `paineladm`, execute:

```bash
cd E:\projetos\paineladm
npx tsx scripts/convert-existing-images.ts
```

### 2. O que o Script Faz

- Itera por todas as lojas no Firestore
- Para cada produto, verifica se a `imagemUrl` é um link externo (não do Firebase Storage)
- Se for link externo:
  - Baixa a imagem
  - Converte para PNG usando `sharp`
  - Faz upload para Firebase Storage
  - Atualiza o produto com a nova URL do Firebase Storage

### 3. Verificar Resultado

Após executar o script, verifique:
- Console mostra quantas imagens foram convertidas
- No painel admin, os produtos devem mostrar URLs do Firebase Storage
- No modelo-2, as imagens devem aparecer corretamente

### 4. Se o Script Falhar

Se houver erros:
- Verifique se `sharp` está instalado: `npm install sharp`
- Verifique se as variáveis de ambiente do Firebase estão configuradas
- Verifique se o Firebase Storage está acessível

## Nota Importante

**Novas imagens adicionadas via link já são convertidas automaticamente** nas rotas:
- `POST /api/lojista/products` (criar produto)
- `PATCH /api/lojista/products/[productId]` (atualizar produto)

Este script é apenas para converter imagens existentes que foram adicionadas antes dessa funcionalidade.



