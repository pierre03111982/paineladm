"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, Sparkles, RotateCcw, Save, Loader2, Package, X, Plus, Edit, ArrowLeft, Image as ImageIcon, AlertCircle } from "lucide-react";
import { MANNEQUIN_STYLES } from "@/lib/ai-services/mannequin-prompts";
import { ManualCombinationModal } from "./ManualCombinationModal";
import { IconPageHeader } from "@/app/(lojista)/components/icon-page-header";
import { getPageHeaderColors } from "@/app/(lojista)/components/page-header-colors";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { normalizeCategory, getConsolidatedCategories } from "@/lib/categories/consolidated-categories";

// Estado consolidado do produto
export interface ProductEditorState {
  // Imagens
  rawImageUrl: string;
  rawImageFile: File | null;
  generatedCatalogImage: string | null;
  generatedCombinedImage: string | null;
  selectedCoverImage: string | null;
  
  // Análise IA
  aiAnalysisData: {
    nome_sugerido?: string;
    descricao_seo?: string;
    tags?: string[]; // Mantido apenas internamente (não exibido na UI)
    suggested_category?: string;
    categoria_sugerida?: string; // Compatibilidade
    product_type?: string;
    detected_fabric?: string;
    dominant_colors?: Array<{ hex: string; name: string }>;
    cor_predominante?: string; // Compatibilidade
    tecido_estimado?: string; // Compatibilidade
    detalhes?: string[]; // Compatibilidade
  } | null;
  
  // Estúdio
  selectedMannequinId: string | null;
  combinationMode: 'auto' | 'manual' | null;
  manualCombinationItems: string[];
  
  // Dados Operacionais
  manualData: {
    preco: string;
    precoPromocional: string;
    estoque: string;
    sku: string;
    tamanhos: string[];
    cores: string[];
    ativo: boolean;
    destaquePromocional: boolean;
  };
}

interface ProductEditorLayoutProps {
  lojistaId: string;
  produtoId?: string; // Para edição
  initialData?: Partial<ProductEditorState>;
  produtoNome?: string; // Para edição, mostrar no título
}

// Lista de categorias disponíveis (usando categorias consolidadas)
const AVAILABLE_CATEGORIES = getConsolidatedCategories();

// Função para mapear categoria sugerida pela IA para a lista de categorias consolidadas
function mapCategoryToAvailable(suggestedCategory: string | undefined): string {
  // Usa o sistema de normalização consolidado
  return normalizeCategory(suggestedCategory);
}

export function ProductEditorLayout({ 
  lojistaId, 
  produtoId, 
  initialData,
  produtoNome 
}: ProductEditorLayoutProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Estado principal
  const [state, setState] = useState<ProductEditorState>({
    rawImageUrl: initialData?.rawImageUrl || "",
    rawImageFile: initialData?.rawImageFile || null,
    generatedCatalogImage: initialData?.generatedCatalogImage || null,
    generatedCombinedImage: initialData?.generatedCombinedImage || null,
    selectedCoverImage: initialData?.selectedCoverImage || null,
    aiAnalysisData: initialData?.aiAnalysisData || null,
    selectedMannequinId: initialData?.selectedMannequinId || MANNEQUIN_STYLES[0]?.id || null,
    combinationMode: initialData?.combinationMode || null,
    manualCombinationItems: initialData?.manualCombinationItems || [],
    manualData: initialData?.manualData || {
      preco: "",
      precoPromocional: "",
      estoque: "",
      sku: "",
      tamanhos: [],
      cores: [],
      ativo: true,
      destaquePromocional: false,
    },
  });

  // Estados de UI
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingCatalog, setGeneratingCatalog] = useState(false);
  const [generatingCombined, setGeneratingCombined] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [creditInfo, setCreditInfo] = useState({ credits: 0, catalogPack: 0 });

  // Carregar créditos
  useEffect(() => {
    loadCreditInfo();
  }, [lojistaId]);

  // Referência para rastrear a última URL analisada
  const lastAnalyzedUrlRef = useRef<string>("");

  // === HANDLER DE ANÁLISE IA ===
  const analyzeImage = async (imageUrl: string) => {
    if (!imageUrl) {
      console.error("[ProductEditor] ❌ imageUrl está vazio ou undefined");
      return;
    }

    // Validar que é uma URL válida
    if (typeof imageUrl !== "string" || (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://"))) {
      console.error("[ProductEditor] ❌ imageUrl inválido:", imageUrl);
      alert("URL da imagem inválida. Por favor, faça upload de uma nova imagem.");
      return;
    }

    try {
      setAnalyzing(true);
      console.log("[ProductEditor] 🔍 Iniciando análise com imageUrl:", imageUrl.substring(0, 100) + "...");
      console.log("[ProductEditor] 🔍 lojistaId:", lojistaId);
      
      const requestBody = { imageUrl: imageUrl };
      console.log("[ProductEditor] 📤 Enviando requisição:", {
        url: `/api/lojista/products/analyze?lojistaId=${lojistaId}`,
        body: requestBody,
      });
      
      const response = await fetch(
        `/api/lojista/products/analyze?lojistaId=${lojistaId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || "Erro ao analisar imagem";
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      // A API retorna { success: true, data: {...} }, então extraímos o data
      const analysisData = responseData.data || responseData;
      
      // Verificar se há erro na resposta mesmo com status 200
      if (responseData.error) {
        throw new Error(responseData.error);
      }
      
      // Debug: Log dos dados recebidos
      console.log("[ProductEditor] 📊 Dados recebidos da análise (RAW):", analysisData);
      console.log("[ProductEditor] 📊 Campos específicos:", {
        product_type: analysisData.product_type,
        detected_fabric: analysisData.detected_fabric,
        tecido_estimado: analysisData.tecido_estimado,
        dominant_colors: analysisData.dominant_colors,
        cor_predominante: analysisData.cor_predominante,
        hasProductType: !!analysisData.product_type,
        hasDetectedFabric: !!analysisData.detected_fabric,
        hasDominantColors: !!analysisData.dominant_colors && Array.isArray(analysisData.dominant_colors),
      });
      
      // Mapear categoria sugerida para a lista de categorias disponíveis
      const rawCategory = analysisData.suggested_category || analysisData.categoria_sugerida;
      const mappedCategory = mapCategoryToAvailable(rawCategory);
      
      // Processar cores: se não vier dominant_colors, tentar criar a partir de cor_predominante
      let processedColors = analysisData.dominant_colors || [];
      if (processedColors.length === 0 && analysisData.cor_predominante) {
        // Se não houver dominant_colors mas houver cor_predominante, criar um array
        processedColors = [{
          hex: "#808080", // Cor padrão cinza se não houver hex
          name: analysisData.cor_predominante
        }];
      }
      
      // Limpar data da descrição SEO se existir
      let descricaoSEOLimpa = (analysisData.descricao_seo || "").toString();
      descricaoSEOLimpa = descricaoSEOLimpa
        .replace(/\[Análise IA[^\]]*\]\s*/g, "") // Remove [Análise IA - data]
        .trim();
      
      // A IA agora está configurada para gerar textos COMPLETOS dentro de 470 caracteres
      // Se exceder 500 (caso raro), apenas limitar sem adicionar "..."
      if (descricaoSEOLimpa.length > 500) {
        console.warn("[ProductEditor] ⚠️ Descrição excedeu 500 caracteres, limitando...");
        descricaoSEOLimpa = descricaoSEOLimpa.slice(0, 500).trim();
      }
      
      const newAiAnalysisData = {
        nome_sugerido: analysisData.nome_sugerido || "",
        descricao_seo: descricaoSEOLimpa,
        tags: analysisData.tags || [], // Mantido apenas internamente
        suggested_category: mappedCategory,
        categoria_sugerida: mappedCategory, // Compatibilidade
        product_type: analysisData.product_type || "",
        detected_fabric: analysisData.detected_fabric || analysisData.tecido_estimado || "",
        dominant_colors: processedColors,
        cor_predominante: analysisData.cor_predominante || "", // Compatibilidade
        tecido_estimado: analysisData.detected_fabric || analysisData.tecido_estimado || "", // Compatibilidade
        detalhes: analysisData.detalhes || [], // Compatibilidade
      };
      
      console.log("[ProductEditor] ✅ Salvando no estado:", {
        product_type: newAiAnalysisData.product_type,
        detected_fabric: newAiAnalysisData.detected_fabric,
        dominant_colors: newAiAnalysisData.dominant_colors,
        dominant_colors_length: newAiAnalysisData.dominant_colors?.length || 0,
        fullData: newAiAnalysisData
      });
      
      setState(prev => ({
        ...prev,
        aiAnalysisData: newAiAnalysisData,
      }));
      
      // Log após atualização (usando setTimeout para garantir que o estado foi atualizado)
      setTimeout(() => {
        console.log("[ProductEditor] ✅ Estado após atualização:", {
          product_type: newAiAnalysisData.product_type,
          detected_fabric: newAiAnalysisData.detected_fabric,
          dominant_colors: newAiAnalysisData.dominant_colors,
        });
      }, 100);
    } catch (error: any) {
      console.error("[ProductEditor] Erro na análise:", error);
      alert(`Erro ao analisar imagem: ${error.message}`);
      // Resetar referência em caso de erro para permitir nova tentativa
      lastAnalyzedUrlRef.current = "";
    } finally {
      setAnalyzing(false);
    }
  };

  // Análise automática quando a imagem for carregada
  useEffect(() => {
    if (state.rawImageUrl && !state.aiAnalysisData && !analyzing) {
      // Verificar se é uma URL válida e diferente da última analisada
      if (
        (state.rawImageUrl.startsWith("http://") || state.rawImageUrl.startsWith("https://")) &&
        state.rawImageUrl !== lastAnalyzedUrlRef.current
      ) {
        // Marcar como analisada para evitar análises duplicadas
        lastAnalyzedUrlRef.current = state.rawImageUrl;
        
        // Pequeno delay para garantir que o upload foi concluído
        const timer = setTimeout(() => {
          console.log("[ProductEditor] 🔍 Iniciando análise automática da imagem:", state.rawImageUrl);
          analyzeImage(state.rawImageUrl).catch(err => {
            console.error("[ProductEditor] Erro na análise automática:", err);
            // Resetar referência em caso de erro para permitir nova tentativa
            lastAnalyzedUrlRef.current = "";
          });
        }, 1500); // Delay de 1.5 segundos para garantir que o upload foi concluído
        
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.rawImageUrl, state.aiAnalysisData, analyzing]);

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
      console.error("[ProductEditor] Erro ao carregar créditos:", error);
    }
  };

  // === HANDLERS DE UPLOAD ===
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

      const data = await response.json();
      
      // Resetar referência para permitir nova análise
      lastAnalyzedUrlRef.current = "";
      
      setState(prev => ({
        ...prev,
        rawImageUrl: data.imageUrl,
        rawImageFile: file,
        selectedCoverImage: data.imageUrl, // Definir como capa inicial
        aiAnalysisData: null, // Resetar análise para nova análise
      }));
    } catch (error: any) {
      console.error("[ProductEditor] Erro no upload:", error);
      alert(`Erro ao fazer upload: ${error.message}`);
    } finally {
      setUploading(false);
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

  // === HANDLERS DE GERAÇÃO DE IMAGENS ===
  const handleGenerateCatalog = async () => {
    if (!state.rawImageUrl || !state.selectedMannequinId) {
      alert("Por favor, faça upload de uma imagem e selecione um manequim.");
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
            mannequinId: state.selectedMannequinId,
            tipo: "catalog",
            imagemUrl: state.rawImageUrl,
            nome: state.aiAnalysisData?.nome_sugerido || "Produto",
            categoria: state.aiAnalysisData?.suggested_category || state.aiAnalysisData?.categoria_sugerida || "Roupas",
            preco: parseFloat(state.manualData.preco.replace(",", ".")) || 0,
            precoPromocional: state.manualData.precoPromocional 
              ? parseFloat(state.manualData.precoPromocional.replace(",", ".")) 
              : null,
            produtoId: produtoId,
            lojistaId: lojistaId,
            tags: state.aiAnalysisData?.tags || [],
            detalhes: state.aiAnalysisData?.detalhes || [],
            cor_predominante: state.aiAnalysisData?.cor_predominante,
            tecido_estimado: state.aiAnalysisData?.tecido_estimado,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao gerar catálogo");
      }

      const data = await response.json();
      
      // Atualizar imagem gerada e definir como capa
      setState(prev => ({
        ...prev,
        generatedCatalogImage: data.imageUrl,
        selectedCoverImage: data.imageUrl, // Auto-selecionar como capa
      }));

      // Atualizar créditos
      loadCreditInfo();
    } catch (error: any) {
      console.error("[ProductEditor] Erro ao gerar catálogo:", error);
      alert(`Erro ao gerar catálogo: ${error.message}`);
    } finally {
      setGeneratingCatalog(false);
    }
  };

  // === HANDLER LOOK COMBINADO AUTOMÁTICO ===
  const handleGenerateCombinedAuto = async () => {
    if (!state.rawImageUrl || !state.selectedMannequinId) {
      alert("Por favor, faça upload de uma imagem e selecione um manequim.");
      return;
    }

    if (!state.aiAnalysisData) {
      alert("Por favor, aguarde a análise IA antes de gerar o look combinado.");
      return;
    }

    try {
      setGeneratingCombined(true);
      console.log(`[ProductEditor] 🎨 Gerando look combinado automático (IA decide quantidade)...`);

      // 1. Buscar produtos do estoque
      const productsResponse = await fetch(`/api/lojista/products?lojistaId=${lojistaId}`);
      if (!productsResponse.ok) {
        throw new Error("Erro ao buscar produtos do estoque");
      }
      
      const products = await productsResponse.json();
      
      // Filtrar: apenas produtos ativos, com imagem, e diferentes do atual
      const availableProducts = products.filter((p: any) => 
        p.ativo && 
        p.imagemPrincipal && 
        p.id !== produtoId
      );

      if (availableProducts.length === 0) {
        alert("Nenhum produto disponível no estoque para combinação. Adicione mais produtos primeiro.");
        setGeneratingCombined(false);
        return;
      }

      // 2. Usar IA para selecionar produtos que combinam (IA decide quantos)
      const selectionResponse = await fetch(`/api/lojista/products/select-combination`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lojistaId,
          currentProduct: {
            nome: state.aiAnalysisData.nome_sugerido || "Produto",
            categoria: state.aiAnalysisData.suggested_category || state.aiAnalysisData.categoria_sugerida || "Roupas",
            tipo: state.aiAnalysisData.product_type || "",
            cores: state.aiAnalysisData.dominant_colors || [],
            tecido: state.aiAnalysisData.detected_fabric || "",
            tags: state.aiAnalysisData.tags || [],
            imagemUrl: state.rawImageUrl, // Adicionar URL da imagem
          },
          availableProducts: availableProducts.map((p: any) => ({
            id: p.id,
            nome: p.nome,
            categoria: p.categoria,
            preco: p.preco,
            tags: p.tags || [],
            imagemPrincipal: p.imagemPrincipal || p.imagemUrl, // Incluir imagem
            analiseIA: p.analiseIA || {}, // Incluir análise IA se disponível
          })),
          autoDecide: true, // Flag para IA decidir quantos produtos
        }),
      });

      if (!selectionResponse.ok) {
        throw new Error("Erro ao selecionar produtos para combinação");
      }

      const { selectedProductIds } = await selectionResponse.json();

      if (!selectedProductIds || selectedProductIds.length === 0) {
        alert("A IA não conseguiu encontrar produtos compatíveis no estoque.");
        setGeneratingCombined(false);
        return;
      }

      console.log(`[ProductEditor] ✅ IA selecionou ${selectedProductIds.length} produto(s):`, selectedProductIds);

      // 3. Gerar a imagem do look combinado
      setState(prev => ({
        ...prev,
        combinationMode: "auto",
        manualCombinationItems: selectedProductIds,
      }));

      const response = await fetch(
        `/api/lojista/products/generate-studio?lojistaId=${lojistaId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mannequinId: state.selectedMannequinId,
            tipo: "combined",
            imagemUrl: state.rawImageUrl,
            nome: state.aiAnalysisData?.nome_sugerido || "Produto",
            categoria: state.aiAnalysisData?.suggested_category || state.aiAnalysisData?.categoria_sugerida || "Roupas",
            preco: parseFloat(state.manualData.preco.replace(",", ".")) || 0,
            produtoId: produtoId,
            lojistaId: lojistaId,
            productIds: selectedProductIds, // IDs dos produtos selecionados pela IA
            tags: state.aiAnalysisData?.tags || [],
            detalhes: state.aiAnalysisData?.detalhes || [],
            cor_predominante: state.aiAnalysisData?.cor_predominante,
            tecido_estimado: state.aiAnalysisData?.tecido_estimado,
            autoMode: true, // Flag para indicar modo automático
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao gerar look combinado");
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        generatedCombinedImage: data.imageUrl,
        selectedCoverImage: data.imageUrl,
        combinationMode: 'auto',
      }));

      loadCreditInfo();
      console.log(`[ProductEditor] ✅ Look combinado gerado com ${selectedProductIds.length} produto(s) complementar(es)`);
    } catch (error: any) {
      console.error("[ProductEditor] Erro ao gerar combinado automático:", error);
      alert(`Erro ao gerar look combinado: ${error.message}`);
    } finally {
      setGeneratingCombined(false);
    }
  };

  const handleGenerateCombinedManual = async (productIds: string[]) => {
    if (!state.rawImageUrl || !state.selectedMannequinId) {
      alert("Por favor, faça upload de uma imagem e selecione um manequim.");
      return;
    }

    try {
      setGeneratingCombined(true);
      setState(prev => ({
        ...prev,
        combinationMode: "manual",
        manualCombinationItems: productIds,
      }));

      const response = await fetch(
        `/api/lojista/products/generate-studio?lojistaId=${lojistaId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mannequinId: state.selectedMannequinId,
            tipo: "combined",
            imagemUrl: state.rawImageUrl,
            nome: state.aiAnalysisData?.nome_sugerido || "Produto",
            categoria: state.aiAnalysisData?.suggested_category || state.aiAnalysisData?.categoria_sugerida || "Roupas",
            preco: parseFloat(state.manualData.preco.replace(",", ".")) || 0,
            produtoId: produtoId,
            lojistaId: lojistaId,
            productIds: productIds, // IDs dos produtos selecionados manualmente
            tags: state.aiAnalysisData?.tags || [],
            detalhes: state.aiAnalysisData?.detalhes || [],
            cor_predominante: state.aiAnalysisData?.cor_predominante,
            tecido_estimado: state.aiAnalysisData?.tecido_estimado,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao gerar look combinado");
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        generatedCombinedImage: data.imageUrl,
        selectedCoverImage: data.imageUrl,
        combinationMode: 'manual',
      }));

      setShowManualModal(false);
      loadCreditInfo();
    } catch (error: any) {
      console.error("[ProductEditor] Erro ao gerar combinado:", error);
      alert(`Erro ao gerar look combinado: ${error.message}`);
    } finally {
      setGeneratingCombined(false);
    }
  };

  // === HANDLER DE SALVAMENTO ===
  const handleSave = async () => {
    // Validações
    if (!state.rawImageUrl) {
      alert("Por favor, faça upload de uma imagem.");
      return;
    }

    if (!state.aiAnalysisData?.nome_sugerido) {
      alert("Por favor, aguarde a análise da IA ou preencha o nome do produto.");
      return;
    }

    if (!state.manualData.preco) {
      alert("Por favor, preencha o preço do produto.");
      return;
    }

    try {
      setSaving(true);
      
      const payload = {
        nome: state.aiAnalysisData.nome_sugerido,
        categoria: state.aiAnalysisData?.suggested_category || state.aiAnalysisData?.categoria_sugerida || "Roupas",
        preco: parseFloat(state.manualData.preco.replace(",", ".")) || 0,
        precoPromocional: state.manualData.precoPromocional 
          ? parseFloat(state.manualData.precoPromocional.replace(",", ".")) 
          : null,
        imagemUrl: state.selectedCoverImage || state.rawImageUrl,
        imagemUrlOriginal: state.rawImageUrl,
        imagemUrlCatalogo: state.generatedCatalogImage || null,
        imagemUrlCombinada: state.generatedCombinedImage || null,
        tamanhos: state.manualData.tamanhos,
        cores: state.manualData.cores,
        estoque: state.manualData.estoque ? parseInt(state.manualData.estoque) : 0,
        tags: state.aiAnalysisData.tags || [],
        obs: (state.aiAnalysisData.descricao_seo || "").replace(/\[Análise IA[^\]]*\]\s*/g, "").trim() || "",
        sku: state.manualData.sku || "",
        ativo: state.manualData.ativo,
        destaquePromocional: state.manualData.destaquePromocional,
        lojistaId: lojistaId,
        // Campos individuais da análise IA (compatibilidade)
        product_type: state.aiAnalysisData?.product_type || null,
        detected_fabric: state.aiAnalysisData?.detected_fabric || state.aiAnalysisData?.tecido_estimado || null,
        dominant_colors: state.aiAnalysisData?.dominant_colors || null,
        // Objeto completo analiseIA
        analiseIA: {
          nome_sugerido: state.aiAnalysisData?.nome_sugerido,
          descricao_seo: state.aiAnalysisData?.descricao_seo,
          suggested_category: state.aiAnalysisData?.suggested_category || state.aiAnalysisData?.categoria_sugerida,
          categoria_sugerida: state.aiAnalysisData?.categoria_sugerida || state.aiAnalysisData?.suggested_category,
          product_type: state.aiAnalysisData?.product_type,
          detected_fabric: state.aiAnalysisData?.detected_fabric || state.aiAnalysisData?.tecido_estimado,
          tecido_estimado: state.aiAnalysisData?.tecido_estimado || state.aiAnalysisData?.detected_fabric,
          dominant_colors: state.aiAnalysisData?.dominant_colors || [],
          cor_predominante: state.aiAnalysisData?.cor_predominante,
          detalhes: state.aiAnalysisData?.detalhes || [],
          tags: state.aiAnalysisData?.tags || [],
          ultimaAtualizacao: new Date().toISOString(),
        },
      };

      const url = produtoId
        ? `/api/lojista/products/${produtoId}?lojistaId=${lojistaId}`
        : `/api/lojista/products?lojistaId=${lojistaId}`;

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

      // Redirecionar para a lista de produtos
      router.push(`/produtos?lojistaId=${lojistaId}`);
    } catch (error: any) {
      console.error("[ProductEditor] Erro ao salvar:", error);
      alert(`Erro ao salvar produto: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // === OBTER IMAGENS DISPONÍVEIS ===
  const getAvailableImages = () => {
    const images = [];
    if (state.rawImageUrl) {
      images.push({ type: "original", url: state.rawImageUrl, label: "Original" });
    }
    if (state.generatedCatalogImage) {
      images.push({ type: "catalog", url: state.generatedCatalogImage, label: "Catálogo (Manequim)" });
    }
    if (state.generatedCombinedImage) {
      images.push({ type: "combined", url: state.generatedCombinedImage, label: "Combinado (Look)" });
    }
    return images;
  };

  const availableImages = getAvailableImages();

  const colors = getPageHeaderColors('/produtos');

  const handleGoBack = () => {
    const lojistaIdFromUrl = new URLSearchParams(window.location.search).get("lojistaId") || 
                             new URLSearchParams(window.location.search).get("lojistald");
    if (lojistaIdFromUrl) {
      router.push(`/produtos?lojistaId=${lojistaIdFromUrl}`);
    } else {
      router.push("/produtos");
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 -mt-8 pt-8">
      {/* === CABEÇALHO === */}
      <div className="w-full">
        <IconPageHeader
        icon={produtoId ? Edit : Plus}
        title={produtoId ? "Editar Produto" : "Adicionar Produto"}
        description={produtoId ? `Editando: ${produtoNome || "Produto"}` : "Adicione um novo produto com análise automática de IA."}
        gradientFrom={colors.from}
        gradientTo={colors.to}
        shadowColor={colors.shadow}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 text-sm font-semibold transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:via-blue-500 hover:to-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: '#FFFFFF' }}
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                  <span style={{ color: '#FFFFFF' }}>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                  <span style={{ color: '#FFFFFF' }}>Salvar Produto</span>
                </>
              )}
            </button>
          </div>
        }
        />
      </div>

      {/* === CONTÊINER DAS DUAS COLUNAS === */}
      <div className="w-full flex flex-col lg:flex-row gap-4 items-stretch">
        {/* === COLUNA ESQUERDA: O Estúdio Visual === */}
        <div className="w-full lg:w-[40%] space-y-6 lg:h-auto">
            {/* Bloco 1: Estúdio Criativo IA - 3 Caixas Lado a Lado */}
            <AnimatedCard className="p-0 overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
              {/* Cabeçalho Verde/Esmeralda */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 flex items-center justify-between min-h-[72px]">
                <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                  <Sparkles className="w-5 h-5 text-white" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                  <span style={{ color: '#FFFFFF' }}>Estúdio Criativo IA</span>
                </h2>
                <span className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg border border-white/30">
                  <Package className="w-5 h-5" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                  <span className="font-bold text-base" style={{ color: '#FFFFFF' }}>
                    {creditInfo.catalogPack > 0 ? `${creditInfo.catalogPack} Pack` : `${creditInfo.credits + 200} Créditos`}
                  </span>
                </span>
              </div>
              
              {/* Corpo Branco */}
              <div className="p-6 space-y-6 bg-white">
              
              {/* Seletor de Manequim - Movido para CIMA das 3 caixas */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 text-center">
                  Selecione o Manequim
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {MANNEQUIN_STYLES.map((mannequin) => (
                    <button
                      key={mannequin.id}
                      onClick={() => setState(prev => ({ ...prev, selectedMannequinId: mannequin.id }))}
                      className={`w-full rounded-lg overflow-hidden border-3 transition-all ${
                        state.selectedMannequinId === mannequin.id
                          ? "border-purple-600 ring-4 ring-purple-300"
                          : "border-slate-300 dark:border-slate-600 hover:border-purple-400"
                      }`}
                    >
                      <img
                        src={mannequin.thumbnailUrl}
                        alt={mannequin.name}
                        className="w-full h-auto object-contain"
                        style={{ display: 'block' }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid de 3 Colunas Fixo */}
              <div className="grid grid-cols-3 gap-4">
                {/* COLUNA 1: Imagem Original */}
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center">
                    Imagem Original
                  </p>
                  {state.rawImageUrl ? (
                    <div className="relative w-full rounded-lg overflow-hidden border-2 border-slate-300 dark:border-slate-600">
                      <img
                        src={state.rawImageUrl}
                        alt="Original"
                        className="w-full h-auto object-contain"
                        style={{ display: 'block', maxHeight: '300px' }}
                      />
                    </div>
                  ) : (
                    <div
                      ref={dropzoneRef}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-full aspect-[3/4] border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                          <p className="text-xs text-slate-600 dark:text-slate-400">Fazendo upload...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-2" />
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium text-center px-2">
                            Clique ou arraste
                          </p>
                        </>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-2 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg shadow-md hover:shadow-lg transition-all mb-3"
                  >
                    <Upload className="w-3 h-3 inline mr-1" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                    <span style={{ color: '#FFFFFF' }}>Trocar Foto</span>
                  </button>
                </div>

                {/* COLUNA 2: Foto Catálogo */}
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center">
                    Foto Catálogo
                  </p>
                  {state.generatedCatalogImage ? (
                    <div className="relative w-full rounded-lg overflow-hidden border-2 border-purple-500">
                      <img
                        src={state.generatedCatalogImage}
                        alt="Catálogo"
                        className="w-full h-auto object-contain"
                        style={{ display: 'block', maxHeight: '300px' }}
                      />
                    </div>
                  ) : (
                    <div className="relative w-full aspect-[3/4] border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800">
                      <ImageIcon className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-2" />
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center px-2">
                        Nenhuma imagem gerada
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handleGenerateCatalog}
                    disabled={generatingCatalog || !state.rawImageUrl || !state.selectedMannequinId}
                    className="w-full px-2 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                  >
                    {generatingCatalog ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin inline mr-1" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                        <span style={{ color: '#FFFFFF' }}>Gerando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 inline mr-1" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                        <span style={{ color: '#FFFFFF' }}>GERAR IA</span>
                      </>
                    )}
                  </button>
                </div>

                {/* COLUNA 3: Look Combinado */}
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center">
                    Look Combinado
                  </p>
                  {state.generatedCombinedImage ? (
                    <div className="relative w-full rounded-lg overflow-hidden border-2 border-pink-500">
                      <img
                        src={state.generatedCombinedImage}
                        alt="Look Combinado"
                        className="w-full h-auto object-contain"
                        style={{ display: 'block', maxHeight: '300px' }}
                      />
                    </div>
                  ) : (
                    <div className="relative w-full aspect-[3/4] border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800">
                      <ImageIcon className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-2" />
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center px-2">
                        Nenhuma imagem gerada
                      </p>
                    </div>
                  )}

                  {/* Botão Gerar Automático */}
                  <button
                    onClick={handleGenerateCombinedAuto}
                    disabled={!state.rawImageUrl || !state.selectedMannequinId || !state.aiAnalysisData || generatingCombined}
                    className="w-full px-2 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                  >
                    {generatingCombined ? (
                      <>
                        <Loader2 className="w-3 h-3 inline mr-1 animate-spin" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                        <span style={{ color: '#FFFFFF' }}>Gerando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 inline mr-1" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                        <span style={{ color: '#FFFFFF' }}>GERAR IA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Input File Hidden */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />

              {/* MANTIDO: Código antigo comentado por enquanto */}
              {false && state.selectedCoverImage ? (
                <div className="space-y-4">
                  {/* Imagem de Capa (Grande) - Tamanho natural sem cortes */}
                  <div className="relative w-full rounded-lg overflow-hidden">
                    <img
                      src={state.selectedCoverImage}
                      alt="Capa do produto"
                      className="w-full h-auto object-contain"
                      style={{ display: 'block' }}
                    />
                  </div>

                  {/* Galeria de Miniaturas */}
                  {availableImages.length > 1 && (
                    <div className="grid grid-cols-3 gap-2 items-stretch">
                      {availableImages.map((img, idx) => {
                        // Determinar aspect ratio baseado no tipo de imagem
                        const isLookCompleto = img.type === "catalog" || img.type === "combined";
                        const aspectRatio = isLookCompleto ? "aspect-[2/3]" : "aspect-[3/4]";
                        
                        return (
                          <button
                            key={idx}
                            onClick={() => setState(prev => ({ ...prev, selectedCoverImage: img.url }))}
                            className={`${aspectRatio} rounded-lg overflow-hidden border-2 transition-all ${
                              state.selectedCoverImage === img.url
                                ? "border-blue-500 ring-2 ring-blue-200"
                                : "border-slate-200 dark:border-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <img
                              src={img.url}
                              alt={img.label}
                              className="w-full h-full object-cover"
                              style={{ width: '100%', height: '100%' }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Labels das Miniaturas */}
                  {availableImages.length > 1 && (
                    <div className="flex gap-2 text-xs text-slate-600 dark:text-slate-400">
                      {availableImages.map((img, idx) => (
                        <span
                          key={idx}
                          className={`flex-shrink-0 w-20 text-center ${
                            state.selectedCoverImage === img.url ? "font-semibold text-blue-600" : ""
                          }`}
                        >
                          {img.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Botão Substituir Imagem */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg shadow-md hover:shadow-lg transition-all border-2 border-blue-500"
                  >
                    <Upload className="w-3.5 h-3.5 inline mr-1.5" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                    <span style={{ color: '#FFFFFF' }}>Trocar Foto</span>
                  </button>
                </div>
              ) : (
                /* Dropzone (Estado Inicial) */
                <div
                  ref={dropzoneRef}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-full aspect-[3/4] border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-2" />
                      <p className="text-slate-600 dark:text-slate-400">Fazendo upload...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-2" />
                      <p className="text-slate-600 dark:text-slate-400 font-medium">
                        Upload your produto
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                        Clique ou arraste uma imagem aqui
                      </p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                    className="hidden"
                  />
                </div>
              )}
              </div>
            </AnimatedCard>
        </div>

        {/* === COLUNA DIREITA: O Hub de Dados === */}
        <div className="w-full lg:flex-1 flex flex-col lg:h-auto">
            {/* Bloco 3: Inteligência Artificial (Sugestões) */}
            <AnimatedCard className="p-0 overflow-hidden bg-white dark:bg-slate-800 shadow-sm mb-6 flex-shrink-0">
              {/* Cabeçalho Roxo Sólido */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-6 py-4 flex items-center justify-between min-h-[72px]">
                <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                  <Sparkles className="w-5 h-5 text-white" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                  <span style={{ color: '#FFFFFF' }}>Análise Inteligente & SEO</span>
                </h2>
                <button
                  onClick={async () => {
                    const imageUrlToAnalyze = state.rawImageUrl || state.selectedCoverImage;
                    if (!imageUrlToAnalyze) {
                      alert("Por favor, faça upload de uma imagem primeiro.");
                      return;
                    }
                    try {
                      console.log("[ProductEditor] 🔄 Regenerando análise para:", imageUrlToAnalyze);
                      // Resetar referência para permitir nova análise
                      lastAnalyzedUrlRef.current = "";
                      await analyzeImage(imageUrlToAnalyze);
                    } catch (error: any) {
                      console.error("[ProductEditor] Erro ao regenerar análise:", error);
                      alert(`Erro ao regenerar análise: ${error.message || "Erro desconhecido"}`);
                    }
                  }}
                  disabled={analyzing || (!state.rawImageUrl && !state.selectedCoverImage)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-white/20 hover:bg-white/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/30"
                  style={{ color: '#FFFFFF' }}
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                      <span style={{ color: '#FFFFFF' }}>Analisando...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 text-white" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                      <span style={{ color: '#FFFFFF' }}>Regenerar</span>
                    </>
                  )}
                </button>
              </div>

              {/* Corpo Branco */}
              <div className="p-6 space-y-6 bg-white">
                {/* Seção A: Marketing & SEO */}
                <div className="space-y-5">
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Marketing & SEO
                  </h3>
                  
                  {/* Nome Sugerido */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Nome Sugerido
                    </label>
                    {analyzing && !state.aiAnalysisData ? (
                      <div className="h-11 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                    ) : (
                      <input
                        type="text"
                        value={state.aiAnalysisData?.nome_sugerido || ""}
                        onChange={(e) =>
                          setState(prev => ({
                            ...prev,
                            aiAnalysisData: prev.aiAnalysisData
                              ? { ...prev.aiAnalysisData, nome_sugerido: e.target.value }
                              : { nome_sugerido: e.target.value },
                          }))
                        }
                        placeholder={analyzing ? "Analisando..." : "Aguardando análise..."}
                        className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
                      />
                    )}
                  </div>

                  {/* Descrição SEO */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Descrição Comercial/SEO
                      </label>
                      <span className={`text-xs font-medium ${
                        (state.aiAnalysisData?.descricao_seo?.length || 0) > 500 
                          ? 'text-red-500' 
                          : (state.aiAnalysisData?.descricao_seo?.length || 0) > 450 
                            ? 'text-orange-500' 
                            : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {(state.aiAnalysisData?.descricao_seo?.length || 0)} / 500
                      </span>
                    </div>
                    {analyzing && !state.aiAnalysisData ? (
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-full" />
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-5/6" />
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-4/6" />
                      </div>
                    ) : (
                      <textarea
                        value={state.aiAnalysisData?.descricao_seo || ""}
                        onChange={(e) => {
                          const newValue = e.target.value.slice(0, 500); // Limitar a 500 caracteres
                          setState(prev => ({
                            ...prev,
                            aiAnalysisData: prev.aiAnalysisData
                              ? { ...prev.aiAnalysisData, descricao_seo: newValue }
                              : { descricao_seo: newValue },
                          }));
                        }}
                        maxLength={500}
                        rows={6}
                        placeholder={analyzing ? "Analisando imagem..." : "Aguardando análise da imagem..."}
                        className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 resize-y transition-all min-h-[120px] ${
                          (state.aiAnalysisData?.descricao_seo?.length || 0) > 500 
                            ? 'border-red-500 dark:border-red-500' 
                            : (state.aiAnalysisData?.descricao_seo?.length || 0) > 450 
                              ? 'border-orange-500 dark:border-orange-500' 
                              : 'border-slate-300 dark:border-slate-600'
                        }`}
                      />
                    )}
                  </div>
                </div>

                {/* Seção B: Ficha Técnica Automática */}
                <div className="space-y-5 pt-2">
                  <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Ficha Técnica Automática
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Categoria (Dropdown) */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Categoria Sugerida
                      </label>
                      {analyzing && !state.aiAnalysisData ? (
                        <div className="h-11 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                      ) : (
                        <select
                          value={state.aiAnalysisData?.suggested_category || state.aiAnalysisData?.categoria_sugerida || ""}
                          onChange={(e) =>
                            setState(prev => ({
                              ...prev,
                              aiAnalysisData: prev.aiAnalysisData
                                ? { 
                                    ...prev.aiAnalysisData, 
                                    suggested_category: e.target.value,
                                    categoria_sugerida: e.target.value 
                                  }
                                : { suggested_category: e.target.value, categoria_sugerida: e.target.value },
                            }))
                          }
                          className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
                        >
                          <option value="">Selecione uma categoria</option>
                          {AVAILABLE_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Tipo de Produto */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Tipo de Produto
                      </label>
                      {analyzing && !state.aiAnalysisData ? (
                        <div className="h-11 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                      ) : (
                        <input
                          type="text"
                          value={state.aiAnalysisData?.product_type || ""}
                          onChange={(e) => {
                            console.log("[ProductEditor] Atualizando product_type:", e.target.value);
                            setState(prev => ({
                              ...prev,
                              aiAnalysisData: prev.aiAnalysisData
                                ? { ...prev.aiAnalysisData, product_type: e.target.value }
                                : { product_type: e.target.value },
                            }));
                          }}
                          placeholder="Ex: Blazer, Vestido, Tênis"
                          className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
                        />
                      )}
                    </div>

                    {/* Tecido Detectado */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Tecido Detectado
                      </label>
                      {analyzing && !state.aiAnalysisData ? (
                        <div className="h-11 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                      ) : (
                        <input
                          type="text"
                          value={state.aiAnalysisData?.detected_fabric || state.aiAnalysisData?.tecido_estimado || ""}
                          onChange={(e) => {
                            console.log("[ProductEditor] Atualizando detected_fabric:", e.target.value);
                            setState(prev => ({
                              ...prev,
                              aiAnalysisData: prev.aiAnalysisData
                                ? { 
                                    ...prev.aiAnalysisData, 
                                    detected_fabric: e.target.value,
                                    tecido_estimado: e.target.value 
                                  }
                                : { detected_fabric: e.target.value, tecido_estimado: e.target.value },
                            }));
                          }}
                          placeholder="Ex: Algodão, Linho, Couro"
                          className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
                        />
                      )}
                    </div>

                    {/* Cores Predominantes */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Cores Predominantes
                      </label>
                      {analyzing && !state.aiAnalysisData ? (
                        <div className="h-11 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                      ) : state.aiAnalysisData?.dominant_colors && Array.isArray(state.aiAnalysisData.dominant_colors) && state.aiAnalysisData.dominant_colors.length > 0 ? (
                        <div className="flex flex-wrap gap-2 items-center">
                          {state.aiAnalysisData.dominant_colors.map((color, idx) => {
                            // Garantir que color tenha hex e name
                            const colorHex = color?.hex || "#808080";
                            const colorName = color?.name || "Não especificado";
                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm"
                              >
                                <div
                                  className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-400"
                                  style={{ backgroundColor: colorHex }}
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                  {colorName}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400 py-2">
                          {state.aiAnalysisData ? "Nenhuma cor detectada" : "Cores serão detectadas após a análise"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedCard>

            {/* Bloco 4: Preenchimento Obrigatório */}
            <AnimatedCard className="p-0 overflow-hidden bg-white dark:bg-slate-800 shadow-sm mt-auto flex-shrink-0">
              {/* Cabeçalho Vermelho/Rosa */}
              <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4 flex items-center justify-between min-h-[72px]">
                <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                  <AlertCircle className="w-5 h-5 text-white" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                  <span style={{ color: '#FFFFFF' }}>Preenchimento Obrigatório *</span>
                </h2>
              </div>
              
              {/* Corpo Branco */}
              <div className="p-6 space-y-4 bg-white">
                {/* Linha 1: Preços */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Preço (R$)
                    </label>
                    <input
                      type="text"
                      value={state.manualData.preco}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d,]/g, "");
                        setState(prev => ({
                          ...prev,
                          manualData: { ...prev.manualData, preco: value },
                        }));
                      }}
                      placeholder="0,00"
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Preço Promocional (R$)
                    </label>
                    <input
                      type="text"
                      value={state.manualData.precoPromocional}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d,]/g, "");
                        setState(prev => ({
                          ...prev,
                          manualData: { ...prev.manualData, precoPromocional: value },
                        }));
                      }}
                      placeholder="0,00"
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Linha 2: SKU e Estoque */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={state.manualData.sku}
                      onChange={(e) =>
                        setState(prev => ({
                          ...prev,
                          manualData: { ...prev.manualData, sku: e.target.value },
                        }))
                      }
                      placeholder="SKU-001"
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Estoque (Qtd Total)
                    </label>
                    <input
                      type="number"
                      value={state.manualData.estoque}
                      onChange={(e) =>
                        setState(prev => ({
                          ...prev,
                          manualData: { ...prev.manualData, estoque: e.target.value },
                        }))
                      }
                      placeholder="0"
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Variações: Tamanhos */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Tamanhos Disponíveis
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["P", "M", "G", "GG", "XG"].map((size) => (
                      <button
                        key={size}
                        onClick={() => {
                          const tamanhos = state.manualData.tamanhos.includes(size)
                            ? state.manualData.tamanhos.filter(t => t !== size)
                            : [...state.manualData.tamanhos, size];
                          setState(prev => ({
                            ...prev,
                            manualData: { ...prev.manualData, tamanhos },
                          }));
                        }}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                          state.manualData.tamanhos.includes(size)
                            ? "bg-blue-500 text-white border-blue-500"
                            : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-blue-500"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Ativar no Site
                    </label>
                    <button
                      onClick={() =>
                        setState(prev => ({
                          ...prev,
                          manualData: { ...prev.manualData, ativo: !prev.manualData.ativo },
                        }))
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        state.manualData.ativo ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          state.manualData.ativo ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Destaque Promocional
                    </label>
                    <button
                      onClick={() =>
                        setState(prev => ({
                          ...prev,
                          manualData: { ...prev.manualData, destaquePromocional: !prev.manualData.destaquePromocional },
                        }))
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        state.manualData.destaquePromocional ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          state.manualData.destaquePromocional ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </AnimatedCard>
        </div>
      </div>

      {/* Modal de Combinação Manual */}
      {showManualModal && (
        <ManualCombinationModal
          lojistaId={lojistaId}
          currentProductTags={state.aiAnalysisData?.tags || []}
          onClose={() => setShowManualModal(false)}
          onConfirm={handleGenerateCombinedManual}
        />
      )}
    </div>
  );
}

