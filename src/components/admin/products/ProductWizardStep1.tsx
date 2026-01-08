"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Loader2, Sparkles } from "lucide-react";
import type { WizardState } from "./ProductCreationWizard";

interface ProductWizardStep1Props {
  wizardState: WizardState;
  updateWizardState: (updates: Partial<WizardState>) => void;
  lojistaId: string;
  onNext: () => void;
}

export function ProductWizardStep1({
  wizardState,
  updateWizardState,
  lojistaId,
  onNext,
}: ProductWizardStep1Props) {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Análise automática após upload
  useEffect(() => {
    if (wizardState.rawImageUrl && !wizardState.aiAnalysisData && !analyzing) {
      analyzeImage(wizardState.rawImageUrl);
    }
  }, [wizardState.rawImageUrl]);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("image", file);
      formData.append("lojistaId", lojistaId);

      const response = await fetch(
        `/api/lojista/products/upload-image?lojistaId=${lojistaId}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Erro ao fazer upload");

      const result = await response.json();
      updateWizardState({ rawImageUrl: result.imageUrl, rawImageFile: file });
    } catch (error: any) {
      console.error("[Step1] Erro no upload:", error);
      alert(`Erro ao fazer upload: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const analyzeImage = async (imageUrl: string) => {
    if (!imageUrl || (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://"))) {
      return;
    }

    try {
      setAnalyzing(true);
      setAnalysisProgress(0);

      // Simular progresso
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 300);

      const response = await fetch(
        `/api/lojista/products/analyze?lojistaId=${lojistaId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl }),
        }
      );

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro na análise");
      }

      const result = await response.json();

      if (result.success && result.data) {
        updateWizardState({ aiAnalysisData: result.data });
      }
    } catch (error: any) {
      console.error("[Step1] Erro na análise:", error);
      alert(`Erro na análise: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Coluna Esquerda: Upload */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Sua Foto Original
        </h2>
        
        <div
          ref={dropzoneRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`relative border-2 border-dashed rounded-xl p-8 min-h-[400px] flex items-center justify-center transition-all ${
            uploading || analyzing
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 hover:border-indigo-500"
          }`}
        >
          {wizardState.rawImageUrl ? (
            <div className="relative w-full h-full">
              <img
                src={wizardState.rawImageUrl}
                alt="Foto original"
                className="w-full h-full object-contain rounded-lg"
              />
              
              {/* Overlay de Processamento */}
              {(uploading || analyzing) && (
                <div className="absolute inset-0 bg-black/50 rounded-lg flex flex-col items-center justify-center">
                  <Loader2 className="h-12 w-12 text-white animate-spin mb-4" />
                  <p className="text-white font-semibold">
                    {uploading ? "Enviando..." : `Processando IA... ${analysisProgress}%`}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <Upload className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Arraste uma imagem aqui ou clique para selecionar
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Selecionar Imagem
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Coluna Direita: Feedback IA */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          Sugestões da Inteligência Artificial
        </h2>

        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 space-y-4">
          {!wizardState.rawImageUrl ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              Aguardando imagem para iniciar análise...
            </p>
          ) : analyzing ? (
            // Skeleton Screens
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-2"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : wizardState.aiAnalysisData ? (
            // Campos Preenchidos
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  Nome Sugerido
                </label>
                <input
                  type="text"
                  value={wizardState.aiAnalysisData.nome_sugerido || ""}
                  onChange={(e) =>
                    updateWizardState({
                      aiAnalysisData: {
                        ...wizardState.aiAnalysisData!,
                        nome_sugerido: e.target.value,
                      },
                    })
                  }
                  className="w-full rounded-lg border border-indigo-200 dark:border-indigo-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  Descrição SEO
                </label>
                <textarea
                  value={wizardState.aiAnalysisData.descricao_seo || ""}
                  onChange={(e) =>
                    updateWizardState({
                      aiAnalysisData: {
                        ...wizardState.aiAnalysisData!,
                        descricao_seo: e.target.value,
                      },
                    })
                  }
                  rows={4}
                  className="w-full rounded-lg border border-indigo-200 dark:border-indigo-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {wizardState.aiAnalysisData.tags?.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  Categoria
                </label>
                <input
                  type="text"
                  value={wizardState.aiAnalysisData.categoria_sugerida || ""}
                  onChange={(e) =>
                    updateWizardState({
                      aiAnalysisData: {
                        ...wizardState.aiAnalysisData!,
                        categoria_sugerida: e.target.value,
                      },
                    })
                  }
                  className="w-full rounded-lg border border-indigo-200 dark:border-indigo-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </>
          ) : null}
        </div>

        {/* Botão Próximo */}
        <div className="flex justify-end pt-4">
          <button
            onClick={onNext}
            disabled={!wizardState.rawImageUrl || !wizardState.aiAnalysisData || analyzing}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            Próximo: Estúdio Criativo →
          </button>
        </div>
      </div>
    </div>
  );
}

