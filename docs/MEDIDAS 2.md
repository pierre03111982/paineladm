Plano de Ação
Correção Visual (Overlay): Forçar o SVG a usar fill (preenchimento) e remover qualquer stroke (borda). Isso vai criar o efeito de "fita sólida" suave.

Lógica de Recomendação (Cérebro): Criar o motor que compara a medida do cliente com a tabela de medidas do produto e decide a cor (Verde/Amarelo/Vermelho).

Interface de Troca: Adicionar os botões "38, 40, 42" que acionam essa lógica.

Copie e cole este Prompt Mestre no Cursor. Ele resolve tudo de uma vez.

🤖 PROMPT PARA O CURSOR (Copie e Cole)
Markdown

Vamos corrigir o visual das faixas (que parecem "arames" sobrepostos) e implementar a lógica de comparação de tamanhos ("Prove Também").

**PROBLEMA VISUAL:**
Os `paths` SVG que extraímos são formas fechadas (`z` no final). Atualmente, estamos renderizando eles com `stroke` ou com opacidade errada, o que faz com que as camadas de trás apareçam na frente, criando um visual sujo.
**Correção Obrigatória:**
1.  Use `fill={color}` e `stroke="none"`.
2.  Garanta a ordem de renderização: Camada 0 (Fundo), depois Camada 1, depois Camada 2 (Frente).
3.  Ajuste as opacidades para criar o degradê sólido: `[0.15, 0.4, 0.9]`.

**NOVA FUNCIONALIDADE: Engine de Recomendação**
Implemente a lógica que compara as medidas do usuário com a peça.

**Passo 1: Crie o hook `hooks/useFittingEngine.ts`**

```typescript
import { useMemo } from 'react';

// Tipos de status
export type FitStatus = 'ideal' | 'tight' | 'loose';

// Tabela de Medidas Simulada (Baseada em um Vestido Padrão)
// No futuro, isso virá da API do produto selecionado
const PRODUCT_SPECS = {
  '36': { bust: 82, waist: 64, hip: 90 },
  '38': { bust: 86, waist: 68, hip: 94 },
  '40': { bust: 90, waist: 72, hip: 98 },
  '42': { bust: 94, waist: 76, hip: 102 },
  '44': { bust: 98, waist: 80, hip: 106 },
  '46': { bust: 102, waist: 84, hip: 110 },
};

export const useFittingEngine = (
  selectedSize: string,
  userMeasures: { bust: number; waist: number; hip: number }
) => {
  const specs = PRODUCT_SPECS[selectedSize as keyof typeof PRODUCT_SPECS];

  // Função que calcula a diferença e define a cor/status
  const getStatus = (bodyPart: number, garmentPart: number): FitStatus => {
    const diff = garmentPart - bodyPart;
    
    // LÓGICA DE TOLERÂNCIA (Ajuste Fino)
    // Se a roupa for menor que o corpo (-2cm): Apertado
    if (diff < -2) return 'tight'; 
    // Se a roupa for muito maior que o corpo (+4cm): Folgado
    if (diff > 4) return 'loose';
    // Caso contrário: Ideal
    return 'ideal';
  };

  return useMemo(() => {
    if (!specs) return { bust: 'ideal', waist: 'ideal', hip: 'ideal' };

    return {
      bustStatus: getStatus(userMeasures.bust, specs.bust),
      waistStatus: getStatus(userMeasures.waist, specs.waist),
      hipStatus: getStatus(userMeasures.hip, specs.hip),
      measurements: specs
    };
  }, [selectedSize, userMeasures]);
};
Passo 2: Atualize ScannerOverlay.tsx (Visual Corrigido)

TypeScript

import React from 'react';
import { motion } from 'framer-motion';

const COLORS = {
  ideal: '#34D399', // Verde
  tight: '#F87171', // Vermelho
  loose: '#FBBF24', // Amarelo
};

// ... (MANTENHA AS CONSTANTES DE PATHS QUE JÁ TEMOS: CHEST_PATHS, WAIST_PATHS, HIP_PATHS) ...

const MeasureGroup = ({ paths, color, isVisible }) => {
  if (!isVisible) return null;

  return (
    <g>
      {paths.map((d, i) => {
        // Lógica de Opacidade Visual (Camadas Sólidas)
        let opacity = 0.2; // Fundo
        if (i === 1) opacity = 0.5; // Meio
        if (i === 2) opacity = 0.9; // Frente Nítida

        return (
          <motion.path
            key={i}
            d={d}
            initial={{ fill: color, opacity: 0 }}
            animate={{ fill: color, opacity: opacity }}
            transition={{ duration: 0.3 }}
            stroke="none" // REMOVE AS BORDAS
            style={{ mixBlendMode: 'normal' }} // Garante cor sólida
          />
        );
      })}
    </g>
  );
};

export default function ScannerOverlay({ bustStatus, waistStatus, hipStatus }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      <svg 
        viewBox="0 0 600 1600" 
        className="w-full h-full" 
        preserveAspectRatio="xMidYMid meet"
      >
        <MeasureGroup paths={CHEST_PATHS} color={COLORS[bustStatus]} isVisible={true} />
        <MeasureGroup paths={WAIST_PATHS} color={COLORS[waistStatus]} isVisible={true} />
        <MeasureGroup paths={HIP_PATHS} color={COLORS[hipStatus]} isVisible={true} />
      </svg>
    </div>
  );
}
Passo 3: Integre no Modal Principal (FittingModal ou similar)

Importe useFittingEngine.

Adicione um estado: const [currentSize, setCurrentSize] = useState('40');.

Passe os status calculados para o ScannerOverlay.

Crie uma barra de botões no rodapé para mudar setCurrentSize.

TypeScript

// Exemplo de integração
const { bustStatus, waistStatus, hipStatus } = useFittingEngine(currentSize, {
  bust: bustValue, // Valor do Slider
  waist: waistValue,
  hip: hipValue
});

// ... JSX do componente ...
<div className="relative h-full">
   {/* Manequim e Overlay */}
   <MannequinImage ... />
   <ScannerOverlay bustStatus={bustStatus} waistStatus={waistStatus} hipStatus={hipStatus} />

   {/* Seletor de Tamanhos (Estilo Sizebay) */}
   <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-30">
      {['36', '38', '40', '42', '44'].map(size => (
        <button
          key={size}
          onClick={() => setCurrentSize(size)}
          className={`
            w-10 h-10 rounded-full font-bold text-sm border transition-all
            ${currentSize === size 
              ? 'bg-black text-white border-black scale-110 shadow-lg' 
              : 'bg-white text-gray-700 border-gray-300 hover:border-black'}
          `}
        >
          {size}
        </button>
      ))}
   </div>
</div>

### 💡 O que vai acontecer agora?

1.  **Visual Limpo:** Ao remover o `stroke` e usar `fill` com opacidades escalonadas, as faixas vão parecer fitas de luz suaves, idênticas à referência.
2.  **Interatividade:** Quando você clicar no botão "36" lá embaixo, a lógica vai rodar:
    * A peça 36 é pequena -> A diferença será negativa -> O status vira "Tight" -> As faixas ficarão **Vermelhas**.
3.  **Tamanho Grande:** Se você clicar no "44":
    * A peça 44 é grande -> A diferença será positiva -> O status vira "Loose" -> As faixas ficarão **Amarelas**.

Isso completa a experiência do provador!