"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, Sparkles, RotateCcw, Save, Loader2, Package, X, Plus, Edit, ArrowLeft, Image as ImageIcon, AlertCircle, Info, AlertTriangle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Tag, Ruler, Venus, Mars, Baby } from "lucide-react";
import { MANNEQUIN_STYLES } from "@/lib/ai-services/mannequin-prompts";
import { ManualCombinationModal } from "./ManualCombinationModal";
import { IconPageHeader } from "@/app/(lojista)/components/icon-page-header";
import { getPageHeaderColors } from "@/app/(lojista)/components/page-header-colors";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { normalizeCategory, getConsolidatedCategories } from "@/lib/categories/consolidated-categories";
import { MeasurementGuideCard } from "./MeasurementGuideCard";

// Estado consolidado do produto
export interface ProductEditorState {
  // Imagens
  rawImageUrl: string;
  rawImageFile: File | null;
  generatedCatalogImage: string | null;
  generatedCombinedImage: string | null;
  selectedCoverImage: string | null;
  imagemMedidasCustomizada: string | null; // Imagem de medidas inserida manualmente
  
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
    unidadeMedida?: string;
    descontoProduto?: string;
    tags?: string;
    marca?: string;
    modelo?: string;
    garantia?: string;
    material?: string;
    statusProduto?: string;
    disponibilidade?: string;
    dataPublicacao?: string;
  };
  // Variações
  temVariacoes: boolean;
  variacoes: Array<{
    id: string;
    variacao: string;
    estoque: string;
    sku: string;
  }>;
  // Grade de Tamanho
  sizeCategory: 'standard' | 'plus'; // Grade Padrão (P, M, G, GG) ou Plus Size (G1, G2, G3, G4)
  // Público Alvo
  targetAudience: 'female' | 'male' | 'kids'; // Feminino, Masculino ou Infantil
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

/**
 * Função utilitária para gerar SKU principal do produto automaticamente
 * Formato: SLUG-DO-PRODUTO-XXXX
 */
function generateMainSKU(nomeProduto: string): string {
  if (!nomeProduto || !nomeProduto.trim()) {
    nomeProduto = "PRODUTO";
  }
  
  const slugProduto = nomeProduto
    .trim()
    .toUpperCase()
    .substring(0, 12)
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const produtoSlug = slugProduto.length >= 3 ? slugProduto : slugProduto.padEnd(3, 'X');
  
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let sufixo = '';
  for (let i = 0; i < 4; i++) {
    sufixo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  
  return `${produtoSlug}-${sufixo}`;
}

/**
 * Função utilitária para gerar SKU automaticamente (com variação)
 * Formato: SLUG-DO-PRODUTO-VARIAÇÃO-XXXX
 */
function generateSKU(nomeProduto: string, variacao: string): string {
  if (!nomeProduto || !nomeProduto.trim()) {
    nomeProduto = "PRODUTO";
  }
  
  if (!variacao || !variacao.trim()) {
    variacao = "VAR";
  }
  
  const slugProduto = nomeProduto
    .trim()
    .toUpperCase()
    .substring(0, 10)
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const produtoSlug = slugProduto.length >= 3 ? slugProduto : slugProduto.padEnd(3, 'X');
  
  const variacaoSlug = variacao
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const variacaoFinal = variacaoSlug || "VAR";
  
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let sufixo = '';
  for (let i = 0; i < 4; i++) {
    sufixo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  
  return `${produtoSlug}-${variacaoFinal}-${sufixo}`;
}

/**
 * Componente de linha de variação com auto-geração de SKU
 */
function VariacaoRow({ 
  variacao, 
  nomeProduto, 
  onUpdate, 
  onRemove 
}: { 
  variacao: { id: string; variacao: string; estoque: string; sku: string }; 
  nomeProduto: string;
  onUpdate: (updated: { id: string; variacao: string; estoque: string; sku: string }) => void;
  onRemove: () => void;
}) {
  const skuEditadoManualRef = useRef<boolean>(false);
  const ultimaVariacaoProcessadaRef = useRef<string>(variacao.variacao || "");
  const ultimoNomeProdutoProcessadoRef = useRef<string>(nomeProduto || "");
  
  useEffect(() => {
    if (variacao.sku && variacao.sku.trim()) {
      skuEditadoManualRef.current = true;
    }
  }, []);
  
  useEffect(() => {
    const variacaoAtual = (variacao.variacao || "").trim();
    const nomeProdutoAtual = (nomeProduto || "").trim();
    const variacaoMudou = ultimaVariacaoProcessadaRef.current !== variacaoAtual;
    const nomeProdutoMudou = ultimoNomeProdutoProcessadoRef.current !== nomeProdutoAtual;
    
    if (!variacaoMudou && !nomeProdutoMudou) {
      return;
    }
    
    if (variacaoAtual && nomeProdutoAtual) {
      const skuVazio = !variacao.sku || !variacao.sku.trim();
      const precisaRegenerar = variacaoMudou || nomeProdutoMudou;
      
      if (skuVazio || (precisaRegenerar && !skuEditadoManualRef.current)) {
        const skuGerado = generateSKU(nomeProdutoAtual, variacaoAtual);
        
        if (variacao.sku !== skuGerado) {
          onUpdate({ ...variacao, sku: skuGerado });
          
          console.log("[ProductEditorVariacaoRow] ✅ SKU auto-gerado:", {
            nomeProduto: nomeProdutoAtual.substring(0, 20),
            variacao: variacaoAtual,
            sku: skuGerado,
            motivo: skuVazio ? "SKU vazio" : (variacaoMudou ? "Variação mudou" : "Nome produto mudou")
          });
        }
        
        ultimaVariacaoProcessadaRef.current = variacaoAtual;
        ultimoNomeProdutoProcessadoRef.current = nomeProdutoAtual;
      }
    }
  }, [variacao.variacao, nomeProduto, variacao.id]);

  return (
    <div className="grid grid-cols-12 gap-1 items-center">
      <div className="col-span-3">
        <input
          type="text"
          value={variacao.variacao}
          onChange={(e) => {
            onUpdate({ ...variacao, variacao: e.target.value });
          }}
          placeholder="P"
          className="w-full h-6 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-1.5 py-0 text-xs leading-tight text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
        />
      </div>

      <div className="col-span-3">
        <input
          type="number"
          min="0"
          value={variacao.estoque}
          onChange={(e) => {
            onUpdate({ ...variacao, estoque: e.target.value });
          }}
          placeholder="10"
          className="w-full h-6 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-1.5 py-0 text-xs leading-tight text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
        />
      </div>

      <div className="col-span-5">
        <input
          type="text"
          value={variacao.sku}
          onChange={(e) => {
            skuEditadoManualRef.current = true;
            onUpdate({ ...variacao, sku: e.target.value });
          }}
          onFocus={() => {
            if (!variacao.sku || !variacao.sku.trim()) {
              skuEditadoManualRef.current = false;
            }
          }}
          placeholder="Auto-gerado"
          className="w-full h-6 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-1.5 py-0 text-xs leading-tight text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
          title="SKU gerado automaticamente. Você pode editar se necessário."
        />
      </div>

      <div className="col-span-1">
        <button
          type="button"
          onClick={onRemove}
          className="w-full h-6 flex items-center justify-center rounded border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          title="Remover variação"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
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
  const medidasFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingMedidas, setUploadingMedidas] = useState(false);

  // Ler preferência de Grade de Tamanho do localStorage
  const getInitialSizeCategory = (): 'standard' | 'plus' => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastSizeCategory');
      if (saved === 'standard' || saved === 'plus') {
        return saved;
      }
    }
    return 'standard'; // Padrão
  };

  const getInitialTargetAudience = (): 'female' | 'male' | 'kids' => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastTargetAudience');
      if (saved === 'female' || saved === 'male' || saved === 'kids') {
        return saved;
      }
    }
    return 'female'; // Padrão: Feminino
  };

  // Estado principal
  const [state, setState] = useState<ProductEditorState>({
    rawImageUrl: initialData?.rawImageUrl || "",
    rawImageFile: initialData?.rawImageFile || null,
    generatedCatalogImage: initialData?.generatedCatalogImage || null,
    generatedCombinedImage: initialData?.generatedCombinedImage || null,
    selectedCoverImage: initialData?.selectedCoverImage || null,
    imagemMedidasCustomizada: initialData?.imagemMedidasCustomizada || null,
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
      unidadeMedida: "UN",
      descontoProduto: "",
      tags: "",
      marca: "",
      modelo: "",
      garantia: "",
      material: "",
      statusProduto: "publicado",
      disponibilidade: "em_estoque",
      dataPublicacao: new Date().toISOString().split('T')[0],
    },
    temVariacoes: initialData?.temVariacoes !== undefined ? initialData.temVariacoes : true,
    variacoes: initialData?.variacoes || [
      { id: "1", variacao: "P", estoque: "", sku: "" },
      { id: "2", variacao: "M", estoque: "", sku: "" },
      { id: "3", variacao: "G", estoque: "", sku: "" },
    ],
    sizeCategory: initialData?.sizeCategory || getInitialSizeCategory(),
    targetAudience: initialData?.targetAudience || getInitialTargetAudience(),
  });

  // Estados de UI
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingCatalog, setGeneratingCatalog] = useState(false);
  const [analiseAccordionOpen, setAnaliseAccordionOpen] = useState(false); // Estado do accordion de Análise Inteligente
  const [generatingCombined, setGeneratingCombined] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewingImageIndex, setViewingImageIndex] = useState(0); // Índice da imagem sendo visualizada
  const [showManualModal, setShowManualModal] = useState(false);
  const [creditInfo, setCreditInfo] = useState({ credits: 0, catalogPack: 0 });

  // Ref para preservar variações quando o switch é desativado
  const variacoesPreservadasRef = useRef<Array<{ id: string; variacao: string; estoque: string; sku: string }>>(
    initialData?.variacoes || []
  );

  // Ref para rastrear se o SKU principal foi editado manualmente pelo usuário
  const skuPrincipalEditadoManualRef = useRef<boolean>(false);
  const ultimoNomeProdutoProcessadoRef = useRef<string>("");

  // Preservar variações iniciais ao carregar
  useEffect(() => {
    if (initialData?.variacoes && initialData.variacoes.length > 0) {
      // Carregar variações iniciais do produto salvo
      variacoesPreservadasRef.current = initialData.variacoes;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Apenas na montagem inicial

  // Inicializar: Se SKU principal já existe ao montar, assumir que foi editado manualmente ou carregado
  useEffect(() => {
    if (state.manualData.sku && state.manualData.sku.trim()) {
      skuPrincipalEditadoManualRef.current = true;
    }
  }, []);

  // Auto-gerar SKU principal quando o nome do produto for definido pela IA
  useEffect(() => {
    const nomeProdutoAtual = (state.aiAnalysisData?.nome_sugerido || "").trim();
    const nomeProdutoMudou = ultimoNomeProdutoProcessadoRef.current !== nomeProdutoAtual;
    const skuVazio = !state.manualData.sku || !state.manualData.sku.trim();

    // Só gerar SKU se:
    // 1. Há um nome de produto disponível
    // 2. O SKU está vazio OU o nome do produto mudou
    // 3. O SKU não foi editado manualmente pelo usuário
    if (nomeProdutoAtual && (skuVazio || (nomeProdutoMudou && !skuPrincipalEditadoManualRef.current))) {
      const skuGerado = generateMainSKU(nomeProdutoAtual);
      
      // Só atualizar se o SKU realmente mudou (evitar atualizações desnecessárias)
      if (state.manualData.sku !== skuGerado) {
        setState(prev => ({
          ...prev,
          manualData: { ...prev.manualData, sku: skuGerado }
        }));
        
        console.log("[ProductEditor] ✅ SKU principal auto-gerado:", {
          nomeProduto: nomeProdutoAtual.substring(0, 30),
          sku: skuGerado,
          motivo: skuVazio ? "SKU vazio" : "Nome produto mudou"
        });
      }
      
      ultimoNomeProdutoProcessadoRef.current = nomeProdutoAtual;
    }
  }, [state.aiAnalysisData?.nome_sugerido]); // Dependência: nome_sugerido (não incluir state.manualData.sku para evitar loop)

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

      // Ler a resposta como texto primeiro (pode ser chamado apenas uma vez)
      const responseText = await response.text();
      
      if (!response.ok) {
        let errorData: any = {};
        try {
          if (responseText) {
            errorData = JSON.parse(responseText);
          }
        } catch (parseError) {
          console.error("[ProductEditor] Erro ao parsear resposta de erro:", parseError);
          console.error("[ProductEditor] Resposta recebida (primeiros 500 chars):", responseText?.substring(0, 500));
          errorData = { error: `Erro HTTP ${response.status}: ${response.statusText}` };
        }
        const errorMessage = errorData.error || errorData.details || `Erro ao analisar imagem (${response.status})`;
        throw new Error(errorMessage);
      }

      // Processar resposta de sucesso
      let responseData: any;
      try {
        if (!responseText) {
          throw new Error("Resposta vazia do servidor");
        }
        responseData = JSON.parse(responseText);
      } catch (parseError: any) {
        console.error("[ProductEditor] Erro ao parsear JSON da resposta:", parseError);
        console.error("[ProductEditor] Resposta recebida (primeiros 500 chars):", responseText?.substring(0, 500));
        throw new Error(`Erro ao processar resposta do servidor: ${parseError.message || "JSON inválido"}. Verifique o console para mais detalhes.`);
      }
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
      if (lojistaId) {
        formData.append("lojistaId", lojistaId);
      }

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
      
      // Mostrar a imagem original recém-carregada
      setViewingImageIndex(0);
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

  // === HANDLER DE UPLOAD DE IMAGEM DE MEDIDAS ===
  const handleMedidasFileSelect = async (file: File) => {
    if (!file) return;

    try {
      setUploadingMedidas(true);
      const formData = new FormData();
      formData.append("image", file);
      if (lojistaId) {
        formData.append("lojistaId", lojistaId);
      }

      const response = await fetch(
        `/api/lojista/products/upload-image?lojistaId=${lojistaId}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Erro ao fazer upload da imagem de medidas");

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        imagemMedidasCustomizada: data.imageUrl,
      }));

      console.log("[ProductEditor] ✅ Imagem de medidas customizada enviada:", data.imageUrl);
    } catch (error: any) {
      console.error("[ProductEditor] Erro no upload da imagem de medidas:", error);
      alert(`Erro ao fazer upload da imagem de medidas: ${error.message}`);
    } finally {
      setUploadingMedidas(false);
    }
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
      
      // Atualizar índice para mostrar a nova imagem gerada (catálogo sempre será índice 1 se houver original)
      setTimeout(() => {
        const images = [];
        if (state.rawImageUrl) images.push({ type: "original" });
        if (data.imageUrl) images.push({ type: "catalog" });
        if (state.generatedCombinedImage) images.push({ type: "combined" });
        const catalogIndex = images.findIndex(img => img.type === "catalog");
        if (catalogIndex !== -1) {
          setViewingImageIndex(catalogIndex);
        }
      }, 100);

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

    let availableProducts: any[] = [];
    
    try {
      setGeneratingCombined(true);
      console.log(`[ProductEditor] 🎨 Gerando look combinado automático (IA decide quantidade)...`);

      // 1. Buscar produtos do estoque
      const productsResponse = await fetch(`/api/lojista/products?lojistaId=${lojistaId}`);
      if (!productsResponse.ok) {
        throw new Error("Erro ao buscar produtos do estoque");
      }
      
      const products = await productsResponse.json();
      
      console.log(`[ProductEditor] 📦 Total de produtos recebidos: ${products.length}`);
      console.log(`[ProductEditor] 📦 Produto atual (produtoId): ${produtoId}`);
      
      // Filtrar: apenas produtos ativos, com imagem, e diferentes do atual
      availableProducts = products.filter((p: any) => {
        // Verificar se o produto está ativo (ou não tem campo ativo, assumir ativo)
        const isActive = p.ativo !== false; // Considera ativo se não estiver explicitamente false
        
        // Verificar se tem imagem (pode estar em diferentes campos)
        const hasImage = !!(p.imagemPrincipal || p.imagemUrl || p.imagemUrlOriginal);
        
        // Verificar se não é o produto atual
        const isNotCurrent = p.id !== produtoId;
        
        const isValid = isActive && hasImage && isNotCurrent;
        
        if (!isValid) {
          console.log(`[ProductEditor] ⚠️ Produto ${p.id || p.nome} filtrado:`, {
            isActive,
            hasImage,
            isNotCurrent,
            imagemPrincipal: p.imagemPrincipal,
            imagemUrl: p.imagemUrl,
            imagemUrlOriginal: p.imagemUrlOriginal,
            ativo: p.ativo,
          });
        }
        
        return isValid;
      });

      console.log(`[ProductEditor] ✅ Produtos disponíveis para combinação: ${availableProducts.length}`);

      if (availableProducts.length === 0) {
        const totalProdutos = products.length;
        const produtosComImagem = products.filter((p: any) => !!(p.imagemPrincipal || p.imagemUrl || p.imagemUrlOriginal)).length;
        const produtosAtivos = products.filter((p: any) => p.ativo !== false).length;
        
        const mensagem = `Nenhum produto disponível no estoque para combinação.\n\n` +
          `Total de produtos: ${totalProdutos}\n` +
          `Produtos com imagem: ${produtosComImagem}\n` +
          `Produtos ativos: ${produtosAtivos}\n\n` +
          `Adicione mais produtos com imagens e ative-os primeiro.`;
        
        alert(mensagem);
        setGeneratingCombined(false);
        return;
      }

      // 2. Usar IA para selecionar produtos que combinam (IA decide quantos)
      console.log(`[ProductEditor] 🤖 Enviando ${availableProducts.length} produtos para IA selecionar...`);
      
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
        const errorData = await selectionResponse.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || "Erro ao selecionar produtos para combinação";
        console.error(`[ProductEditor] ❌ Erro na API de seleção:`, errorMessage);
        throw new Error(errorMessage);
      }

      const selectionData = await selectionResponse.json();
      const { selectedProductIds, fallback } = selectionData;

      console.log(`[ProductEditor] 📥 Resposta da IA:`, { selectedProductIds, fallback });

      if (!selectedProductIds || selectedProductIds.length === 0) {
        // Se a IA não selecionou, usar fallback: pegar produtos de categorias diferentes
        const fallbackProducts = availableProducts
          .filter((p: any) => {
            const currentCategoria = (state.aiAnalysisData?.suggested_category || state.aiAnalysisData?.categoria_sugerida || "Roupas").toLowerCase();
            const productCategoria = (p.categoria || "").toLowerCase();
            return productCategoria !== currentCategoria;
          })
          .slice(0, 2)
          .map((p: any) => p.id);

        if (fallbackProducts.length === 0) {
          alert("A IA não conseguiu encontrar produtos compatíveis no estoque. Adicione produtos de categorias diferentes.");
          setGeneratingCombined(false);
          return;
        }

        console.log(`[ProductEditor] 🔄 Usando fallback com produtos de categorias diferentes:`, fallbackProducts);
        // Continuar com os produtos do fallback
        const finalIds = fallbackProducts;
        
        setState(prev => ({
          ...prev,
          combinationMode: "auto",
          manualCombinationItems: finalIds,
        }));

        // Continuar para gerar a imagem
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
              productIds: finalIds,
              tags: state.aiAnalysisData?.tags || [],
              detalhes: state.aiAnalysisData?.detalhes || [],
              cor_predominante: state.aiAnalysisData?.cor_predominante,
              tecido_estimado: state.aiAnalysisData?.tecido_estimado,
              autoMode: true,
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
        
        // Atualizar índice para mostrar a nova imagem gerada
        setTimeout(() => {
          const images = [];
          if (state.rawImageUrl) images.push({ type: "original" });
          if (state.generatedCatalogImage) images.push({ type: "catalog" });
          if (data.imageUrl) images.push({ type: "combined" });
          const combinedIndex = images.findIndex(img => img.type === "combined");
          if (combinedIndex !== -1) {
            setViewingImageIndex(combinedIndex);
          }
        }, 100);

        loadCreditInfo();
        console.log(`[ProductEditor] ✅ Look combinado gerado com fallback usando ${finalIds.length} produto(s)`);
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
      console.error("[ProductEditor] ❌ Erro completo ao gerar combinado automático:", error);
      console.error("[ProductEditor] ❌ Stack trace:", error?.stack);
      
      // Mensagem de erro mais detalhada
      let errorMessage = "Erro ao gerar look combinado";
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Se o erro mencionar "selecionar produtos", tentar usar fallback
      if (errorMessage.includes("selecionar produtos") || errorMessage.includes("select-combination")) {
        console.log("[ProductEditor] 🔄 Tentando fallback após erro na seleção...");
        
        // Fallback: selecionar produtos de categorias diferentes automaticamente
        const fallbackProducts = availableProducts
          .filter((p: any) => {
            const currentCategoria = (state.aiAnalysisData?.suggested_category || state.aiAnalysisData?.categoria_sugerida || "Roupas").toLowerCase();
            const productCategoria = (p.categoria || "").toLowerCase();
            return productCategoria !== currentCategoria && p.id !== produtoId;
          })
          .slice(0, 2)
          .map((p: any) => p.id);

        if (fallbackProducts.length > 0) {
          console.log(`[ProductEditor] 🔄 Usando fallback automático:`, fallbackProducts);
          
          try {
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
                  productIds: fallbackProducts,
                  tags: state.aiAnalysisData?.tags || [],
                  detalhes: state.aiAnalysisData?.detalhes || [],
                  cor_predominante: state.aiAnalysisData?.cor_predominante,
                  tecido_estimado: state.aiAnalysisData?.tecido_estimado,
                  autoMode: true,
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
              manualCombinationItems: fallbackProducts,
            }));

            loadCreditInfo();
            console.log(`[ProductEditor] ✅ Look combinado gerado com fallback usando ${fallbackProducts.length} produto(s)`);
            return;
          } catch (fallbackError: any) {
            console.error("[ProductEditor] ❌ Erro no fallback também:", fallbackError);
            alert(`Erro ao gerar look combinado: ${fallbackError.message || errorMessage}`);
          }
        } else {
          alert(`Erro ao gerar look combinado: ${errorMessage}\n\nNão há produtos de categorias diferentes disponíveis para combinação.`);
        }
      } else {
        alert(`Erro ao gerar look combinado: ${errorMessage}`);
      }
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
      
      // Atualizar índice para mostrar a nova imagem gerada
      setTimeout(() => {
        const images = [];
        if (state.rawImageUrl) images.push({ type: "original" });
        if (state.generatedCatalogImage) images.push({ type: "catalog" });
        if (data.imageUrl) images.push({ type: "combined" });
        const combinedIndex = images.findIndex(img => img.type === "combined");
        if (combinedIndex !== -1) {
          setViewingImageIndex(combinedIndex);
        }
      }, 100);

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
      
      const payload: any = {
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
        imagemMedidasCustomizada: state.imagemMedidasCustomizada || null,
        tamanhos: state.manualData.tamanhos,
        cores: state.manualData.cores,
        estoque: state.manualData.estoque ? parseInt(state.manualData.estoque) : 0,
        tags: state.aiAnalysisData.tags || [],
        obs: (state.aiAnalysisData.descricao_seo || "").replace(/\[Análise IA[^\]]*\]\s*/g, "").trim() || "",
        sku: state.manualData.sku || "",
        ativo: state.manualData.ativo,
        destaquePromocional: state.manualData.destaquePromocional,
        unidadeMedida: state.manualData.unidadeMedida || "UN",
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

      // Se produto tem variações, processar e salvar grade de estoque
      if (state.temVariacoes && state.variacoes.length > 0) {
        // Filtrar apenas variações válidas (com variação preenchida)
        const variacoesValidas = state.variacoes.filter(v => v.variacao && v.variacao.trim());
        
        if (variacoesValidas.length > 0) {
          // Extrair tamanhos das variações válidas
          const tamanhosVariacoes = variacoesValidas.map(v => v.variacao.trim());
          payload.tamanhos = tamanhosVariacoes;
          
          // Salvar variações completas
          payload.variacoes = variacoesValidas.map(v => ({
            variacao: v.variacao.trim(),
            estoque: parseInt(v.estoque) || 0,
            sku: v.sku?.trim() || "",
          }));
          
          // Calcular estoque total das variações
          const estoqueTotal = variacoesValidas.reduce((sum, v) => sum + (parseInt(v.estoque) || 0), 0);
          if (estoqueTotal > 0) {
            payload.estoque = estoqueTotal;
          }
        }
      }

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
      images.push({ type: "catalog", url: state.generatedCatalogImage, label: "Catálogo" });
    }
    if (state.generatedCombinedImage) {
      images.push({ type: "combined", url: state.generatedCombinedImage, label: "Combinado" });
    }
    return images;
  };

  const availableImages = getAvailableImages();
  
  // Atualizar índice quando imagens mudarem
  useEffect(() => {
    if (availableImages.length > 0) {
      if (viewingImageIndex >= availableImages.length) {
        setViewingImageIndex(0);
      }
      // Se não há imagem sendo visualizada mas há imagens disponíveis, mostrar a primeira
      if (viewingImageIndex < 0 && availableImages.length > 0) {
        setViewingImageIndex(0);
      }
    }
  }, [state.rawImageUrl, state.generatedCatalogImage, state.generatedCombinedImage, viewingImageIndex]);
  
  // Função para navegar entre imagens
  const navigateImage = (direction: 'prev' | 'next') => {
    if (availableImages.length === 0) return;
    
    if (direction === 'prev') {
      setViewingImageIndex(prev => (prev > 0 ? prev - 1 : availableImages.length - 1));
    } else {
      setViewingImageIndex(prev => (prev < availableImages.length - 1 ? prev + 1 : 0));
    }
  };
  
  // Função para selecionar imagem pela miniatura
  const selectImageByType = (type: 'original' | 'catalog' | 'combined') => {
    const index = availableImages.findIndex(img => img.type === type);
    if (index !== -1) {
      setViewingImageIndex(index);
    }
  };
  
  const currentViewingImage = availableImages[viewingImageIndex] || null;

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
    <div className="w-full flex flex-col gap-2 -mt-4 pt-4">
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
      <div className="w-full flex flex-col lg:flex-row gap-2 items-stretch">
        {/* === COLUNA ESQUERDA: O Estúdio Visual === */}
        <div className="w-full lg:w-[40%] flex flex-col">
            {/* Bloco 1: Estúdio Criativo IA - 3 Caixas Lado a Lado */}
            <AnimatedCard className="p-0 overflow-hidden bg-white dark:bg-slate-800 shadow-sm flex-1 flex flex-col">
              {/* Cabeçalho Verde/Esmeralda */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-3 h-[52px] flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                  <Sparkles className="w-7 h-7 text-white" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                  <span style={{ color: '#FFFFFF' }}>Estúdio Criativo IA</span>
                </h2>
                <span className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg border border-white/30">
                  <Package className="w-6 h-6" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                  <span className="font-bold text-base" style={{ color: '#FFFFFF' }}>
                    {creditInfo.catalogPack > 0 ? `${creditInfo.catalogPack} Pack` : `${creditInfo.credits + 200} Créditos`}
                  </span>
                </span>
              </div>
              
              {/* Corpo Branco */}
              <div className="p-3 space-y-3 bg-white flex-1 flex flex-col">
              
              {/* Cards de Seleção de Público Alvo */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 text-center">
                  Público Alvo <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Card Feminino */}
                  <button
                    onClick={() => {
                      const newAudience: 'female' | 'male' | 'kids' = 'female';
                      setState(prev => ({ ...prev, targetAudience: newAudience }));
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('lastTargetAudience', newAudience);
                      }
                    }}
                    className={`relative p-4 rounded-lg border-2 transition-all ${
                      state.targetAudience === 'female'
                        ? 'border-pink-600 bg-pink-50 dark:bg-pink-900/20 ring-2 ring-pink-300 dark:ring-pink-700'
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 hover:border-pink-300 dark:hover:border-pink-700'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Venus className={`w-8 h-8 ${
                        state.targetAudience === 'female'
                          ? 'text-pink-600 dark:text-pink-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }`} />
                      <h3 className={`text-sm font-bold ${
                        state.targetAudience === 'female'
                          ? 'text-pink-700 dark:text-pink-300'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        Feminino
                      </h3>
                    </div>
                    {state.targetAudience === 'female' && (
                      <div className="absolute top-2 right-2 w-3 h-3 bg-pink-600 rounded-full"></div>
                    )}
                  </button>

                  {/* Card Masculino */}
                  <button
                    onClick={() => {
                      const newAudience: 'female' | 'male' | 'kids' = 'male';
                      setState(prev => ({ ...prev, targetAudience: newAudience }));
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('lastTargetAudience', newAudience);
                      }
                    }}
                    className={`relative p-4 rounded-lg border-2 transition-all ${
                      state.targetAudience === 'male'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-300 dark:ring-blue-700'
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Mars className={`w-8 h-8 ${
                        state.targetAudience === 'male'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }`} />
                      <h3 className={`text-sm font-bold ${
                        state.targetAudience === 'male'
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        Masculino
                      </h3>
                    </div>
                    {state.targetAudience === 'male' && (
                      <div className="absolute top-2 right-2 w-3 h-3 bg-blue-600 rounded-full"></div>
                    )}
                  </button>

                  {/* Card Infantil */}
                  <button
                    onClick={() => {
                      const newAudience: 'female' | 'male' | 'kids' = 'kids';
                      setState(prev => ({ ...prev, targetAudience: newAudience }));
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('lastTargetAudience', newAudience);
                      }
                    }}
                    className={`relative p-4 rounded-lg border-2 transition-all ${
                      state.targetAudience === 'kids'
                        ? 'border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 ring-2 ring-yellow-300 dark:ring-yellow-700'
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 hover:border-yellow-300 dark:hover:border-yellow-700'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Baby className={`w-8 h-8 ${
                        state.targetAudience === 'kids'
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }`} />
                      <h3 className={`text-sm font-bold ${
                        state.targetAudience === 'kids'
                          ? 'text-yellow-700 dark:text-yellow-300'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        Infantil
                      </h3>
                    </div>
                    {state.targetAudience === 'kids' && (
                      <div className="absolute top-2 right-2 w-3 h-3 bg-yellow-600 rounded-full"></div>
                    )}
                  </button>
                </div>
              </div>

              {/* Cards de Seleção de Grade de Tamanho */}
              <div className={`mb-4 ${state.targetAudience === 'kids' ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 text-center">
                  Selecione a Grade de Tamanho <span className="text-red-500">*</span>
                  {state.targetAudience === 'kids' && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">
                      (Não se aplica a produtos infantis)
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Card A: Grade Padrão */}
                  <button
                    onClick={() => {
                      const newCategory: 'standard' | 'plus' = 'standard';
                      setState(prev => ({ ...prev, sizeCategory: newCategory }));
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('lastSizeCategory', newCategory);
                      }
                    }}
                    className={`relative p-4 rounded-lg border-2 transition-all ${
                      state.sizeCategory === 'standard'
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-300 dark:ring-purple-700'
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 hover:border-purple-300 dark:hover:border-purple-700'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Tag className={`w-8 h-8 ${
                        state.sizeCategory === 'standard'
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }`} />
                      <h3 className={`text-sm font-bold ${
                        state.sizeCategory === 'standard'
                          ? 'text-purple-700 dark:text-purple-300'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        Grade Padrão
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        P, M, G, GG
                      </p>
                    </div>
                    {state.sizeCategory === 'standard' && (
                      <div className="absolute top-2 right-2 w-3 h-3 bg-purple-600 rounded-full"></div>
                    )}
                  </button>

                  {/* Card B: Plus Size */}
                  <button
                    onClick={() => {
                      const newCategory: 'standard' | 'plus' = 'plus';
                      setState(prev => ({ ...prev, sizeCategory: newCategory }));
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('lastSizeCategory', newCategory);
                      }
                    }}
                    className={`relative p-4 rounded-lg border-2 transition-all ${
                      state.sizeCategory === 'plus'
                        ? 'border-pink-600 bg-pink-50 dark:bg-pink-900/20 ring-2 ring-pink-300 dark:ring-pink-700'
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 hover:border-pink-300 dark:hover:border-pink-700'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Ruler className={`w-8 h-8 ${
                        state.sizeCategory === 'plus'
                          ? 'text-pink-600 dark:text-pink-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }`} />
                      <h3 className={`text-sm font-bold ${
                        state.sizeCategory === 'plus'
                          ? 'text-pink-700 dark:text-pink-300'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        Plus Size
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        G1, G2, G3, G4
                      </p>
                    </div>
                    {state.sizeCategory === 'plus' && (
                      <div className="absolute top-2 right-2 w-3 h-3 bg-pink-600 rounded-full"></div>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Seletor de Manequim */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 text-center">
                  Selecione o Manequim
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {MANNEQUIN_STYLES.map((mannequin) => (
                    <button
                      key={mannequin.id}
                      onClick={() => setState(prev => ({ ...prev, selectedMannequinId: mannequin.id }))}
                      className={`w-full rounded-lg overflow-hidden border-2 transition-all ${
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

              {/* Caixa de Visualização de Imagens - ABAIXO DOS BOTÕES */}
              <div className="mb-4">
                {availableImages.length > 0 ? (
                  /* Visualizador de Imagens com Navegação */
                  <div className="relative w-full aspect-[3/4] border-2 border-dashed border-blue-400 rounded-lg overflow-hidden bg-white group">
                    {/* Imagem Atual */}
                    <img
                      src={currentViewingImage.url}
                      alt={currentViewingImage.label}
                      className="w-full h-full object-contain bg-white"
                    />
                    
                    {/* Setas de Navegação - Aparecem no hover */}
                    {availableImages.length > 1 && (
                      <>
                        {/* Seta Esquerda */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateImage('prev');
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          aria-label="Imagem anterior"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        
                        {/* Seta Direita */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateImage('next');
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          aria-label="Próxima imagem"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </>
                    )}
                    
                    {/* Indicador de Imagem Atual */}
                    {availableImages.length > 1 && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        {viewingImageIndex + 1} / {availableImages.length}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Caixa de Upload (quando não há imagens) */
                  <div
                    ref={dropzoneRef}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-full aspect-[3/4] border-2 border-dashed border-blue-400 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-colors bg-white"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-2" />
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">Fazendo upload...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-slate-500 mb-2" />
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                          Upload your produto
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 whitespace-nowrap">
                          Clique ou arraste uma imagem aqui
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 3 Caixas de Imagens lado a lado - SEMPRE VISÍVEIS */}
              <div className="space-y-4">
                {/* Grid com 3 colunas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Caixa 1: Imagem Original */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide whitespace-nowrap text-center">
                      Imagem Original
                    </h4>
                    <button
                      onClick={() => {
                        if (state.rawImageUrl) {
                          selectImageByType('original');
                        } else {
                          fileInputRef.current?.click();
                        }
                      }}
                      className={`relative w-full aspect-[3/4] rounded-lg overflow-hidden border-2 border-dashed bg-white transition-all ${
                        currentViewingImage?.type === 'original' && state.rawImageUrl
                          ? "border-purple-600 ring-2 ring-purple-500"
                          : "border-purple-400 hover:border-purple-500"
                      }`}
                    >
                      {state.rawImageUrl ? (
                        <img
                          src={state.rawImageUrl}
                          alt="Imagem original"
                          className="w-full h-full object-contain bg-white"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-white p-3 min-h-[200px]">
                          <Upload className="h-10 w-10 mb-1.5 text-gray-600" />
                          <p className="text-xs text-center text-gray-700 font-medium leading-tight px-2">Clique ou<br />arraste</p>
                        </div>
                      )}
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <Upload className="w-3.5 h-3.5" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                      <span style={{ color: '#FFFFFF' }}>Trocar Foto</span>
                    </button>
                  </div>

                  {/* Caixa 2: Foto Catálogo */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide whitespace-nowrap text-center">
                      Foto Catálogo
                    </h4>
                    <button
                      onClick={() => {
                        if (state.generatedCatalogImage) {
                          selectImageByType('catalog');
                        }
                      }}
                      disabled={!state.generatedCatalogImage}
                      className={`relative w-full aspect-[3/4] rounded-lg overflow-hidden border-2 border-dashed bg-white transition-all ${
                        currentViewingImage?.type === 'catalog' && state.generatedCatalogImage
                          ? "border-purple-600 ring-2 ring-purple-500"
                          : "border-purple-400 hover:border-purple-500"
                      } ${!state.generatedCatalogImage ? "cursor-default" : "cursor-pointer"}`}
                    >
                      {state.generatedCatalogImage ? (
                        <img
                          src={state.generatedCatalogImage}
                          alt="Foto catálogo"
                          className="w-full h-full object-contain bg-white"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-white p-3 min-h-[200px]">
                          <ImageIcon className="h-10 w-10 mb-1.5 text-gray-600" />
                          <p className="text-xs text-center text-gray-700 font-medium leading-tight px-2">Nenhuma imagem<br />gerada</p>
                        </div>
                      )}
                    </button>
                    <button
                      onClick={handleGenerateCatalog}
                      disabled={generatingCatalog || !state.rawImageUrl || !state.selectedMannequinId}
                      className="w-full px-3 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      {generatingCatalog ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                          <span style={{ color: '#FFFFFF' }}>Gerando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                          <span style={{ color: '#FFFFFF' }}>GERAR IA</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Caixa 3: Look Combinado */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide whitespace-nowrap text-center">
                      Look Combinado
                    </h4>
                    <button
                      onClick={() => {
                        if (state.generatedCombinedImage) {
                          selectImageByType('combined');
                        }
                      }}
                      disabled={!state.generatedCombinedImage}
                      className={`relative w-full aspect-[3/4] rounded-lg overflow-hidden border-2 border-dashed bg-white transition-all ${
                        currentViewingImage?.type === 'combined' && state.generatedCombinedImage
                          ? "border-purple-600 ring-2 ring-purple-500"
                          : "border-purple-400 hover:border-purple-500"
                      } ${!state.generatedCombinedImage ? "cursor-default" : "cursor-pointer"}`}
                    >
                      {state.generatedCombinedImage ? (
                        <img
                          src={state.generatedCombinedImage}
                          alt="Look combinado"
                          className="w-full h-full object-contain bg-white"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-white p-3 min-h-[200px]">
                          <ImageIcon className="h-10 w-10 mb-1.5 text-gray-600" />
                          <p className="text-xs text-center text-gray-700 font-medium leading-tight px-2">Nenhuma imagem<br />gerada</p>
                        </div>
                      )}
                    </button>
                    <button
                      onClick={handleGenerateCombinedAuto}
                      disabled={!state.rawImageUrl || !state.selectedMannequinId || !state.aiAnalysisData || generatingCombined}
                      className="w-full px-3 py-2 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      {generatingCombined ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                          <span style={{ color: '#FFFFFF' }}>Gerando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                          <span style={{ color: '#FFFFFF' }}>GERAR IA</span>
                        </>
                      )}
                    </button>
                  </div>
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
              </div>
            </AnimatedCard>
        </div>

        {/* === COLUNA DIREITA: O Hub de Dados === */}
        <div className="w-full lg:flex-1 flex flex-col">
            {/* Card Unificado: Preenchimento Obrigatório + Análise Inteligente */}
            <AnimatedCard className="p-0 overflow-hidden bg-white dark:bg-slate-800 shadow-sm flex-1 flex flex-col">
              {/* Cabeçalho Vermelho/Rosa - Preenchimento Obrigatório no Topo */}
              <div className="bg-gradient-to-r from-red-600 to-rose-600 px-3 h-[52px] flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                  <AlertCircle className="w-7 h-7 text-white" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                  <span style={{ color: '#FFFFFF' }}>Preenchimento Obrigatório *</span>
                </h2>
                <span className="opacity-0 pointer-events-none">
                  {/* Espaço reservado para alinhar com o cabeçalho do Estúdio */}
                </span>
              </div>
              
              {/* Corpo Branco - Conteúdo Unificado */}
              <div className="p-3 space-y-3 bg-white flex-1 flex flex-col">
                {/* SEÇÃO 1: Preenchimento Obrigatório (No Topo) */}
                <div className="space-y-2 pb-3 border-b border-slate-200 dark:border-slate-700">
                  {/* Linha 1: Preços */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Preço (R$) <span style={{ color: '#ef4444', fontWeight: 'bold' }}>*</span>
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
                        className="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        style={{ 
                          border: '2px solid #ef4444', 
                          borderColor: '#ef4444',
                          borderWidth: '2px'
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.setProperty('border', '2px solid #ef4444', 'important');
                            el.style.setProperty('border-color', '#ef4444', 'important');
                            el.style.setProperty('border-width', '2px', 'important');
                          }
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#dc2626';
                          e.target.style.borderWidth = '2px';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#ef4444';
                          e.target.style.borderWidth = '2px';
                        }}
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
                        className="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        style={{ 
                          border: '2px solid #ef4444', 
                          borderColor: '#ef4444',
                          borderWidth: '2px'
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.setProperty('border', '2px solid #ef4444', 'important');
                            el.style.setProperty('border-color', '#ef4444', 'important');
                            el.style.setProperty('border-width', '2px', 'important');
                          }
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#dc2626';
                          e.target.style.borderWidth = '2px';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#ef4444';
                          e.target.style.borderWidth = '2px';
                        }}
                      />
                    </div>
                  </div>

                  {/* Linha 2: SKU e Estoque */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        SKU <span style={{ color: '#ef4444', fontWeight: 'bold' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={state.manualData.sku}
                        onChange={(e) => {
                          skuPrincipalEditadoManualRef.current = true;
                          setState(prev => ({
                            ...prev,
                            manualData: { ...prev.manualData, sku: e.target.value },
                          }));
                        }}
                        onFocus={() => {
                          // Se o SKU estiver vazio ao focar, permitir regeneração
                          if (!state.manualData.sku || !state.manualData.sku.trim()) {
                            skuPrincipalEditadoManualRef.current = false;
                          }
                        }}
                        placeholder="Auto-gerado"
                        title="SKU gerado automaticamente. Você pode editar se necessário."
                        className="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        style={{ 
                          border: '2px solid #ef4444', 
                          borderColor: '#ef4444',
                          borderWidth: '2px'
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.setProperty('border', '2px solid #ef4444', 'important');
                            el.style.setProperty('border-color', '#ef4444', 'important');
                            el.style.setProperty('border-width', '2px', 'important');
                          }
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#dc2626';
                          e.target.style.borderWidth = '2px';
                          // Se o SKU estiver vazio ao focar, permitir regeneração
                          if (!state.manualData.sku || !state.manualData.sku.trim()) {
                            skuPrincipalEditadoManualRef.current = false;
                          }
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#ef4444';
                          e.target.style.borderWidth = '2px';
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Estoque (Qtd Total) <span style={{ color: '#ef4444', fontWeight: 'bold' }}>*</span>
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
                        className="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        style={{ 
                          border: '2px solid #ef4444', 
                          borderColor: '#ef4444',
                          borderWidth: '2px'
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.setProperty('border', '2px solid #ef4444', 'important');
                            el.style.setProperty('border-color', '#ef4444', 'important');
                            el.style.setProperty('border-width', '2px', 'important');
                          }
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#dc2626';
                          e.target.style.borderWidth = '2px';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#ef4444';
                          e.target.style.borderWidth = '2px';
                        }}
                      />
                    </div>
                  </div>

                  {/* Switch: Este produto possui variações? */}
                  <div className="flex items-center justify-between py-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Este produto possui variações? (Ex: Cores, Tamanhos)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setState(prev => {
                          const novoEstadoVariacoes = !prev.temVariacoes;
                          
                          // Se está ativando variações e não há variações, restaurar as preservadas ou criar padrão
                          if (novoEstadoVariacoes && prev.variacoes.length === 0) {
                            if (variacoesPreservadasRef.current.length > 0) {
                              // Restaurar variações preservadas
                              return { ...prev, temVariacoes: novoEstadoVariacoes, variacoes: [...variacoesPreservadasRef.current] };
                            } else {
                              // Criar variações padrão P, M, G sem estoque preenchido
                              const variacoesPadrao = [
                                { id: Date.now().toString(), variacao: "P", estoque: "", sku: "" },
                                { id: (Date.now() + 1).toString(), variacao: "M", estoque: "", sku: "" },
                                { id: (Date.now() + 2).toString(), variacao: "G", estoque: "", sku: "" }
                              ];
                              variacoesPreservadasRef.current = variacoesPadrao;
                              return { ...prev, temVariacoes: novoEstadoVariacoes, variacoes: variacoesPadrao };
                            }
                          }
                          
                          // Se está desativando, preservar as variações atuais
                          if (!novoEstadoVariacoes && prev.variacoes.length > 0) {
                            variacoesPreservadasRef.current = [...prev.variacoes];
                          }
                          
                          return { ...prev, temVariacoes: novoEstadoVariacoes };
                        });
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        state.temVariacoes ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          state.temVariacoes ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* ÁREA DINÂMICA: Grade de Estoque (quando variações ativadas) - COMPACTA */}
                  {state.temVariacoes && (
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Grade de Estoque
                        </h4>
                        <select
                          value={state.manualData.unidadeMedida || "UN"}
                          onChange={(e) => {
                            setState(prev => ({
                              ...prev,
                              manualData: { ...prev.manualData, unidadeMedida: e.target.value }
                            }));
                          }}
                          className="text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-2 py-1 text-slate-900 dark:text-white focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                        >
                          <option value="UN">UN (Unidade)</option>
                          <option value="KG">KG (Quilograma)</option>
                          <option value="MT">MT (Metro)</option>
                          <option value="LT">LT (Litro)</option>
                          <option value="CX">CX (Caixa)</option>
                          <option value="PC">PC (Peça)</option>
                          <option value="DZ">DZ (Dúzia)</option>
                          <option value="PAR">PAR (Par)</option>
                        </select>
                      </div>
                      
                      {/* Lista de Variações - Compacta */}
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {state.variacoes.map((variacao) => (
                          <VariacaoRow
                            key={variacao.id}
                            variacao={variacao}
                            nomeProduto={state.aiAnalysisData?.nome_sugerido || ""}
                            onUpdate={(updated) => {
                              setState(prev => {
                                const novasVariacoes = prev.variacoes.map(v => v.id === variacao.id ? updated : v);
                                // Atualizar ref para preservar as variações atualizadas
                                variacoesPreservadasRef.current = [...novasVariacoes];
                                return {
                                  ...prev,
                                  variacoes: novasVariacoes,
                                };
                              });
                            }}
                            onRemove={() => {
                              setState(prev => {
                                const novasVariacoes = prev.variacoes.filter(v => v.id !== variacao.id);
                                // Atualizar ref para preservar as variações atualizadas
                                variacoesPreservadasRef.current = [...novasVariacoes];
                                return {
                                  ...prev,
                                  variacoes: novasVariacoes,
                                };
                              });
                            }}
                          />
                        ))}
                      </div>

                      {/* Botão Adicionar Variação */}
                      <button
                        type="button"
                        onClick={() => {
                          const novaId = Date.now().toString();
                          setState(prev => {
                            const novasVariacoes = [
                              ...prev.variacoes,
                              { id: novaId, variacao: "", estoque: "", sku: "" }
                            ];
                            // Atualizar ref para preservar as variações atualizadas
                            variacoesPreservadasRef.current = [...novasVariacoes];
                            return {
                              ...prev,
                              variacoes: novasVariacoes,
                            };
                          });
                        }}
                        className="w-full h-6 rounded border-2 border-solid border-blue-300 dark:border-blue-400 bg-blue-300 dark:bg-blue-400 px-2 py-0 text-xs font-semibold hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors duration-200 flex items-center justify-center gap-1.5"
                        style={{ color: '#FFFFFF' }}
                      >
                        <Plus className="h-2.5 w-2.5 stroke-[2.5]" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                        <span style={{ color: '#FFFFFF' }}>Adicionar Variação</span>
                      </button>
                    </div>
                  )}

                  {/* Card de Medidas - Abaixo da Grade de Estoque */}
                  <MeasurementGuideCard
                    aiCategory={state.aiAnalysisData?.suggested_category || state.aiAnalysisData?.categoria_sugerida}
                    aiProductType={state.aiAnalysisData?.product_type}
                    aiKeywords={state.aiAnalysisData?.tags}
                    imagemMedidasCustomizada={state.imagemMedidasCustomizada}
                    onUploadManual={(file) => handleMedidasFileSelect(file)}
                    onRemoveCustom={() => {
                      setState(prev => ({ ...prev, imagemMedidasCustomizada: null }));
                    }}
                    uploading={uploadingMedidas}
                    medidasFileInputRef={medidasFileInputRef}
                    variacoes={state.variacoes}
                    onMedidasChange={(medidas) => {
                      // Salvar medidas no estado do produto (pode ser adicionado ao estado se necessário)
                      console.log('Medidas atualizadas:', medidas);
                    }}
                    sizeCategory={state.sizeCategory}
                    targetAudience={state.targetAudience}
                  />

                  {/* Toggles */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
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

                {/* SEÇÃO 2: Análise Inteligente & SEO (Accordion Colapsável) */}
                <div className="space-y-2 pt-2">
                  {/* Cabeçalho Roxo Interno - Clicável para Expandir/Colapsar */}
                  <button
                    onClick={() => setAnaliseAccordionOpen(!analiseAccordionOpen)}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 px-3 h-[52px] flex items-center justify-between rounded-lg hover:from-purple-700 hover:to-indigo-800 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-7 h-7 text-white" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                      <div className="flex flex-col items-start">
                        <h2 className="text-lg font-bold text-white" style={{ color: '#FFFFFF' }}>
                          Análise Inteligente & SEO
                        </h2>
                        {!analiseAccordionOpen && state.aiAnalysisData && (
                          <p className="text-xs text-white/80" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            {state.aiAnalysisData.nome_sugerido || state.aiAnalysisData.product_type || 'Análise concluída'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {analiseAccordionOpen ? (
                        <ChevronUp className="w-5 h-5 text-white" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-white" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                      )}
                    </div>
                  </button>

                  {/* Conteúdo do Accordion */}
                  {analiseAccordionOpen && (
                    <div className="space-y-2 pt-2">
                      {/* Botão Regenerar - Movido para dentro do accordion */}
                      <div className="flex justify-end">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const imageUrlToAnalyze = state.rawImageUrl || state.selectedCoverImage;
                            if (!imageUrlToAnalyze) {
                              alert("Por favor, faça upload de uma imagem primeiro.");
                              return;
                            }
                            try {
                              console.log("[ProductEditor] 🔄 Regenerando análise para:", imageUrlToAnalyze);
                              lastAnalyzedUrlRef.current = "";
                              await analyzeImage(imageUrlToAnalyze);
                            } catch (error: any) {
                              console.error("[ProductEditor] Erro ao regenerar análise:", error);
                              alert(`Erro ao regenerar análise: ${error.message || "Erro desconhecido"}`);
                            }
                          }}
                          disabled={analyzing || (!state.rawImageUrl && !state.selectedCoverImage)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-purple-300 dark:border-purple-700"
                        >
                          {analyzing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Analisando...</span>
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-4 h-4" />
                              <span>Regenerar Análise</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Subseção: Marketing & SEO */}
                      <div className="space-y-2 pt-2">
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
                      <div className="space-y-2 pt-2">
                        <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Ficha Técnica Automática
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                  )}
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

