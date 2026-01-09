"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Check, Image as ImageIcon, Package, Star, Monitor, Loader2, Upload } from "lucide-react";
import { MANNEQUIN_STYLES, type MannequinStyle } from "@/lib/ai-services/mannequin-prompts";

interface ProductStudioInlineProps {
  produtoId?: string;
  imagemUrlOriginal: string;
  nomeProduto: string;
  categoria: string;
  preco: number;
  lojistaId: string;
  onImageGenerated?: (type: "catalog" | "combined", imageUrl: string) => void;
  onImageUpload?: (file: File) => Promise<void>;
  onImageUrlChange?: (url: string) => void;
  uploadingImage?: boolean;
  isAnalyzing?: boolean;
  onAnalyzeImage?: (imageUrl: string) => Promise<void>;
}

interface CreditInfo {
  credits: number;
  catalogPack: number;
}

export function ProductStudioInline({
  produtoId,
  imagemUrlOriginal,
  nomeProduto,
  categoria,
  preco,
  lojistaId,
  onImageGenerated,
  onImageUpload,
  onImageUrlChange,
  uploadingImage = false,
  isAnalyzing = false,
  onAnalyzeImage,
}: ProductStudioInlineProps) {
  const [selectedMannequinId, setSelectedMannequinId] = useState<string | null>(null);
  const [catalogImage, setCatalogImage] = useState<string | null>(null);
  const [combinedImage, setCombinedImage] = useState<string | null>(null);
  const [generatingCatalog, setGeneratingCatalog] = useState(false);
  const [generatingCombined, setGeneratingCombined] = useState(false);
  const [creditInfo, setCreditInfo] = useState<CreditInfo>({ credits: 0, catalogPack: 0 });
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const lastAnalyzedUrlRef = useRef<string>("");

  // Carregar informações de créditos
  useEffect(() => {
    if (lojistaId) {
      loadCreditInfo();
    }
  }, [lojistaId]);

  // Análise automática quando a imagem for carregada via upload
  useEffect(() => {
    // Só analisar se não estiver fazendo upload e não estiver analisando
    if (imagemUrlOriginal && onAnalyzeImage && !isAnalyzing && !uploadingImage) {
      // Verificar se é uma URL válida (não apenas um placeholder)
      const isValidUrl = imagemUrlOriginal.startsWith("http://") || imagemUrlOriginal.startsWith("https://");
      const isNewUrl = imagemUrlOriginal !== lastAnalyzedUrlRef.current;
      const isNotEmpty = imagemUrlOriginal.trim() !== "";
      
      if (isValidUrl && isNewUrl && isNotEmpty) {
        // Marcar como analisada para evitar análises duplicadas
        lastAnalyzedUrlRef.current = imagemUrlOriginal;
        
        console.log("[ProductStudioInline] 🔍 Nova imagem detectada, agendando análise automática...", {
          url: imagemUrlOriginal.substring(0, 50) + "...",
          isAnalyzing,
          uploadingImage
        });
        
        // Delay para garantir que o upload foi concluído e o estado foi atualizado
        const timer = setTimeout(() => {
          console.log("[ProductStudioInline] 🚀 Executando análise automática agora...");
          onAnalyzeImage(imagemUrlOriginal).catch(err => {
            console.error("[ProductStudioInline] ❌ Erro na análise automática:", err);
            // Resetar referência em caso de erro para permitir nova tentativa
            lastAnalyzedUrlRef.current = "";
          });
        }, 2000); // Delay de 2 segundos para garantir que tudo foi atualizado
        
        return () => clearTimeout(timer);
      }
    }
  }, [imagemUrlOriginal, onAnalyzeImage, isAnalyzing, uploadingImage]);

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
      console.error("[ProductStudioInline] Erro ao carregar créditos:", err);
    } finally {
      setLoadingCredits(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload) return;
    
    try {
      // Fazer upload da imagem
      await onImageUpload(file);
      
      // A análise automática será feita pelo componente pai (manual-product-form.tsx)
      // através do handleImageUpload que já chama analyzeProductImage automaticamente
      // O useEffect também monitora mudanças em imagemUrlOriginal como backup
    } catch (error) {
      console.error("[ProductStudioInline] Erro ao fazer upload:", error);
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
      
      await loadCreditInfo();
      
      if (onImageGenerated) {
        onImageGenerated("catalog", result.imageUrl);
      }
    } catch (err: any) {
      console.error("[ProductStudioInline] Erro ao gerar catálogo:", err);
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
      
      await loadCreditInfo();
      
      if (onImageGenerated) {
        onImageGenerated("combined", result.imageUrl);
      }
    } catch (err: any) {
      console.error("[ProductStudioInline] Erro ao gerar look combinado:", err);
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

  const catalogCost = creditInfo.catalogPack > 0 ? 1 : 1;
  const combinedCost = creditInfo.catalogPack > 0 ? 2 : 2;

  return (
    <div className="neon-card rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            Estúdio de Criação IA
          </h3>
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
        </div>
      </div>

      {/* Área de Imagens - NO TOPO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Foto Original */}
        <div className="space-y-3">
          <h4 className="text-base font-bold uppercase tracking-wider bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
            Foto Original
          </h4>
          <div className="relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            {imagemUrlOriginal ? (
              <img
                src={imagemUrlOriginal}
                alt="Foto original"
                className="w-full h-full object-cover"
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <ImageIcon className="h-12 w-12" />
              </div>
            )}
          </div>
          {/* Botão Selecionar Imagem - Verde Degradê */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploadingImage}
            className="w-full px-4 py-2 bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 hover:from-green-500 hover:via-emerald-500 hover:to-green-500 text-white font-semibold rounded-lg transition shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-green-600 disabled:hover:via-emerald-600 disabled:hover:to-green-600 flex items-center justify-center gap-2"
          >
            <Upload className="h-4 w-4" style={{ color: '#FFFFFF', stroke: '#FFFFFF', fill: 'none' }} />
            <span>{uploadingImage ? "Enviando..." : "Selecionar Imagem"}</span>
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          {/* Campo URL */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Ou adicione por URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={imagemUrlOriginal}
                onChange={(e) => {
                  if (onImageUrlChange) {
                    onImageUrlChange(e.target.value);
                  }
                }}
                onBlur={(e) => {
                  const url = e.target.value.trim();
                  if (url && (url.startsWith("http://") || url.startsWith("https://")) && onAnalyzeImage) {
                    onAnalyzeImage(url);
                  }
                }}
                placeholder="https://exemplo.com/imagem.jpg"
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-green-500 dark:focus:border-green-400 focus:outline-none"
              />
              {imagemUrlOriginal && !isAnalyzing && onAnalyzeImage && (
                <button
                  type="button"
                  onClick={() => onAnalyzeImage(imagemUrlOriginal)}
                  className="shimmer-effect inline-flex items-center gap-1 rounded-lg border-2 border-indigo-300 dark:border-indigo-500 px-3 py-2 text-xs font-bold shadow-md shadow-indigo-500/20 transition relative overflow-hidden group"
                  title="Analisar com IA"
                  style={{
                    background: 'linear-gradient(90deg, #ec4899 0%, #a855f7 25%, #6366f1 50%, #a855f7 75%, #ec4899 100%)',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/10 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity z-0"></div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 relative z-10">
                    <path
                      d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z"
                      fill="#FFFFFF"
                    />
                    <path
                      d="M19 15L19.5 17.5L22 18L19.5 18.5L19 21L18.5 18.5L16 18L18.5 17.5L19 15Z"
                      fill="#FFFFFF"
                    />
                    <path
                      d="M5 15L5.5 17.5L8 18L5.5 18.5L5 21L4.5 18.5L2 18L4.5 17.5L5 15Z"
                      fill="#FFFFFF"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {isAnalyzing && (
            <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>✨ IA analisando...</span>
            </div>
          )}
        </div>

        {/* Foto Catálogo */}
        <div className="space-y-3">
          <h4 className="text-base font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-600 bg-clip-text text-transparent">
            Foto Catálogo
          </h4>
          <div className="relative aspect-[2/3] rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            {catalogImage ? (
              <img
                src={catalogImage}
                alt="Foto catálogo"
                className="w-full h-full object-cover"
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <ImageIcon className="h-12 w-12" />
              </div>
            )}
          </div>
          <button
            onClick={handleGenerateCatalog}
            disabled={!selectedMannequinId || generatingCatalog || !imagemUrlOriginal}
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
          <h4 className="text-base font-bold uppercase tracking-wider bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 bg-clip-text text-transparent">
            Look Combinado
          </h4>
          <div className="relative aspect-[2/3] rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            {combinedImage ? (
              <img
                src={combinedImage}
                alt="Look combinado"
                className="w-full h-full object-cover"
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <ImageIcon className="h-12 w-12" />
              </div>
            )}
          </div>
          <button
            onClick={handleGenerateCombined}
            disabled={!selectedMannequinId || generatingCombined || !imagemUrlOriginal}
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

      {/* Seleção de Manequim - ABAIXO DAS CAIXAS */}
      <div className="mb-6">
        <h4 className="text-base font-bold mb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          Selecione o Manequim:
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {MANNEQUIN_STYLES.map((mannequin) => (
            <button
              key={mannequin.id}
              onClick={() => setSelectedMannequinId(mannequin.id)}
              className={`group relative rounded-xl border-2 transition-all overflow-hidden flex flex-col ${
                selectedMannequinId === mannequin.id
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500 ring-offset-2"
                  : "border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:shadow-lg"
              }`}
            >
              {/* Miniatura do Manequim - Formato 2:3 (Look Completo) */}
              <div className="relative w-full bg-gray-100 dark:bg-gray-800 overflow-hidden" style={{ aspectRatio: '2/3' }}>
                <img
                  src={mannequin.thumbnailUrl}
                  alt={mannequin.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  style={{ 
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block'
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23e5e7eb' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-family='sans-serif' font-size='14'%3EModelo%3C/text%3E%3C/svg%3E";
                  }}
                />
                {/* Overlay de seleção */}
                {selectedMannequinId === mannequin.id && (
                  <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg">
                      <Check className="h-6 w-6 text-white" />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Informações do Manequim - Abaixo da imagem, pode ultrapassar 9:16 */}
              <div className="p-3 flex-shrink-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white text-center mb-1">
                  {mannequin.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
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

      {/* Mensagens de Erro/Sucesso */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300">
          {success}
        </div>
      )}
    </div>
  );
}

