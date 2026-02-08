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
  const clampToLevel = (v: number): number => Math.max(-2, Math.min(2, Math.round(v)));
  const [bustAdjustment, setBustAdjustment] = useState<number>(clampToLevel(initialBust));
  const [waistAdjustment, setWaistAdjustment] = useState<number>(clampToLevel(initialWaist));
  const [hipAdjustment, setHipAdjustment] = useState<number>(clampToLevel(initialHip));
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

  // 5 níveis discretos: -2, -1, 0, +1, +2 (como na referência)
  const LEVELS = [-2, -1, 0, 1, 2] as const;
  const adjustByLevel = (current: number, delta: number): number => clampToLevel(current + delta);

  const SliderControl = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (newValue: number) => void;
  }) => {
    const levelIndex = LEVELS.indexOf(clampToLevel(value) as typeof LEVELS[number]);
    const safeIndex = levelIndex === -1 ? 2 : levelIndex; // 2 = meio (0)
    const percentage = (safeIndex / (LEVELS.length - 1)) * 100; // 0, 25, 50, 75, 100

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">{label}</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange(adjustByLevel(value, -1))}
            disabled={value <= -2}
            className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            aria-label={`Diminuir ${label}`}
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Trilho com 5 marcas (níveis) e handle */}
          <div className="flex-1 relative flex items-center">
            <div className="relative w-full h-4 flex items-center">
              {/* Linha de fundo do trilho */}
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-1.5 bg-slate-200 rounded-full" />
              </div>
              {/* 5 marcas verticais (ticks) */}
              <div className="absolute inset-0 flex justify-between items-center px-0.5">
                {LEVELS.map((_, i) => (
                  <div
                    key={i}
                    className="w-0.5 h-3 bg-slate-400 rounded-full shrink-0"
                    style={{ marginLeft: i === 0 ? 0 : undefined }}
                  />
                ))}
              </div>
              {/* Preenchimento até o nível atual (rosa suave) */}
              <div
                className="absolute left-0 h-1.5 rounded-full bg-rose-300 transition-all duration-200 pointer-events-none"
                style={{ width: `${percentage}%` }}
              />
              {/* Handle (bolinha preta) no nível atual */}
              <div
                className="absolute w-5 h-5 rounded-full bg-slate-800 border-2 border-white shadow-md transition-all duration-200 pointer-events-none -ml-2.5"
                style={{ left: `${percentage}%` }}
              />
              <input
                type="range"
                min={-2}
                max={2}
                step={1}
                value={clampToLevel(value)}
                onChange={(e) => onChange(clampToLevel(Number(e.target.value)))}
                className="absolute top-0 left-0 w-full h-4 opacity-0 cursor-pointer"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onChange(adjustByLevel(value, 1))}
            disabled={value >= 2}
            className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            aria-label={`Aumentar ${label}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      {/* Cabeçalho compacto */}
      <div className="shrink-0 mb-3">
        <h2 className="text-lg font-bold text-slate-800 mb-1">
          Ajuste o formato do corpo
        </h2>
        <p className="text-xs text-slate-600">
          Este é o formato aproximado do corpo que geramos com suas medidas. Ajuste somente se for necessário.
        </p>
      </div>

      {/* Layout: Manequim à esquerda, Controles à direita — sem scroll */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Manequim — altura limitada para caber na tela */}
        <div className="flex items-center justify-center bg-slate-50 rounded-lg p-3 border border-slate-200 min-h-0 max-h-[280px] md:max-h-[320px]">
          <img
            src={mannequinImagePath}
            alt={`Manequim - Pele ${skinToneIndex}, Medidas B${busto}C${cintura}Q${quadril}`}
            className="max-w-full max-h-full object-contain"
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

        {/* Controles — compactos */}
        <div className="space-y-3 min-h-0 overflow-auto">
          {/* Paleta de Tons de Pele (referência imagens) */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              Tom de Pele
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SKIN_TONE_PALETTE.map((tone, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSkinTone(tone)}
                  className={`w-8 h-8 rounded-full border-2 transition-all shrink-0 ${
                    skinTone === tone
                      ? "border-slate-500 scale-110 ring-2 ring-offset-1 ring-slate-300"
                      : "border-slate-200"
                  }`}
                  style={{ backgroundColor: tone }}
                  title={`Tom ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Sliders Busto, Cintura, Quadril */}
          <div className="space-y-3">
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

      {/* Indicadores de progresso — cores suaves */}
      <div className="flex items-center justify-center gap-2 pt-2 shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
        <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
      </div>

      {/* Voltar (fundo claro + letra escura) e Próximo (rosa suave) */}
      <div className="flex gap-3 pt-3 shrink-0">
        {onBack && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex-1 bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200 hover:text-slate-900 font-semibold"
          >
            Voltar
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
          className="flex-1 bg-rose-400 hover:bg-rose-500 text-white font-semibold"
        >
          Próximo
        </Button>
      </div>
    </div>
  );
}
