"use client";

import { motion } from "framer-motion";

type TensionStatus = "ideal" | "levemente justo" | "justo" | "folgado";

interface FitOverlayProps {
  bustStatus: TensionStatus | null;
  waistStatus: TensionStatus | null;
  hipStatus: TensionStatus | null;
  coordinates?: {
    bust: { startX: number; startY: number; controlX: number; controlY: number; endX: number; endY: number };
    waist: { startX: number; startY: number; controlX: number; controlY: number; endX: number; endY: number };
    hip: { startX: number; startY: number; controlX: number; controlY: number; endX: number; endY: number };
  };
}

/**
 * --- CONFIGURAÇÃO DE CORES (Estilo Sizebay) ---
 */
const COLORS = {
  ideal: "#34D399", // Verde Sizebay
  "levemente justo": "#FBBF24", // Laranja (Folgado)
  justo: "#F87171", // Vermelho (Aperto)
  folgado: "#FBBF24", // Laranja (mesma cor que levemente justo)
};

/**
 * Retorna a cor baseada no status de tensão
 */
function getStatusColor(status: TensionStatus): string {
  return COLORS[status] || COLORS.ideal;
}

/**
 * --- DADOS BRUTOS OFICIAIS (Limpos e Organizados) ---
 * Extraído do código fonte original do site de referência
 * 
 * Estrutura: Cada medida tem 3 paths sobrepostos (st1, st2, st3)
 * - st1: Opacidade 0.1 (Fundo suave)
 * - st2: Opacidade 0.3 (Meio)
 * - st3: Opacidade 1.0 (Frente nítida - O Fio Nítido)
 */

// Busto (Chest) - 3 camadas
const CHEST_PATHS = [
  // .st1 (Fundo - Opacidade 0.1)
  "M293.9,440.8c2.1,0,4.1-0.1,5.9-0.1c26.7-0.6,34.5-5,43.6-10c2.9-1.6,5.8-3.3,9.5-4.9c5-2.2,13.4-2.1,24.1-1.9c19.7,0.4,47.2,0.8,67.1-14.5c-1.7-3.3-3.6-6.4-5.7-9.5c-19,11.3-44,11.5-62.5,11.7c-11.1,0.1-20.8,0.2-25.1,2.5c-2.5,1.4-4.8,2.9-7,4.8c-6,4.8-10.7,8.6-40,9.8c-2.4,0.1-5,0.2-7.8,0.4c-10.7,0.5-24,1.2-38.4,1.2c-28.5,0-61.6-2.5-88.5-13.6c-0.6,3-1.3,6.6-1.9,10C205.7,442.9,263.4,441.5,293.9,440.8z",
  // .st2 (Meio - Opacidade 0.3)
  "M164.3,441.6c39,17,104.3,16.3,131.6,16c25-0.3,37-5.5,49.7-11c3.7-1.6,7.6-3.3,11.7-4.8c4.5-1.7,11.9-1.3,21.1-0.9c20.4,1,49.6,2.4,72-16.7c-1.1-3.5-2.5-7-4-10.4c-21,15.8-49.3,15.3-69.5,14.9c-9.7-0.2-18-0.3-22,1.4c-3.5,1.5-6.3,3.1-9.1,4.7c-9.3,5.2-18,10.1-45.9,10.7l-5.9,0.1c-7.3,0.2-16.1,0.4-25.8,0.4c-31.1,0-71.7-2.2-101.8-14.6l-1.4,6.9L164.3,441.6z",
  // .st3 (Frente - Opacidade 1.0 - O Fio Nítido)
  "M289.9,474.7l2.2,0.1c22,0.6,37.9-5.4,53.3-11.1c5.6-2.1,10.9-4.1,16.4-5.7c4.1-1.2,10.4-0.7,18.4,0c19.9,1.7,48.6,4.2,73.9-16.2c-0.1-0.8-0.2-1.6-0.3-2.4c-0.5-3.3-1.1-6.6-1.9-9.8c-23.4,18.8-53,17.4-73.7,16.4c-8.4-0.4-15.6-0.8-19.1,0.5c-4,1.5-7.8,3.1-11.5,4.7c-12.6,5.5-25.6,11.2-51.6,11.5c-4,0-8.8,0.1-14.3,0.1c-31.7,0-84.1-1.7-118.5-16.2c-0.8,3.4-1.7,7.2-2.4,9.9C195.9,472.2,259.9,473.9,289.9,474.7z",
];

// Cintura (Waist) - 3 camadas
const WAIST_PATHS = [
  // .st1 (Fundo - Opacidade 0.1)
  "M262.7,652.6c49.5-1.8,68.4-4.5,91.9-9.8c2-0.5,4.6-0.9,7.7-1.4c15.6-2.7,44.4-7.6,62.6-25.3c-0.8-2.9-1.5-5.6-2.1-7.9c-18.5,15.1-45.4,19.7-62,22.5c-3.1,0.5-5.8,1-7.9,1.4c-23.8,5-45.5,7.9-92.2,8.6c-2.5,0-5,0.1-7.4,0.1c-26.7,0-47.6-2.6-63.7-7.8c-10.1-3.3-18.2-7.7-24.4-13.2c-1.5,2.1-3.9,5.3-6.6,8.9C173.3,646.6,208.2,654.6,262.7,652.6z",
  // .st2 (Meio - Opacidade 0.3)
  "M191,628.2c17,5.6,39.8,8,69.5,7.5c46.4-0.8,67.8-3.6,91.3-8.5c2.2-0.5,5-0.9,8.1-1.5c16.4-2.8,43.5-7.3,61.1-22.7c-1-2.7-1.8-5.4-2.3-8.3c-18.3,13.3-44.3,17.6-60.5,20.3c-3.2,0.5-6,1-8.3,1.5c-22.3,4.4-45.7,7.3-86.3,7.3h-5.4c-39.8-0.2-67.5-6.2-83.8-18.2c-2.3,3.4-4.5,7-6.5,10C173.5,620.8,181.2,625,191,628.2z",
  // .st3 (Frente - Opacidade 1.0 - O Fio Nítido)
  "M258.2,618.9c43.6,0.3,67.8-2.7,90.7-7.2c2.4-0.5,5.2-0.9,8.4-1.5c16.3-2.7,42.9-7.1,60.3-20.9c-0.3-2.3-0.5-5.7-0.8-9.4c-17.9,12.6-43.8,16.8-61.5,19.7c-3,0.5-5.9,1-8.3,1.4c-17.2,3.2-39.1,6.3-72.8,6.3c-5.8,0-11.9-0.1-18.3-0.3c-32.7-1-56.6-6.3-72.1-16c-0.9,2.2-2,4.3-3.4,6.2c-1,1.3-2.1,2.7-3.1,4.3C192.4,613,219.3,618.7,258.2,618.9z",
];

// Quadril (Hip) - 3 camadas
const HIP_PATHS = [
  // .st1 (Fundo - Opacidade 0.1)
  "M100.1,762.5c0.2,0.7,0.5,1.4,0.9,2.1c29.3,41.6,112.8,42.8,145.6,35.1c23.2-5.5,48.2-10.5,68.3-14.5c14.8-3,27.6-5.5,36-7.5c3.5-0.8,7.8-1.7,12.7-2.7c23.6-4.8,59.9-12.3,80.9-30.4c-0.1-2.8-0.2-5.7-0.3-8.3c-23.7,18.9-63.8,27-86.1,31.5c-3,0.6-5.8,1.2-8.1,1.7c-17.5,3.8-56.3,11.2-103.9,19.8c-11.8,2-23.8,2.9-35.8,2.8c-16.9,0.1-33.8-1.7-50.3-5.2c-28.1-6.4-48.1-18.1-58.9-34.5C100.6,755.6,100.2,759,100.1,762.5z",
  // .st2 (Meio - Opacidade 0.3)
  "M102.4,744.5c23.1,45.4,110.3,45.5,142.8,39.7c47.5-8.6,86.3-16,103.7-19.7c2.3-0.5,5-1.1,8.1-1.7c22.8-4.6,64.9-13.2,86.9-32.9c0-2.2-0.1-5-0.1-8c-25.5,20.8-71.8,29.8-92.8,33.8l-3,0.6c-15.6,3-63,12.2-103.6,17.5c-10.3,1.2-20.7,1.9-31.1,1.8c-31.8,0-72.3-5.3-96.2-24.8c-5.1-4.1-9.4-9-12.8-14.6c-0.6,2.5-1.1,4.7-1.5,6.2C102.8,742.9,102.6,743.7,102.4,744.5z",
  // .st3 (Frente - Opacidade 1.0 - O Fio Nítido)
  "M247.9,815c26.5-7.8,54-13.5,76.1-18c11.7-2.4,21.8-4.5,28.7-6.3c4.7-1.2,10.3-2.4,16.9-3.7c22.6-4.6,54.5-11,75.6-27.8c-0.1-2.4-0.3-5.4-0.4-8.5c-22.4,17.2-57.1,24.3-80.2,29c-4.9,1-9.1,1.9-12.5,2.7c-8.5,2-21.3,4.6-36.2,7.6c-20,4-45,9-68.1,14.5c-9.7,2.3-23.9,3.8-39.8,3.8c-15.3,0-30.6-1.4-45.6-4.4c-17.4-3.6-37.8-10.3-53.2-23.2c1.3,3.6,2.8,8.1,3.6,11.1c0.3,1.3,0.7,3,1.1,4.9C154.6,824.7,224.4,821.9,247.9,815z",
];

/**
 * Componente para renderizar um Grupo de Paths com efeito 3D volumétrico
 * 
 * Estilo Degradê Simétrico:
 * - Linha central: opacidade máxima (1.0) - mais sólida
 * - Linhas acima e abaixo: opacidade decrescente progressivamente
 * - Cria efeito de "glow" com degradê suave para cima e para baixo
 */
interface MeasureGroupProps {
  paths: string[];
  color: string;
  isVisible: boolean;
  delay?: number;
}

function MeasureGroup({ paths, color, isVisible, delay = 0 }: MeasureGroupProps) {
  if (!isVisible) return null;

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay }}
    >
      {/* Renderizar os 3 paths originais em ordem: st1 (Fundo), st2 (Meio), st3 (Frente/Central) */}
      {/* CORREÇÃO VISUAL: Usar fill sólido, stroke="none", opacidades [0.15, 0.4, 0.9] */}
      {paths.map((d, i) => {
        // Lógica de Opacidade Visual (Camadas Sólidas com Degradê)
        let opacity = 0.15; // Fundo (st1)
        if (i === 1) opacity = 0.4;  // Meio (st2)
        if (i === 2) opacity = 0.9;  // Frente Nítida (st3 - CENTRAL mais sólida)

        return (
          <motion.path
            key={i}
            d={d}
            fill={color}
            stroke="none" // REMOVE AS BORDAS - cria efeito de "fita sólida" suave
            opacity={opacity}
            style={{ mixBlendMode: "normal" }} // Garante cor sólida (não multiplica)
            initial={{ opacity: 0 }}
            animate={{ opacity: opacity }}
            transition={{ duration: 0.3, delay: delay + i * 0.1 }}
          />
        );
      })}
    </motion.g>
  );
}

/**
 * Componente de Overlay de Ajuste (Fit Overlay) - Estilo "Scanner de Luz" Sizebay
 * 
 * Baseado nos dados exatos extraídos do código fonte original do site de referência.
 * 
 * Características:
 * - ViewBox: `0 0 600 1600` (escala exata do original)
 * - 3 paths sobrepostos por zona (st1, st2, st3)
 * - Opacidades exatas: 0.1 (fundo), 0.3 (meio), 1.0 (frente)
 * - Usa `fill` para dar volume às faixas
 * - mixBlendMode: multiply para integração visual com o manequim
 * 
 * Zonas:
 * - Busto (CHEST): 3 camadas
 * - Cintura (WAIST): 3 camadas
 * - Quadril (HIP): 3 camadas
 */
export function FitOverlay({
  bustStatus,
  waistStatus,
  hipStatus,
  coordinates, // Mantido para compatibilidade, mas não usado (paths são fixos)
}: FitOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* O SEGREDO: viewBox="0 0 600 1600" 
         Isso alinha a escala do SVG exatamente com a imagem do manequim da Sizebay.
         preserveAspectRatio="xMidYMid meet" garante que fique centralizado.
      */}
      <svg
        viewBox="0 0 600 1600"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        style={{ overflow: "visible" }}
      >
        {/* Busto - Curva convexa (acompanha o volume dos seios) */}
        {bustStatus && (
          <MeasureGroup
            paths={CHEST_PATHS}
            color={getStatusColor(bustStatus)}
            isVisible={true}
            delay={0}
          />
        )}

        {/* Cintura - Curva suave */}
        {waistStatus && (
          <MeasureGroup
            paths={WAIST_PATHS}
            color={getStatusColor(waistStatus)}
            isVisible={true}
            delay={0.1}
          />
        )}

        {/* Quadril - Curva acentuada (acompanha a pélvis) */}
        {hipStatus && (
          <MeasureGroup
            paths={HIP_PATHS}
            color={getStatusColor(hipStatus)}
            isVisible={true}
            delay={0.2}
          />
        )}
      </svg>
    </div>
  );
}
