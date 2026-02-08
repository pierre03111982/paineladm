"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

interface StepInputsProps {
  initialHeight?: number;
  initialWeight?: number;
  initialAge?: number;
  initialGender?: "female" | "male";
  onNext: (data: { height: number; weight: number; age: number; gender: "female" | "male" }) => void;
  onCancel?: () => void;
}

/**
 * Passo 1: Coleta de dados básicos (Altura, Peso, Idade, Gênero)
 */
export function StepInputs({
  initialHeight,
  initialWeight,
  initialAge,
  initialGender,
  onNext,
  onCancel,
}: StepInputsProps) {
  // Mantém como string para permitir campo realmente "em branco"
  const [height, setHeight] = useState<string>(
    typeof initialHeight === "number" ? String(initialHeight) : ""
  );
  const [weight, setWeight] = useState<string>(
    typeof initialWeight === "number" ? String(initialWeight) : ""
  );
  const [age, setAge] = useState<string>(
    typeof initialAge === "number" ? String(initialAge) : ""
  );
  const [gender, setGender] = useState<"female" | "male" | null>(
    initialGender ?? null
  );

  const parsedHeight = Number(height);
  const parsedWeight = Number(weight);
  const parsedAge = Number(age);
  const isValid =
    !!gender &&
    Number.isFinite(parsedHeight) &&
    Number.isFinite(parsedWeight) &&
    Number.isFinite(parsedAge) &&
    parsedHeight >= 100 &&
    parsedHeight <= 220 &&
    parsedWeight >= 30 &&
    parsedWeight <= 200 &&
    parsedAge >= 12 &&
    parsedAge <= 100;

  const handleNext = () => {
    if (gender && isValid) {
      onNext({
        height: parsedHeight,
        weight: parsedWeight,
        age: parsedAge,
        gender,
      });
    }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-5 overflow-hidden">
      <div className="shrink-0">
        <h2 className="text-base md:text-lg font-bold text-slate-800 mb-0.5">
          Provador Virtual
        </h2>
        <p className="text-xs text-slate-600">
          Preencha os dados para experimentar este produto
        </p>
      </div>

      {/* Seleção de Gênero */}
      <div className="shrink-0">
        <label className="block text-sm font-semibold text-slate-900 mb-2">
          Gênero
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setGender("female")}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              gender === "female"
                ? "bg-rose-200 text-rose-900 border border-rose-300 shadow-sm"
                : "bg-slate-50 text-slate-700 border border-slate-300 hover:bg-slate-100"
            }`}
          >
            Feminino
          </button>
          <button
            type="button"
            onClick={() => setGender("male")}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              gender === "male"
                ? "bg-sky-200 text-sky-900 border border-sky-300 shadow-sm"
                : "bg-slate-50 text-slate-700 border border-slate-300 hover:bg-slate-100"
            }`}
          >
            Masculino
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3 shrink-0">
        {/* Altura */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">
            Altura
          </label>
          <div className="flex items-center gap-2">
            <Input
              inputMode="numeric"
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              min={100}
              max={220}
              className="flex-1 h-10 text-base text-center bg-white"
              placeholder="Ex: 160"
            />
            <span className="text-xs text-slate-900 font-semibold">
              cm
            </span>
          </div>
        </div>

        {/* Peso */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-1.5">
            Peso
          </label>
          <div className="flex items-center gap-2">
            <Input
              inputMode="numeric"
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              min={30}
              max={200}
              className="flex-1 h-10 text-base text-center bg-white"
              placeholder="Ex: 60"
            />
            <span className="text-xs text-slate-900 font-semibold">
              kg
            </span>
          </div>
        </div>

        {/* Idade */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-1.5">
            Idade
            <button
              type="button"
              className="p-1 rounded-full hover:bg-slate-100"
              title="Usado para ajustar cálculos de medidas corporais"
            >
              <Info className="w-4 h-4 text-slate-700" />
            </button>
          </label>
          <div className="flex items-center gap-2">
            <Input
              inputMode="numeric"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              min={12}
              max={100}
              className="flex-1 h-10 text-base text-center bg-white"
              placeholder="Ex: 30"
            />
            <span className="text-xs text-slate-900 font-semibold">
              anos
            </span>
          </div>
        </div>
      </div>

      {/* Indicadores de progresso (passo 1 ativo) — cores suaves */}
      <div className="flex items-center justify-center gap-2 pt-2 shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
      </div>

      {/* Botões de navegação — contraste legível */}
      <div className="flex gap-3 pt-3 mt-auto shrink-0">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
          >
            Voltar
          </Button>
        )}
        <Button
          type="button"
          onClick={handleNext}
          className="flex-1 bg-rose-400 hover:bg-rose-500 text-white font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={!isValid}
        >
          Próximo
        </Button>
      </div>
    </div>
  );
}
