"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { SKIN_TONE_PALETTE } from "./DynamicMannequin";
import { Minus, Plus } from "lucide-react";
import { getMannequinImagePath } from "@/lib/mannequin-selector";

interface StepShapeProps {
  initialBust?: number;
  initialWaist?: number;
  initialHip?: number;
  initialSkinTone?: string;
  gender: "female" | "male";
  height: number; // Altura em cm
  weight: number; // Peso em kg
  age: number; // Idade em anos
  onNext: (adjustments: { bust: number; waist: number; hip: number; skinTone: string }) => void;
  onBack?: () => void;
}

/**
 * Converte tom de pele (hex) para índice (0-6)
 * A paleta tem 8 cores, mas as imagens têm 7 tons (0-6)
 */
function hexToSkinToneIndex(hex: string): number {
  const index = SKIN_TONE_PALETTE.indexOf(hex);
  // Se não encontrar, usar 0 como padrão
  if (index === -1) return 0;
  // Mapear 8 cores (0-7) para 7 tons (0-6)
  // Distribuir uniformemente: 0->0, 1->1, 2->2, 3->3, 4->4, 5->5, 6->6, 7->6
  return Math.min(index, 6);
}

/**
 * Converte ajuste (-2 a +2) para valor de medida (1-5)
 */
function adjustmentToMeasure(adjustment: number): number {
  // -2 a +2 -> 1 a 5
  // -2 = 1, -1 = 2, 0 = 3, +1 = 4, +2 = 5
  return Math.max(1, Math.min(5, Math.round(adjustment + 3)));
}

/**
 * Passo 2: Ajuste visual do formato do corpo com sliders
 */
export function StepShape({
  initialBust = 0,
  initialWaist = 0,
  initialHip = 0,
  initialSkinTone = SKIN_TONE_PALETTE[0],
  gender,
  height,
  weight,
  age,
  onNext,
  onBack,
}: StepShapeProps) {
  const [bustAdjustment, setBustAdjustment] = useState<number>(initialBust);
  const [waistAdjustment, setWaistAdjustment] = useState<number>(initialWaist);
  const [hipAdjustment, setHipAdjustment] = useState<number>(initialHip);
  const [skinTone, setSkinTone] = useState<string>(initialSkinTone);

  // Calcular valores de medida (1-5) a partir dos ajustes (-2 a +2)
  const busto = useMemo(() => adjustmentToMeasure(bustAdjustment), [bustAdjustment]);
  const cintura = useMemo(() => adjustmentToMeasure(waistAdjustment), [waistAdjustment]);
  const quadril = useMemo(() => adjustmentToMeasure(hipAdjustment), [hipAdjustment]);
  const skinToneIndex = useMemo(() => hexToSkinToneIndex(skinTone), [skinTone]);

  // Gerar caminho da imagem do manequim
  const mannequinImagePath = useMemo(() => {
    return getMannequinImagePath(
      skinToneIndex,
      { altura: height, peso: weight, idade: age },
      busto,
      cintura,
      quadril
    );
  }, [skinToneIndex, height, weight, age, busto, cintura, quadril]);

  const adjustValue = (current: number, delta: number, min: number = -2, max: number = 2): number => {
    return Math.max(min, Math.min(max, current + delta));
  };

  const SliderControl = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (newValue: number) => void;
  }) => {
    const percentage = ((value + 2) / 4) * 100; // Converter -2 a +2 para 0-100%

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">{label}</label>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange(adjustValue(value, -0.5))}
            disabled={value <= -2}
            className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          
          <div className="flex-1 relative">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-400 to-pink-500 rounded-full transition-all duration-200"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              className="absolute top-0 left-0 w-full h-3 opacity-0 cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => onChange(adjustValue(value, 0.5))}
            disabled={value >= 2}
            className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-2xl font-bold text-red-600 mb-2">
          Ajuste o formato do corpo
        </h2>
        <p className="text-sm text-slate-600">
          Este é o formato aproximado do corpo que geramos com suas medidas. Ajuste somente se for necessário.
        </p>
      </div>

      {/* Layout: Manequim à esquerda, Controles à direita */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manequim - Imagem Real */}
        <div className="flex items-center justify-center bg-white rounded-lg p-4 border border-gray-200 min-h-[400px]">
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

        {/* Controles */}
        <div className="space-y-6">
          {/* Paleta de Tons de Pele */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Tom de Pele
            </label>
            <div className="flex flex-wrap gap-2">
              {SKIN_TONE_PALETTE.map((tone, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSkinTone(tone)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    skinTone === tone
                      ? "border-gray-800 scale-110"
                      : "border-gray-300"
                  }`}
                  style={{ backgroundColor: tone }}
                  title={`Tom ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Sliders de Ajuste */}
          <div className="space-y-4">
            <SliderControl
              label="Busto"
              value={bustAdjustment}
              onChange={setBustAdjustment}
            />
            <SliderControl
              label="Cintura"
              value={waistAdjustment}
              onChange={setWaistAdjustment}
            />
            <SliderControl
              label="Quadril"
              value={hipAdjustment}
              onChange={setHipAdjustment}
            />
          </div>
        </div>
      </div>

      {/* Indicadores de Progresso */}
      <div className="flex items-center justify-center gap-2 pt-4">
        <div className="w-3 h-3 rounded-full bg-gray-300" />
        <div className="w-3 h-3 rounded-full bg-red-500" />
      </div>

      {/* Botões de Navegação */}
      <div className="flex gap-3 pt-4">
        {onBack && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1"
          >
            VOLTAR
          </Button>
        )}
        <Button
          type="button"
          onClick={() =>
            onNext({
              bust: bustAdjustment,
              waist: waistAdjustment,
              hip: hipAdjustment,
              skinTone,
            })
          }
          className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold"
        >
          PRÓXIMO
        </Button>
      </div>
    </div>
  );
}
