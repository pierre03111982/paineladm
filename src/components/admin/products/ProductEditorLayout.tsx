"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Upload, Sparkles, RotateCcw, Save, Loader2, Package, X, Plus, Edit, ArrowLeft, Image as ImageIcon, AlertCircle, Info, AlertTriangle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Tag, Ruler, Venus, Mars, Baby, UserCircle, User, Star } from "lucide-react";
import { MANNEQUIN_STYLES } from "@/lib/ai-services/mannequin-prompts";
import { ManualCombinationModal } from "./ManualCombinationModal";
import { IconPageHeader } from "@/app/(lojista)/components/icon-page-header";
import { getPageHeaderColors } from "@/app/(lojista)/components/page-header-colors";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { normalizeCategory, getConsolidatedCategories } from "@/lib/categories/consolidated-categories";
import { SmartMeasurementEditor } from "./SmartMeasurementEditor";
import type { SmartGuideData, MeasurementPoint, SizeKey } from "@/types/measurements";

// Estado consolidado do produto
export interface ProductEditorState {
  // Imagens
  rawImageUrl: string;
  rawImageFile: File | null;
  generatedCatalogImage: string | null;
  generatedCombinedImage: string | null;
  selectedCoverImage: string | null;
  imagemMedidasCustomizada: string | null; // Imagem de medidas inserida manualmente
  extraImages: Array<{ idx: number; url: string; file: File | null }>; // Imagens extras (Foto Verso, Extra 1-4)
  smartMeasurements?: SmartGuideData; // Dados do editor inteligente de medidas
  
  // Persistência de medidas por público alvo e grade
  // Armazena medidas coletadas para cada combinação de público alvo + grade
  // Chave: `${targetAudience}_${sizeCategory}`, Valor: SmartGuideData
  persistedMeasurementsByAudience?: Record<string, SmartGuideData>;
  
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
    colors_by_item?: Array<{ item: string; colors: Array<{ hex: string; name: string }> }>; // Cores por item (para conjuntos)
    standard_measurements?: {
      bust?: number;
      waist?: number;
      hip?: number;
      length?: number;
    }; // Medidas padrão coletadas da análise inteligente (tamanho M)
    detected_audience?: 'KIDS' | 'ADULT'; // Público alvo detectado pela IA
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
    equivalence?: string; // Referência em outra grade (ex: "38" -> "M")
  }>;
  // Grade de Tamanho
  sizeCategory: 'standard' | 'plus' | 'numeric' | 'baby' | 'kids_numeric' | 'teen'; // Grades dinâmicas
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

// Sistema de Grades Dinâmicas
const SIZE_GRIDS = {
  ADULT: [
    { id: 'standard', label: 'Letras (Padrão)', examples: 'PP, P, M, G, GG', icon: Tag },
    { id: 'numeric', label: 'Numérica (Jeans)', examples: '36, 38, 40, 42', icon: Ruler },
    { id: 'plus', label: 'Plus Size', examples: 'G1, G2, G3, 46+', icon: Package },
  ],
  KIDS: [
    { id: 'baby', label: 'Bebê (Meses)', examples: 'RN, 3M, 6M, 9M', icon: Baby },
    { id: 'kids_numeric', label: 'Infantil (Anos)', examples: '2, 4, 6, 8, 10', icon: UserCircle },
    { id: 'teen', label: 'Juvenil', examples: '12, 14, 16', icon: User },
  ],
};

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
  variacao: { id: string; variacao: string; estoque: string; sku: string; equivalence?: string }; 
  nomeProduto: string;
  onUpdate: (updated: { id: string; variacao: string; estoque: string; sku: string; equivalence?: string }) => void;
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
      <div className="col-span-2">
        <input
          type="text"
          value={variacao.variacao}
          onChange={(e) => {
            onUpdate({ ...variacao, variacao: e.target.value });
          }}
          placeholder="P"
          className="w-full h-6 rounded border border-gray-300 bg-white px-1.5 py-0 text-xs leading-tight text-slate-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
        />
      </div>

      <div className="col-span-2">
        <input
          type="text"
          value={variacao.equivalence || ""}
          onChange={(e) => {
            onUpdate({ ...variacao, equivalence: e.target.value });
          }}
          placeholder="Ref: M"
          className="w-full h-6 rounded border border-gray-300 bg-white px-1.5 py-0 text-xs leading-tight text-slate-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
          title="Referência em outra grade (ex: 38 = M)"
        />
      </div>

      <div className="col-span-2">
        <input
          type="number"
          min="0"
          value={variacao.estoque}
          onChange={(e) => {
            onUpdate({ ...variacao, estoque: e.target.value });
          }}
          placeholder="10"
          className="w-full h-6 rounded border border-gray-300 bg-white px-1.5 py-0 text-xs leading-tight text-slate-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
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
          className="w-full h-6 rounded border border-gray-300 bg-white px-1.5 py-0 text-xs leading-tight text-slate-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
          title="SKU gerado automaticamente. Você pode editar se necessário."
        />
      </div>

      <div className="col-span-1">
        <button
          type="button"
          onClick={onRemove}
          className="w-full h-6 flex items-center justify-center rounded border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
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
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const dropzoneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const medidasFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingMedidas, setUploadingMedidas] = useState(false);

  // Ler preferência de Grade de Tamanho do localStorage
  const getInitialSizeCategory = (): 'standard' | 'plus' | 'numeric' | 'baby' | 'kids_numeric' | 'teen' => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastSizeCategory');
      if (saved === 'standard' || saved === 'plus' || saved === 'numeric' || saved === 'baby' || saved === 'kids_numeric' || saved === 'teen') {
        return saved as any;
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
    extraImages: [],
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
      { id: "1", variacao: "P", estoque: "", sku: "", equivalence: "" },
      { id: "2", variacao: "M", estoque: "", sku: "", equivalence: "" },
      { id: "3", variacao: "G", estoque: "", sku: "", equivalence: "" },
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
  const [viewingImageTab, setViewingImageTab] = useState<'original' | 'catalog' | 'combined' | 'measurements'>('original'); // Aba ativa no Passo 2
  const [uploadViewerIndex, setUploadViewerIndex] = useState(0); // Índice da imagem na visualização de uploads
  const [showManualModal, setShowManualModal] = useState(false);
  const [showAudienceConfirmation, setShowAudienceConfirmation] = useState(false);
  const [creditInfo, setCreditInfo] = useState({ credits: 0, catalogPack: 0 });
  
  // Estados para o 6-Shot AI Studio
  const [studioImages, setStudioImages] = useState<{
    slot1: { url: string | null; generating: boolean }; // Ghost Mannequin Frente
    slot2: { url: string | null; generating: boolean }; // Ghost Mannequin Costas
    slot3: { url: string | null; generating: boolean; scenario: string; model: string }; // Virtual Model Frente
    slot4: { url: string | null; generating: boolean }; // Virtual Model Costas/Meio-Perfil
    slot5: { url: string | null; generating: boolean; combinedProductId: string | null }; // Look Combinado A
    slot6: { url: string | null; generating: boolean }; // Look Combinado B (Zoom/Detalhe)
  }>({
    slot1: { url: null, generating: false },
    slot2: { url: null, generating: false },
    slot3: { url: null, generating: false, scenario: 'urbano', model: 'morena' },
    slot4: { url: null, generating: false },
    slot5: { url: null, generating: false, combinedProductId: null },
    slot6: { url: null, generating: false },
  });
  const [showCombinedModal, setShowCombinedModal] = useState(false);
  const [selectedSlotForCombined, setSelectedSlotForCombined] = useState<5 | 6 | null>(null);

  // Ref para preservar variações quando o switch é desativado
  const variacoesPreservadasRef = useRef<Array<{ id: string; variacao: string; estoque: string; sku: string; equivalence?: string }>>(
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

  // Atualizar índice quando nova imagem de medidas for gerada
  useEffect(() => {
    if (state.smartMeasurements?.baseImage) {
      // Se a imagem de medidas foi gerada, atualizar o índice para mostrar ela
      // Coletar todas as imagens geradas para determinar o índice correto
      const allGeneratedImages = [];
      if (state.smartMeasurements?.baseImage) {
        allGeneratedImages.push({ url: state.smartMeasurements.baseImage, type: 'measurements' });
      }
      if (state.generatedCatalogImage) {
        allGeneratedImages.push({ url: state.generatedCatalogImage, type: 'catalog' });
      }
      if (state.generatedCombinedImage) {
        allGeneratedImages.push({ url: state.generatedCombinedImage, type: 'combined' });
      }
      
      // Encontrar o índice da imagem de medidas
      const measurementsIndex = allGeneratedImages.findIndex(img => img.type === 'measurements');
      if (measurementsIndex >= 0 && viewingImageIndex !== measurementsIndex) {
        setViewingImageIndex(measurementsIndex);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.smartMeasurements?.baseImage]);

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
  const analyzingRef = useRef<boolean>(false); // Ref para evitar chamadas simultâneas
  const has429ErrorRef = useRef<boolean>(false); // Ref simples: se houve erro 429, não tentar automaticamente novamente
  const last429ErrorTimeRef = useRef<number>(0); // Timestamp do último erro 429 para permitir nova tentativa após 15 minutos

  // === HANDLER DE ANÁLISE IA ===
  const analyzeImage = async (imageUrl: string) => {
    // Proteção contra chamadas simultâneas
    if (analyzingRef.current) {
      console.warn("[ProductEditor] ⚠️ Análise já em andamento, ignorando chamada duplicada");
      return;
    }
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
      analyzingRef.current = true;
      setAnalyzing(true);
      console.log("[ProductEditor] 🔍 Iniciando análise com imageUrl:", imageUrl.substring(0, 100) + "...");
      console.log("[ProductEditor] 🔍 lojistaId:", lojistaId);
      
      // Preparar contexto para a análise
      const context: {
        audience?: 'KIDS' | 'ADULT';
        sizeSystem?: 'AGE_BASED' | 'LETTER_BASED' | 'NUMERIC';
      } = {};
      
      // Mapear targetAudience para audience
      if (state.targetAudience === 'kids') {
        context.audience = 'KIDS';
      } else if (state.targetAudience === 'female' || state.targetAudience === 'male') {
        context.audience = 'ADULT';
      }
      
      // Mapear sizeCategory para sizeSystem (corrigido conforme documento)
      if (state.targetAudience === 'kids') {
        // Grades infantis
        if (state.sizeCategory === 'baby') {
          context.sizeSystem = 'AGE_BASED'; // Bebê usa meses (idade)
        } else if (state.sizeCategory === 'kids_numeric' || state.sizeCategory === 'teen') {
          context.sizeSystem = 'AGE_BASED'; // Infantil/Juvenil usa anos (idade)
        } else {
          context.sizeSystem = 'AGE_BASED'; // Padrão para kids
        }
      } else {
        // Grades adultas
        if (state.sizeCategory === 'numeric') {
          context.sizeSystem = 'NUMERIC'; // Numérica (36, 38, 40)
        } else if (state.sizeCategory === 'plus') {
          context.sizeSystem = 'NUMERIC'; // Plus Size usa numérico (G1, G2, etc.)
        } else {
          context.sizeSystem = 'LETTER_BASED'; // Padrão usa letras (P, M, G, GG)
        }
      }
      
      const requestBody = { 
        imageUrl: imageUrl,
        context: Object.keys(context).length > 0 ? context : undefined
      };
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
        if (!responseText || responseText.trim() === "") {
          throw new Error("Resposta vazia do servidor");
        }
        
        // Verificar se parece JSON antes de tentar parsear
        const trimmedText = responseText.trim();
        if (!trimmedText.startsWith("{") && !trimmedText.startsWith("[")) {
          console.error("[ProductEditor] ❌ Resposta não parece ser JSON:", trimmedText.substring(0, 200));
          throw new Error(`Resposta do servidor não é JSON válido. Recebido: ${trimmedText.substring(0, 100)}...`);
        }
        
        responseData = JSON.parse(responseText);
      } catch (parseError: any) {
        console.error("[ProductEditor] ❌ Erro ao parsear JSON da resposta:", parseError);
        console.error("[ProductEditor] 📄 Resposta completa recebida:", responseText);
        console.error("[ProductEditor] 📄 Tamanho da resposta:", responseText?.length || 0);
        
        // Tentar obter mais detalhes do erro de parsing
        const errorPosition = parseError.message?.match(/position (\d+)/)?.[1];
        if (errorPosition) {
          const pos = parseInt(errorPosition);
          const start = Math.max(0, pos - 50);
          const end = Math.min(responseText?.length || 0, pos + 50);
          console.error("[ProductEditor] 📍 Contexto ao redor do erro (posição", pos, "):", responseText?.substring(start, end));
        }
        
        // Se a resposta parece HTML, informar ao usuário
        if (responseText?.includes("<!DOCTYPE") || responseText?.includes("<html")) {
          throw new Error(`O servidor retornou HTML ao invés de JSON. Isso geralmente indica um erro interno. Verifique os logs do servidor.`);
        }
        
        // Mensagem mais clara para erro de JSON malformado
        const errorMsg = parseError.message?.includes("Expected double-quoted property") 
          ? "A resposta do servidor contém JSON malformado. Tente novamente ou preencha os campos manualmente."
          : `Erro ao processar resposta do servidor: ${parseError.message || "JSON inválido"}`;
        
        throw new Error(`Erro ao analisar imagem: ${errorMsg}`);
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
      
      // Processar cores: usar apenas dados precisos da API
      let processedColors = analysisData.dominant_colors || [];
      
      // Validar se as cores são precisas (não genéricas)
      if (Array.isArray(processedColors) && processedColors.length > 0) {
        // Filtrar cores genéricas ou sem hex válido
        processedColors = processedColors.filter(color => {
          // Verificar se tem hex válido e nome não genérico
          const hasValidHex = color.hex && color.hex.startsWith('#') && color.hex.length === 7;
          const hasValidName = color.name && 
            !color.name.toLowerCase().includes('não identificad') &&
            !color.name.toLowerCase().includes('não especificad') &&
            color.name.trim().length > 0;
          return hasValidHex && hasValidName;
        });
      }
      
      // Se não houver dominant_colors válidos mas houver cor_predominante específica, usar
      if (processedColors.length === 0 && analysisData.cor_predominante) {
        const corPredominante = analysisData.cor_predominante.trim();
        // Só usar se não for genérica
        if (corPredominante && 
            !corPredominante.toLowerCase().includes('não identificad') &&
            !corPredominante.toLowerCase().includes('não especificad') &&
            corPredominante.length > 2) {
          processedColors = [{
            hex: "#808080", // Cor padrão cinza se não houver hex específico
            name: corPredominante
          }];
        }
      }
      
      // Limpar data da descrição SEO se existir
      let descricaoSEOLimpa = (analysisData.descricao_seo || "").toString();
      descricaoSEOLimpa = descricaoSEOLimpa
        .replace(/\[Análise IA[^\]]*\]\s*/g, "") // Remove [Análise IA - data]
        .trim();
      
      // A IA agora está configurada para gerar textos COMPLETOS dentro de 470 caracteres
      // Descrição SEO agora não tem limite - manter texto completo
      
      // Validação de tecido: usar apenas dados precisos da API
      const detectedFabric = analysisData.detected_fabric || analysisData.tecido_estimado || "";
      
      // Validar se o tecido é preciso (não genérico)
      let finalDetectedFabric = "";
      if (detectedFabric && detectedFabric.trim() !== "") {
        const fabricLower = detectedFabric.toLowerCase().trim();
        // Verificar se não é genérico
        const isGeneric = 
          fabricLower.includes('não identificad') ||
          fabricLower.includes('não especificad') ||
          fabricLower.includes('tecido de qualidade') ||
          fabricLower.includes('material de qualidade') ||
          fabricLower === 'tecido' ||
          fabricLower === 'material' ||
          fabricLower.length < 3;
        
        if (!isGeneric) {
          finalDetectedFabric = detectedFabric.trim();
        }
      }
      
      // NÃO usar fallbacks genéricos - deixar vazio se não houver dados precisos
      // O usuário pode preencher manualmente se necessário
      
      // Log de validação dos dados processados
      // Processar colors_by_item para conjuntos (cores separadas por item)
      let processedColorsByItem = analysisData.colors_by_item;
      console.log("[ProductEditor] 🎨 Cores por item recebidas da API:", {
        hasColorsByItem: !!processedColorsByItem,
        isArray: Array.isArray(processedColorsByItem),
        length: Array.isArray(processedColorsByItem) ? processedColorsByItem.length : 0,
        rawData: processedColorsByItem,
        productType: analysisData.product_type,
        isConjunto: analysisData.product_type?.toLowerCase().includes('conjunto'),
      });
      
      if (Array.isArray(processedColorsByItem) && processedColorsByItem.length > 0) {
        // Validar e filtrar cores por item
        processedColorsByItem = processedColorsByItem.map(itemData => ({
          item: itemData.item || "Item",
          colors: (itemData.colors || []).filter((color: { hex: string; name: string }) => {
            const hasValidHex = color?.hex && color.hex.startsWith('#') && color.hex.length === 7;
            const hasValidName = color?.name && 
              !color.name.toLowerCase().includes('não identificad') &&
              !color.name.toLowerCase().includes('não especificad') &&
              color.name.trim().length > 0;
            return hasValidHex && hasValidName;
          })
        })).filter(itemData => itemData.colors.length > 0);
        
        console.log("[ProductEditor] 🎨 Cores por item processadas e validadas:", {
          itemsCount: processedColorsByItem.length,
          items: processedColorsByItem.map((item: { item: string; colors: Array<{ hex: string; name: string }> }) => ({
            item: item.item,
            colorsCount: item.colors.length,
            colors: item.colors.map((c: { hex: string; name: string }) => c.name),
          })),
        });
      } else {
        console.log("[ProductEditor] ⚠️ Nenhuma cor por item encontrada ou inválida. Verificando se é conjunto...", {
          productType: analysisData.product_type,
          hasColorsByItem: !!processedColorsByItem,
        });
      }
      
      console.log("[ProductEditor] 🔍 Validação de dados da análise:", {
        detected_fabric_original: analysisData.detected_fabric,
        detected_fabric_final: finalDetectedFabric,
        dominant_colors_original: analysisData.dominant_colors,
        dominant_colors_final: processedColors,
        colors_by_item_original: analysisData.colors_by_item,
        colors_by_item_processed: processedColorsByItem,
        cor_predominante_original: analysisData.cor_predominante,
        hasValidFabric: !!finalDetectedFabric,
        hasValidColors: processedColors.length > 0,
        hasColorsByItem: !!(processedColorsByItem && processedColorsByItem.length > 0),
        standard_measurements: analysisData.standard_measurements,
      });
      
      const newAiAnalysisData = {
        nome_sugerido: analysisData.nome_sugerido || "",
        descricao_seo: descricaoSEOLimpa,
        tags: analysisData.tags || [], // Mantido apenas internamente
        suggested_category: mappedCategory,
        categoria_sugerida: mappedCategory, // Compatibilidade
        product_type: analysisData.product_type || "",
        detected_fabric: finalDetectedFabric, // Vazio se não houver dados precisos
        dominant_colors: processedColors, // Array vazio se não houver cores precisas
        colors_by_item: processedColorsByItem && processedColorsByItem.length > 0 
          ? processedColorsByItem 
          : undefined, // Cores por item (para conjuntos) - preservar se houver
        standard_measurements: analysisData.standard_measurements || undefined, // Medidas padrão coletadas da análise
        cor_predominante: processedColors[0]?.name || "", // Vazio se não houver cor precisa
        tecido_estimado: finalDetectedFabric, // Vazio se não houver tecido preciso
        detalhes: analysisData.detalhes || [], // Compatibilidade
        detected_audience: analysisData.detected_audience, // Público alvo detectado pela IA
      };
      
      console.log("[ProductEditor] 📏 Medidas padrão coletadas da análise:", newAiAnalysisData.standard_measurements);
      console.log("[ProductEditor] 🎨 Cores por item no resultado final:", newAiAnalysisData.colors_by_item);
      console.log("[ProductEditor] ✅ Dados finais processados:", {
        fabric: newAiAnalysisData.detected_fabric || "(vazio - sem dados precisos)",
        colors: newAiAnalysisData.dominant_colors.length > 0 
          ? newAiAnalysisData.dominant_colors.map((c: { hex: string; name: string }) => c.name).join(", ")
          : "(vazio - sem dados precisos)",
        colorsByItem: newAiAnalysisData.colors_by_item 
          ? newAiAnalysisData.colors_by_item.map((item: { item: string; colors: Array<{ hex: string; name: string }> }) => `${item.item}: ${item.colors.map((c: { hex: string; name: string }) => c.name).join(", ")}`).join(" | ")
          : "(nenhum conjunto detectado)",
      });
      
      // Verificar inconsistência entre público alvo selecionado e detectado pela IA
      const detectedAudience = analysisData.detected_audience;
      const selectedAudience = state.targetAudience;
      let hasInconsistency = false;
      
      if (detectedAudience) {
        // Mapear detected_audience para targetAudience
        // KIDS sempre mapeia para 'kids'
        // ADULT pode ser 'female' ou 'male' (mantém o selecionado se já for adulto)
        const isSelectedAdult = selectedAudience === 'female' || selectedAudience === 'male';
        const isDetectedAdult = detectedAudience === 'ADULT';
        const isSelectedKids = selectedAudience === 'kids';
        const isDetectedKids = detectedAudience === 'KIDS';
        
        // Inconsistência: selecionou adulto mas IA detectou kids, ou vice-versa
        if ((isSelectedAdult && isDetectedKids) || (isSelectedKids && isDetectedAdult)) {
          hasInconsistency = true;
          console.log("[ProductEditor] ⚠️ Inconsistência detectada:", {
            selecionado: selectedAudience,
            detectado: detectedAudience,
            isSelectedAdult,
            isDetectedAdult,
            isSelectedKids,
            isDetectedKids
          });
        }
      }
      
      console.log("[ProductEditor] ✅ Salvando no estado:", {
        product_type: newAiAnalysisData.product_type,
        detected_fabric: newAiAnalysisData.detected_fabric,
        dominant_colors: newAiAnalysisData.dominant_colors,
        dominant_colors_length: newAiAnalysisData.dominant_colors?.length || 0,
        detected_audience: newAiAnalysisData.detected_audience,
        hasInconsistency,
        fullData: newAiAnalysisData
      });
      
      setState(prev => ({
        ...prev,
        aiAnalysisData: newAiAnalysisData,
      }));
      
      // Detectar landmarks automaticamente após análise completar
      // Isso carrega as medidas automaticamente
      // Usar o imageUrl passado para a função analyzeImage (que é o rawImageUrl atual)
      if (imageUrl && (newAiAnalysisData.suggested_category || newAiAnalysisData.categoria_sugerida || newAiAnalysisData.product_type)) {
        console.log("[ProductEditor] 🤖 Condições atendidas para detecção automática de landmarks:", {
          hasImage: !!imageUrl,
          imageUrl: imageUrl.substring(0, 100) + "...",
          category: newAiAnalysisData.suggested_category || newAiAnalysisData.categoria_sugerida,
          productType: newAiAnalysisData.product_type,
          standardMeasurements: newAiAnalysisData.standard_measurements,
        });
        
        setTimeout(async () => {
          await handleDetectLandmarksAutomatically(imageUrl, newAiAnalysisData);
        }, 1500);
      } else {
        console.log("[ProductEditor] ⚠️ Condições não atendidas para detecção automática:", {
          hasImage: !!imageUrl,
          category: newAiAnalysisData.suggested_category || newAiAnalysisData.categoria_sugerida,
          productType: newAiAnalysisData.product_type,
        });
      }
      
      // Se houver inconsistência, mostrar modal de confirmação
      if (hasInconsistency) {
        setShowAudienceConfirmation(true);
      }
      
      // Log após atualização (usando setTimeout para garantir que o estado foi atualizado)
      setTimeout(() => {
        console.log("[ProductEditor] ✅ Estado após atualização:", {
          product_type: newAiAnalysisData.product_type,
          detected_fabric: newAiAnalysisData.detected_fabric,
          dominant_colors: newAiAnalysisData.dominant_colors,
        });
      }, 100);
    } catch (error: any) {
      const errorMessage = error.message || "";
      console.error("[ProductEditor] ❌ Erro na análise:", errorMessage);
      
      // Se for erro 429, marcar que houve erro e parar tentativas automáticas
      if (errorMessage.includes("429") || errorMessage.includes("Resource exhausted")) {
        has429ErrorRef.current = true; // Marcar que houve erro 429 - não tentar automaticamente novamente
        last429ErrorTimeRef.current = Date.now(); // Registrar timestamp do erro
        alert(`⚠️ Limite de uso da API Gemini atingido. A análise automática foi interrompida. Aguarde alguns minutos ou use o botão "Regenerar Análise" para tentar manualmente.`);
        console.error("[ProductEditor] 🚫 Erro 429 registrado. Tentativas automáticas interrompidas. Aguarde 15 minutos ou use o botão manual.");
        return;
      } else {
        // Mensagem mais amigável para erro de JSON malformado
        const userFriendlyMessage = errorMessage.includes("JSON malformado") || errorMessage.includes("Expected double-quoted")
          ? "Erro ao processar análise da imagem. A resposta do servidor está incorreta. Você pode tentar novamente ou preencher os campos manualmente."
          : errorMessage;
        
        alert(`Erro ao analisar imagem: ${userFriendlyMessage}`);
      }
    } finally {
      analyzingRef.current = false;
      setAnalyzing(false);
    }
  };

  // Análise automática quando a imagem for carregada
  // SIMPLES: Apenas uma tentativa automática. Se der erro 429, parar completamente (mas permitir após 15 minutos).
  useEffect(() => {
    // Verificar se estamos no cliente (evitar problemas de hidratação)
    if (typeof window === 'undefined') {
      return;
    }
    
    // Verificar se o erro 429 já expirou (15 minutos)
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    if (has429ErrorRef.current && last429ErrorTimeRef.current > 0) {
      const timeSinceError = Date.now() - last429ErrorTimeRef.current;
      if (timeSinceError >= FIFTEEN_MINUTES) {
        // Erro 429 expirou, permitir nova tentativa automática
        console.log("[ProductEditor] ⏰ Erro 429 expirou (passaram mais de 15 minutos). Permitindo nova tentativa automática.");
        has429ErrorRef.current = false;
        last429ErrorTimeRef.current = 0;
      } else {
        const minutesRemaining = Math.ceil((FIFTEEN_MINUTES - timeSinceError) / 1000 / 60);
        console.log(`[ProductEditor] ⏭️ Erro 429 ainda ativo (${minutesRemaining} minuto(s) restante(s)). Use o botão 'Regenerar Análise' para tentar manualmente.`);
        return;
      }
    }
    
    // VALIDAÇÕES: Se não temos URL, já temos análise, ou está analisando, não fazer nada
    if (!state.rawImageUrl || state.aiAnalysisData || analyzing || analyzingRef.current) {
      return;
    }
    
    // Verificar se é uma URL válida
    if (!state.rawImageUrl.startsWith("http://") && !state.rawImageUrl.startsWith("https://")) {
      return;
    }
    
    // VERIFICAÇÃO DE DUPLICATAS: Se já está marcado como analisada, não tentar novamente
    if (state.rawImageUrl === lastAnalyzedUrlRef.current) {
      console.log("[ProductEditor] ⏭️ Imagem já foi marcada para análise");
      return;
    }
    
    // Marcar como analisada IMEDIATAMENTE para evitar disparos duplicados
    lastAnalyzedUrlRef.current = state.rawImageUrl;
    
    console.log("[ProductEditor] 📝 Iniciando análise automática da imagem:", state.rawImageUrl.substring(0, 50));
    
    // Delay simples de 2 segundos para garantir que o upload foi concluído
    const timer = setTimeout(() => {
      // Verificações finais antes de executar
      if (
        state.rawImageUrl === lastAnalyzedUrlRef.current && 
        !state.aiAnalysisData && 
        !analyzing && 
        !analyzingRef.current &&
        !has429ErrorRef.current &&
        typeof window !== 'undefined'
      ) {
        console.log("[ProductEditor] 🔍 Executando análise automática da imagem");
        analyzeImage(state.rawImageUrl).catch(err => {
          console.error("[ProductEditor] ❌ Erro na análise automática:", err);
          // Não fazer nada aqui - o erro já foi tratado no analyzeImage
        });
      } else {
        console.log("[ProductEditor] ⏭️ Análise cancelada - condições mudaram durante o delay");
      }
    }, 2000);
    
    return () => {
      clearTimeout(timer);
    };
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
  const handleFileSelect = async (file: File, imageIndex?: number) => {
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
      
      // Se for a primeira imagem (Foto Frente)
      if (imageIndex === undefined || imageIndex === 1) {
        // Resetar referências para permitir nova análise
        lastAnalyzedUrlRef.current = "";
        has429ErrorRef.current = false;
        last429ErrorTimeRef.current = 0;
        analyzingRef.current = false;
        
        setState(prev => ({
          ...prev,
          rawImageUrl: data.imageUrl,
          rawImageFile: file,
          selectedCoverImage: data.imageUrl,
          aiAnalysisData: null,
        }));
        
        setViewingImageIndex(0);
        setUploadViewerIndex(0); // Resetar visualizador de uploads
      } else {
        // Para imagens extras, adicionar ao array
        setState(prev => {
          const existingIndex = prev.extraImages.findIndex(img => img.idx === imageIndex);
          const newExtraImage = { idx: imageIndex, url: data.imageUrl, file };
          
          let updatedExtraImages;
          if (existingIndex >= 0) {
            // Substituir imagem existente
            updatedExtraImages = [...prev.extraImages];
            updatedExtraImages[existingIndex] = newExtraImage;
          } else {
            // Adicionar nova imagem
            updatedExtraImages = [...prev.extraImages, newExtraImage];
          }
          
          // Se foi uma nova imagem (não substituição), mostrar ela no visualizador
          if (existingIndex < 0) {
            const allImages: string[] = [];
            if (prev.rawImageUrl) allImages.push(prev.rawImageUrl);
            updatedExtraImages.forEach(img => {
              if (img.url) allImages.push(img.url);
            });
            const newImageIndex = allImages.length - 1;
            setTimeout(() => {
              setUploadViewerIndex(newImageIndex);
            }, 0);
          }
          
          return { ...prev, extraImages: updatedExtraImages };
        });
      }
    } catch (error: any) {
      console.error("[ProductEditor] Erro no upload:", error);
      alert(`Erro ao fazer upload: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent, imageIndex?: number) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file, imageIndex);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handler para excluir imagem
  const handleDeleteImage = (imageIndex: number) => {
    if (imageIndex === 1) {
      // Excluir foto frente (rawImageUrl)
      setState(prev => ({
        ...prev,
        rawImageUrl: "",
        rawImageFile: null,
        selectedCoverImage: null,
        aiAnalysisData: null,
      }));
      setUploadViewerIndex(0);
    } else {
      // Excluir imagem extra
      setState(prev => ({
        ...prev,
        extraImages: prev.extraImages.filter(img => img.idx !== imageIndex),
      }));
    }
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

  // Função auxiliar para obter tamanhos da grade (mesma lógica do SmartMeasurementEditor)
  const getSizesForGrade = (
    sizeCategory?: 'standard' | 'plus' | 'numeric' | 'baby' | 'kids_numeric' | 'teen',
    targetAudience?: 'female' | 'male' | 'kids'
  ): string[] => {
    if (targetAudience === 'kids') {
      if (sizeCategory === 'baby') {
        return ['RN', '3M', '6M', '9M', '12M'];
      } else if (sizeCategory === 'kids_numeric') {
        return ['2', '4', '6', '8', '10'];
      } else if (sizeCategory === 'teen') {
        return ['12', '14', '16'];
      }
    } else {
      // Adulto
      if (sizeCategory === 'numeric') {
        return ['36', '38', '40', '42', '44', '46'];
      } else if (sizeCategory === 'plus') {
        return ['G1', 'G2', 'G3', 'G4', 'G5'];
      } else {
        // standard (padrão)
        return ['PP', 'P', 'M', 'G', 'GG'];
      }
    }
    // Fallback para padrão
    return ['PP', 'P', 'M', 'G', 'GG'];
  };

  // === HANDLER DE DETECÇÃO AUTOMÁTICA DE LANDMARKS E PROCESSAMENTO DE MEDIDAS ===
  const handleDetectLandmarksAutomatically = async (imageUrl: string, analysisData: any) => {
    try {
      console.log("[ProductEditor] 🔍 Detectando landmarks e processando medidas automaticamente após análise...");
      
      // Mapear categoria para categoria de landmark
      const category = analysisData.suggested_category || analysisData.categoria_sugerida || "";
      const categoryLower = category.toLowerCase();
      
      let garmentCategory: string = "TOPS"; // Padrão
      if (categoryLower.includes("vestido") || categoryLower.includes("dress") || categoryLower.includes("macacão")) {
        garmentCategory = "DRESS";
      } else if (categoryLower.includes("calça") || categoryLower.includes("short") || categoryLower.includes("saia")) {
        garmentCategory = "BOTTOMS";
      }
      
      // 1. Detectar landmarks
      const landmarksResponse = await fetch(
        `/api/lojista/products/detect-landmarks?lojistaId=${lojistaId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: imageUrl,
            category: garmentCategory,
          }),
        }
      );
      
      if (!landmarksResponse.ok) {
        const errorText = await landmarksResponse.text();
        console.error("[ProductEditor] ❌ Erro ao detectar landmarks automaticamente:", errorText);
        return;
      }
      
      const landmarksResult = await landmarksResponse.json();
      const landmarksData = landmarksResult.data;
      
      if (!landmarksData) {
        console.log("[ProductEditor] ⚠️ Nenhum landmark detectado");
        return;
      }
      
      console.log("[ProductEditor] ✅ Landmarks detectados automaticamente");
      
      // 2. Processar landmarks para criar geometria de medidas
      // Usar as medidas padrão da análise inteligente se disponíveis
      const standardMeasurements = analysisData.standard_measurements || {};
      console.log("[ProductEditor] 📏 Medidas padrão da análise:", standardMeasurements);
      
      // Calcular tamanho intermediário da grade ATUAL
      const currentGradeSizes = getSizesForGrade(state.sizeCategory, state.targetAudience);
      const middleIndex = Math.floor(currentGradeSizes.length / 2);
      const activeSize = (currentGradeSizes[middleIndex] || 'M') as SizeKey;
      
      console.log("[ProductEditor] 🎯 Tamanho intermediário da grade:", {
        sizeCategory: state.sizeCategory,
        targetAudience: state.targetAudience,
        gradeSizes: currentGradeSizes,
        middleIndex,
        activeSize,
      });
      
      // Converter landmarks para MeasurementPoint
      const measurementPoints: MeasurementPoint[] = [];
      
      // Processar landmarks de TOPS/DRESS
      if ('bust_start' in landmarksData && 'bust_end' in landmarksData) {
        const value = standardMeasurements.bust || 0;
        console.log("[ProductEditor] 📐 Processando busto - valor:", value, "landmarks disponíveis");
        // SEMPRE criar geometria, mesmo se valor for 0
        // A geometria permite que o usuário veja onde as medidas devem ser tomadas
        measurementPoints.push({
          id: 'bust',
          label: 'Busto',
          value: value, // Pode ser 0 se não houver medida da análise
          startX: landmarksData.bust_start.x,
          startY: landmarksData.bust_start.y,
          endX: landmarksData.bust_end.x,
          endY: landmarksData.bust_end.y,
        });
      }
      
      if ('waist_start' in landmarksData && 'waist_end' in landmarksData) {
        const value = standardMeasurements.waist || 0;
        console.log("[ProductEditor] 📐 Processando cintura - valor:", value, "landmarks disponíveis");
        measurementPoints.push({
          id: 'waist',
          label: 'Cintura',
          value: value, // Pode ser 0 se não houver medida da análise
          startX: landmarksData.waist_start.x,
          startY: landmarksData.waist_start.y,
          endX: landmarksData.waist_end.x,
          endY: landmarksData.waist_end.y,
        });
      }
      
      if ('length_top' in landmarksData && 'length_bottom' in landmarksData) {
        const value = standardMeasurements.length || 0;
        console.log("[ProductEditor] 📐 Processando comprimento - valor:", value, "landmarks disponíveis");
        measurementPoints.push({
          id: 'length',
          label: 'Comprimento',
          value: value, // Pode ser 0 se não houver medida da análise
          startX: landmarksData.length_top.x,
          startY: landmarksData.length_top.y,
          endX: landmarksData.length_bottom.x,
          endY: landmarksData.length_bottom.y,
        });
      }
      
      // Processar landmarks de BOTTOMS (hip)
      if ('hip_start' in landmarksData && 'hip_end' in landmarksData) {
        const value = standardMeasurements.hip || 0;
        console.log("[ProductEditor] 📐 Processando quadril - valor:", value, "landmarks disponíveis");
        measurementPoints.push({
          id: 'hip',
          label: 'Quadril',
          value: value, // Pode ser 0 se não houver medida da análise
          startX: landmarksData.hip_start.x,
          startY: landmarksData.hip_start.y,
          endX: landmarksData.hip_end.x,
          endY: landmarksData.hip_end.y,
        });
      }
      
      if (measurementPoints.length === 0) {
        console.log("[ProductEditor] ⚠️ Nenhuma medida processada dos landmarks. Landmarks disponíveis:", Object.keys(landmarksData));
        return;
      }
      
      console.log("[ProductEditor] ✅ Medidas processadas:", measurementPoints.length, "pontos criados");
      console.log("[ProductEditor] 📊 Valores das medidas:", measurementPoints.map(mp => `${mp.label}: ${mp.value}cm`));
      
      // 3. Criar SmartGuideData com as medidas processadas
      // Converter para o formato esperado: Record<SizeKey, MeasurementPoint[]>
      // Criar estrutura de sizes com todos os tamanhos da grade atual
      const sizes: Record<string, MeasurementPoint[]> = {};
      
      // Inicializar todos os tamanhos da grade atual com as medidas detectadas
      currentGradeSizes.forEach(size => {
        sizes[size] = measurementPoints; // Todos começam com os mesmos valores (serão calculados depois com auto-grading)
      });
      
      // Inicializar também tamanhos padrão vazios para compatibilidade
      const standardSizes: SizeKey[] = ['PP', 'P', 'M', 'G', 'GG', 'XG'];
      standardSizes.forEach(size => {
        if (!sizes[size]) {
          sizes[size] = [];
        }
      });
      
      // 4. Atualizar estado com medidas processadas
      const measurementKey = `${state.targetAudience}_${state.sizeCategory}`;
      const persistedMeasurements = state.persistedMeasurementsByAudience || {};
      
      // Criar estrutura compatível com SmartGuideData (aceita qualquer string como chave)
      const smartMeasurementsData: any = {
        baseImage: imageUrl, // Usar imagem RAW por enquanto (será substituída quando gerar imagem)
        activeSize: activeSize, // Usar tamanho intermediário da grade atual (ex: '6' para infantil, 'M' para padrão)
        autoGrading: true,
        sizes: sizes, // Aceita qualquer string como chave (ex: '2', '4', '6', '8', '10' para infantil)
      };
      
      console.log("[ProductEditor] 📊 Medidas criadas para grade:", {
        grade: state.sizeCategory,
        tamanhos: currentGradeSizes,
        tamanhoIntermediario: activeSize,
        medidasPorTamanho: Object.keys(sizes).map(size => `${size}: ${sizes[size].length} medidas`),
      });
      
      setState(prev => ({
        ...prev,
        smartMeasurements: smartMeasurementsData,
        persistedMeasurementsByAudience: {
          ...persistedMeasurements,
          [measurementKey]: smartMeasurementsData,
        },
      }));
      
      console.log("[ProductEditor] ✅ Medidas processadas e carregadas automaticamente:", {
        measurementsCount: measurementPoints.length,
        measurements: measurementPoints.map(m => `${m.label}: ${m.value}cm`),
      });
    } catch (err: any) {
      console.error("[ProductEditor] ❌ Erro ao detectar landmarks e processar medidas automaticamente:", err);
      // Não mostrar erro ao usuário, apenas logar
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
            equivalence: v.equivalence?.trim() || undefined,
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
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-sm font-semibold transition-all duration-300"
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

      {/* === LAYOUT REESTRUTURADO: 4 CONTAINERS VERTICAIS === */}
      <div className="w-full flex flex-col space-y-8">
      
      {/* CONTAINER 1: DEFINIÇÃO & MÍDIA - Configuração Inicial */}
      <AnimatedCard className="p-0 overflow-hidden bg-white shadow-sm">
        {/* CardHeader */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center gap-3 border-b border-blue-500/20">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg" style={{ color: 'white' }}>
            1
          </div>
          <div className="text-white" style={{ color: 'white' }}>
            <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ color: 'white' }}>
              <Upload className="w-5 h-5" stroke="white" style={{ stroke: 'white' }} />
              <span style={{ color: 'white' }}>Configuração Inicial</span>
            </h2>
            <p className="text-sm text-white mt-0.5" style={{ color: 'white' }}>Defina o público alvo, grade de tamanho e faça upload das fotos</p>
          </div>
        </div>
        
        <div className="p-4" style={{ height: '580px' }}>
          {/* LAYOUT EM 3 CAIXAS LADO A LADO */}
          <div className="flex gap-3 items-start">
            {/* CAIXA 1: Público Alvo e Grade de Tamanho */}
            <div className="flex-1 border-2 border-slate-200 rounded-lg p-2 bg-slate-50 flex flex-col min-w-0" style={{ height: '502.4px' }}>
              <div className="flex-1 flex flex-col gap-2">
              {/* Público Alvo */}
              <div className="flex-1 flex flex-col">
                <label className="flex text-xs font-semibold mb-1 px-2 py-2 rounded-lg bg-red-100 border-2 border-red-300 shadow-sm items-center gap-1.5" style={{ color: 'white' }}>
                  <span className="text-red-800" style={{ color: '#991b1b' }}>Público Alvo</span>
                  <span className="text-red-700 font-bold text-sm" style={{ color: '#b91c1c' }}>*</span>
                </label>
                <div className="flex-1 grid grid-cols-3 gap-1">
                {/* Card Feminino */}
                <button
                  onClick={() => {
                    const newAudience: 'female' | 'male' | 'kids' = 'female';
                    setState(prev => {
                      const persistedMeasurements = prev.persistedMeasurementsByAudience || {};
                      const measurementKeys = Object.keys(persistedMeasurements).filter(key => 
                        key.startsWith(`${newAudience}_`)
                      );
                      if (measurementKeys.length > 0) {
                        const lastKey = measurementKeys[measurementKeys.length - 1];
                        const existingMeasurements = persistedMeasurements[lastKey];
                        const [, sizeCategory] = lastKey.split('_');
                        return {
                          ...prev,
                          targetAudience: newAudience,
                          sizeCategory: sizeCategory as typeof prev.sizeCategory,
                          smartMeasurements: existingMeasurements,
                          imagemMedidasCustomizada: existingMeasurements.baseImage,
                        };
                      } else {
                        return { ...prev, targetAudience: newAudience };
                      }
                    });
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('lastTargetAudience', newAudience);
                    }
                  }}
                  className={`relative h-full rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                    state.targetAudience === 'female'
                      ? 'border-pink-600 bg-pink-50 ring-2 ring-pink-300'
                      : 'border-gray-200 bg-white hover:border-pink-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <Venus className={`w-10 h-10 ${
                      state.targetAudience === 'female' ? 'text-pink-600' : 'text-gray-400'
                    }`} />
                    <h3 className={`text-xs font-bold ${
                      state.targetAudience === 'female' ? 'text-pink-700' : 'text-slate-700'
                    }`}>
                      Feminino
                    </h3>
                  </div>
                  {state.targetAudience === 'female' && (
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-600 rounded-full"></div>
                  )}
                </button>
                
                {/* Card Masculino */}
                <button
                  onClick={() => {
                    const newAudience: 'female' | 'male' | 'kids' = 'male';
                    setState(prev => {
                      const persistedMeasurements = prev.persistedMeasurementsByAudience || {};
                      const measurementKeys = Object.keys(persistedMeasurements).filter(key => 
                        key.startsWith(`${newAudience}_`)
                      );
                      if (measurementKeys.length > 0) {
                        const lastKey = measurementKeys[measurementKeys.length - 1];
                        const existingMeasurements = persistedMeasurements[lastKey];
                        const [, sizeCategory] = lastKey.split('_');
                        return {
                          ...prev,
                          targetAudience: newAudience,
                          sizeCategory: sizeCategory as typeof prev.sizeCategory,
                          smartMeasurements: existingMeasurements,
                          imagemMedidasCustomizada: existingMeasurements.baseImage,
                        };
                      } else {
                        return { ...prev, targetAudience: newAudience };
                      }
                    });
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('lastTargetAudience', newAudience);
                    }
                  }}
                  className={`relative h-full rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                    state.targetAudience === 'male'
                      ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-300'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <Mars className={`w-10 h-10 ${
                      state.targetAudience === 'male' ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <h3 className={`text-xs font-bold ${
                      state.targetAudience === 'male' ? 'text-blue-700' : 'text-slate-700'
                    }`}>
                      Masculino
                    </h3>
                  </div>
                  {state.targetAudience === 'male' && (
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </button>
                
                {/* Card Infantil */}
                <button
                  onClick={() => {
                    const newAudience: 'female' | 'male' | 'kids' = 'kids';
                    setState(prev => {
                      const persistedMeasurements = prev.persistedMeasurementsByAudience || {};
                      const measurementKeys = Object.keys(persistedMeasurements).filter(key => 
                        key.startsWith(`${newAudience}_`)
                      );
                      if (measurementKeys.length > 0) {
                        const lastKey = measurementKeys[measurementKeys.length - 1];
                        const existingMeasurements = persistedMeasurements[lastKey];
                        const [, sizeCategory] = lastKey.split('_');
                        return {
                          ...prev,
                          targetAudience: newAudience,
                          sizeCategory: sizeCategory as typeof prev.sizeCategory,
                          smartMeasurements: existingMeasurements,
                          imagemMedidasCustomizada: existingMeasurements.baseImage,
                        };
                      } else {
                        return { ...prev, targetAudience: newAudience };
                      }
                    });
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('lastTargetAudience', 'kids');
                    }
                  }}
                  className={`relative h-full rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                    state.targetAudience === 'kids'
                      ? 'border-yellow-600 bg-yellow-50 ring-2 ring-yellow-300'
                      : 'border-gray-200 bg-white hover:border-yellow-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <Baby className={`w-10 h-10 ${
                      state.targetAudience === 'kids' ? 'text-yellow-600' : 'text-gray-400'
                    }`} />
                    <h3 className={`text-xs font-bold ${
                      state.targetAudience === 'kids' ? 'text-yellow-700' : 'text-slate-700'
                    }`}>
                      Infantil
                    </h3>
                  </div>
                  {state.targetAudience === 'kids' && (
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-yellow-600 rounded-full"></div>
                  )}
                </button>
              </div>
              </div>
              
              {/* Grade de Tamanho */}
              <div className="flex-1 flex flex-col">
                <label className="flex text-xs font-semibold mb-1 px-2 py-2 rounded-lg bg-red-100 border-2 border-red-300 shadow-sm items-center gap-1.5" style={{ color: 'white' }}>
                  <span className="text-red-800" style={{ color: '#991b1b' }}>Selecione a Grade de Tamanho</span>
                  <span className="text-red-700 font-bold text-sm" style={{ color: '#b91c1c' }}>*</span>
                </label>
                <div className="flex-1 grid grid-cols-3 gap-1 items-stretch">
                {(state.targetAudience === 'kids' ? SIZE_GRIDS.KIDS : SIZE_GRIDS.ADULT).map((grid) => {
                  const Icon = grid.icon;
                  const isSelected = state.sizeCategory === grid.id;
                  const audienceColors = {
                    female: {
                      selected: { border: 'border-pink-600', bg: 'bg-pink-50', ring: 'ring-pink-300', icon: 'text-pink-600', text: 'text-pink-700', dot: 'bg-pink-600' },
                      hover: 'hover:border-pink-300',
                    },
                    male: {
                      selected: { border: 'border-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-300', icon: 'text-blue-600', text: 'text-blue-700', dot: 'bg-blue-600' },
                      hover: 'hover:border-blue-300',
                    },
                    kids: {
                      selected: { border: 'border-yellow-600', bg: 'bg-yellow-50', ring: 'ring-yellow-300', icon: 'text-yellow-600', text: 'text-yellow-700', dot: 'bg-yellow-600' },
                      hover: 'hover:border-yellow-300',
                    },
                  };
                  const colors = audienceColors[state.targetAudience];
                  return (
                    <button
                      key={grid.id}
                      onClick={() => {
                        const newCategory = grid.id as 'standard' | 'plus' | 'numeric' | 'baby' | 'kids_numeric' | 'teen';
                        setState(prev => {
                          const measurementKey = `${prev.targetAudience}_${newCategory}`;
                          const persistedMeasurements = prev.persistedMeasurementsByAudience || {};
                          const existingMeasurements = persistedMeasurements[measurementKey];
                          if (existingMeasurements) {
                            return {
                              ...prev,
                              sizeCategory: newCategory,
                              smartMeasurements: existingMeasurements,
                              imagemMedidasCustomizada: existingMeasurements.baseImage,
                            };
                          } else {
                            return { ...prev, sizeCategory: newCategory };
                          }
                        });
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('lastSizeCategory', newCategory);
                        }
                      }}
                      className={`relative h-full rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                        isSelected
                          ? `${colors.selected.border} ${colors.selected.bg} ring-2 ${colors.selected.ring}`
                          : `border-gray-200 bg-white ${colors.hover}`
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2.5 justify-center w-full px-2">
                        <Icon className={`w-10 h-10 ${
                          isSelected ? colors.selected.icon : 'text-gray-400'
                        }`} />
                        <h3 className={`text-xs font-bold ${
                          isSelected ? colors.selected.text : 'text-slate-700'
                        }`}>
                          {grid.label}
                        </h3>
                        <p className="text-[10px] text-slate-600 text-center leading-tight">
                          {grid.examples}
                        </p>
                      </div>
                      {isSelected && (
                        <div className={`absolute top-1.5 right-1.5 w-2 h-2 ${colors.selected.dot} rounded-full`}></div>
                      )}
                    </button>
                  );
                })}
                </div>
              </div>
              </div>
            </div>
            
            {/* CAIXA 2: Área para carregar fotos */}
            <div className="flex-1 border-2 border-slate-200 rounded-lg p-2 bg-slate-50 flex flex-col min-w-0" style={{ height: '502.4px' }}>
              <div className="flex-1 flex flex-col">
                <label className="flex text-xs font-semibold mb-1 px-2 py-2 rounded-lg bg-red-100 border-2 border-red-300 shadow-sm items-center gap-1.5" style={{ color: 'white' }}>
                  <span className="text-red-800" style={{ color: '#991b1b' }}>Área para carregar as fotos upload</span>
                  <span className="text-red-700 font-bold text-sm" style={{ color: '#b91c1c' }}>*</span>
                </label>
                <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-1">
                {[
                  { idx: 1, label: 'Foto Frente', subtitle: '(Calibração Medidas)', required: true },
                  { idx: 2, label: 'Foto Verso', subtitle: '', required: true },
                  { idx: 3, label: 'Foto Extra 1', subtitle: '', required: false },
                  { idx: 4, label: 'Foto Extra 2', subtitle: '', required: false },
                  { idx: 5, label: 'Foto Extra 3', subtitle: '', required: false },
                  { idx: 6, label: 'Foto Extra 4', subtitle: '', required: false },
                ].map(({ idx, label, subtitle, required }) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-0.5 w-full h-full"
                  >
                    <div
                      ref={(el) => {
                        if (idx === 1) dropzoneRef.current = el;
                        dropzoneRefs.current[idx - 1] = el;
                      }}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragOver={handleDragOver}
                      onClick={() => {
                        if (idx === 1) {
                          fileInputRef.current?.click();
                        } else {
                          fileInputRefs.current[idx - 1]?.click();
                        }
                      }}
                      className="relative flex-1 w-full border-2 border-blue-300 rounded-lg flex items-center justify-center transition-colors bg-white cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 overflow-hidden"
                      title="Clique para fazer upload"
                    >
                      {idx === 1 && (
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-semibold shadow-md z-10 whitespace-nowrap" style={{ color: 'white' }}>
                          Calibração Imagem
                        </div>
                      )}
                      {(idx === 1 && state.rawImageUrl) || (idx > 1 && state.extraImages.find(img => img.idx === idx)?.url) ? (
                        <>
                          <img 
                            src={idx === 1 ? state.rawImageUrl : state.extraImages.find(img => img.idx === idx)?.url || ''} 
                            alt="Upload" 
                            className="w-full h-full object-cover rounded-lg" 
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Deseja realmente excluir esta imagem?')) {
                                handleDeleteImage(idx);
                              }
                            }}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded w-6 h-6 flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:scale-110 z-20 border-2 border-red-800/30"
                            title="Excluir imagem"
                          >
                            <X className="w-4 h-4 text-white" strokeWidth={3} style={{ color: 'white', stroke: 'white' }} />
                          </button>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-10 h-10 text-gray-300" strokeWidth={2} />
                        </>
                      )}
                      {required && (idx === 1 || idx === 2) && (
                        <div 
                          className="absolute z-10"
                          style={{ 
                            bottom: '0',
                            right: '0',
                            width: '0',
                            height: '0',
                            borderLeft: '20px solid transparent',
                            borderBottom: '20px solid #dc2626',
                            borderBottomRightRadius: '0.5rem'
                          }}
                        ></div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 text-center" style={{ height: '42.5px' }}>
                        <div className="text-[10px] font-semibold leading-tight px-1 py-0.5 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-200 shadow-sm rounded-b-lg h-full flex items-center justify-center">
                          {label}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </div>
            
            {/* CAIXA 3: Visualizar fotos originais */}
            <div className="border-2 border-slate-200 rounded-lg p-3 bg-slate-50 flex flex-col shrink-0" style={{ width: '282px', flexShrink: 0 }}>
              <label className="block text-xs font-semibold text-white mb-1.5 px-2 py-1 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-sm">
                Visualizar fotos originais upload
              </label>
              <div className="flex items-center justify-center relative shrink-0" style={{ width: '250px', height: '444px' }}>
                {(() => {
                  // Coletar todas as imagens carregadas
                  const allImages: string[] = [];
                  if (state.rawImageUrl) allImages.push(state.rawImageUrl);
                  state.extraImages.forEach(img => {
                    if (img.url) allImages.push(img.url);
                  });
                  
                  const currentImage = allImages[uploadViewerIndex];
                  
                  if (currentImage) {
                    return (
                      <div className="relative w-full h-full border-2 border-green-400 rounded-lg overflow-hidden bg-white">
                        {/* Setas de Navegação */}
                        {allImages.length > 1 && (
                          <>
                            <button
                              onClick={() => setUploadViewerIndex(prev => (prev - 1 + allImages.length) % allImages.length)}
                              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-colors"
                              title="Foto anterior"
                            >
                              <ChevronLeft className="w-5 h-5 text-gray-700" />
                            </button>
                            <button
                              onClick={() => setUploadViewerIndex(prev => (prev + 1) % allImages.length)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-colors"
                              title="Próxima foto"
                            >
                              <ChevronRight className="w-5 h-5 text-gray-700" />
                            </button>
                          </>
                        )}
                        
                        {/* Indicador de imagem atual */}
                        {allImages.length > 1 && (
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 bg-white/90 rounded-full px-3 py-1 shadow-md">
                            <span className="text-xs font-semibold text-gray-700">
                              {uploadViewerIndex + 1} / {allImages.length}
                            </span>
                          </div>
                        )}
                        
                        {/* Container da imagem com zoom hover */}
                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden group">
                          <img
                            src={currentImage}
                            alt={`Foto ${uploadViewerIndex + 1}`}
                            className="max-w-full max-h-full object-contain transition-transform duration-300 ease-in-out group-hover:scale-150 cursor-zoom-in"
                            draggable={false}
                          />
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="relative w-full h-full border-2 border-blue-300 rounded-lg flex items-center justify-center bg-gray-50">
                        <p className="text-xs text-gray-400 text-center px-2">Faça upload de uma foto para visualizar</p>
                      </div>
                    );
                  }
                })()}
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
              if (file) handleFileSelect(file, 1);
            }}
            className="hidden"
          />
          {[2, 3, 4, 5, 6].map((idx) => (
            <input
              key={idx}
              ref={(el) => {
                fileInputRefs.current[idx - 1] = el;
              }}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file, idx);
              }}
              className="hidden"
            />
          ))}
        </div>
      </AnimatedCard>
      
      {/* CONTAINER 2: ESTÚDIO CRIATIVO - Tratamento de Imagem */}
      <AnimatedCard className="p-0 overflow-hidden bg-white shadow-sm">
        {/* CardHeader */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 flex items-center gap-3 border-b border-emerald-500/20">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg" style={{ color: 'white' }}>
            2
          </div>
          <div className="text-white" style={{ color: 'white' }}>
            <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ color: 'white' }}>
              <Sparkles className="w-5 h-5" stroke="white" style={{ stroke: 'white' }} />
              <span style={{ color: 'white' }}>Estúdio Criativo (IA) - Catálogo</span>
            </h2>
            <p className="text-sm text-white mt-0.5" style={{ color: 'white' }}>Gere imagens profissionais com IA: Ghost Mannequin, Modelo Virtual e Looks Combinados</p>
          </div>
        </div>
        
        <div className="p-4" style={{ height: '580px' }}>
          {/* LAYOUT EM 3 CAIXAS LADO A LADO */}
          <div className="flex gap-3 items-start">
            {/* CAIXA 2: Estrutura de grid 3x2 (trocada para posição 1) */}
            <div className="flex-1 border-2 border-slate-200 rounded-lg p-2 bg-slate-50 flex flex-col min-w-0" style={{ height: '502.4px' }}>
              <div className="flex-1 flex flex-col">
                <div className="flex text-xs font-semibold mb-1 px-2 py-2 rounded-lg bg-red-100 border-2 border-red-300 shadow-sm items-center justify-center gap-1.5">
                  CATÁLOGO IA
                </div>
                <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-1 items-stretch" style={{ gridAutoRows: '1fr' }}>
                  {/* Linha 1 */}
                  {/* Botão 1: FOTO FRENTE (IA) */}
                  <div className="flex flex-col gap-0.5 w-full h-full min-h-0">
                    <div className="relative flex-1 w-full border-2 border-purple-300 rounded-lg flex items-center justify-center bg-white overflow-hidden">
                      <Sparkles className="w-8 h-8" stroke="#7c3aed" fill="none" />
                      <div className="absolute bottom-0 left-0 right-0 text-center" style={{ height: '42.5px' }}>
                        <div className="text-[10px] font-semibold leading-tight px-1 py-0.5 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-200 shadow-sm rounded-b-lg h-full flex items-center justify-center">
                          FOTO FRENTE
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Botão 2: FOTO COSTAS (IA) */}
                  <div className="flex flex-col gap-0.5 w-full h-full min-h-0">
                    <div className="relative flex-1 w-full border-2 border-purple-300 rounded-lg flex items-center justify-center bg-white overflow-hidden">
                      <Sparkles className="w-8 h-8" stroke="#7c3aed" fill="none" />
                      <div className="absolute bottom-0 left-0 right-0 text-center" style={{ height: '42.5px' }}>
                        <div className="text-[10px] font-semibold leading-tight px-1 py-0.5 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-200 shadow-sm rounded-b-lg h-full flex items-center justify-center">
                          FOTO COSTAS
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Botão 3: MODELO FRENTE (IA) */}
                  <div className="flex flex-col gap-0.5 w-full h-full min-h-0">
                    <div className="relative flex-1 w-full border-2 border-purple-300 rounded-lg flex items-center justify-center bg-white overflow-hidden">
                      <Sparkles className="w-8 h-8" stroke="#7c3aed" fill="none" />
                      <div className="absolute bottom-0 left-0 right-0 text-center" style={{ height: '42.5px' }}>
                        <div className="text-[10px] font-semibold leading-tight px-1 py-0.5 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-200 shadow-sm rounded-b-lg h-full flex items-center justify-center">
                          MODELO FRENTE
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Linha 2 */}
                  {/* Botão 4: MODELO COSTAS (IA) */}
                  <div className="flex flex-col gap-0.5 w-full h-full min-h-0">
                    <div className="relative flex-1 w-full border-2 border-purple-300 rounded-lg flex items-center justify-center bg-white overflow-hidden">
                      <Sparkles className="w-8 h-8" stroke="#7c3aed" fill="none" />
                      <div className="absolute bottom-0 left-0 right-0 text-center" style={{ height: '42.5px' }}>
                        <div className="text-[10px] font-semibold leading-tight px-1 py-0.5 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-200 shadow-sm rounded-b-lg h-full flex items-center justify-center">
                          MODELO COSTAS
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Botão 5: LOOK COMBINADO (IA) */}
                  <div className="flex flex-col gap-0.5 w-full h-full min-h-0">
                    <div className="relative flex-1 w-full border-2 border-purple-300 rounded-lg flex items-center justify-center bg-white overflow-hidden">
                      <Sparkles className="w-8 h-8 z-0" stroke="#7c3aed" fill="none" />
                      <div className="absolute bottom-0 left-0 right-0 text-center" style={{ height: '42.5px' }}>
                        <div className="text-[10px] font-semibold leading-tight px-1 py-0.5 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-200 shadow-sm rounded-b-lg h-full flex items-center justify-center">
                          LOOK COMBINADO
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Botão 6: LOOK COMBINADO (IA) */}
                  <div className="flex flex-col gap-0.5 w-full h-full min-h-0">
                    <div className="relative flex-1 w-full border-2 border-purple-300 rounded-lg flex items-center justify-center bg-white overflow-hidden">
                      <Sparkles className="w-8 h-8 z-0" stroke="#7c3aed" fill="none" />
                      <div className="absolute bottom-0 left-0 right-0 text-center" style={{ height: '42.5px' }}>
                        <div className="text-[10px] font-semibold leading-tight px-1 py-0.5 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-200 shadow-sm rounded-b-lg h-full flex items-center justify-center">
                          LOOK COMBINADO
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* CAIXA 1: Layout para Looks Combinados (trocada para posição 2) */}
            <div className="flex-1 border-2 border-slate-200 rounded-lg p-2 bg-slate-50 flex flex-col min-w-0" style={{ height: '502.4px' }}>
              <div className="flex text-xs font-semibold mb-2 px-2 py-2 rounded-lg bg-red-100 border-2 border-red-300 shadow-sm items-center justify-center gap-1.5">
                GERAR CATALOGO (IA) - Looks Combinados
              </div>
              
              <div className="flex-1 flex flex-col gap-2 overflow-hidden min-h-0">
                {/* Conjunto 1: Look Combinado #1 */}
                <div className="flex-1 flex gap-2 overflow-hidden min-h-0">
                  {/* Coluna Direita: Controles do Combo #1 */}
                  <div className="flex-1 flex flex-col shrink-0 min-w-0">
                    <div className="flex flex-col border-2 border-slate-200 rounded-lg p-1.5 bg-white h-full min-w-0 overflow-hidden">
                      <div className="text-[10px] font-bold text-slate-700 mb-1.5 px-1">Controles do Combo #1</div>
                      
                      <div className="grid grid-cols-3 gap-1.5 mb-2 justify-items-stretch min-w-0 w-full flex-1">
                        {/* Miniatura Principal */}
                        <div className="flex flex-col gap-1 items-center w-full min-w-0 h-full">
                          <div className="w-full h-full border-2 border-yellow-500 rounded-lg bg-white flex items-center justify-center min-h-[80px]">
                            <Star className="w-8 h-8 !text-yellow-500" style={{ color: '#eab308' }} />
                          </div>
                          <div className="text-[8px] font-medium text-slate-600 text-center leading-tight">Principal</div>
                        </div>
                        
                        {/* Miniatura Produto 1 */}
                        <div className="flex flex-col gap-1 items-center w-full min-w-0 h-full">
                          <div className="w-full h-full border-2 border-blue-500 rounded-lg bg-white flex items-center justify-center min-h-[80px]">
                            <Package className="w-8 h-8 !text-blue-500" style={{ color: '#3b82f6' }} />
                          </div>
                          <div className="text-[8px] font-medium text-slate-600 text-center leading-tight">Produto 1</div>
                        </div>
                        
                        {/* Miniatura Produto 2 */}
                        <div className="flex flex-col gap-1 items-center w-full min-w-0 h-full">
                          <div className="w-full h-full border-2 border-red-500 rounded-lg bg-white flex items-center justify-center min-h-[80px]">
                            <Package className="w-8 h-8 !text-red-500" style={{ color: '#ef4444' }} />
                          </div>
                          <div className="text-[8px] font-medium text-slate-600 text-center leading-tight">Produto 2</div>
                        </div>
                      </div>
                      
                      <button className="w-full py-1.5 px-1.5 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 !text-white text-[10px] font-semibold rounded transition-all shadow-md mt-auto" style={{ color: '#ffffff' }}>
                        Selecionar Look Combinado
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Conjunto 2: Look Combinado #2 */}
                <div className="flex-1 flex gap-2 overflow-hidden min-h-0">
                  {/* Coluna Direita: Controles do Combo #2 */}
                  <div className="flex-1 flex flex-col shrink-0 min-w-0">
                    <div className="flex flex-col border-2 border-slate-200 rounded-lg p-1.5 bg-white h-full min-w-0 overflow-hidden">
                      <div className="text-[10px] font-bold text-slate-700 mb-1.5 px-1">Controles do Combo #2</div>
                      
                      <div className="grid grid-cols-3 gap-1.5 mb-2 justify-items-stretch min-w-0 w-full flex-1">
                        {/* Miniatura Principal */}
                        <div className="flex flex-col gap-1 items-center w-full min-w-0 h-full">
                          <div className="w-full h-full border-2 border-yellow-500 rounded-lg bg-white flex items-center justify-center min-h-[80px]">
                            <Star className="w-8 h-8 !text-yellow-500" style={{ color: '#eab308' }} />
                          </div>
                          <div className="text-[8px] font-medium text-slate-600 text-center leading-tight">Principal</div>
                        </div>
                        
                        {/* Miniatura Produto 1 */}
                        <div className="flex flex-col gap-1 items-center w-full min-w-0 h-full">
                          <div className="w-full h-full border-2 border-blue-500 rounded-lg bg-white flex items-center justify-center min-h-[80px]">
                            <Package className="w-8 h-8 !text-blue-500" style={{ color: '#3b82f6' }} />
                          </div>
                          <div className="text-[8px] font-medium text-slate-600 text-center leading-tight">Produto 1</div>
                        </div>
                        
                        {/* Miniatura Produto 2 */}
                        <div className="flex flex-col gap-1 items-center w-full min-w-0 h-full">
                          <div className="w-full h-full border-2 border-red-500 rounded-lg bg-white flex items-center justify-center min-h-[80px]">
                            <Package className="w-8 h-8 !text-red-500" style={{ color: '#ef4444' }} />
                          </div>
                          <div className="text-[8px] font-medium text-slate-600 text-center leading-tight">Produto 2</div>
                        </div>
                      </div>
                      
                      <button className="w-full py-1.5 px-1.5 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 !text-white text-[10px] font-semibold rounded transition-all shadow-md mt-auto" style={{ color: '#ffffff' }}>
                        Selecionar Look Combinado
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* CAIXA 3: Estrutura de visualização */}
            <div className="border-2 border-slate-200 rounded-lg p-3 bg-slate-50 flex flex-col shrink-0" style={{ width: '282px', flexShrink: 0 }}>
              <div className="block text-xs font-semibold mb-1.5 px-2 py-1 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-sm">
                Visualizar Fotos Catálogo IA
              </div>
              <div className="flex items-center justify-center relative shrink-0" style={{ width: '250px', height: '444px' }}>
                <div className="relative w-full h-full border-2 border-purple-300 rounded-lg flex items-center justify-center bg-gray-50"></div>
              </div>
            </div>
          </div>
          
          {/* Botão Aprovar e Salvar - Embaixo das três caixas */}
          <div className="mt-4 flex gap-3 items-start">
            {/* Espaçador para alinhar com CAIXA 2 */}
            <div className="flex-1"></div>
            {/* Botão com largura da CAIXA 1 */}
            <div className="flex-1">
              <button className="w-full py-2 px-6 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 !text-white text-sm font-bold rounded transition-all shadow-md" style={{ color: '#ffffff' }}>
                Aprovar e Salvar Todas as Imagens
              </button>
            </div>
            {/* Espaçador para alinhar com CAIXA 3 */}
            <div className="shrink-0" style={{ width: '282px' }}></div>
          </div>
        </div>
        
        {/* Modal de Seleção de Produto Complementar */}
        {showCombinedModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">Montar Look - Selecionar Produto Complementar</h3>
                <button
                  onClick={() => {
                    setShowCombinedModal(false);
                    setSelectedSlotForCombined(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Buscar produtos..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* TODO: Listar produtos do catálogo aqui */}
                  <div className="text-center py-8 text-slate-400 text-sm">
                    Lista de produtos será carregada aqui
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowCombinedModal(false);
                    setSelectedSlotForCombined(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    // TODO: Implementar seleção de produto e geração de look combinado
                    setShowCombinedModal(false);
                    setSelectedSlotForCombined(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Selecionar
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatedCard>
      
      {/* CONTAINER 3: ANÁLISE INTELIGENTE - Medidas & Ficha Técnica */}
      <AnimatedCard className="p-0 overflow-hidden bg-white shadow-sm">
        {/* CardHeader */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-6 py-4 flex items-center gap-3 border-b border-purple-500/20">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg" style={{ color: 'white' }}>
            3
          </div>
          <div className="flex-1 text-white" style={{ color: 'white' }}>
            <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ color: 'white' }}>
              <Sparkles className="w-5 h-5" stroke="white" style={{ stroke: 'white' }} />
              <span style={{ color: 'white' }}>Medidas & Ficha Técnica</span>
            </h2>
            <p className="text-sm text-white mt-0.5" style={{ color: 'white' }}>Análise inteligente, medidas ABNT e informações do produto geradas automaticamente</p>
          </div>
          <div className="flex items-center gap-2">
            {state.aiAnalysisData && (
              <button
                    onClick={async () => {
                      const imageUrlToAnalyze = state.rawImageUrl || state.selectedCoverImage;
                      if (!imageUrlToAnalyze) {
                        alert("Por favor, faça upload de uma imagem primeiro.");
                        return;
                      }
                      try {
                        console.log("[ProductEditor] 🔄 Nova análise com contexto atualizado");
                        lastAnalyzedUrlRef.current = "";
                        setState(prev => ({ ...prev, aiAnalysisData: null }));
                        await new Promise(resolve => setTimeout(resolve, 100));
                        await analyzeImage(imageUrlToAnalyze);
                      } catch (error: any) {
                        console.error("[ProductEditor] Erro ao fazer nova análise:", error);
                        alert(`Erro ao fazer nova análise: ${error.message || "Erro desconhecido"}`);
                      }
                    }}
                    disabled={analyzing || (!state.rawImageUrl && !state.selectedCoverImage)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/30"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Analisando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        <span>Nova Análise</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={async () => {
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
                  className="flex items-center gap-1 px-2 py-1 text-xs text-purple-100 hover:text-white hover:bg-white/20 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/30"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Analisando...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3 h-3" />
                      <span>Regenerar</span>
                    </>
                  )}
                </button>
          </div>
        </div>
        
        {/* Corpo - Dados e Formulários */}
        <div className="p-6">
          <div className="w-full flex flex-col space-y-4">
              {/* Subseção: Marketing & SEO */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Marketing & SEO
                </h3>
              
                {/* Nome Sugerido */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Nome Sugerido
                  </label>
                  {analyzing && !state.aiAnalysisData ? (
                    <div className="h-9 bg-slate-200 rounded animate-pulse" />
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
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
                    />
                  )}
                </div>

                {/* Descrição SEO */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-700">
                      Descrição Comercial/SEO
                    </label>
                    <span className="text-xs font-medium text-slate-500">
                      {(state.aiAnalysisData?.descricao_seo?.length || 0)} caracteres
                    </span>
                  </div>
                  {analyzing && !state.aiAnalysisData ? (
                    <div className="space-y-1">
                      <div className="h-3 bg-slate-200 rounded animate-pulse w-full" />
                      <div className="h-3 bg-slate-200 rounded animate-pulse w-5/6" />
                      <div className="h-3 bg-slate-200 rounded animate-pulse w-4/6" />
                    </div>
                  ) : (
                    <textarea
                      value={state.aiAnalysisData?.descricao_seo || ""}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setState(prev => ({
                          ...prev,
                          aiAnalysisData: prev.aiAnalysisData
                            ? { ...prev.aiAnalysisData, descricao_seo: newValue }
                            : { descricao_seo: newValue },
                        }));
                      }}
                      rows={4}
                      placeholder={analyzing ? "Analisando imagem..." : "Aguardando análise da imagem..."}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 resize-y transition-all min-h-[80px]"
                    />
                  )}
                </div>
              </div>

              {/* Seção: Ficha Técnica Automática */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Ficha Técnica Automática
                </h3>
                
                <div className="grid grid-cols-1 gap-2">
                  {/* Categoria (Dropdown) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Categoria Sugerida
                    </label>
                    {analyzing && !state.aiAnalysisData ? (
                      <div className="h-9 bg-slate-200 rounded animate-pulse" />
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
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
                      >
                        <option value="">Selecione uma categoria</option>
                        {AVAILABLE_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Tipo de Produto */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Tipo de Produto
                    </label>
                    {analyzing && !state.aiAnalysisData ? (
                      <div className="h-9 bg-slate-200 rounded animate-pulse" />
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
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
                      />
                    )}
                  </div>

                  {/* Tecido Detectado */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Tecido Detectado
                    </label>
                    {analyzing && !state.aiAnalysisData ? (
                      <div className="h-9 bg-slate-200 rounded animate-pulse" />
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
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
                      />
                    )}
                  </div>

                  {/* Cores Predominantes */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Cores Predominantes
                    </label>
                    {analyzing && !state.aiAnalysisData ? (
                      <div className="h-9 bg-slate-200 rounded animate-pulse" />
                    ) : state.aiAnalysisData?.colors_by_item && Array.isArray(state.aiAnalysisData.colors_by_item) && state.aiAnalysisData.colors_by_item.length > 0 ? (
                      /* CONJUNTO: Mostrar cores por item (prioridade) */
                      <div className="space-y-2">
                        {state.aiAnalysisData.colors_by_item.map((itemData, itemIdx) => {
                          // Validar se há cores válidas neste item
                          const validColors = (itemData.colors || []).filter(color => 
                            color?.hex && color.hex.startsWith('#') && 
                            color?.name && color.name.trim().length > 0
                          );
                          
                          if (validColors.length === 0) return null;
                          
                          return (
                            <div key={itemIdx} className="space-y-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800 uppercase">
                                  {itemData.item || `Item ${itemIdx + 1}`}:
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {validColors.map((color, colorIdx) => {
                                  const colorHex = color.hex || "#808080";
                                  const colorName = color.name || "Não especificado";
                                  return (
                                    <div
                                      key={colorIdx}
                                      className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-300 rounded shadow-sm hover:shadow-md transition-shadow"
                                    >
                                      <div
                                        className="w-4 h-4 rounded-full border-2 border-slate-300"
                                        style={{ backgroundColor: colorHex }}
                                      />
                                      <span className="text-xs text-slate-700 font-medium">
                                        {colorName}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : state.aiAnalysisData?.dominant_colors && Array.isArray(state.aiAnalysisData.dominant_colors) && state.aiAnalysisData.dominant_colors.length > 0 ? (
                      /* PRODUTO ÚNICO: Mostrar cores gerais */
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {state.aiAnalysisData.dominant_colors.map((color, idx) => {
                          const colorHex = color?.hex || "#808080";
                          const colorName = color?.name || "Não especificado";
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded shadow-sm"
                            >
                              <div
                                className="w-4 h-4 rounded-full border border-slate-200"
                                style={{ backgroundColor: colorHex }}
                              />
                              <span className="text-xs text-slate-700 font-medium">
                                {colorName}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 py-1">
                        {state.aiAnalysisData ? "Nenhuma cor detectada" : "Cores serão detectadas após a análise"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          
          {/* Editor de Medidas Inteligente - Abaixo do layout Clean Studio */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <SmartMeasurementEditor
                  rawImageUrl={state.rawImageUrl}
                  rawImageFile={state.rawImageFile}
                  lojistaId={lojistaId}
                  produtoId={produtoId}
                  productInfo={{
                    category: state.aiAnalysisData?.suggested_category || state.aiAnalysisData?.categoria_sugerida,
                    productType: state.aiAnalysisData?.product_type,
                    color: state.aiAnalysisData?.dominant_colors?.[0]?.name || state.aiAnalysisData?.cor_predominante,
                    material: state.aiAnalysisData?.detected_fabric || state.aiAnalysisData?.tecido_estimado,
                    style: state.aiAnalysisData?.product_type,
                    standardMeasurements: state.aiAnalysisData?.standard_measurements,
                  }}
                  sizeCategory={state.sizeCategory}
                  targetAudience={state.targetAudience}
                  variacoes={state.variacoes}
                  onImageUpload={async (file) => {
                    await handleMedidasFileSelect(file);
                  }}
                  onMeasurementsChange={useCallback((data: SmartGuideData) => {
                    setState(prev => {
                      const currentBaseImage = prev.smartMeasurements?.baseImage;
                      if (currentBaseImage === data.baseImage && 
                          JSON.stringify(prev.smartMeasurements) === JSON.stringify(data)) {
                        return prev;
                      }
                      
                      const measurementKey = `${prev.targetAudience}_${prev.sizeCategory}`;
                      const persistedMeasurements = prev.persistedMeasurementsByAudience || {};
                      
                      return {
                        ...prev,
                        smartMeasurements: data,
                        imagemMedidasCustomizada: data.baseImage,
                        persistedMeasurementsByAudience: {
                          ...persistedMeasurements,
                          [measurementKey]: data,
                        },
                      };
                    });
                  }, [])}
                  onSave={async (data) => {
                    setState(prev => {
                      const measurementKey = `${prev.targetAudience}_${prev.sizeCategory}`;
                      const persistedMeasurements = prev.persistedMeasurementsByAudience || {};
                      
                      return {
                        ...prev,
                        smartMeasurements: data,
                        imagemMedidasCustomizada: data.baseImage,
                        persistedMeasurementsByAudience: {
                          ...persistedMeasurements,
                          [measurementKey]: data,
                        },
                      };
                    });
                    console.log('[ProductEditor] Medidas salvas e persistidas:', data);
                  }}
                  initialData={useMemo(() => {
                    const measurementKey = `${state.targetAudience}_${state.sizeCategory}`;
                    const persistedMeasurements = state.persistedMeasurementsByAudience || {};
                    const persistedData = persistedMeasurements[measurementKey];
                    
                    if (persistedData) {
                      console.log('[ProductEditor] 📦 Usando medidas persistidas para', measurementKey);
                      return persistedData;
                    }
                    
                    const data = state.smartMeasurements;
                    console.log('[ProductEditor] 📦 Usando smartMeasurements como initialData:', {
                      hasData: !!data,
                      hasSizes: !!(data?.sizes && Object.keys(data.sizes).length > 0),
                      sizesKeys: data?.sizes ? Object.keys(data.sizes) : [],
                    });
                    return data;
                  }, [state.smartMeasurements, state.targetAudience, state.sizeCategory, state.persistedMeasurementsByAudience])}
                  uploading={uploadingMedidas}
                />
          </div>
        </div>
      </AnimatedCard>

      {/* CONTAINER 4: DADOS COMERCIAIS - Preço e Estoque */}
      <AnimatedCard className="p-0 overflow-hidden bg-white shadow-sm">
        {/* CardHeader */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4 flex items-center gap-3 border-b border-red-500/20">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg" style={{ color: 'white' }}>
            4
          </div>
          <div className="text-white" style={{ color: 'white' }}>
            <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ color: 'white' }}>
              <AlertCircle className="w-5 h-5" stroke="white" style={{ stroke: 'white' }} />
              <span style={{ color: 'white' }}>Preço e Estoque</span>
            </h2>
            <p className="text-sm text-white mt-0.5" style={{ color: 'white' }}>Configure os dados comerciais e publique o produto</p>
          </div>
        </div>
        
        {/* Corpo - Campos Comerciais */}
        <div className="p-6 space-y-4">
          {/* SEÇÃO: Preenchimento Obrigatório */}
          <div className="space-y-4">
                  {/* Linha 1: Preços */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-0.5">
                        Preço (R$) <span className="text-red-500">*</span>
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
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-white text-slate-900 border-2 border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-0.5">
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
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-white text-slate-900 border-2 border-red-500"
                      />
                    </div>
                  </div>

                  {/* Linha 2: SKU e Estoque */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-0.5">
                        SKU <span className="text-red-500">*</span>
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
                          if (!state.manualData.sku || !state.manualData.sku.trim()) {
                            skuPrincipalEditadoManualRef.current = false;
                          }
                        }}
                        placeholder="Auto-gerado"
                        title="SKU gerado automaticamente. Você pode editar se necessário."
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-white text-slate-900 border-2 border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-0.5">
                        Estoque (Qtd Total) <span className="text-red-500">*</span>
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
                        className="w-full px-2 py-1.5 text-sm rounded-lg bg-white text-slate-900 border-2 border-red-500"
                      />
                    </div>
                  </div>

                  {/* Switch: Este produto possui variações? */}
                  <div className="flex items-center justify-between py-1">
                    <label className="text-xs font-medium text-slate-700">
                      Este produto possui variações?
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
                                { id: Date.now().toString(), variacao: "P", estoque: "", sku: "", equivalence: "" },
                                { id: (Date.now() + 1).toString(), variacao: "M", estoque: "", sku: "", equivalence: "" },
                                { id: (Date.now() + 2).toString(), variacao: "G", estoque: "", sku: "", equivalence: "" }
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
                        state.temVariacoes ? 'bg-indigo-600' : 'bg-gray-300'
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
                    <div className="border-t border-slate-200 pt-2 space-y-1.5">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
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
                          className="text-xs rounded border border-gray-300 bg-white px-2 py-1 text-slate-900 focus:border-gray-500 focus:outline-none"
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
                      
                      {/* Cabeçalho da Tabela de Variações */}
                      <div className="grid grid-cols-12 gap-0.5 mb-0.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        <div className="col-span-2">Tam</div>
                        <div className="col-span-2">Ref</div>
                        <div className="col-span-2">Est</div>
                        <div className="col-span-5">SKU</div>
                        <div className="col-span-1"></div>
                      </div>
                      
                      {/* Lista de Variações - Compacta */}
                      <div className="space-y-0.5 max-h-40 overflow-y-auto pr-1">
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
                              { id: novaId, variacao: "", estoque: "", sku: "", equivalence: "" }
                            ];
                            // Atualizar ref para preservar as variações atualizadas
                            variacoesPreservadasRef.current = [...novasVariacoes];
                            return {
                              ...prev,
                              variacoes: novasVariacoes,
                            };
                          });
                        }}
                        className="w-full h-6 rounded border-2 border-solid border-blue-300 bg-blue-300 px-2 py-0 text-xs font-semibold hover:bg-blue-400 transition-colors duration-200 flex items-center justify-center gap-1.5"
                        style={{ color: '#FFFFFF' }}
                      >
                        <Plus className="h-2.5 w-2.5 stroke-[2.5]" style={{ color: '#FFFFFF', stroke: '#FFFFFF' }} />
                        <span style={{ color: '#FFFFFF' }}>Adicionar Variação</span>
                      </button>
                    </div>
                  )}

                  {/* Toggles */}
                  <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-700">
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
                          state.manualData.ativo ? "bg-blue-500" : "bg-slate-300"
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
                      <label className="text-xs font-medium text-slate-700">
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
                          state.manualData.destaquePromocional ? "bg-blue-500" : "bg-slate-300"
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
        </div>
      </AnimatedCard>
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

      {/* Modal de Confirmação de Público Alvo */}
      {showAudienceConfirmation && state.aiAnalysisData?.detected_audience && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Confirmação de Público Alvo
                </h3>
                <p className="text-xs text-slate-500">
                  A IA detectou uma possível inconsistência
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-slate-700">
                A análise detectou que este produto pode ser para um público diferente do que você selecionou. Isso pode afetar a precisão das medidas sugeridas.
              </p>
              
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-amber-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">Você selecionou:</span>
                  </div>
                  <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                    state.targetAudience === 'female' ? 'bg-pink-100 text-pink-700' :
                    state.targetAudience === 'male' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {state.targetAudience === 'female' ? '👩 Feminino' : 
                     state.targetAudience === 'male' ? '👨 Masculino' : '👶 Infantil'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-medium text-slate-700">IA detectou:</span>
                  </div>
                  <span className="text-sm font-bold px-3 py-1 rounded-lg bg-indigo-100 text-indigo-700">
                    {state.aiAnalysisData.detected_audience === 'KIDS' ? '👶 Infantil' : '👔 Adulto'}
                  </span>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800 leading-relaxed">
                  <strong>💡 Dica:</strong> Se o público alvo estiver incorreto, ajuste o seletor acima e clique em <strong>"Nova Análise"</strong> para recalcular as medidas com o contexto adequado. Isso garante maior precisão nas medidas sugeridas.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={async () => {
                  setShowAudienceConfirmation(false);
                  const imageUrlToAnalyze = state.rawImageUrl || state.selectedCoverImage;
                  
                  if (!imageUrlToAnalyze) {
                    alert("Por favor, faça upload de uma imagem primeiro.");
                    return;
                  }
                  
                  try {
                    // Resetar análise anterior
                    setState(prev => ({
                      ...prev,
                      aiAnalysisData: null,
                    }));
                    lastAnalyzedUrlRef.current = ""; // Resetar para permitir nova análise
                    
                    // Aguardar um momento para o estado atualizar
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Fazer nova análise com contexto atual (público alvo já foi ajustado pelo usuário)
                    await analyzeImage(imageUrlToAnalyze);
                  } catch (error: any) {
                    console.error("[ProductEditor] Erro ao fazer nova análise:", error);
                    alert(`Erro ao fazer nova análise: ${error.message || "Erro desconhecido"}`);
                  }
                }}
                className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>Nova Análise com Contexto Correto</span>
              </button>
              
              <button
                onClick={() => {
                  setShowAudienceConfirmation(false);
                }}
                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
              >
                Continuar com Análise Atual
              </button>
              
              <button
                onClick={() => {
                  setShowAudienceConfirmation(false);
                }}
                className="w-full px-4 py-2 text-slate-500 hover:text-slate-700 font-medium rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

