"use client";

import { useState } from "react";
import { Check, Sparkles, Loader2 } from "lucide-react";
import type { WizardState } from "./ProductCreationWizard";

interface ProductWizardStep3Props {
  wizardState: WizardState;
  updateWizardState: (updates: Partial<WizardState>) => void;
  lojistaId: string;
  onBack: () => void;
  onPublish: () => void;
}

export function ProductWizardStep3({
  wizardState,
  updateWizardState,
  lojistaId,
  onBack,
  onPublish,
}: ProductWizardStep3Props) {
  const [publishing, setPublishing] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newColor, setNewColor] = useState("");

  const handleAddTag = () => {
    if (newTag.trim() && wizardState.aiAnalysisData) {
      const currentTags = wizardState.aiAnalysisData.tags || [];
      if (!currentTags.includes(newTag.trim())) {
        updateWizardState({
          aiAnalysisData: {
            ...wizardState.aiAnalysisData,
            tags: [...currentTags, newTag.trim()],
          },
        });
      }
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (wizardState.aiAnalysisData) {
      const currentTags = wizardState.aiAnalysisData.tags || [];
      updateWizardState({
        aiAnalysisData: {
          ...wizardState.aiAnalysisData,
          tags: currentTags.filter(tag => tag !== tagToRemove),
        },
      });
    }
  };

  const handleAddSize = () => {
    if (newSize.trim()) {
      const currentSizes = wizardState.manualData.tamanhos || [];
      if (!currentSizes.includes(newSize.trim())) {
        updateWizardState({
          manualData: {
            ...wizardState.manualData,
            tamanhos: [...currentSizes, newSize.trim()],
          },
        });
      }
      setNewSize("");
    }
  };

  const handleRemoveSize = (sizeToRemove: string) => {
    const currentSizes = wizardState.manualData.tamanhos || [];
    updateWizardState({
      manualData: {
        ...wizardState.manualData,
        tamanhos: currentSizes.filter(size => size !== sizeToRemove),
      },
    });
  };

  const handleAddColor = () => {
    if (newColor.trim()) {
      const currentColors = wizardState.manualData.cores || [];
      if (!currentColors.includes(newColor.trim())) {
        updateWizardState({
          manualData: {
            ...wizardState.manualData,
            cores: [...currentColors, newColor.trim()],
          },
        });
      }
      setNewColor("");
    }
  };

  const handleRemoveColor = (colorToRemove: string) => {
    const currentColors = wizardState.manualData.cores || [];
    updateWizardState({
      manualData: {
        ...wizardState.manualData,
        cores: currentColors.filter(color => color !== colorToRemove),
      },
    });
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await onPublish();
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Coluna Principal: Formulário (70%) */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Dados de Venda (Manual)
          </h2>

          <div className="space-y-4">
            {/* Preço */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Preço (R$)
              </label>
              <input
                type="text"
                value={wizardState.manualData.preco}
                onChange={(e) =>
                  updateWizardState({
                    manualData: {
                      ...wizardState.manualData,
                      preco: e.target.value,
                    },
                  })
                }
                placeholder="199,90"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-900"
              />
            </div>

            {/* Preço Promocional */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Preço Promocional (R$)
              </label>
              <input
                type="text"
                value={wizardState.manualData.precoPromocional}
                onChange={(e) =>
                  updateWizardState({
                    manualData: {
                      ...wizardState.manualData,
                      precoPromocional: e.target.value,
                    },
                  })
                }
                placeholder="149,90"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-900"
              />
            </div>

            {/* Estoque */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Estoque (Qtd)
              </label>
              <input
                type="number"
                value={wizardState.manualData.estoque}
                onChange={(e) =>
                  updateWizardState({
                    manualData: {
                      ...wizardState.manualData,
                      estoque: e.target.value,
                    },
                  })
                }
                placeholder="50"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-900"
              />
            </div>

            {/* SKU */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                SKU
              </label>
              <input
                type="text"
                value={wizardState.manualData.sku}
                onChange={(e) =>
                  updateWizardState({
                    manualData: {
                      ...wizardState.manualData,
                      sku: e.target.value,
                    },
                  })
                }
                placeholder="VST-FL-001"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-900"
              />
            </div>

            {/* Variações: Tamanhos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Variações (Tamanho)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddSize()}
                  placeholder="Ex: P, M, G"
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-900"
                />
                <button
                  onClick={handleAddSize}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Adicionar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {wizardState.manualData.tamanhos.map((size) => (
                  <span
                    key={size}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm flex items-center gap-2"
                  >
                    {size}
                    <button
                      onClick={() => handleRemoveSize(size)}
                      className="hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Variações: Cores */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Variações (Cor)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddColor()}
                  placeholder="Ex: Preto, Branco"
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-slate-900"
                />
                <button
                  onClick={handleAddColor}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Adicionar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {wizardState.manualData.cores.map((color) => (
                  <span
                    key={color}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-2"
                  >
                    {color}
                    <button
                      onClick={() => handleRemoveColor(color)}
                      className="hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Coluna Lateral: Contexto Visual (30%) */}
      <div className="space-y-6">
        {/* Miniatura da Capa */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Contexto do Produto
          </h3>
          {wizardState.selectedCoverImage ? (
            <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
              <img
                src={wizardState.selectedCoverImage}
                alt="Capa selecionada"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-square rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400">
              Sem capa selecionada
            </div>
          )}
          <p className="text-sm text-gray-500 mt-2 text-center">
            Capa Selecionada
          </p>
        </div>

        {/* Resumo IA */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            Resumo IA
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Nome:
              </label>
              <p className="text-sm font-semibold text-gray-900">
                {wizardState.aiAnalysisData?.nome_sugerido || "Não definido"}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Tags:
              </label>
              <div className="flex flex-wrap gap-2">
                {wizardState.aiAnalysisData?.tags?.slice(0, 5).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botões de Navegação */}
      <div className="lg:col-span-3 flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
        >
          ← Voltar
        </button>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
        >
          {publishing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Publicando...</span>
            </>
          ) : (
            <>
              <Check className="h-5 w-5" />
              <span>PUBLICAR PRODUTO</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

