"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { getMannequinImagePath } from "@/lib/mannequin-selector";
import { SKIN_TONE_PALETTE } from "./DynamicMannequin";
import type { UserPhysicalCharacteristics } from "@/lib/mannequin-selector";
import { FitOverlay } from "./FitOverlay";
import { useFittingLogic } from "@/hooks/useFittingLogic";

interface StepResultProps {
  recommendedSize: string | null;
  fitFeedback?: Record<string, "justo" | "folgado" | "levemente justo" | "ideal">;
  estimatedMeasurements: {
    bust: number;
    waist: number;
    hip: number;
  };
  userCharacteristics?: UserPhysicalCharacteristics;
  skinTone?: string;
  shapeAdjustments?: { bust: number; waist: number; hip: number };
  gender?: "female" | "male";
  onEdit?: () => void;
  onClose?: () => void;
  productMeasurements?: Record<string, Record<string, number>>; // Opcional: para mostrar tabela
  alternativeSizes?: string[]; // Tamanhos alternativos para sugerir
  onTrySize?: (size: string) => void;
}

type TensionStatus = "ideal" | "levemente justo" | "justo" | "folgado";

/**
 * Converte tom de pele (hex) para índice (0-6)
 */
function hexToSkinToneIndex(hex: string): number {
  const index = SKIN_TONE_PALETTE.indexOf(hex);
  if (index === -1) return 0;
  return Math.min(index, 6);
}

/**
 * Converte ajuste (-2 a +2) para valor de medida (1-5)
 */
function adjustmentToMeasure(adjustment: number): number {
  return Math.max(1, Math.min(5, Math.round(adjustment + 3)));
}

/**
 * Calcula o status de tensão baseado na diferença entre medida da roupa e do corpo
 * CORRIGIDO: diff = productValue - userValue (Roupa - Corpo)
 * 
 * Lógica correta:
 * - Se diff < -2cm: Roupa menor que corpo = "justo" (Apertado)
 * - Se diff entre -2cm e 4cm: "ideal" (Folga adequada)
 * - Se diff > 4cm: Roupa muito maior que corpo = "folgado"
 */
function calculateTensionStatus(
  userValue: number,
  productValue: number | undefined
): TensionStatus | null {
  if (productValue === undefined || productValue === 0) return null;
  
  const diff = productValue - userValue; // CORRIGIDO: Roupa - Corpo
  
  // Se diff < -2cm: Roupa menor que corpo = Apertado (Justo)
  if (diff < -2) return "justo";
  
  // Se diff > 4cm: Roupa muito maior que corpo = Folgado
  if (diff > 4) return "folgado";
  
  // Se diff entre -2cm e 4cm: Ideal (folga adequada)
  return "ideal";
}

/**
 * Retorna cor e estilo da faixa baseado no status
 */
function getTensionColor(status: TensionStatus): { bg: string; opacity: number } {
  switch (status) {
    case "ideal":
      return { bg: "rgba(34, 197, 94, 0.5)", opacity: 0.5 }; // Verde
    case "levemente justo":
      return { bg: "rgba(234, 179, 8, 0.6)", opacity: 0.6 }; // Amarelo/Laranja
    case "justo":
      return { bg: "rgba(239, 68, 68, 0.7)", opacity: 0.7 }; // Vermelho
    case "folgado":
      return { bg: "rgba(59, 130, 246, 0.5)", opacity: 0.5 }; // Azul
  }
}

// TensionBand removido - agora usamos FitOverlay com SVG

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
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {labelTexts[status]}
      </span>
    </motion.div>
  );
}

/**
 * Passo 3: Resultado da recomendação com feedback visual de ajuste
 */
export function StepResult({
  recommendedSize,
  fitFeedback = {},
  estimatedMeasurements,
  userCharacteristics,
  skinTone,
  shapeAdjustments,
  onEdit,
  onClose,
  productMeasurements,
  alternativeSizes = [],
  onTrySize,
}: StepResultProps) {
  // Estado para tamanho selecionado (padrão: recomendado ou primeiro disponível)
  const [selectedSize, setSelectedSize] = useState<string | null>(
    recommendedSize || (productMeasurements ? Object.keys(productMeasurements)[0] : null)
  );

  // Usar hook de lógica de ajuste para calcular status baseado no tamanho selecionado
  // O hook retorna "ideal" | "justo" | "folgado" que são compatíveis com TensionStatus
  const { bustStatus, waistStatus, hipStatus } = useFittingLogic(
    selectedSize,
    productMeasurements,
    estimatedMeasurements
  );

  const getFitIcon = (fit: string) => {
    switch (fit) {
      case "ideal":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "levemente justo":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "justo":
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case "folgado":
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getFitText = (fit: string) => {
    switch (fit) {
      case "ideal":
        return "Ideal";
      case "levemente justo":
        return "Levemente justo";
      case "justo":
        return "Justo";
      case "folgado":
        return "Folgadinho";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Título da Recomendação */}
      <div className="text-center">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
          MELHOR OPÇÃO
        </p>
        {recommendedSize ? (
          <div className="relative inline-block">
            <div className="w-32 h-32 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-5xl font-bold text-slate-900 dark:text-white">
                {recommendedSize}
              </span>
            </div>
            <div className="absolute -top-2 -right-2">
              <CheckCircle2 className="w-8 h-8 text-green-500 bg-white rounded-full" />
            </div>
          </div>
        ) : (
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Não foi possível calcular uma recomendação precisa
          </p>
        )}
      </div>

      {/* Botão Editar Medidas */}
      {onEdit && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={onEdit}
            className="px-6"
          >
            Editar Medidas
          </Button>
        </div>
      )}

      {/* Visualização do Manequim com Faixas de Tensão */}
      {selectedSize && productMeasurements?.[selectedSize] && userCharacteristics && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <MannequinWithTensionBands
            userCharacteristics={userCharacteristics}
            skinTone={skinTone || SKIN_TONE_PALETTE[0]}
            shapeAdjustments={shapeAdjustments || { bust: 0, waist: 0, hip: 0 }}
            userMeasurements={estimatedMeasurements}
            productMeasurements={productMeasurements[selectedSize]}
            bustStatus={bustStatus}
            waistStatus={waistStatus}
            hipStatus={hipStatus}
          />
        </div>
      )}

      {/* Feedback de Tensão/Ajuste */}
      {recommendedSize && productMeasurements?.[recommendedSize] && (
        <div className="space-y-3 bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Ajuste em diferentes partes:
          </h3>
          
          <div className="space-y-2">
            {/* Busto */}
            {productMeasurements[recommendedSize]["Busto"] && (() => {
              const status = calculateTensionStatus(
                estimatedMeasurements.bust,
                productMeasurements[recommendedSize]["Busto"] || productMeasurements[recommendedSize]["bust"]
              );
              if (!status) return null;
              return (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Busto</span>
                  <div className="flex items-center gap-2">
                    {getFitIcon(status)}
                    <span className="text-slate-700 dark:text-slate-300">
                      {getFitText(status)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Cintura */}
            {productMeasurements[recommendedSize]["Cintura"] && (() => {
              const status = calculateTensionStatus(
                estimatedMeasurements.waist,
                productMeasurements[recommendedSize]["Cintura"] || productMeasurements[recommendedSize]["waist"]
              );
              if (!status) return null;
              return (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Cintura</span>
                  <div className="flex items-center gap-2">
                    {getFitIcon(status)}
                    <span className="text-slate-700 dark:text-slate-300">
                      {getFitText(status)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Quadril */}
            {productMeasurements[recommendedSize]["Quadril"] && (() => {
              const status = calculateTensionStatus(
                estimatedMeasurements.hip,
                productMeasurements[recommendedSize]["Quadril"] || productMeasurements[recommendedSize]["hip"]
              );
              if (!status) return null;
              return (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Quadril</span>
                  <div className="flex items-center gap-2">
                    {getFitIcon(status)}
                    <span className="text-slate-700 dark:text-slate-300">
                      {getFitText(status)}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Seletor de Tamanhos - "Prove Também os Tamanhos" */}
      {productMeasurements && Object.keys(productMeasurements).length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 text-center">
            Prove também os tamanhos:
          </p>
          <div className="flex items-center justify-center gap-3 overflow-x-auto pb-2 flex-wrap">
            {Object.keys(productMeasurements).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setSelectedSize(size);
                  onTrySize?.(size);
                }}
                className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 flex items-center justify-center font-semibold transition-all ${
                  size === selectedSize
                    ? "border-slate-900 dark:border-white bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-lg"
                    : "border-gray-300 dark:border-slate-600 bg-transparent dark:bg-transparent text-slate-700 dark:text-slate-300 hover:border-red-500 dark:hover:border-red-500"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Medidas Estimadas (Info) */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-800 dark:text-blue-300 font-medium mb-2">
          Medidas estimadas:
        </p>
        <div className="grid grid-cols-3 gap-2 text-xs text-blue-700 dark:text-blue-400">
          <div>
            <span className="font-medium">Busto:</span> {estimatedMeasurements.bust}cm
          </div>
          <div>
            <span className="font-medium">Cintura:</span> {estimatedMeasurements.waist}cm
          </div>
          <div>
            <span className="font-medium">Quadril:</span> {estimatedMeasurements.hip}cm
          </div>
        </div>
      </div>

      {/* Botão Fechar */}
      {onClose && (
        <Button
          type="button"
          onClick={onClose}
          className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold"
        >
          FECHAR
        </Button>
      )}
    </div>
  );
}

/**
 * Componente que exibe a imagem real do manequim com overlays de faixas de tensão
 */
function MannequinWithTensionBands({
  userCharacteristics,
  skinTone,
  shapeAdjustments,
  userMeasurements,
  productMeasurements,
  bustStatus,
  waistStatus,
  hipStatus,
}: {
  userCharacteristics: UserPhysicalCharacteristics;
  skinTone: string;
  shapeAdjustments: { bust: number; waist: number; hip: number };
  userMeasurements: { bust: number; waist: number; hip: number };
  productMeasurements: Record<string, number>;
  bustStatus?: TensionStatus | null;
  waistStatus?: TensionStatus | null;
  hipStatus?: TensionStatus | null;
}) {
  // Calcular valores de medida (1-5) a partir dos ajustes (-2 a +2)
  const busto = useMemo(() => adjustmentToMeasure(shapeAdjustments.bust), [shapeAdjustments.bust]);
  const cintura = useMemo(() => adjustmentToMeasure(shapeAdjustments.waist), [shapeAdjustments.waist]);
  const quadril = useMemo(() => adjustmentToMeasure(shapeAdjustments.hip), [shapeAdjustments.hip]);
  const skinToneIndex = useMemo(() => hexToSkinToneIndex(skinTone), [skinTone]);

  // Gerar caminho da imagem do manequim
  const mannequinImagePath = useMemo(() => {
    return getMannequinImagePath(
      skinToneIndex,
      userCharacteristics,
      busto,
      cintura,
      quadril
    );
  }, [skinToneIndex, userCharacteristics, busto, cintura, quadril]);

  // Calcular status de tensão para cada zona (como fallback se não passados via props)
  const calculatedBustStatus = useMemo(() => {
    return calculateTensionStatus(userMeasurements.bust, productMeasurements["Busto"] || productMeasurements["bust"]);
  }, [userMeasurements.bust, productMeasurements]);

  const calculatedWaistStatus = useMemo(() => {
    return calculateTensionStatus(userMeasurements.waist, productMeasurements["Cintura"] || productMeasurements["waist"]);
  }, [userMeasurements.waist, productMeasurements]);

  const calculatedHipStatus = useMemo(() => {
    return calculateTensionStatus(userMeasurements.hip, productMeasurements["Quadril"] || productMeasurements["hip"]);
  }, [userMeasurements.hip, productMeasurements]);

  // Usar status passados como props, ou calcular como fallback
  const finalBustStatus = bustStatus ?? calculatedBustStatus;
  const finalWaistStatus = waistStatus ?? calculatedWaistStatus;
  const finalHipStatus = hipStatus ?? calculatedHipStatus;

  return (
    <div className="relative w-full min-h-[400px] flex items-center justify-center">
      {/* Container principal com posicionamento relativo */}
      <div className="relative w-64 h-[500px] mx-auto flex items-center justify-center">
        {/* 1. Imagem Base do Manequim Real */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={mannequinImagePath}
            alt={`Manequim - Pele ${skinToneIndex}, Medidas B${busto}C${cintura}Q${quadril}`}
            className="max-w-full max-h-[500px] object-contain"
            onError={(e) => {
              // Fallback: tentar outras pastas se a imagem não carregar
              const folders = ['A', 'B', 'C', 'D', 'E'];
              const currentPath = mannequinImagePath;
              const match = currentPath.match(/f([A-E])/);
              if (match) {
                const currentFolder = match[1];
                const currentIndex = folders.indexOf(currentFolder);
                const nextIndex = (currentIndex + 1) % folders.length;
                const fallbackFolder = folders[nextIndex];
                const fallbackPath = currentPath.replace(/f[A-E]/, `f${fallbackFolder}`);
                (e.target as HTMLImageElement).src = fallbackPath;
              }
            }}
          />
        </div>

        {/* 2. Faixas de Tensão (Overlays) - SVG com curvas estilo fita */}
        <FitOverlay
          bustStatus={finalBustStatus}
          waistStatus={finalWaistStatus}
          hipStatus={finalHipStatus}
        />

        {/* 3. Indicadores Laterais (Side Labels) */}
        <SideLabel top="22%" status={finalBustStatus} zone="bust" />
        <SideLabel top="38%" status={finalWaistStatus} zone="waist" />
        <SideLabel top="51%" status={finalHipStatus} zone="hip" />
      </div>
    </div>
  );
}
