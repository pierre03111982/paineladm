"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductWizardStepper } from "./ProductWizardStepper";
import { ProductWizardStep1 } from "./ProductWizardStep1";
import { ProductWizardStep2 } from "./ProductWizardStep2";
import { ProductWizardStep3 } from "./ProductWizardStep3";

export interface WizardState {
  currentStep: number;
  rawImageUrl: string;
  rawImageFile: File | null;
  aiAnalysisData: {
    nome_sugerido?: string;
    descricao_seo?: string;
    tags?: string[];
    categoria_sugerida?: string;
    cor_predominante?: string;
    tecido_estimado?: string;
    detalhes?: string[];
  } | null;
  selectedMannequinId: string | null;
  generatedCatalogImage: string | null;
  generatedCombinedImage: string | null;
  selectedCoverImage: string | null;
  combinationMode: 'auto' | 'manual' | null;
  manualCombinationItems: string[];
  manualData: {
    preco: string;
    precoPromocional: string;
    estoque: string;
    sku: string;
    tamanhos: string[];
    cores: string[];
  };
}

interface ProductCreationWizardProps {
  lojistaId: string;
  produtoId?: string; // Para edição
  initialData?: Partial<WizardState>;
}

export function ProductCreationWizard({ lojistaId, produtoId, initialData }: ProductCreationWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lojistaIdFromUrl = searchParams.get("lojistaId") || lojistaId;

  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 1,
    rawImageUrl: initialData?.rawImageUrl || "",
    rawImageFile: initialData?.rawImageFile || null,
    aiAnalysisData: initialData?.aiAnalysisData || null,
    selectedMannequinId: initialData?.selectedMannequinId || null,
    generatedCatalogImage: initialData?.generatedCatalogImage || null,
    generatedCombinedImage: initialData?.generatedCombinedImage || null,
    selectedCoverImage: initialData?.selectedCoverImage || null,
    combinationMode: initialData?.combinationMode || null,
    manualCombinationItems: initialData?.manualCombinationItems || [],
    manualData: initialData?.manualData || {
      preco: "",
      precoPromocional: "",
      estoque: "",
      sku: "",
      tamanhos: [],
      cores: [],
    },
  });

  const updateWizardState = (updates: Partial<WizardState>) => {
    setWizardState(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    // Validações por etapa
    if (wizardState.currentStep === 1) {
      if (!wizardState.rawImageUrl || !wizardState.aiAnalysisData) {
        alert("Por favor, aguarde a análise da IA ser concluída antes de prosseguir.");
        return;
      }
    }
    
    if (wizardState.currentStep === 2) {
      if (!wizardState.selectedCoverImage) {
        alert("Por favor, selecione uma imagem de capa antes de prosseguir.");
        return;
      }
    }

    if (wizardState.currentStep < 3) {
      setWizardState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    }
  };

  const handleBack = () => {
    if (wizardState.currentStep > 1) {
      setWizardState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
    }
  };

  const handlePublish = async () => {
    // Validar dados obrigatórios
    if (!wizardState.rawImageUrl) {
      alert("Imagem é obrigatória");
      return;
    }

    if (!wizardState.aiAnalysisData?.nome_sugerido) {
      alert("Nome do produto é obrigatório");
      return;
    }

    if (!wizardState.manualData.preco) {
      alert("Preço é obrigatório");
      return;
    }

    try {
      // Preparar payload
      const payload = {
        nome: wizardState.aiAnalysisData.nome_sugerido,
        categoria: wizardState.aiAnalysisData.categoria_sugerida || "Roupas",
        preco: parseFloat(wizardState.manualData.preco.replace(",", ".")) || 0,
        precoPromocional: wizardState.manualData.precoPromocional 
          ? parseFloat(wizardState.manualData.precoPromocional.replace(",", ".")) 
          : null,
        imagemUrl: wizardState.selectedCoverImage || wizardState.rawImageUrl,
        imagemUrlOriginal: wizardState.rawImageUrl,
        imagemUrlCatalogo: wizardState.generatedCatalogImage || null,
        tamanhos: wizardState.manualData.tamanhos,
        cores: wizardState.manualData.cores,
        estoque: wizardState.manualData.estoque ? parseInt(wizardState.manualData.estoque) : 0,
        tags: wizardState.aiAnalysisData.tags || [],
        obs: wizardState.aiAnalysisData.descricao_seo || "",
        sku: wizardState.manualData.sku || "",
        lojistaId: lojistaIdFromUrl,
      };

      const url = produtoId
        ? `/api/lojista/products/${produtoId}?lojistaId=${lojistaIdFromUrl}`
        : `/api/lojista/products?lojistaId=${lojistaIdFromUrl}`;

      const method = produtoId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao salvar produto");
      }

      const result = await response.json();
      
      // Redirecionar para a lista de produtos
      router.push(`/produtos?lojistaId=${lojistaIdFromUrl}`);
    } catch (error: any) {
      console.error("[ProductCreationWizard] Erro ao publicar:", error);
      alert(`Erro ao publicar produto: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Stepper */}
        <ProductWizardStepper 
          currentStep={wizardState.currentStep}
          completedSteps={[]}
        />

        {/* Conteúdo da Etapa Atual */}
        <div className="mt-8">
          {wizardState.currentStep === 1 && (
            <ProductWizardStep1
              wizardState={wizardState}
              updateWizardState={updateWizardState}
              lojistaId={lojistaIdFromUrl}
              onNext={handleNext}
            />
          )}

          {wizardState.currentStep === 2 && (
            <ProductWizardStep2
              wizardState={wizardState}
              updateWizardState={updateWizardState}
              lojistaId={lojistaIdFromUrl}
              produtoId={produtoId}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {wizardState.currentStep === 3 && (
            <ProductWizardStep3
              wizardState={wizardState}
              updateWizardState={updateWizardState}
              lojistaId={lojistaIdFromUrl}
              onBack={handleBack}
              onPublish={handlePublish}
            />
          )}
        </div>
      </div>
    </div>
  );
}

