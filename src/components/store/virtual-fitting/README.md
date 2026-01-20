# Provador Virtual / Ajustador de Medidas

Sistema completo de recomendação de tamanhos baseado em medidas antropométricas estimadas, estilo Sizebay/Shein.

## 📋 Visão Geral

O Provador Virtual permite que os clientes descubram seu tamanho ideal baseado em:
- **Dados básicos**: Altura, Peso, Idade, Gênero
- **Ajustes visuais**: Sliders para Busto, Cintura, Quadril (-2 a +2)
- **Algoritmo de estimativa**: Calcula medidas em cm usando IMC + heurísticas

## 🎯 Componentes Principais

### `FittingTrigger`
Botão para abrir o provador virtual na página do produto.

```tsx
import { FittingTrigger } from "@/components/store/virtual-fitting";

<FittingTrigger
  productId="produto-123"
  productMeasurements={{
    "P": { "Busto": 88, "Cintura": 72, "Quadril": 92 },
    "M": { "Busto": 92, "Cintura": 76, "Quadril": 96 },
    "G": { "Busto": 96, "Cintura": 80, "Quadril": 100 },
  }}
  sizeOrder={["P", "M", "G", "GG"]}
  onSaveMeasurements={async (measurements) => {
    await saveUserMeasurements(userId, measurements);
  }}
/>
```

### `FittingModal`
Modal completo com fluxo de 3 passos.

### `DynamicMannequin`
Manequim 3D SVG que reage aos ajustes visuais.

## 📊 Fluxo de Experiência

1. **Passo 1 - Dados Base**: Coleta Altura, Peso, Idade, Gênero
2. **Passo 2 - Ajuste Visual**: Sliders + Manequim interativo + Paleta de tons de pele
3. **Passo 3 - Resultado**: Recomendação de tamanho + Feedback de ajuste

## 💾 Integração com Firestore

As medidas são salvas automaticamente no perfil do usuário:

```tsx
import { saveUserMeasurements, getUserMeasurements } from "@/lib/firestore/user-profile";

// Salvar (feito automaticamente no StepResult)
await saveUserMeasurements(userId, {
  height: 165,
  weight: 70,
  age: 30,
  gender: "female",
  shapeAdjustments: { bust: 1, waist: 0, hip: 2 },
  estimatedCm: { bust: 98, waist: 82, hip: 105 },
  lastUpdated: new Date(),
});

// Buscar medidas salvas
const measurements = await getUserMeasurements(userId);
```

## 🎨 Estilo

- Modal mobile-first com slide-up animation
- Design limpo estilo Sizebay/Shein
- Suporte a dark mode
- Animações suaves com Framer Motion

## 📐 Estrutura de Dados

### Medidas do Produto
```typescript
Record<string, Record<string, number>>
// Exemplo: { "P": { "Busto": 88, "Cintura": 72 }, "M": { ... } }
```

### Medidas do Usuário
```typescript
{
  height: number; // cm
  weight: number; // kg
  age: number;
  gender: "female" | "male";
  shapeAdjustments: {
    bust: number; // -2 a +2
    waist: number; // -2 a +2
    hip: number; // -2 a +2
  };
  estimatedCm: {
    bust: number; // cm
    waist: number; // cm
    hip: number; // cm
  };
  lastUpdated: Date;
}
```

## 🔧 Algoritmo de Estimativa

O hook `useFittingAlgorithm` calcula medidas estimadas usando:

1. **IMC**: `peso / (altura/100)²`
2. **Fórmulas base**: Diferentes para masculino/feminino
3. **Ajustes visuais**: Cada ponto no slider = ~4cm de ajuste

## 🚀 Próximos Passos

- [ ] Integração com "Minha Conta" para reeditar medidas
- [ ] Cache de recomendações para produtos similares
- [ ] A/B testing de diferentes fórmulas de estimativa
- [ ] Suporte a diferentes tipos de roupas (algoritmos específicos)

## 📝 Notas

- As medidas são **estimativas** baseadas em heurísticas
- O sistema não exige fita métrica (diferenciador competitivo)
- Medidas salvas podem ser usadas para personalização de IA futura
