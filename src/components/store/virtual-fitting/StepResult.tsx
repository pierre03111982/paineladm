"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const getFitText = (fit: string) => {
    switch (fit) {
      case "ideal":
        return "ideal";
      case "levemente justo":
        return "levemente justo";
      case "justo":
        return "apertado";
      case "folgado":
        return "levemente folgado";
      default:
        return "";
    }
  };

  /** Legenda ao lado do manequim (uma linha por zona) — como nas imagens de referência */
  const FitLegendLine = ({ status }: { status: TensionStatus | null }) => {
    if (!status) return null;
    const iconColors: Record<TensionStatus, string> = {
      ideal: "bg-green-500",
      "levemente justo": "bg-amber-500",
      justo: "bg-red-500",
      folgado: "bg-amber-500",
    };
    return (
      <div className="flex items-center gap-2">
        <div className={`rounded-full p-1 ${iconColors[status]}`}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-white">
            <path d="M4 8L6 6M4 8L6 10M12 8L10 6M12 8L10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-xs text-slate-700">{getFitText(status)}</span>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      {/* 1) MELHOR OPÇÃO — só título + card do tamanho + Editar Medidas */}
      <div className="shrink-0 flex flex-col items-center mb-3">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
          MELHOR OPÇÃO
        </p>
        {recommendedSize ? (
          <>
            <div className="relative">
              <div className="w-20 h-20 bg-white border-2 border-slate-300 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-3xl font-bold text-slate-900">{recommendedSize}</span>
              </div>
              <div className="absolute -top-0.5 -right-0.5">
                <CheckCircle2 className="w-5 h-5 text-green-500 bg-white rounded-full" />
              </div>
            </div>
            {onEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={onEdit}
                className="mt-2 px-4 py-1.5 text-xs bg-white border-slate-300 text-slate-800 hover:bg-slate-50"
              >
                Editar Medidas
              </Button>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500">Não foi possível calcular.</p>
        )}
      </div>

      {/* 2) Manequim maior + legenda à direita (faixas mudam conforme tamanho selecionado) */}
      {selectedSize && productMeasurements?.[selectedSize] && userCharacteristics && (
        <div className="flex-1 min-h-0 flex gap-4 items-stretch">
          <div className="flex-1 min-w-0 flex items-center justify-center min-h-[200px] max-h-[320px] rounded-lg overflow-hidden bg-slate-50/50">
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
          <div className="shrink-0 flex flex-col justify-center gap-3">
            <FitLegendLine status={bustStatus ?? null} />
            <FitLegendLine status={waistStatus ?? null} />
            <FitLegendLine status={hipStatus ?? null} />
          </div>
        </div>
      )}

      {/* 3) Prove também os tamanhos — setas + check no recomendado */}
      {productMeasurements && Object.keys(productMeasurements).length > 0 && (() => {
        const sizes = Object.keys(productMeasurements);
        const currentIndex = sizes.indexOf(selectedSize || sizes[0]);
        const goPrev = () => {
          const idx = currentIndex <= 0 ? sizes.length - 1 : currentIndex - 1;
          setSelectedSize(sizes[idx]);
          onTrySize?.(sizes[idx]);
        };
        const goNext = () => {
          const idx = currentIndex >= sizes.length - 1 ? 0 : currentIndex + 1;
          setSelectedSize(sizes[idx]);
          onTrySize?.(sizes[idx]);
        };
        return (
          <div className="shrink-0 space-y-1.5 mt-2">
            <p className="text-xs font-medium text-slate-600">Prove também os tamanhos:</p>
            <div className="flex items-center justify-center gap-1">
              <button type="button" onClick={goPrev} className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 shrink-0" aria-label="Anterior">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex gap-2 flex-wrap justify-center min-w-0">
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => { setSelectedSize(size); onTrySize?.(size); }}
                    className={`relative shrink-0 w-11 h-11 rounded-lg border-2 flex items-center justify-center text-sm font-semibold transition-all ${
                      size === selectedSize ? "border-slate-600 bg-slate-50 text-slate-800" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {size}
                    {size === recommendedSize && (
                      <span className="absolute -top-0.5 -right-0.5">
                        <CheckCircle2 className="w-4 h-4 text-green-500 bg-white rounded-full" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button type="button" onClick={goNext} className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 shrink-0" aria-label="Próximo">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* 4) Uma linha de medidas (corpo do cliente) */}
      <div className="shrink-0 flex justify-center gap-4 text-[11px] text-slate-600 mt-1">
        <span>Busto: {estimatedMeasurements.bust} cm</span>
        <span>Cintura: {estimatedMeasurements.waist} cm</span>
        <span>Quadril: {estimatedMeasurements.hip} cm</span>
      </div>

      {/* 5) Fechar */}
      {onClose && (
        <Button type="button" onClick={onClose} className="w-full shrink-0 bg-rose-400 hover:bg-rose-500 text-white font-semibold py-2 mt-2">
          Fechar
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
    <div className="relative w-full h-full min-h-[200px] flex items-center justify-center">
      <div
        className="relative w-48 md:w-56 lg:w-60 h-full max-h-[300px] mx-auto flex items-center justify-center overflow-hidden"
        style={{
          maskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
        }}
      >
        {/* 1. Imagem Base do Manequim */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={mannequinImagePath}
            alt={`Manequim - Pele ${skinToneIndex}, Medidas B${busto}C${cintura}Q${quadril}`}
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
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

        {/* 2. Faixas de Tensão — cores mudam conforme tamanho selecionado vs corpo */}
        <FitOverlay
          bustStatus={finalBustStatus}
          waistStatus={finalWaistStatus}
          hipStatus={finalHipStatus}
        />
      </div>
    </div>
  );
}
