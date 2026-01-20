# Integração do Ajustador de Medidas no App Modelo-2

## ✅ O que foi feito no Paineladm

1. ✅ **Componentes criados** em `src/components/store/virtual-fitting/`
2. ✅ **Cores corrigidas** na página de teste
3. ✅ **Botão adicionado** na aba Produtos para acessar a página de teste

## 📋 Para integrar no App Modelo-2

### Passo 1: Copiar Componentes e Hooks

Copiar os seguintes arquivos do `paineladm` para `apps-cliente/modelo-2`:

#### Hooks:
- `src/hooks/useFittingAlgorithm.ts` → `apps-cliente/modelo-2/src/hooks/useFittingAlgorithm.ts`

#### Componentes:
- `src/components/store/virtual-fitting/` (todos os arquivos) → `apps-cliente/modelo-2/src/components/store/virtual-fitting/`

#### Firestore Utils:
- `src/lib/firestore/user-profile.ts` → `apps-cliente/modelo-2/src/lib/firestore/user-profile.ts`
  - ⚠️ **ATENÇÃO**: Adaptar para usar `getFirestoreClient()` do modelo-2 ao invés de `getFirebaseApp()`

### Passo 2: Adaptar FittingModal.tsx

O modelo-2 não tem `framer-motion`. Duas opções:

**Opção A: Instalar framer-motion (Recomendado)**
```bash
cd apps-cliente/modelo-2
npm install framer-motion
```

**Opção B: Adaptar sem framer-motion**
Remover animações ou usar CSS transitions simples.

### Passo 3: Criar Página no Modelo-2

Criar arquivo: `apps-cliente/modelo-2/src/app/[lojistaId]/minhas-medidas/page.tsx`

```tsx
"use client";

import { FittingModal, FittingTrigger } from "@/components/store/virtual-fitting";
import { saveUserMeasurements, getUserMeasurements } from "@/lib/firestore/user-profile";
import { getFirebaseAuth } from "@/lib/firebase";
import { useState, useEffect } from "react";

export default function MinhasMedidasPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (auth) {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        setUserId(user?.uid || null);
      });
      return () => unsubscribe();
    }
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Minhas Medidas</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="mb-4">
          Cadastre suas medidas para receber recomendações de tamanho personalizadas.
        </p>
        
        <FittingTrigger
          productId="cadastro-medidas"
          productMeasurements={{}}
          onSaveMeasurements={async (data) => {
            if (userId) {
              await saveUserMeasurements(userId, data);
              alert("Medidas salvas com sucesso!");
            }
          }}
        />
      </div>
    </div>
  );
}
```

### Passo 4: Adicionar Link no Menu

Adicionar um link no menu do app modelo-2 apontando para `/minhas-medidas`.

## 🔧 Adaptações Necessárias

### user-profile.ts

Adaptar para usar a estrutura do modelo-2:

```tsx
// ANTES (paineladm):
import { getFirebaseApp } from "../firebaseConfig";

// DEPOIS (modelo-2):
import { getFirestoreClient } from "../firebase";

// E usar:
const db = getFirestoreClient();
```

### FittingModal.tsx

Se não instalar framer-motion, remover imports e animações:

```tsx
// Remover:
import { motion, AnimatePresence } from "framer-motion";

// Substituir <motion.div> por <div>
// Remover props de animação (initial, animate, exit, etc.)
```

## 🎯 Como o Cliente Usa

1. Cliente acessa `/minhas-medidas` no app modelo-2
2. Clica em "Descubra seu tamanho ideal"
3. Preenche Altura, Peso, Idade, Gênero
4. Ajusta sliders no manequim 3D
5. Vê recomendação de tamanho
6. Medidas são salvas automaticamente no perfil

## 📝 Próximos Passos Sugeridos

- [ ] Integrar botão do FittingTrigger em páginas de produto específicas
- [ ] Mostrar recomendação de tamanho automaticamente quando cliente visualizar produto
- [ ] Criar seção "Minha Conta" com opção para editar medidas
- [ ] Adicionar histórico de recomendações

## ❓ Dúvidas?

Os componentes principais estão prontos e funcionais no paineladm. A integração no modelo-2 requer apenas a cópia e pequenas adaptações conforme descrito acima.
