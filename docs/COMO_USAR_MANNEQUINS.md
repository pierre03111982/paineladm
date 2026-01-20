# Como Usar os Manequins no Sistema

## 📋 Visão Geral

O sistema de manequins funciona com **duas camadas de características**:

1. **Características do USUÁRIO** (altura, peso, idade) → Determinam a **pasta** (A-E)
2. **Medidas do MANEQUIM** (busto, cintura, quadril) → Determinam a **imagem específica** (1-5 cada)

## 🗂️ Estrutura das Pastas (A-E)

As pastas representam diferentes **perfis físicos do usuário**:

- **Pasta A**: Usuários com características físicas específicas (ex: baixa estatura, baixo peso, jovem)
- **Pasta B**: Usuários com características físicas específicas
- **Pasta C**: Usuários com características físicas específicas (média)
- **Pasta D**: Usuários com características físicas específicas
- **Pasta E**: Usuários com características físicas específicas (ex: alta estatura, maior peso, mais idade)

> ⚠️ **Nota**: A fórmula exata de mapeamento altura/peso/idade → pasta ainda precisa ser calibrada testando no site da Sizebay.

## 📁 Estrutura dos Arquivos

Os arquivos seguem o padrão:
```
mannequin_s{SKIN}_f{FOLDER}_b{BUSTO}_c{CINTURA}_q{QUADRIL}.jpg
```

**Exemplo:**
- `mannequin_s0_fA_b3_c3_q3.jpg` → Pele 0, Pasta A, Medidas médias (3-3-3)
- `mannequin_s4_fE_b5_c5_q5.jpg` → Pele 4, Pasta E, Medidas plus size (5-5-5)

## 💻 Como Usar no Código

### Opção 1: Usar o Componente React (Recomendado)

```tsx
import MannequinDisplay from '@/components/MannequinDisplay';

function MeuComponente() {
  const [skinTone, setSkinTone] = useState(0);
  const [altura, setAltura] = useState(170);
  const [peso, setPeso] = useState(65);
  const [idade, setIdade] = useState(30);
  const [busto, setBusto] = useState(3);
  const [cintura, setCintura] = useState(3);
  const [quadril, setQuadril] = useState(3);

  return (
    <MannequinDisplay
      skinTone={skinTone}
      userCharacteristics={{
        altura,
        peso,
        idade
      }}
      busto={busto}
      cintura={cintura}
      quadril={quadril}
      className="w-64 h-auto"
    />
  );
}
```

### Opção 2: Usar as Funções Diretamente

```tsx
import { 
  selectMannequinFolder, 
  getMannequinImagePath 
} from '@/lib/mannequin-selector';

function MeuComponente() {
  const characteristics = {
    altura: 170, // cm
    peso: 65,    // kg
    idade: 30    // anos
  };

  const folder = selectMannequinFolder(characteristics);
  const imagePath = getMannequinImagePath(
    0, // skinTone
    characteristics,
    3, // busto
    3, // cintura
    3  // quadril
  );

  return <img src={imagePath} alt="Manequim" />;
}
```

### Opção 3: Montar Manualmente

```tsx
function MeuComponente() {
  const skinTone = 0;
  const folder = 'A'; // Calcular baseado em altura/peso/idade
  const busto = 3;
  const cintura = 3;
  const quadril = 3;

  const imagePath = `/assets/mannequins/mannequin_s${skinTone}_f${folder}_b${busto}_c${cintura}_q${quadril}.jpg`;

  return <img src={imagePath} alt="Manequim" />;
}
```

## 🔄 Fluxo de Uso Completo

1. **Usuário informa características físicas:**
   - Altura (cm)
   - Peso (kg)
   - Idade (anos)
   - Tom de pele (0-6)

2. **Sistema calcula a pasta:**
   ```typescript
   const folder = selectMannequinFolder({
     altura: 170,
     peso: 65,
     idade: 30
   });
   // Retorna: 'A', 'B', 'C', 'D' ou 'E'
   ```

3. **Usuário ajusta medidas do manequim:**
   - Sliders de busto (1-5)
   - Sliders de cintura (1-5)
   - Sliders de quadril (1-5)

4. **Sistema exibe o manequim:**
   ```typescript
   const imagePath = getMannequinImagePath(
     skinTone,
     characteristics,
     busto,
     cintura,
     quadril
   );
   ```

## ⚙️ Calibração da Fórmula

A função `selectMannequinFolder` atualmente usa uma lógica baseada em:
- **Altura** (40% do peso)
- **IMC** (40% do peso)
- **Idade** (20% do peso)

**Para calibrar corretamente:**
1. Teste no site da Sizebay com diferentes combinações de altura/peso/idade
2. Observe qual pasta é usada em cada caso
3. Ajuste os pesos e faixas na função `selectMannequinFolder`

## 🎨 Exemplo Completo com Sliders

```tsx
'use client';

import { useState } from 'react';
import MannequinDisplay from '@/components/MannequinDisplay';

export default function AjustadorMedidas() {
  const [skinTone, setSkinTone] = useState(0);
  const [altura, setAltura] = useState(170);
  const [peso, setPeso] = useState(65);
  const [idade, setIdade] = useState(30);
  const [busto, setBusto] = useState(3);
  const [cintura, setCintura] = useState(3);
  const [quadril, setQuadril] = useState(3);

  return (
    <div className="p-8">
      <h1>Ajustador de Medidas</h1>

      {/* Seleção de Tom de Pele */}
      <div className="mb-4">
        <label>Tom de Pele: {skinTone}</label>
        <input
          type="range"
          min="0"
          max="6"
          value={skinTone}
          onChange={(e) => setSkinTone(Number(e.target.value))}
        />
      </div>

      {/* Características Físicas */}
      <div className="mb-4">
        <label>Altura: {altura}cm</label>
        <input
          type="range"
          min="140"
          max="200"
          value={altura}
          onChange={(e) => setAltura(Number(e.target.value))}
        />
      </div>

      <div className="mb-4">
        <label>Peso: {peso}kg</label>
        <input
          type="range"
          min="40"
          max="120"
          value={peso}
          onChange={(e) => setPeso(Number(e.target.value))}
        />
      </div>

      <div className="mb-4">
        <label>Idade: {idade}anos</label>
        <input
          type="range"
          min="15"
          max="80"
          value={idade}
          onChange={(e) => setIdade(Number(e.target.value))}
        />
      </div>

      {/* Medidas do Manequim */}
      <div className="mb-4">
        <label>Busto: {busto}</label>
        <input
          type="range"
          min="1"
          max="5"
          value={busto}
          onChange={(e) => setBusto(Number(e.target.value))}
        />
      </div>

      <div className="mb-4">
        <label>Cintura: {cintura}</label>
        <input
          type="range"
          min="1"
          max="5"
          value={cintura}
          onChange={(e) => setCintura(Number(e.target.value))}
        />
      </div>

      <div className="mb-4">
        <label>Quadril: {quadril}</label>
        <input
          type="range"
          min="1"
          max="5"
          value={quadril}
          onChange={(e) => setQuadril(Number(e.target.value))}
        />
      </div>

      {/* Exibição do Manequim */}
      <MannequinDisplay
        skinTone={skinTone}
        userCharacteristics={{
          altura,
          peso,
          idade
        }}
        busto={busto}
        cintura={cintura}
        quadril={quadril}
        className="w-64 h-auto mx-auto"
      />
    </div>
  );
}
```

## 📊 Resumo da Lógica

```
┌─────────────────────────────────────┐
│  Características do USUÁRIO         │
│  - Altura (cm)                      │
│  - Peso (kg)                        │
│  - Idade (anos)                     │
└──────────────┬──────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ selectMannequinFolder│
    │   Calcula IMC        │
    │   Classifica faixas  │
    │   Retorna: A-E       │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │  Pasta Selecionada   │
    │  (A, B, C, D ou E)   │
    └──────────┬───────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Medidas do MANEQUIM                │
│  - Busto (1-5)                      │
│  - Cintura (1-5)                    │
│  - Quadril (1-5)                    │
└──────────────┬──────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ getMannequinImagePath│
    │   Monta nome arquivo │
    │   Retorna: caminho   │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │  /assets/mannequins/ │
    │  mannequin_s0_fA_    │
    │  b3_c3_q3.jpg        │
    └──────────────────────┘
```

## ✅ Checklist de Implementação

- [x] Script de download criado e executado
- [x] 3.851 imagens baixadas de todas as pastas (A-E)
- [x] Função de seleção de pasta criada
- [x] Componente React criado
- [x] Documentação criada
- [ ] Calibrar fórmula de mapeamento altura/peso/idade → pasta (testar no site)
- [ ] Integrar no componente de ajuste de medidas
- [ ] Adicionar tratamento de erro/fallback
- [ ] Testar com diferentes combinações
