"use client";

import { useState, useEffect } from "react";
import { Check, Sparkles, Loader2, Package, Gem } from "lucide-react";
import { MANNEQUIN_STYLES } from "@/lib/ai-services/mannequin-prompts";
import type { WizardState } from "./ProductCreationWizard";
import { ManualCombinationModal } from "./ManualCombinationModal";

interface ProductWizardStep2Props {
  wizardState: WizardState;
  updateWizardState: (updates: Partial<WizardState>) => void;
  lojistaId: string;
  produtoId?: string;
  onNext: () => void;
  onBack: () => void;
}

interface CreditInfo {
  credits: number;
  catalogPack: number;
}

export function ProductWizardStep2({
  wizardState,
  updateWizardState,
  lojistaId,
  produtoId,
  onNext,
  onBack,
}: ProductWizardStep2Props) {
  const [creditInfo, setCreditInfo] = useState<CreditInfo>({ credits: 0, catalogPack: 0 });
  const [generatingCatalog, setGeneratingCatalog] = useState(false);
  const [generatingCombined, setGeneratingCombined] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [loadingCredits, setLoadingCredits] = useState(true);

  useEffect(() => {
    loadCreditInfo();
  }, [lojistaId]);

  const loadCreditInfo = async () => {
    try {
      const response = await fetch(`/api/lojista/credits?lojistaId=${lojistaId}`);
      if (response.ok) {
        const data = await response.json();
        setCreditInfo({
          credits: data.credits || 0,
          catalogPack: data.catalogPack || 0,
        });
      }
    } catch (error) {
      console.error("[Step2] Erro ao carregar créditos:", error);
    } finally {
      setLoadingCredits(false);
    }
  };

  const handleGenerateCatalog = async () => {
    if (!wizardState.selectedMannequinId || !wizardState.rawImageUrl) {
      alert("Selecione um manequim primeiro");
      return;
    }

    try {
      setGeneratingCatalog(true);
      const response = await fetch(
        `/api/lojista/products/generate-studio?lojistaId=${lojistaId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mannequinId: wizardState.selectedMannequinId,
            tipo: "catalog",
            imagemUrl: wizardState.rawImageUrl,
            nome: wizardState.aiAnalysisData?.nome_sugerido || "Produto",
            categoria: wizardState.aiAnalysisData?.categoria_sugerida || "Roupas",
            preco: parseFloat(wizardState.manualData.preco.replace(",", ".")) || 0,
            precoPromocional: wizardState.manualData.precoPromocional 
              ? parseFloat(wizardState.manualData.precoPromocional.replace(",", ".")) 
              : null,
            produtoId: produtoId,
            lojistaId: lojistaId,
            // Passar características do produto para análise de cenário
            tags: wizardState.aiAnalysisData?.tags || [],
            detalhes: wizardState.aiAnalysisData?.detalhes || [],
            cor_predominante: wizardState.aiAnalysisData?.cor_predominante,
            tecido_estimado: wizardState.aiAnalysisData?.tecido_estimado,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao gerar catálogo");
      }

      const result = await response.json();
      updateWizardState({ generatedCatalogImage: result.imageUrl });
      await loadCreditInfo();
    } catch (error: any) {
      console.error("[Step2] Erro ao gerar catálogo:", error);
      alert(`Erro ao gerar catálogo: ${error.message}`);
    } finally {
      setGeneratingCatalog(false);
    }
  };

  const handleGenerateCombinedAuto = async () => {
    if (!wizardState.selectedMannequinId || !wizardState.rawImageUrl) {
      alert("Selecione um manequim primeiro");
      return;
    }

    try {
      setGeneratingCombined(true);
      updateWizardState({ combinationMode: "auto" });

      const response = await fetch(
        `/api/lojista/products/generate-studio?lojistaId=${lojistaId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mannequinId: wizardState.selectedMannequinId,
            tipo: "combined",
            imagemUrl: wizardState.rawImageUrl,
            nome: wizardState.aiAnalysisData?.nome_sugerido || "Produto",
            categoria: wizardState.aiAnalysisData?.categoria_sugerida || "Roupas",
            preco: parseFloat(wizardState.manualData.preco.replace(",", ".")) || 0,
            produtoId: produtoId,
            lojistaId: lojistaId, // Adicionar lojistaId no body
            tags: wizardState.aiAnalysisData?.tags || [],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao gerar look combinado");
      }

      const result = await response.json();
      updateWizardState({ generatedCombinedImage: result.imageUrl });
      await loadCreditInfo();
    } catch (error: any) {
      console.error("[Step2] Erro ao gerar look combinado:", error);
      alert(`Erro ao gerar look combinado: ${error.message}`);
    } finally {
      setGeneratingCombined(false);
    }
  };

  const handleGenerateCombinedManual = async (productIds: string[]) => {
    if (!wizardState.selectedMannequinId || !wizardState.rawImageUrl) {
      alert("Selecione um manequim primeiro");
      return;
    }

    try {
      setGeneratingCombined(true);
      updateWizardState({ combinationMode: "manual", manualCombinationItems: productIds });

      const response = await fetch(
        `/api/lojista/products/generate-studio?lojistaId=${lojistaId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mannequinId: wizardState.selectedMannequinId,
            tipo: "combined",
            imagemUrl: wizardState.rawImageUrl,
            nome: wizardState.aiAnalysisData?.nome_sugerido || "Produto",
            categoria: wizardState.aiAnalysisData?.categoria_sugerida || "Roupas",
            preco: parseFloat(wizardState.manualData.preco.replace(",", ".")) || 0,
            produtoId: produtoId,
            lojistaId: lojistaId, // Adicionar lojistaId no body
            productIds: productIds, // IDs dos produtos selecionados manualmente
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao gerar look combinado");
      }

      const result = await response.json();
      updateWizardState({ generatedCombinedImage: result.imageUrl });
      setShowManualModal(false);
      await loadCreditInfo();
    } catch (error: any) {
      console.error("[Step2] Erro ao gerar look combinado:", error);
      alert(`Erro ao gerar look combinado: ${error.message}`);
    } finally {
      setGeneratingCombined(false);
    }
  };

  const handleSelectCover = (imageUrl: string) => {
    updateWizardState({ selectedCoverImage: imageUrl });
  };

  const catalogCost = creditInfo.catalogPack > 0 ? 1 : 1;
  const combinedCost = creditInfo.catalogPack > 0 ? 2 : 2;

  return (
    <div className="space-y-6">
      {/* Barra Superior: Seletor de Manequim e Créditos */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Seletor de Manequim
          </h3>
          {!loadingCredits && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Gem className="h-5 w-5 text-blue-500" />
                <span className="font-semibold text-gray-700">
                  {creditInfo.credits} Créditos
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-500" />
                <span className="font-semibold text-gray-700">
                  {creditInfo.catalogPack} no Pacote
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Carrossel de Manequins */}
        <div className="flex gap-4 overflow-x-auto pb-2">
          {MANNEQUIN_STYLES.map((mannequin) => (
            <button
              key={mannequin.id}
              onClick={() => updateWizardState({ selectedMannequinId: mannequin.id })}
              className={`flex-shrink-0 rounded-xl border-2 transition-all ${
                wizardState.selectedMannequinId === mannequin.id
                  ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500 ring-offset-2"
                  : "border-gray-200 hover:border-indigo-300"
              }`}
            >
              <div className="w-32 h-48 overflow-hidden rounded-t-xl">
                <img
                  src={mannequin.thumbnailUrl}
                  alt={mannequin.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='192'%3E%3Crect fill='%23e5e7eb' width='128' height='192'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-family='sans-serif' font-size='12'%3E${mannequin.name}%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
              <div className="p-2 text-center">
                <p className="text-xs font-semibold text-gray-900">
                  {mannequin.name}
                </p>
                <p className="text-xs text-gray-500">
                  {mannequin.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Grid Principal: 3 Colunas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna 1: Original */}
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <h4 className="text-base font-bold text-gray-900">
            Original (Referência)
          </h4>
          <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
            {wizardState.rawImageUrl ? (
              <img
                src={wizardState.rawImageUrl}
                alt="Original"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                Sem imagem
              </div>
            )}
          </div>
          <button
            onClick={() => handleSelectCover(wizardState.rawImageUrl)}
            className={`w-full px-4 py-2 rounded-lg font-semibold transition ${
              wizardState.selectedCoverImage === wizardState.rawImageUrl
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <Check className="h-4 w-4 inline mr-2" />
            Usar como Capa
          </button>
        </div>

        {/* Coluna 2: Foto Catálogo */}
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <h4 className="text-base font-bold text-gray-900">
            Foto Catálogo (Solo)
          </h4>
          <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
            {wizardState.generatedCatalogImage ? (
              <img
                src={wizardState.generatedCatalogImage}
                alt="Catálogo"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Sparkles className="h-12 w-12" />
              </div>
            )}
          </div>
          {!wizardState.generatedCatalogImage ? (
            <button
              onClick={handleGenerateCatalog}
              disabled={!wizardState.selectedMannequinId || generatingCatalog}
              className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generatingCatalog ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Gerando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Gerar Catálogo (Custo: {catalogCost} {creditInfo.catalogPack > 0 ? "Pack" : "Crédito"})</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => handleSelectCover(wizardState.generatedCatalogImage!)}
              className={`w-full px-4 py-2 rounded-lg font-semibold transition ${
                wizardState.selectedCoverImage === wizardState.generatedCatalogImage
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              <Check className="h-4 w-4 inline mr-2" />
              Usar como Capa
            </button>
          )}
        </div>

        {/* Coluna 3: Look Combinado */}
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <h4 className="text-base font-bold text-gray-900">
            Look Combinado (Sugestão)
          </h4>
          <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
            {wizardState.generatedCombinedImage ? (
              <img
                src={wizardState.generatedCombinedImage}
                alt="Look Combinado"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Sparkles className="h-12 w-12" />
              </div>
            )}
          </div>
          {!wizardState.generatedCombinedImage ? (
            <div className="space-y-3">
              <h5 className="text-sm font-semibold text-gray-700">
                Adicionar Peças Complementares
              </h5>
              <button
                onClick={handleGenerateCombinedAuto}
                disabled={!wizardState.selectedMannequinId || generatingCombined}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generatingCombined ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Combinação Automática (IA)</span>
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 text-center">
                A IA escolhe até 2 peças do seu estoque que combinam baseado nas tags.
              </p>
              <button
                onClick={() => setShowManualModal(true)}
                disabled={generatingCombined}
                className="w-full px-4 py-2 border-2 border-indigo-500 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition disabled:opacity-50"
              >
                👆 Seleção Manual
              </button>
              <p className="text-xs text-gray-500 text-center">
                Abra o catálogo e escolha você mesmo as peças.
              </p>
            </div>
          ) : (
            <button
              onClick={() => handleSelectCover(wizardState.generatedCombinedImage!)}
              className={`w-full px-4 py-2 rounded-lg font-semibold transition ${
                wizardState.selectedCoverImage === wizardState.generatedCombinedImage
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              <Check className="h-4 w-4 inline mr-2" />
              Usar como Capa
            </button>
          )}
        </div>
      </div>

      {/* Botões de Navegação */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
        >
          ← Voltar
        </button>
        <button
          onClick={onNext}
          disabled={!wizardState.selectedCoverImage}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          Próximo: Detalhes de Venda →
        </button>
      </div>

      {/* Modal de Seleção Manual */}
      {showManualModal && (
        <ManualCombinationModal
          lojistaId={lojistaId}
          currentProductTags={wizardState.aiAnalysisData?.tags || []}
          onClose={() => setShowManualModal(false)}
          onConfirm={handleGenerateCombinedManual}
        />
      )}
    </div>
  );
}

