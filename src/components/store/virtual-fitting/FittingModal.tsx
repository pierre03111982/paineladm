"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Pencil, UserPlus, UserMinus, RotateCcw } from "lucide-react";
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
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
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
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      setCurrentStep("result");
    }, 1400);
  };

  const handleClose = () => {
    setCurrentStep("inputs");
    setProfilePanelOpen(false);
    hasSavedRef.current = false;
    onClose();
  };

  const handleReiniciar = () => {
    setInputData({
      height: initialData?.height ?? 0,
      weight: initialData?.weight ?? 0,
      age: initialData?.age ?? 0,
      gender: initialData?.gender ?? "female",
      shapeAdjustments: { bust: 0, waist: 0, hip: 0 },
    });
    setCurrentStep("inputs");
    setProfilePanelOpen(false);
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

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — cockpit: cobre toda a viewport incluindo cabeçalho */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/55 flex items-center justify-center p-2 sm:p-4"
            style={{ zIndex: 2147483647 }}
            onClick={handleClose}
          >
            {/* Modal — centralizado, altura fixa para não precisar de scroll */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25, type: "spring", damping: 28 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xl md:max-w-2xl h-[90vh] max-h-[720px] flex flex-col overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: título + ícone de perfil (abre aba) + fechar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/60 sticky top-0 z-20"
              style={{ background: 'linear-gradient(90deg, #7c3aed 0%, #a855f7 50%, #f472b6 100%)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setProfilePanelOpen((v) => !v)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/25 hover:bg-white/35 text-white transition-colors"
                    aria-label="Abrir perfil"
                  >
                    <User className="w-4 h-4" />
                  </button>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-white tracking-wide truncate drop-shadow-sm">
                      Ajuste suas Medidas
                    </span>
                    <span className="text-[11px] text-white/90 leading-tight truncate">
                      Informe seus dados para um caimento mais preciso
                    </span>
                  </div>
                </div>
                <motion.button
                  onClick={handleClose}
                  className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors shrink-0"
                  whileTap={{ scale: 0.95 }}
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Aba do perfil: abre ao clicar na foto do perfil (sem foto de modelo) */}
              <AnimatePresence>
                {profilePanelOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: 80 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 80 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-14 right-0 bottom-0 w-72 max-w-[85vw] max-h-[calc(90vh-3.5rem)] bg-white border-l border-slate-200 shadow-xl z-30 flex flex-col overflow-hidden rounded-l-lg"
                  >
                    <div className="p-4 border-b border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                          <User className="w-5 h-5" />
                        </div>
                        <button
                          type="button"
                          onClick={() => setProfilePanelOpen(false)}
                          className="p-1.5 text-slate-500 hover:text-slate-700 rounded"
                          aria-label="Fechar perfil"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Digite o nome</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder="Seu nome"
                          className="flex-1 min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                        <Pencil className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>
                    </div>
                    <div className="p-4 flex-1 overflow-auto">
                      <div className="grid grid-cols-3 gap-2 text-center mb-4">
                        <div className="bg-slate-50 rounded-lg py-2 px-1">
                          <p className="text-[10px] font-medium text-slate-500 uppercase">Altura</p>
                          <p className="text-sm font-semibold text-slate-800">{inputData.height || "—"} cm</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg py-2 px-1">
                          <p className="text-[10px] font-medium text-slate-500 uppercase">Peso</p>
                          <p className="text-sm font-semibold text-slate-800">{inputData.weight || "—"} kg</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg py-2 px-1">
                          <p className="text-[10px] font-medium text-slate-500 uppercase">Idade</p>
                          <p className="text-sm font-semibold text-slate-800">{inputData.age || "—"} anos</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mb-4">
                        <button
                          type="button"
                          onClick={handleReiniciar}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reiniciar
                        </button>
                        <button
                          type="button"
                          onClick={() => { setCurrentStep("inputs"); setProfilePanelOpen(false); }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 py-2 text-xs font-semibold text-violet-800 hover:bg-violet-100"
                        >
                          Editar Medidas
                        </button>
                      </div>
                      <div className="border-t border-slate-200 pt-3 space-y-2">
                        <button
                          type="button"
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <UserPlus className="w-4 h-4" />
                          Adicionar perfil
                        </button>
                        <button
                          type="button"
                          onClick={handleClose}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-800"
                        >
                          <UserMinus className="w-4 h-4" />
                          Remover perfil
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Overlay "Quase lá!" ao calcular recomendação */}
              <AnimatePresence>
                {isCalculating && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm rounded-2xl"
                  >
                    <div className="w-12 h-12 border-4 border-slate-100 border-t-rose-400 rounded-full animate-spin" />
                    <p className="mt-4 text-lg font-bold text-slate-800">Quase lá!</p>
                    <p className="mt-1 text-sm text-slate-600 text-center px-6">
                      Estamos calculando as medidas para gerar a recomendação de tamanho ideal
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Área de conteúdo — sem scroll, altura fixa */}
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 min-h-0 overflow-hidden flex flex-col"
                  >
                    {renderStep()}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Rodapé compacto */}
              <div className="shrink-0 px-4 py-2 border-t border-slate-200">
                <p className="text-[11px] text-slate-500 text-center">Experimente AI®</p>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Portal no body: modal sempre por cima da página (cabeçalho, sidebar, etc.) — estilo cockpit
  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
