"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Check, Image as ImageIcon, Package, Star, Monitor, Loader2 } from "lucide-react";
import { MANNEQUIN_STYLES, type MannequinStyle } from "@/lib/ai-services/mannequin-prompts";

interface ProductStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  produtoId?: string;
  imagemUrlOriginal: string;
  nomeProduto: string;
  categoria: string;
  preco: number;
  lojistaId: string;
  onImageGenerated?: (type: "catalog" | "combined", imageUrl: string) => void;
}

interface CreditInfo {
  credits: number;
  catalogPack: number;
}

export function ProductStudioModal({
  isOpen,
  onClose,
  produtoId,
  imagemUrlOriginal,
  nomeProduto,
  categoria,
  preco,
  lojistaId,
  onImageGenerated,
}: ProductStudioModalProps) {
  const [selectedMannequinId, setSelectedMannequinId] = useState<string | null>(null);
  const [catalogImage, setCatalogImage] = useState<string | null>(null);
  const [combinedImage, setCombinedImage] = useState<string | null>(null);
  const [generatingCatalog, setGeneratingCatalog] = useState(false);
  const [generatingCombined, setGeneratingCombined] = useState(false);
  const [creditInfo, setCreditInfo] = useState<CreditInfo>({ credits: 0, catalogPack: 0 });
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Carregar informações de créditos
  useEffect(() => {
    if (isOpen && lojistaId) {
      loadCreditInfo();
    }
  }, [isOpen, lojistaId]);

  const loadCreditInfo = async () => {
    try {
      setLoadingCredits(true);
      const response = await fetch(`/api/lojista/credits?lojistaId=${lojistaId}`);
      if (response.ok) {
        const data = await response.json();
        setCreditInfo({
          credits: data.credits || 0,
          catalogPack: data.catalogPack || 0,
        });
      }
    } catch (err) {
      console.error("[ProductStudioModal] Erro ao carregar créditos:", err);
    } finally {
      setLoadingCredits(false);
    }
  };

  const handleGenerateCatalog = async () => {
    if (!selectedMannequinId || !imagemUrlOriginal) {
      setError("Selecione um manequim e certifique-se de que há uma imagem original.");
      return;
    }

    try {
      setGeneratingCatalog(true);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/lojista/products/generate-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produtoId,
          imagemUrl: imagemUrlOriginal,
          mannequinId: selectedMannequinId,
          tipo: "catalog",
          lojistaId,
          nome: nomeProduto,
          categoria,
          preco,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao gerar imagem de catálogo");
      }

      const result = await response.json();
      setCatalogImage(result.imageUrl);
      setSuccess("Imagem de catálogo gerada com sucesso!");
      
      // Atualizar créditos
      await loadCreditInfo();
      
      if (onImageGenerated) {
        onImageGenerated("catalog", result.imageUrl);
      }
    } catch (err: any) {
      console.error("[ProductStudioModal] Erro ao gerar catálogo:", err);
      setError(err.message || "Erro ao gerar imagem de catálogo");
    } finally {
      setGeneratingCatalog(false);
    }
  };

  const handleGenerateCombined = async () => {
    if (!selectedMannequinId || !imagemUrlOriginal) {
      setError("Selecione um manequim e certifique-se de que há uma imagem original.");
      return;
    }

    try {
      setGeneratingCombined(true);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/lojista/products/generate-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produtoId,
          imagemUrl: imagemUrlOriginal,
          mannequinId: selectedMannequinId,
          tipo: "combined",
          lojistaId,
          nome: nomeProduto,
          categoria,
          preco,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao gerar look combinado");
      }

      const result = await response.json();
      setCombinedImage(result.imageUrl);
      setSuccess("Look combinado gerado com sucesso!");
      
      // Atualizar créditos
      await loadCreditInfo();
      
      if (onImageGenerated) {
        onImageGenerated("combined", result.imageUrl);
      }
    } catch (err: any) {
      console.error("[ProductStudioModal] Erro ao gerar look combinado:", err);
      setError(err.message || "Erro ao gerar look combinado");
    } finally {
      setGeneratingCombined(false);
    }
  };

  const handleSetAsCover = async (imageUrl: string) => {
    if (!produtoId) {
      setError("Produto não encontrado. Salve o produto primeiro.");
      return;
    }

    try {
      const response = await fetch(`/api/lojista/products/${produtoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lojistaId,
          imagemUrl: imageUrl,
          imagemUrlCatalogo: imageUrl,
        }),
      });

      if (!response.ok) throw new Error("Erro ao definir como capa");
      
      setSuccess("Imagem definida como capa do produto!");
    } catch (err: any) {
      setError(err.message || "Erro ao definir como capa");
    }
  };

  const handleSendToDisplay = async (imageUrl: string) => {
    if (!produtoId) {
      setError("Produto não encontrado. Salve o produto primeiro.");
      return;
    }

    try {
      const response = await fetch(`/api/lojista/products/${produtoId}/display-asset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lojistaId,
          imagemUrl: imageUrl,
        }),
      });

      if (!response.ok) throw new Error("Erro ao enviar para display");
      
      setSuccess("Imagem enviada para display da loja!");
    } catch (err: any) {
      setError(err.message || "Erro ao enviar para display");
    }
  };

  const handleSetPromotional = async (imageUrl: string) => {
    if (!produtoId) {
      setError("Produto não encontrado. Salve o produto primeiro.");
      return;
    }

    try {
      const response = await fetch(`/api/lojista/products/${produtoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lojistaId,
          imagemUrlCatalogo: imageUrl,
          isPromotional: true,
        }),
      });

      if (!response.ok) throw new Error("Erro ao marcar como promocional");
      
      setSuccess("Produto marcado como promocional!");
    } catch (err: any) {
      setError(err.message || "Erro ao marcar como promocional");
    }
  };

  if (!isOpen) return null;

  const selectedMannequin = MANNEQUIN_STYLES.find(m => m.id === selectedMannequinId);
  const catalogCost = creditInfo.catalogPack > 0 ? 1 : 1; // Priorizar pacote de catálogo
  const combinedCost = creditInfo.catalogPack > 0 ? 2 : 2; // Priorizar pacote de catálogo

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Estúdio de Criação IA
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {nomeProduto}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {loadingCredits ? (
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                    {creditInfo.credits} Créditos
                  </span>
                </div>
                {creditInfo.catalogPack > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Package className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                      {creditInfo.catalogPack} Pack
                    </span>
                  </div>
                )}
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Seleção de Manequim */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Selecione o Manequim:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {MANNEQUIN_STYLES.map((mannequin) => (
                <button
                  key={mannequin.id}
                  onClick={() => setSelectedMannequinId(mannequin.id)}
                  className={`group relative rounded-xl border-2 transition-all overflow-hidden ${
                    selectedMannequinId === mannequin.id
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500 ring-offset-2"
                      : "border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:shadow-lg"
                  }`}
                >
                  {/* Miniatura do Manequim */}
                  <div className="relative aspect-square w-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-start justify-center">
                    <img
                      src={mannequin.thumbnailUrl}
                      alt={mannequin.name}
                      className="w-full h-full object-contain object-top transition-transform group-hover:scale-105"
                      style={{ objectPosition: 'top center' }}
                      onError={(e) => {
                        // Fallback se a imagem não carregar
                        const target = e.target as HTMLImageElement;
                        target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23e5e7eb' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-family='sans-serif' font-size='14'%3EModelo%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    {/* Overlay de seleção */}
                    {selectedMannequinId === mannequin.id && (
                      <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg">
                          <Check className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Informações do Manequim */}
                  <div className="p-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white text-center mb-1">
                      {mannequin.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {mannequin.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            {!selectedMannequinId && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-3 text-center">
                ⚠️ Selecione um manequim para habilitar a geração de imagens
              </p>
            )}
          </div>

          {/* Área de Imagens */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Foto Original */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Foto Original
              </h4>
              <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                {imagemUrlOriginal ? (
                  <img
                    src={imagemUrlOriginal}
                    alt="Foto original"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon className="h-12 w-12" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                <span>Base</span>
              </div>
            </div>

            {/* Foto Catálogo */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Foto Catálogo
              </h4>
              <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                {catalogImage ? (
                  <img
                    src={catalogImage}
                    alt="Foto catálogo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon className="h-12 w-12" />
                  </div>
                )}
              </div>
              <button
                onClick={handleGenerateCatalog}
                disabled={!selectedMannequinId || generatingCatalog}
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
                    <span>Gerar</span>
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Custo: {catalogCost} {creditInfo.catalogPack > 0 ? "Pack" : "Crédito"}
              </p>
              {catalogImage && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => handleSetAsCover(catalogImage)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition"
                  >
                    <Check className="h-3 w-3 inline mr-1" />
                    Capa
                  </button>
                  <button
                    onClick={() => handleSendToDisplay(catalogImage)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
                  >
                    <Monitor className="h-3 w-3 inline mr-1" />
                    Display
                  </button>
                  <button
                    onClick={() => handleSetPromotional(catalogImage)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition"
                  >
                    <Star className="h-3 w-3 inline mr-1" />
                    Promo
                  </button>
                </div>
              )}
            </div>

            {/* Look Combinado */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Look Combinado
              </h4>
              <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                {combinedImage ? (
                  <img
                    src={combinedImage}
                    alt="Look combinado"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon className="h-12 w-12" />
                  </div>
                )}
              </div>
              <button
                onClick={handleGenerateCombined}
                disabled={!selectedMannequinId || generatingCombined}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generatingCombined ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Gerar</span>
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Custo: {combinedCost} {creditInfo.catalogPack > 0 ? "Pack" : "Créditos"}
              </p>
              {combinedImage && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => handleSetAsCover(combinedImage)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition"
                  >
                    <Check className="h-3 w-3 inline mr-1" />
                    Capa
                  </button>
                  <button
                    onClick={() => handleSendToDisplay(combinedImage)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
                  >
                    <Monitor className="h-3 w-3 inline mr-1" />
                    Display
                  </button>
                  <button
                    onClick={() => handleSetPromotional(combinedImage)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition"
                  >
                    <Star className="h-3 w-3 inline mr-1" />
                    Promo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mensagens de Erro/Sucesso */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300">
              {success}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

