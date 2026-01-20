# Como Testar o Ajustador de Medidas / Provador Virtual

## 📍 Situação Atual

Os componentes do **Ajustador de Medidas** foram criados em:
```
paineladm/src/components/store/virtual-fitting/
```

Mas eles **ainda não foram integrados** em nenhuma página do app. Eles existem como componentes prontos, mas precisam ser inseridos em uma página para testar.

## 🧪 Opção 1: Criar Página de Teste no Paineladm

### Passo 1: Criar página de teste

Criar arquivo: `src/app/(lojista)/ajustador-medidas-test/page.tsx`

```tsx
"use client";

import { FittingTrigger } from "@/components/store/virtual-fitting";
import { saveUserMeasurements } from "@/lib/firestore/user-profile";

export default function AjustadorMedidasTestPage() {
  // Dados de exemplo do produto
  const productMeasurements = {
    "P": { "Busto": 88, "Cintura": 72, "Quadril": 92 },
    "M": { "Busto": 92, "Cintura": 76, "Quadril": 96 },
    "G": { "Busto": 96, "Cintura": 80, "Quadril": 100 },
    "GG": { "Busto": 100, "Cintura": 84, "Quadril": 104 },
  };

  // ID do usuário (você precisa obter do contexto de autenticação)
  const userId = "user-id-exemplo"; // Substituir pelo ID real do usuário logado

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Teste do Ajustador de Medidas</h1>
      
      <div className="space-y-4">
        <p>Clique no botão abaixo para abrir o Provador Virtual:</p>
        
        <FittingTrigger
          productId="produto-teste-123"
          productMeasurements={productMeasurements}
          sizeOrder={["P", "M", "G", "GG"]}
          onSaveMeasurements={async (measurements) => {
            await saveUserMeasurements(userId, measurements);
            alert("Medidas salvas com sucesso!");
          }}
        />
      </div>
    </div>
  );
}
```

### Passo 2: Acessar a página de teste

Acesse no navegador:
```
http://localhost:3000/ajustador-medidas-test
```

## 🔗 Opção 2: Integrar no App Modelo-2

Se quiser testar no **app modelo-2**, você precisa:

1. **Copiar os componentes** de `paineladm/src/components/store/virtual-fitting/` para `apps-cliente/modelo-2/src/components/store/virtual-fitting/`

2. **Copiar o hook** de `paineladm/src/hooks/useFittingAlgorithm.ts` para `apps-cliente/modelo-2/src/hooks/useFittingAlgorithm.ts`

3. **Copiar a função do Firestore** de `paineladm/src/lib/firestore/user-profile.ts` para `apps-cliente/modelo-2/src/lib/firestore/user-profile.ts`

4. **Integrar em uma página** (ex: na ExperimentarView.tsx ou criar uma página de produto)

## 🚀 Teste Rápido (Recomendado)

A forma mais rápida é criar a página de teste no paineladm conforme a **Opção 1**.

### O que você verá:

1. **Botão "Descubra seu tamanho ideal"** - Ao clicar, abre o modal
2. **Passo 1**: Formulário com Altura, Peso, Idade, Gênero
3. **Passo 2**: Manequim 3D + Sliders de ajuste + Paleta de tons de pele
4. **Passo 3**: Recomendação de tamanho + Feedback de ajuste

## 📝 Observações Importantes

- O ajustador **NÃO está visível automaticamente** - precisa ser integrado
- É uma funcionalidade **separada** do "Provador Virtual com IA" que aparece no app modelo-2
- O ajustador é para **recomendar tamanhos** baseado em medidas corporais
- O provador virtual atual é para **experimentar roupas** com foto

## ❓ Dúvidas?

Se precisar de ajuda para integrar ou criar a página de teste, me avise!
