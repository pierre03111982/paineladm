# 🔧 Como Criar o Índice Composto para Favoritos

## ⚠️ Passo Obrigatório

Para que a solução dos favoritos funcione corretamente, é necessário criar um **índice composto** no Firestore que combine os campos `action` e `createdAt`.

---

## 📋 Método 1: Criar Manualmente no Firebase Console

### Passo 1: Acessar o Firebase Console
1. Acesse: https://console.firebase.google.com/
2. Selecione seu projeto

### Passo 2: Navegar até Firestore
1. No menu lateral, clique em **"Firestore Database"**
2. Clique na aba **"Índices"** (no topo)
3. Clique no botão **"Criar índice"**

### Passo 3: Configurar o Índice

**ID da Coleção:**
```
favoritos
```

**Caminho Completo da Coleção:**
```
lojas/{lojistaId}/clientes/{customerId}/favoritos
```

**Campos do Índice:**

| Campo | Tipo de Ordenação | Ordem |
|-------|-------------------|-------|
| `action` | Ascendente | 1 |
| `createdAt` | Descendente | 2 |

**Configurações:**
- ✅ **Query scope:** Collection
- ✅ **Status:** Habilitado

### Passo 4: Criar o Índice
1. Clique em **"Criar"**
2. Aguarde alguns minutos enquanto o Firebase cria o índice (status: "Building")
3. Quando o status mudar para **"Enabled"**, o índice estará pronto!

---

## 📋 Método 2: Usar o Link Automático (Recomendado)

### Passo 1: Executar o Backend
1. No terminal, execute:
```bash
cd E:\projetos\paineladm
npm run dev
```

### Passo 2: Fazer uma Requisição de Favoritos
- Abra o app `modelo-2` e clique em "Meus Favoritos"
- OU faça uma requisição manual para: `GET /api/cliente/favoritos?lojistaId=XXX&customerId=YYY`

### Passo 3: Verificar o Console do Servidor
- O console do servidor mostrará um erro como:
```
⚠️ FALTA ÍNDICE NO FIRESTORE! Crie o índice clicando no link do erro abaixo:
```

### Passo 4: Clicar no Link
- O erro do Firestore conterá um link como:
```
https://console.firebase.google.com/v1/r/project/SEU_PROJETO/firestore/indexes?create_composite=...
```
- **Clique nesse link** - ele abrirá o Firebase Console já com o índice pré-configurado
- Clique em **"Criar"**
- Aguarde alguns minutos

---

## 🔍 Verificar se o Índice Foi Criado

### No Firebase Console:
1. Acesse: **Firestore Database** → **Índices**
2. Procure por um índice com:
   - **Collection ID:** `favoritos`
   - **Fields:** `action (Ascending)`, `createdAt (Descending)`
   - **Status:** `Enabled` (verde)

### No Código:
- Quando o índice estiver pronto, o código usará a query otimizada:
```typescript
.where("action", "==", "like") 
.orderBy("createdAt", "desc")
.limit(10)
```
- Se o índice não existir, o código usará o fallback (busca 200 itens e filtra em memória)

---

## ⚡ Teste Rápido

Após criar o índice, teste:

1. **No app `modelo-2`:**
   - Dê um "like" em uma imagem
   - Clique em "Meus Favoritos"
   - Verifique se a imagem aparece na lista

2. **No console do servidor:**
   - Não deve aparecer mais o erro de índice
   - Deve aparecer: `[fetchFavoriteLooks] Favoritos encontrados: X`

---

## 🐛 Troubleshooting

### Problema: O link não aparece no erro
**Solução:** Crie o índice manualmente usando o Método 1

### Problema: O índice está "Building" há muito tempo
**Solução:** 
- Aguarde mais alguns minutos (pode levar até 10-15 minutos)
- Verifique se há muitos documentos na coleção
- Se necessário, crie o índice manualmente

### Problema: O índice foi criado mas ainda dá erro
**Solução:**
- Verifique se o caminho da coleção está correto
- Verifique se os campos estão exatamente como: `action` e `createdAt`
- Verifique se a ordenação está correta: `action` (Ascendente), `createdAt` (Descendente)

---

## 📝 Notas Importantes

1. **O índice é necessário** porque estamos fazendo uma query composta:
   - Filtro: `where("action", "==", "like")`
   - Ordenação: `orderBy("createdAt", "desc")`

2. **Sem o índice**, o Firestore não consegue executar essa query e retorna erro `failed-precondition`

3. **O fallback funciona**, mas é menos eficiente (busca 200 itens e filtra em memória)

4. **Com o índice**, a query é otimizada e busca apenas os 10 likes mais recentes diretamente do banco

---

**Última atualização:** 2024-12-19

