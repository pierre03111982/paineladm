# 📚 Explicação: Coleção Global vs Subcoleção

## 🔍 Estrutura de Dados no Firestore

O sistema armazena composições em **DUAS localizações diferentes** no Firestore:

### 1️⃣ **COLEÇÃO GLOBAL** 
```
composicoes/
  ├── {composicaoId1}
  │   ├── lojistaId: "thais-moda"
  │   ├── customerId: "cliente123"
  │   ├── createdAt: Timestamp
  │   └── ... outros dados
  ├── {composicaoId2}
  │   ├── lojistaId: "outra-loja"
  │   └── ...
  └── ...
```

**Características:**
- ✅ Todas as composições de TODOS os lojistas ficam juntas
- ✅ Identificação por campo `lojistaId` dentro de cada documento
- ✅ Útil para buscas globais e relatórios gerais
- ✅ Facilita migrações e backups centralizados

### 2️⃣ **SUBCOLEÇÃO** (por lojista)
```
lojas/
  └── {lojistaId}/
      └── composicoes/
          ├── {composicaoId1}
          │   ├── customerId: "cliente123"
          │   ├── createdAt: Timestamp
          │   └── ... outros dados
          ├── {composicaoId2}
          └── ...
```

**Características:**
- ✅ Composições organizadas por lojista
- ✅ Busca mais rápida quando você já sabe o lojista
- ✅ Melhor organização hierárquica
- ✅ Facilita controle de acesso por lojista

---

## 📊 Onde Cada Página Usa

### 🎨 **Página de Composições** (`/composicoes`)

**Arquivo:** `src/app/(lojista)/composicoes/fetch-all-compositions.ts`

**Busca em AMBAS as coleções:**

```typescript
// 1. Busca na COLEÇÃO GLOBAL
const globalSnapshot = await db
  .collection("composicoes")
  .where("lojistaId", "==", lojistaId)
  .limit(10000)
  .get();

// 2. Busca na SUBCOLEÇÃO
const subcollectionSnapshot = await db
  .collection("lojas")
  .doc(lojistaId)
  .collection("composicoes")
  .limit(10000)
  .get();
```

**Por quê?**
- ✅ Garante que todas as composições sejam encontradas
- ✅ Remove duplicatas (usando `seenIds` Set)
- ✅ Combina resultados de ambas as fontes
- ✅ Ordena por data (mais recente primeiro)

---

### 📡 **Radar de Oportunidades** (`/dashboard` - Visual History)

**Arquivo:** `src/lib/firestore/crm-queries.ts`

**Busca em AMBAS as coleções:**

```typescript
// 1. Busca na COLEÇÃO GLOBAL (últimas 72h)
const compositionsRef = db.collection("composicoes");
const globalQuery = compositionsRef
  .where("lojistaId", "==", lojistaId)
  .where("createdAt", ">=", cutoffTimestamp)
  .orderBy("createdAt", "desc")
  .limit(1000);

// 2. Busca na SUBCOLEÇÃO (últimas 72h)
const subcollectionRef = db
  .collection("lojas")
  .doc(lojistaId)
  .collection("composicoes");
```

**Por quê?**
- ✅ Foca em composições recentes (últimas 72 horas)
- ✅ Mostra clientes ativos recentemente
- ✅ Combina ambas as fontes para evitar perda de dados
- ✅ Agrupa por cliente para mostrar atividade

---

## 💾 Onde as Composições são SALVAS?

Quando uma composição é **gerada**, ela é salva na **SUBCOLEÇÃO**:

**Arquivo:** `src/app/api/lojista/composicoes/generate/route.ts`

```typescript
const composicaoData = {
  lojistaId,
  customerId,
  customerName,
  createdAt: FieldValue.serverTimestamp(),
  // ... outros dados
};

// Salva na SUBCOLEÇÃO
await db
  .collection("lojas")
  .doc(lojistaId)
  .collection("composicoes")
  .doc(composicaoId)
  .set(composicaoData);
```

**NOTA:** Algumas composições antigas podem ter sido salvas apenas na coleção global. Por isso, as páginas buscam em AMBAS para garantir que nada seja perdido.

---

## 🔄 Por que Duas Localizações?

### Vantagens da Coleção Global:
- ✅ Relatórios consolidados de todas as lojas
- ✅ Análises globais de uso
- ✅ Facilita migrações e backups

### Vantagens da Subcoleção:
- ✅ Organização hierárquica por lojista
- ✅ Melhor performance em buscas específicas
- ✅ Controle de acesso mais granular
- ✅ Estrutura mais limpa e organizada

### Por que Buscar em Ambas?

O sistema evoluiu ao longo do tempo:
1. **Inicialmente:** Composições eram salvas apenas na coleção global
2. **Depois:** Mudou para salvar na subcoleção
3. **Agora:** Busca em ambas para garantir compatibilidade

Isso garante que:
- ✅ Composições antigas (coleção global) sejam encontradas
- ✅ Composições novas (subcoleção) sejam encontradas
- ✅ Nada seja perdido ou duplicado

---

## 🎯 Resumo Prático

### 📱 **Painel do Lojista** (Login Normal)

| Página | Coleção Global? | Subcoleção? | Por quê? |
|--------|----------------|-------------|----------|
| **Composições** (`/composicoes`) | ❌ **NÃO** | ✅ Sim | Mostra todas as composições APENAS da subcoleção |
| **Radar** (Visual History) | ❌ **NÃO** | ✅ Sim | Mostra composições recentes APENAS da subcoleção |
| **Chat AI** | ❌ **NÃO** | ✅ Sim | Conta total e busca composições APENAS da subcoleção |
| **Salvar Nova** | ❌ Não | ✅ Sim | Salva apenas na subcoleção do lojista |

### 🔐 **Painel Administrativo** (Login Admin)

| Página | Coleção Global? | Subcoleção? | Por quê? |
|--------|----------------|-------------|----------|
| **Composições** | ✅ Sim | ✅ Sim | Acesso completo a todas as coleções |
| **Chat AI** | ✅ Sim | ✅ Sim | Acesso à coleção global para análises globais |
| **Dashboard Admin** | ✅ Sim | ✅ Sim | Relatórios consolidados de todas as lojas |

---

## 🔍 Funções de Busca

### `fetchAllCompositionsForVisualHistory`
- Busca em AMBAS as coleções
- Remove duplicatas
- Retorna todas as composições ordenadas por data

### `fetchActiveClients` (Radar)
- Busca em AMBAS as coleções
- Filtra últimas 72 horas
- Agrupa por cliente

### `countAllCompositions`
- Conta em AMBAS as coleções
- Remove duplicatas na contagem
- Retorna total único

---

## 💡 Recomendação

Para garantir consistência:
- ✅ **Sempre buscar em ambas** quando precisar de dados completos
- ✅ **Usar Set para remover duplicatas** (mesmo ID pode existir em ambas)
- ✅ **Salvar na subcoleção** para novas composições
- ✅ **Manter compatibilidade** buscando em ambas para não perder dados antigos

