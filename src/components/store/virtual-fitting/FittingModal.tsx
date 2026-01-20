"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User } from "lucide-react";
import { StepInputs } from "./StepInputs";
import { StepShape } from "./StepShape";
import { StepResult } from "./StepResult";
import { useFittingAlgorithm, recommendSize, type FittingInputs, type EstimatedMeasurements } from "@/hooks/useFittingAlgorithm";

interface FittingModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  productMeasurements?: Record<string, Record<string, number>>; // { "P": { "Busto": 88, "Cintura": 72 }, ... }
  sizeOrder?: string[];
  initialData?: {
    height?: number;
    weight?: number;
    age?: number;
    gender?: "female" | "male";
    measurements?: EstimatedMeasurements;
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
}

type Step = "inputs" | "shape" | "result";

/**
 * Modal principal do Provador Virtual
 * Gerencia o fluxo de 3 passos com animações suaves
 */
export function FittingModal({
  isOpen,
  onClose,
  productId,
  productMeasurements = {},
  sizeOrder = ["PP", "P", "M", "G", "GG", "XG", "XXG"],
  initialData,
  onSaveMeasurements,
}: FittingModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>("inputs");
  const [inputData, setInputData] = useState<FittingInputs>({
    height: initialData?.height ?? 0,
    weight: initialData?.weight ?? 0,
    age: initialData?.age ?? 0,
    gender: initialData?.gender ?? "female",
    shapeAdjustments: { bust: 0, waist: 0, hip: 0 },
  });
  const [skinTone, setSkinTone] = useState<string>("#f5e6d3");
  const hasSavedRef = useRef<boolean>(false);

  // Calcular medidas estimadas
  const estimatedMeasurements = useFittingAlgorithm(inputData);

  // Salvar medidas quando chegar ao resultado (apenas uma vez)
  useEffect(() => {
    if (currentStep === "result" && onSaveMeasurements && !hasSavedRef.current) {
      hasSavedRef.current = true;
      onSaveMeasurements({
        height: inputData.height,
        weight: inputData.weight,
        age: inputData.age,
        gender: inputData.gender,
        shapeAdjustments: {
          bust: inputData.shapeAdjustments?.bust || 0,
          waist: inputData.shapeAdjustments?.waist || 0,
          hip: inputData.shapeAdjustments?.hip || 0,
        },
        estimatedCm: estimatedMeasurements,
        lastUpdated: new Date(),
      }).catch((error) => {
        console.error("Erro ao salvar medidas:", error);
        hasSavedRef.current = false; // Permite tentar novamente em caso de erro
      });
    }

    // Reset ao fechar o modal
    if (!isOpen) {
      hasSavedRef.current = false;
    }
  }, [currentStep, estimatedMeasurements, inputData, onSaveMeasurements, isOpen]);

  // Calcular recomendação de tamanho
  const { recommendedSize, fitFeedback } = recommendSize(
    estimatedMeasurements,
    productMeasurements,
    sizeOrder
  );

  // Tamanhos alternativos (adjacentes ao recomendado)
  const getAlternativeSizes = (): string[] => {
    if (!recommendedSize) return [];
    const index = sizeOrder.indexOf(recommendedSize);
    if (index === -1) return [];
    const alternatives: string[] = [];
    if (index > 0) alternatives.push(sizeOrder[index - 1]);
    if (index < sizeOrder.length - 1) alternatives.push(sizeOrder[index + 1]);
    return alternatives;
  };

  const handleStep1Next = (data: { height: number; weight: number; age: number; gender: "female" | "male" }) => {
    setInputData((prev) => ({ ...prev, ...data }));
    setCurrentStep("shape");
  };

  const handleStep2Next = (adjustments: { bust: number; waist: number; hip: number; skinTone: string }) => {
    const updatedInputData = {
      ...inputData,
      shapeAdjustments: {
        bust: adjustments.bust,
        waist: adjustments.waist,
        hip: adjustments.hip,
      },
    };
    
    setInputData(updatedInputData);
    setSkinTone(adjustments.skinTone);
    setCurrentStep("result");
  };

  const handleClose = () => {
    setCurrentStep("inputs");
    hasSavedRef.current = false; // Reset para permitir salvar novamente na próxima vez
    onClose();
  };

  const renderStep = () => {
    switch (currentStep) {
      case "inputs":
        return (
          <StepInputs
            initialHeight={inputData.height > 0 ? inputData.height : undefined}
            initialWeight={inputData.weight > 0 ? inputData.weight : undefined}
            initialAge={inputData.age > 0 ? inputData.age : undefined}
            initialGender={
              initialData?.gender
                ? initialData.gender
                : inputData.height > 0 || inputData.weight > 0 || inputData.age > 0
                  ? inputData.gender
                  : undefined
            }
            onNext={handleStep1Next}
          />
        );
      case "shape":
        return (
          <StepShape
            initialBust={inputData.shapeAdjustments?.bust || 0}
            initialWaist={inputData.shapeAdjustments?.waist || 0}
            initialHip={inputData.shapeAdjustments?.hip || 0}
            initialSkinTone={skinTone}
            gender={inputData.gender}
            height={inputData.height}
            weight={inputData.weight}
            age={inputData.age}
            onNext={handleStep2Next}
            onBack={() => setCurrentStep("inputs")}
          />
        );
      case "result":
        return (
          <StepResult
            recommendedSize={recommendedSize || null}
            fitFeedback={fitFeedback}
            estimatedMeasurements={estimatedMeasurements}
            productMeasurements={productMeasurements}
            alternativeSizes={getAlternativeSizes()}
            userCharacteristics={{
              altura: inputData.height,
              peso: inputData.weight,
              idade: inputData.age,
            }}
            skinTone={skinTone}
            shapeAdjustments={inputData.shapeAdjustments || { bust: 0, waist: 0, hip: 0 }}
            gender={inputData.gender}
            onEdit={() => setCurrentStep("shape")}
            onClose={handleClose}
            onTrySize={(size) => {
              // Implementar ação ao selecionar tamanho alternativo
              console.log("Tamanho selecionado:", size);
            }}
          />
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
            onClick={handleClose}
          >
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, y: "100%", scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: "100%", scale: 0.95 }}
              transition={{ duration: 0.3, type: "spring", damping: 25 }}
              className="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl w-full max-w-xl md:max-w-2xl max-h-[85vh] overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header com título e botões de controle */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/40 sticky top-0 bg-linear-to-r from-indigo-700 via-fuchsia-600 to-rose-500 z-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white tracking-wide">
                      Ajuste suas Medidas
                    </span>
                    <span className="text-[11px] text-white/80 leading-tight">
                      Informe seus dados para um caimento mais preciso
                    </span>
                  </div>
                </div>
                <motion.button
                  onClick={handleClose}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                  whileTap={{ scale: 0.95 }}
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Content com transições entre steps */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>

              {/* Rodapé */}
              <div className="px-4 pb-3 pt-2 border-t border-slate-200">
                <p className="text-xs text-slate-500 text-center">
                  Experimente AI®
                </p>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
