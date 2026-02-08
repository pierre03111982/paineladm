"use client";

import { useState, useEffect } from "react";
import { Ruler, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FittingModal } from "./FittingModal";
import { type EstimatedMeasurements } from "@/hooks/useFittingAlgorithm";

interface FittingTriggerProps {
  productId: string;
  productMeasurements?: Record<string, Record<string, number>>; // { "P": { "Busto": 88, "Cintura": 72 }, ... }
  sizeOrder?: string[];
  /** Se true, o modal abre automaticamente ao montar (ex.: link direto "Testar Ajustador") */
  defaultOpen?: boolean;
  userProfile?: {
    measurements?: {
      height?: number;
      weight?: number;
      age?: number;
      gender?: "female" | "male";
      estimatedCm?: EstimatedMeasurements;
    };
  };
  onSaveMeasurements?: (measurements: {
    height: number;
    weight: number;
    age: number;
    gender: "female" | "male";
    shapeAdjustments: { bust: number; waist: number; hip: number };
    estimatedCm: EstimatedMeasurements;
    lastUpdated: Date;
  }) => Promise<void>;
  className?: string;
}

/**
 * Componente de Trigger (botão) para abrir o Provador Virtual
 * Pode exibir uma recomendação rápida se o usuário já tiver medidas salvas
 */
export function FittingTrigger({
  productId,
  productMeasurements = {},
  sizeOrder = ["PP", "P", "M", "G", "GG", "XG", "XXG"],
  defaultOpen = false,
  userProfile,
  onSaveMeasurements,
  className = "",
}: FittingTriggerProps) {
  const [isModalOpen, setIsModalOpen] = useState(defaultOpen);

  useEffect(() => {
    if (defaultOpen) setIsModalOpen(true);
  }, [defaultOpen]);

  // Se o usuário já tem medidas salvas, podemos mostrar uma recomendação rápida
  const hasSavedMeasurements = !!(
    userProfile?.measurements?.height &&
    userProfile?.measurements?.weight &&
    userProfile?.measurements?.age &&
    userProfile?.measurements?.gender &&
    userProfile?.measurements?.estimatedCm
  );

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 ${className}`}
      >
        <Ruler className="w-5 h-5" />
        <span>
          {hasSavedMeasurements
            ? `Sugerido para você: ${"M"}` // TODO: Calcular recomendação rápida
            : "Descubra seu tamanho ideal"}
        </span>
        <ChevronRight className="w-5 h-5" />
      </button>

      {hasSavedMeasurements && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-sm text-slate-600 hover:text-red-500 underline mt-2"
        >
          Ver detalhes
        </button>
      )}

      <FittingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productId={productId}
        productMeasurements={productMeasurements}
        sizeOrder={sizeOrder}
        initialData={
          userProfile?.measurements
            ? {
                height: userProfile.measurements.height,
                weight: userProfile.measurements.weight,
                age: userProfile.measurements.age,
                gender: userProfile.measurements.gender,
                measurements: userProfile.measurements.estimatedCm,
              }
            : undefined
        }
        onSaveMeasurements={onSaveMeasurements}
      />
    </>
  );
}
