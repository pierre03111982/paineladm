"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { EstimatedMeasurements } from "@/hooks/useFittingAlgorithm";

interface DynamicMannequinProps {
  bustAdjustment: number; // -2 a +2 (para ajuste visual no StepShape)
  waistAdjustment: number; // -2 a +2
  hipAdjustment: number; // -2 a +2
  skinTone?: string; // Cor do tom de pele (hex)
  gender?: "female" | "male";
  className?: string;
  // Novas props para cálculo de tensão (quando usado no StepResult)
  userMeasurements?: EstimatedMeasurements;
  productMeasurements?: Record<string, number>; // { "Busto": 88, "Cintura": 72, "Quadril": 92 }
  recommendedSize?: string | null;
}

type TensionStatus = "ideal" | "levemente justo" | "justo" | "folgado";

/**
 * Calcula o status de tensão baseado na diferença entre medida do usuário e do produto
 */
function calculateTensionStatus(
  userValue: number,
  productValue: number | undefined
): TensionStatus | null {
  if (productValue === undefined) return null;
  
  const diff = userValue - productValue;
  
  if (Math.abs(diff) <= 2) return "ideal";
  if (diff <= -4) return "justo"; // Roupa muito maior (folgado)
  if (diff >= 4) return "justo"; // Roupa muito menor (apertado)
  if (Math.abs(diff) <= 4) return "levemente justo";
  return diff < 0 ? "folgado" : "justo";
}

/**
 * Retorna cor e estilo da faixa baseado no status
 */
function getTensionColor(status: TensionStatus): { bg: string; opacity: number } {
  switch (status) {
    case "ideal":
      return { bg: "rgba(34, 197, 94, 0.4)", opacity: 0.4 }; // Verde
    case "levemente justo":
      return { bg: "rgba(234, 179, 8, 0.5)", opacity: 0.5 }; // Amarelo/Laranja
    case "justo":
      return { bg: "rgba(239, 68, 68, 0.6)", opacity: 0.6 }; // Vermelho
    case "folgado":
      return { bg: "rgba(59, 130, 246, 0.4)", opacity: 0.4 }; // Azul
  }
}

/**
 * Componente de Faixa de Tensão (Overlay)
 */
function TensionBand({
  top,
  status,
  zone,
}: {
  top: string;
  status: TensionStatus | null;
  zone: "bust" | "waist" | "hip";
}) {
  if (!status) return null;

  const { bg, opacity } = getTensionColor(status);
  const height = zone === "waist" ? "24px" : zone === "bust" ? "32px" : "28px";

  return (
    <motion.div
      className="absolute left-[20%] right-[20%] rounded-[100%] blur-[2px]"
      style={{
        top,
        height,
        backgroundColor: bg,
        opacity,
        boxShadow: `0 2px 8px ${bg}`,
      }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity }}
      transition={{ duration: 0.3 }}
    />
  );
}

/**
 * Componente de Indicador Lateral (Side Label)
 */
function SideLabel({
  top,
  status,
  zone,
}: {
  top: string;
  status: TensionStatus | null;
  zone: "bust" | "waist" | "hip";
}) {
  if (!status) return null;

  const labelTexts: Record<TensionStatus, string> = {
    ideal: "ideal",
    "levemente justo": "levemente justo",
    justo: "justo",
    folgado: "folgado",
  };

  const iconColors: Record<TensionStatus, string> = {
    ideal: "bg-green-500",
    "levemente justo": "bg-yellow-500",
    justo: "bg-red-500",
    folgado: "bg-blue-500",
  };

  const arrowsDirection = status === "folgado" ? "outward" : "inward";

  return (
    <motion.div
      className="absolute flex items-center gap-2 -right-[140px]"
      style={{ top: `calc(${top} - 12px)` }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      {/* Ícone de Setas */}
      <div className={`rounded-full p-1.5 ${iconColors[status]}`}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="text-white"
        >
          {arrowsDirection === "inward" ? (
            // Setas apontando para dentro <- ->
            <>
              <path
                d="M6 8L4 6M6 8L4 10M10 8L12 6M10 8L12 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="8" cy="8" r="1" fill="currentColor" />
            </>
          ) : (
            // Setas apontando para fora -> <-
            <>
              <path
                d="M4 8L6 6M4 8L6 10M12 8L10 6M12 8L10 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="8" cy="8" r="1" fill="currentColor" />
            </>
          )}
        </svg>
      </div>
      {/* Texto */}
      <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
        {labelTexts[status]}
      </span>
    </motion.div>
  );
}

/**
 * Componente de Manequim Premium (Estilo Sizebay/Shein)
 * Usa imagem base + overlays de faixas de tensão + indicadores laterais
 */
export function DynamicMannequin({
  bustAdjustment,
  waistAdjustment,
  hipAdjustment,
  skinTone = "#F5E6D3",
  gender = "female",
  className = "",
  userMeasurements,
  productMeasurements,
  recommendedSize,
}: DynamicMannequinProps) {
  // Calcular status de tensão para cada zona (se tiver medidas do produto)
  const bustStatus = useMemo(() => {
    if (userMeasurements && productMeasurements) {
      return calculateTensionStatus(userMeasurements.bust, productMeasurements["Busto"] || productMeasurements["bust"]);
    }
    return null;
  }, [userMeasurements, productMeasurements]);

  const waistStatus = useMemo(() => {
    if (userMeasurements && productMeasurements) {
      return calculateTensionStatus(userMeasurements.waist, productMeasurements["Cintura"] || productMeasurements["waist"]);
    }
    return null;
  }, [userMeasurements, productMeasurements]);

  const hipStatus = useMemo(() => {
    if (userMeasurements && productMeasurements) {
      return calculateTensionStatus(userMeasurements.hip, productMeasurements["Quadril"] || productMeasurements["hip"]);
    }
    return null;
  }, [userMeasurements, productMeasurements]);

  // SVG placeholder realista (será substituído por imagem PNG quando disponível)
  const mannequinSVG = gender === "female" ? (
    <svg
      viewBox="0 0 240 480"
      className="w-full h-full"
      style={{ maxHeight: "500px" }}
    >
      {/* Gradiente para efeito 3D flat */}
      <defs>
        <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F9FAFB" stopOpacity="1" />
          <stop offset="50%" stopColor="#E5E7EB" stopOpacity="1" />
          <stop offset="100%" stopColor="#9CA3AF" stopOpacity="0.8" />
        </linearGradient>
        <filter id="shadow">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dx="0" dy="4" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Cabeça */}
      <ellipse
        cx="120"
        cy="35"
        rx="28"
        ry="34"
        fill="url(#bodyGradient)"
        filter="url(#shadow)"
      />

      {/* Pescoço */}
      <rect x="108" y="65" width="24" height="18" fill="url(#bodyGradient)" rx="2" />

      {/* Torso Superior (Busto) */}
      <path
        d="M 100 83 Q 95 95 95 110 Q 95 125 100 135 Q 105 140 110 138 Q 115 140 120 138 Q 125 140 130 138 Q 135 140 140 135 Q 145 125 145 110 Q 145 95 140 83 Z"
        fill="url(#bodyGradient)"
        filter="url(#shadow)"
      />

      {/* Cintura */}
      <path
        d="M 110 135 Q 105 150 105 165 Q 105 175 110 180 Q 115 182 120 180 Q 125 182 130 180 Q 135 175 135 165 Q 135 150 130 135 Z"
        fill="url(#bodyGradient)"
        filter="url(#shadow)"
      />

      {/* Quadril */}
      <path
        d="M 105 180 Q 100 200 100 220 Q 100 235 105 245 Q 110 250 120 250 Q 130 250 135 245 Q 140 235 140 220 Q 140 200 135 180 Z"
        fill="url(#bodyGradient)"
        filter="url(#shadow)"
      />

      {/* Pernas */}
      <path
        d="M 110 245 Q 108 280 108 320 Q 108 350 110 380 Q 112 400 115 410 Q 118 415 120 415 Q 122 415 125 410 Q 128 400 130 380 Q 132 350 132 320 Q 132 280 130 245 Z"
        fill="url(#bodyGradient)"
        filter="url(#shadow)"
      />
      <path
        d="M 130 245 Q 132 280 132 320 Q 132 350 130 380 Q 128 400 125 410 Q 122 415 120 415 Q 118 415 115 410 Q 112 400 110 380 Q 108 350 108 320 Q 108 280 110 245 Z"
        fill="url(#bodyGradient)"
        filter="url(#shadow)"
      />

      {/* Braço Esquerdo */}
      <ellipse
        cx="85"
        cy="130"
        rx="10"
        ry="55"
        fill="url(#bodyGradient)"
        transform="rotate(-25 85 130)"
        filter="url(#shadow)"
      />

      {/* Braço Direito */}
      <ellipse
        cx="155"
        cy="130"
        rx="10"
        ry="55"
        fill="url(#bodyGradient)"
        transform="rotate(25 155 130)"
        filter="url(#shadow)"
      />
    </svg>
  ) : (
    // Versão masculina (proporções diferentes)
    <svg
      viewBox="0 0 240 480"
      className="w-full h-full"
      style={{ maxHeight: "500px" }}
    >
      <defs>
        <linearGradient id="bodyGradientMale" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F9FAFB" stopOpacity="1" />
          <stop offset="50%" stopColor="#E5E7EB" stopOpacity="1" />
          <stop offset="100%" stopColor="#9CA3AF" stopOpacity="0.8" />
        </linearGradient>
        <filter id="shadow">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dx="0" dy="4" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Cabeça (maior) */}
      <ellipse cx="120" cy="35" rx="32" ry="36" fill="url(#bodyGradientMale)" filter="url(#shadow)" />

      {/* Pescoço (mais largo) */}
      <rect x="106" y="68" width="28" height="20" fill="url(#bodyGradientMale)" rx="2" />

      {/* Torso Superior (mais largo, ombros mais largos) */}
      <path
        d="M 95 88 Q 90 100 90 115 Q 90 130 95 140 Q 100 145 105 143 Q 110 145 115 143 Q 120 145 125 143 Q 130 145 135 143 Q 140 145 145 140 Q 150 130 150 115 Q 150 100 145 88 Z"
        fill="url(#bodyGradientMale)"
        filter="url(#shadow)"
      />

      {/* Cintura (mais reta) */}
      <path
        d="M 108 140 Q 105 155 105 170 Q 105 180 108 185 Q 112 187 120 185 Q 128 187 132 185 Q 135 180 135 170 Q 135 155 132 140 Z"
        fill="url(#bodyGradientMale)"
        filter="url(#shadow)"
      />

      {/* Quadril (menos pronunciado) */}
      <path
        d="M 108 185 Q 105 205 105 225 Q 105 240 108 250 Q 112 255 120 255 Q 128 255 132 250 Q 135 240 135 225 Q 135 205 132 185 Z"
        fill="url(#bodyGradientMale)"
        filter="url(#shadow)"
      />

      {/* Pernas (mais retas) */}
      <path
        d="M 112 250 Q 110 285 110 325 Q 110 355 112 385 Q 114 405 118 415 Q 120 418 120 418 Q 120 418 122 415 Q 124 405 128 385 Q 130 355 130 325 Q 130 285 128 250 Z"
        fill="url(#bodyGradientMale)"
        filter="url(#shadow)"
      />
      <path
        d="M 128 250 Q 130 285 130 325 Q 130 355 128 385 Q 124 405 122 415 Q 120 418 120 418 Q 120 418 118 415 Q 114 405 112 385 Q 110 355 110 325 Q 110 285 112 250 Z"
        fill="url(#bodyGradientMale)"
        filter="url(#shadow)"
      />

      {/* Braços (mais desenvolvidos) */}
      <ellipse cx="78" cy="135" rx="12" ry="58" fill="url(#bodyGradientMale)" transform="rotate(-22 78 135)" filter="url(#shadow)" />
      <ellipse cx="162" cy="135" rx="12" ry="58" fill="url(#bodyGradientMale)" transform="rotate(22 162 135)" filter="url(#shadow)" />
    </svg>
  );

  return (
    <div className={`relative w-full h-full min-h-[400px] flex items-center justify-center ${className}`}>
      {/* Container principal com posicionamento relativo */}
      <div className="relative w-64 h-[500px] mx-auto">
        {/* 1. Imagem Base do Manequim */}
        <div className="absolute inset-0 flex items-center justify-center">
          {mannequinSVG}
        </div>

        {/* 2. Faixas de Tensão (Overlays) - Apenas se tiver medidas do produto */}
        {userMeasurements && productMeasurements && (
          <>
            {/* Faixa do Busto */}
            <TensionBand top="22%" status={bustStatus} zone="bust" />
            
            {/* Faixa da Cintura */}
            <TensionBand top="38%" status={waistStatus} zone="waist" />
            
            {/* Faixa do Quadril */}
            <TensionBand top="51%" status={hipStatus} zone="hip" />
          </>
        )}

        {/* 3. Indicadores Laterais (Side Labels) */}
        {userMeasurements && productMeasurements && (
          <>
            {/* Indicador do Busto */}
            <SideLabel top="22%" status={bustStatus} zone="bust" />
            
            {/* Indicador da Cintura */}
            <SideLabel top="38%" status={waistStatus} zone="waist" />
            
            {/* Indicador do Quadril */}
            <SideLabel top="51%" status={hipStatus} zone="hip" />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Paleta de tons de pele para seleção
 * Cores realistas que representam diferentes tons de pele humanos
 */
export const SKIN_TONE_PALETTE = [
  "#F5E6D3", // Tom 1: Muito claro (tipo europeu/nórdico)
  "#E8D5C4", // Tom 2: Claro (tipo europeu/mediterrâneo)
  "#D4B896", // Tom 3: Claro-médio (tipo latino/asiático claro)
  "#C19A6B", // Tom 4: Médio (tipo latino/asiático médio)
  "#A67C52", // Tom 5: Médio-escuro (tipo latino/indiano)
  "#8B5A3C", // Tom 6: Escuro (tipo africano/médio-oriental)
  "#5D4037", // Tom 7: Muito escuro (tipo africano)
  "#3E2723", // Tom 8: Extremamente escuro (tipo africano profundo)
];
