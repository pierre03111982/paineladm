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
import type { SmartGuideData, MeasurementPoint, SizeKey, MeasurementGroup } from "@/types/measurements";
import { analyzeImageForReference } from "@/services/calibrationService";
import { getStandardMeasurements } from "@/lib/standards/abnt-data";

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
  // Calibração por objeto de referência (ex.: cartão) — APENAS na foto frontal (Container 1)
  // Se encontrado na frente, essa escala é usada como "régua universal" para todo o produto (incl. verso/extras)
  calibrationScale: number | null; // pixels por cm (quando isCalibratedByCard)
  isCalibratedByCard: boolean;
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

  // Valores fixos no estado inicial para evitar React Hydration Error (localStorage só existe no client)
  const getInitialSizeCategory = (): 'standard' | 'plus' | 'numeric' | 'baby' | 'kids_numeric' | 'teen' => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastSizeCategory');
      if (saved === 'standard' || saved === 'plus' || saved === 'numeric' || saved === 'baby' || saved === 'kids_numeric' || saved === 'teen') {
        return saved as any;
      }
    }
    return 'standard';
  };

  const getInitialTargetAudience = (): 'female' | 'male' | 'kids' => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastTargetAudience');
      if (saved === 'female' || saved === 'male' || saved === 'kids') {
        return saved;
      }
    }
    return 'female';
  };

  // Estado principal: primeiro render usa sempre os mesmos defaults (evita hydration mismatch)
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
    sizeCategory: initialData?.sizeCategory ?? 'standard',
    targetAudience: initialData?.targetAudience ?? 'female',
    calibrationScale: initialData?.calibrationScale ?? null,
    isCalibratedByCard: initialData?.isCalibratedByCard ?? false,
  });

  // Após hidratação, restaurar preferência de público/grade do localStorage (só no client)
  useEffect(() => {
    if (typeof window === 'undefined' || (initialData?.targetAudience != null && initialData?.sizeCategory != null)) return;
    const savedAudience = localStorage.getItem('lastTargetAudience') as 'female' | 'male' | 'kids' | null;
    const savedCategory = localStorage.getItem('lastSizeCategory');
    const validAudience = savedAudience === 'female' || savedAudience === 'male' || savedAudience === 'kids';
    const validCategory = ['standard', 'plus', 'numeric', 'baby', 'kids_numeric', 'teen'].includes(savedCategory || '');
    setState(prev => ({
      ...prev,
      ...(validAudience && initialData?.targetAudience == null && { targetAudience: savedAudience! }),
      ...(validCategory && initialData?.sizeCategory == null && { sizeCategory: savedCategory as typeof prev.sizeCategory }),
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- só na montagem, sem initialData nas deps para não sobrescrever

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

  // Caixas 2, 3 e 4: só cabeçalho visível até clicar em "Análise do Produto (IA)"; depois corpo surge (2 com loading, 3 e 4 em sequência)
  const [showBox2Content, setShowBox2Content] = useState(false);
  const [showBox3Content, setShowBox3Content] = useState(false);
  const [showBox4Content, setShowBox4Content] = useState(false);
  const [animateBox3, setAnimateBox3] = useState(false);
  const [animateBox4, setAnimateBox4] = useState(false);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const box2CardRef = useRef<HTMLDivElement | null>(null);
  
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

  // Callbacks estáveis para SmartMeasurementEditor (Regras dos Hooks: sempre no topo, incondicional)
  const handleMeasurementsChange = useCallback((data: SmartGuideData) => {
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
  }, []);

  const smartMeasurementInitialData = useMemo(() => {
    const measurementKey = `${state.targetAudience}_${state.sizeCategory}`;
    const persistedMeasurements = state.persistedMeasurementsByAudience || {};
    const persistedData = persistedMeasurements[measurementKey];
    const smartData = state.smartMeasurements;
    const isConjunto = /conjunto/i.test((state.aiAnalysisData?.product_type || '').trim());
    const smartHasGroups = !!(smartData?.groups && smartData.groups.length > 0);
    const persistedHasGroups = !!(persistedData?.groups && persistedData.groups.length > 0);

    // Conjunto: priorizar sempre o que tiver groups, para não mostrar flat no lugar de Cropped/Saia
    if (isConjunto) {
      if (smartHasGroups) {
        console.log('[ProductEditor] 📦 Conjunto: usando smartMeasurements com groups');
        return smartData;
      }
      if (persistedHasGroups) {
        console.log('[ProductEditor] 📦 Conjunto: usando medidas persistidas com groups para', measurementKey);
        return persistedData;
      }
    }

    if (persistedData) {
      console.log('[ProductEditor] 📦 Usando medidas persistidas para', measurementKey);
      return persistedData;
    }
    console.log('[ProductEditor] 📦 Usando smartMeasurements como initialData:', {
      hasData: !!smartData,
      hasSizes: !!(smartData?.sizes && Object.keys(smartData.sizes || {}).length > 0),
      hasGroups: smartHasGroups,
    });
    return smartData;
  }, [state.smartMeasurements, state.targetAudience, state.sizeCategory, state.persistedMeasurementsByAudience, state.aiAnalysisData?.product_type]);

  // === HANDLER DE ANÁLISE IA ===
  // contextOverride: ao refazer análise após confirmação de público/grade, usa esses valores em vez do state
  const analyzeImage = async (
    imageUrl: string,
    contextOverride?: { targetAudience?: 'female' | 'male' | 'kids'; sizeCategory?: 'standard' | 'plus' | 'numeric' | 'baby' | 'kids_numeric' | 'teen' }
  ) => {
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
      const effectiveAudience = contextOverride?.targetAudience ?? state.targetAudience;
      const effectiveSizeCategory = contextOverride?.sizeCategory ?? state.sizeCategory;
      console.log("[ProductEditor] 🔍 Iniciando análise com imageUrl:", imageUrl.substring(0, 100) + "...", contextOverride ? { contextOverride } : "");
      
      // Preparar contexto para a análise (usa override quando refaz após confirmação de público)
      const context: {
        audience?: 'KIDS' | 'ADULT';
        sizeSystem?: 'AGE_BASED' | 'LETTER_BASED' | 'NUMERIC';
      } = {};
      
      if (effectiveAudience === 'kids') {
        context.audience = 'KIDS';
      } else if (effectiveAudience === 'female' || effectiveAudience === 'male') {
        context.audience = 'ADULT';
      }
      
      if (effectiveAudience === 'kids') {
        if (effectiveSizeCategory === 'baby') {
          context.sizeSystem = 'AGE_BASED';
        } else if (effectiveSizeCategory === 'kids_numeric' || effectiveSizeCategory === 'teen') {
          context.sizeSystem = 'AGE_BASED';
        } else {
          context.sizeSystem = 'AGE_BASED';
        }
      } else {
        if (effectiveSizeCategory === 'numeric') {
          context.sizeSystem = 'NUMERIC';
        } else if (effectiveSizeCategory === 'plus') {
          context.sizeSystem = 'NUMERIC';
        } else {
          context.sizeSystem = 'LETTER_BASED';
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
      
      // Validar se as cores são precisas (não genéricas) — rejeitar "Cinza" quando for a única e nome/descrição indicam outra cor
      const genericColorNames = ["cinza", "gray", "grey", "neutro", "neutral", "não identificad", "não especificad"];
      const colorWordsInText = (text: string) => {
        const t = (text || "").toLowerCase();
        const colorHexMap: Record<string, string> = {
          lilás: "#E6E6FA", lilas: "#E6E6FA", rosa: "#FFC0CB", azul: "#0000FF", vermelho: "#FF0000", verde: "#008000",
          preto: "#000000", branco: "#FFFFFF", bege: "#F5F5DC", marrom: "#8B4513", amarelo: "#FFFF00", dourado: "#FFD700",
          prateado: "#C0C0C0", bordô: "#722F37", bordo: "#722F37", coral: "#FF7F50", corais: "#FF7F50", vinho: "#722F37",
        };
        const match = t.match(/(lilás|lilas|rosa|azul|vermelho|verde|preto|branco|bege|marrom|amarelo|dourado|prateado|bordô|bordo|coral|vinho)/i);
        if (match && match[1]) {
          const name = match[1].toLowerCase().replace("lilas", "lilás");
          return { hex: colorHexMap[name] || "#E6E6FA", name: name.charAt(0).toUpperCase() + name.slice(1) };
        }
        return null;
      };
      if (Array.isArray(processedColors) && processedColors.length > 0) {
        processedColors = processedColors.filter(color => {
          const hasValidHex = color.hex && color.hex.startsWith('#') && color.hex.length === 7;
          const nameLower = (color.name || "").toLowerCase().trim();
          const isGenericOnly = genericColorNames.some(g => nameLower === g || nameLower.startsWith(g + " "));
          const hasValidName = color.name && color.name.trim().length > 0 &&
            !nameLower.includes('não identificad') &&
            !nameLower.includes('não especificad');
          return hasValidHex && hasValidName && !(processedColors.length === 1 && isGenericOnly);
        });
      }
      // Se sobrou só Cinza/cor genérica ou vazio, tentar extrair cor do nome/descrição (ex.: vestido lilás → Lilás)
      if (processedColors.length === 0 || (processedColors.length === 1 && genericColorNames.some(g => (processedColors[0]?.name || "").toLowerCase().includes(g)))) {
        const nome = (analysisData.nome_sugerido || "").toString();
        const desc = (analysisData.descricao_seo || "").toString();
        const fromNome = colorWordsInText(nome);
        const fromDesc = colorWordsInText(desc);
        const extracted = fromNome || fromDesc;
        if (extracted) {
          processedColors = [extracted];
          console.log("[ProductEditor] 🎨 Cor predominante corrigida a partir do nome/descrição (evitar Cinza incorreto):", extracted.name);
        }
      }
      
      // Se não houver dominant_colors válidos mas houver cor_predominante específica, usar (evitar genéricas)
      const genericColorNamesFallback = ["cinza", "gray", "grey", "neutro", "neutral"];
      if (processedColors.length === 0 && analysisData.cor_predominante) {
        const corPredominante = analysisData.cor_predominante.trim();
        const cpLower = corPredominante.toLowerCase();
        const isGeneric = genericColorNamesFallback.some(g => cpLower === g || cpLower.startsWith(g + " "));
        if (corPredominante && corPredominante.length > 2 &&
            !cpLower.includes('não identificad') &&
            !cpLower.includes('não especificad') &&
            !isGeneric) {
          processedColors = [{
            hex: "#808080",
            name: corPredominante
          }];
        }
      }
      
      // Limpar data da descrição SEO se existir
      let descricaoSEOLimpa = (analysisData.descricao_seo || "").toString();
      descricaoSEOLimpa = descricaoSEOLimpa
        .replace(/\[Análise IA[^\]]*\]\s*/g, "") // Remove [Análise IA - data]
        .trim();
      
      // Incluir cor do produto na descrição comercial quando faltar (para aparecer na Descrição Comercial/SEO)
      const corParaDescricao = processedColors[0]?.name || colorWordsInText((analysisData.nome_sugerido || "") + " " + descricaoSEOLimpa)?.name;
      if (corParaDescricao && descricaoSEOLimpa.length > 0) {
        const descLower = descricaoSEOLimpa.toLowerCase();
        const corLower = corParaDescricao.toLowerCase();
        const jaMencionaCor = descLower.includes(corLower) || /(\bna cor\b|\bcor\b|\bdisponível em\b|\blilás\b|\blilas\b|\brosa\b|\bazul\b|\bverde\b|\bvermelho\b|\bpreto\b|\bbranco\b|\bbege\b)/i.test(descricaoSEOLimpa);
        if (!jaMencionaCor) {
          descricaoSEOLimpa = descricaoSEOLimpa.trimEnd() + " Disponível na cor " + corParaDescricao + ".";
          console.log("[ProductEditor] 📝 Cor adicionada à descrição comercial:", corParaDescricao);
        }
      }
      
      // A IA agora está configurada para gerar textos COMPLETOS dentro de 470 caracteres
      // Descrição SEO agora não tem limite - manter texto completo
      
      // Tecido: usar o valor retornado pela API; ignorar frases genéricas que não descrevem o tecido
      const detectedFabric = analysisData.detected_fabric || analysisData.tecido_estimado || analysisData.material || "";
      let finalDetectedFabric = (detectedFabric && typeof detectedFabric === "string" && detectedFabric.trim() !== "")
        ? detectedFabric.trim()
        : "";
      const genericFabricPhrases = [
        "tecido", "material", "tecido de qualidade", "tecido de qualidade.", "qualidade",
        "não identificado", "não identificada", "não especificado", "não especificada"
      ];
      const fabricLower = finalDetectedFabric.toLowerCase();
      if (genericFabricPhrases.some(p => fabricLower === p || fabricLower.startsWith(p + " ") || fabricLower.endsWith(" " + p))) {
        finalDetectedFabric = "";
      }
      if (finalDetectedFabric && (fabricLower === "tecido" || fabricLower === "material")) {
        finalDetectedFabric = "";
      }
      
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
        // Validar e filtrar cores por item; rejeitar "Cinza" quando for a única e nome/descrição indicam outra cor
        const isOnlyGray = (colors: Array<{ hex?: string; name?: string }>) =>
          colors.length === 1 && ["cinza", "gray", "grey"].some(g => (colors[0]?.name || "").toLowerCase().includes(g));
        const colorFromText = colorWordsInText((analysisData.nome_sugerido || "") + " " + (analysisData.descricao_seo || ""));
        processedColorsByItem = processedColorsByItem.map(itemData => {
          let colors = (itemData.colors || []).filter((color: { hex: string; name: string }) => {
            const hasValidHex = color?.hex && color.hex.startsWith('#') && color.hex.length === 7;
            const hasValidName = color?.name && 
              !color.name.toLowerCase().includes('não identificad') &&
              !color.name.toLowerCase().includes('não especificad') &&
              color.name.trim().length > 0;
            return hasValidHex && hasValidName;
          });
          if (isOnlyGray(colors) && colorFromText) {
            colors = [colorFromText];
            console.log("[ProductEditor] 🎨 Cores por item corrigidas (Cinza → " + colorFromText.name + "):", itemData.item);
          }
          return { item: itemData.item || "Item", colors };
        }).filter(itemData => itemData.colors.length > 0);
        
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

      // Conjunto: se temos dominant_colors mas não colors_by_item, sintetizar por peça para exibir corretamente
      const isConjuntoType = analysisData.product_type?.toLowerCase().includes("conjunto");
      const hasDominantColors = Array.isArray(analysisData.dominant_colors) && analysisData.dominant_colors.length > 0;
      const validProcessedColors = (analysisData.dominant_colors || []).filter(
        (c: { hex?: string; name?: string }) => c?.hex?.startsWith?.("#") && c?.name?.trim?.()
      );
      if (
        isConjuntoType &&
        validProcessedColors.length > 0 &&
        (!Array.isArray(processedColorsByItem) || processedColorsByItem.length === 0)
      ) {
        const match = (analysisData.product_type || "").match(/conjunto\s+(.+)\s+e\s+(.+)/i);
        const part1 = match ? match[1].trim() : "Parte 1";
        const part2 = match ? match[2].trim() : "Parte 2";
        processedColorsByItem = [
          { item: part1, colors: validProcessedColors },
          { item: part2, colors: validProcessedColors },
        ];
        console.log("[ProductEditor] 🎨 colors_by_item sintetizado para conjunto:", processedColorsByItem.map((i: { item: string; colors: unknown[] }) => ({ item: i.item, colorsCount: i.colors.length })));
      }
      if (isConjuntoType && processedColors.length === 0 && validProcessedColors.length > 0) {
        processedColors = validProcessedColors;
      }

      // Fallback: extrair tecido e cores da descrição SEO quando a API não retornar (ou retornar genéricos)
      const descricaoParaFallback = (analysisData.descricao_seo || "").toString().replace(/\[Análise IA[^\]]*\]\s*/g, "").trim();
      if (descricaoParaFallback.length > 20) {
        if (!finalDetectedFabric) {
          const fabricPatterns = [
            /confeccionad[oa]?\s+em\s+([^.,]+?)(?:\s*,|\s*\.|\s+oferece|\s+e\s+)/i,
            /(?:em|de)\s+(malha|algodão|viscose|linho|seda|chiffon|elastano|poliamida|nylon|poliéster|cetim|jeans|sarja|moletom|malha)[\s,.]/i,
            /(malha|algodão|viscose|linho|seda)\s+(?:de|com|leve|macio)/i,
          ];
          for (const re of fabricPatterns) {
            const m = descricaoParaFallback.match(re);
            if (m && m[1]) {
              const extracted = m[1].trim();
              if (extracted.length >= 3 && extracted.length <= 50 && !/^(não|nao|qualidade|tecido|material)$/i.test(extracted)) {
                finalDetectedFabric = extracted.charAt(0).toUpperCase() + extracted.slice(1).toLowerCase();
                console.log("[ProductEditor] 📎 Tecido extraído da descrição (fallback):", finalDetectedFabric);
                break;
              }
            }
          }
        }
        if (processedColors.length === 0) {
          const colorPatterns = [
            /na\s+cor\s+([a-záàâãéêíóôõúç]+)(?:\s*,|\s*\.|\s+transmite)/i,
            /em\s+([a-záàâãéêíóôõúç]+)\s*,?\s*transmite/i,
            /(?:cor|tom)\s+([a-záàâãéêíóôõúç]+)(?:\s*[,.]|\s+e)/i,
            /(rosa|azul|vermelho|verde|preto|branco|bege|lilás|marrom|amarelo|cinza|dourado|prateado|bordô|corais?)/i,
          ];
          const colorHexMap: Record<string, string> = {
            rosa: "#FFC0CB", azul: "#0000FF", vermelho: "#FF0000", verde: "#008000", preto: "#000000",
            branco: "#FFFFFF", bege: "#F5F5DC", lilás: "#E6E6FA", marrom: "#8B4513", amarelo: "#FFFF00",
            cinza: "#808080", dourado: "#FFD700", prateado: "#C0C0C0", bordô: "#722F37", coral: "#FF7F50", corais: "#FF7F50",
          };
          for (const re of colorPatterns) {
            const m = descricaoParaFallback.match(re);
            if (m && m[1]) {
              const name = m[1].trim();
              if (name.length >= 2 && name.length <= 20) {
                const hex = colorHexMap[name.toLowerCase()] || "#808080";
                processedColors = [{ hex, name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() }];
                console.log("[ProductEditor] 📎 Cor extraída da descrição (fallback):", processedColors[0].name);
                break;
              }
            }
          }
        }
      }

      // Após fallback: para conjunto, garantir colors_by_item a partir de dominant_colors/processedColors
      const productTypeForConjunto = analysisData.product_type?.toLowerCase().includes("conjunto");
      if (
        productTypeForConjunto &&
        Array.isArray(processedColors) &&
        processedColors.length > 0 &&
        (!Array.isArray(processedColorsByItem) || processedColorsByItem.length === 0)
      ) {
        const matchConjunto = (analysisData.product_type || "").match(/conjunto\s+(.+)\s+e\s+(.+)/i);
        const p1 = matchConjunto ? matchConjunto[1].trim() : "Parte 1";
        const p2 = matchConjunto ? matchConjunto[2].trim() : "Parte 2";
        processedColorsByItem = [
          { item: p1, colors: processedColors },
          { item: p2, colors: processedColors },
        ];
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
      
      // Aceitar chaves alternativas da API (produto único ou conjunto)
      const productType = analysisData.product_type || analysisData.tipo_produto || analysisData.productType || "";
      const standardMeasurementsFromApi = analysisData.standard_measurements || analysisData.medidas_produto || analysisData.standardMeasurements;

      // Inferir público alvo a partir do CONTEÚDO (tipo, descrição, medidas) para o pop-up de confirmação.
      // A API pode retornar detected_audience alinhado ao contexto enviado (ex.: ADULT quando selecionou Feminino),
      // então priorizamos a inferência pelo conteúdo para detectar peça infantil e exibir o pop-up.
      const rawDetected = analysisData.detected_audience;
      const textToCheck = [
        productType,
        mappedCategory,
        analysisData.nome_sugerido || "",
        analysisData.descricao_seo || "",
        (analysisData.suggested_category || analysisData.categoria_sugerida) || "",
      ].join(" ").toLowerCase();
      const kidKeywords = ["infantil", "criança", "crianca", "kids", "bebê", "bebe", "infant", "child", "juvenil", "menino", "menina", "berçário", "bercario", "chá de bebê", "cha de bebe", "primeira infância", "0 a 3", "0-3", "2 a 6", "2-6"];
      const hasKidKeyword = kidKeywords.some(k => textToCheck.includes(k));
      const sm = standardMeasurementsFromApi;
      const smallMeasurements = sm && (
        (typeof sm.bust === 'number' && sm.bust < 55) ||
        (typeof sm.waist === 'number' && sm.waist < 52) ||
        (typeof sm.length === 'number' && sm.length < 55)
      );
      const inferredFromContent: 'KIDS' | 'ADULT' = (hasKidKeyword || smallMeasurements) ? 'KIDS' : 'ADULT';
      // Usar inferência quando indica KIDS (para mostrar pop-up mesmo se a API devolveu ADULT por causa do contexto)
      const effectiveDetectedAudience: 'KIDS' | 'ADULT' = inferredFromContent === 'KIDS'
        ? 'KIDS'
        : (rawDetected ?? inferredFromContent);
      if (inferredFromContent === 'KIDS' && rawDetected === 'ADULT') {
        console.log("[ProductEditor] 📌 Conteúdo indica KIDS (medidas/texto); API devolveu ADULT por contexto. Usando KIDS para pop-up.", { hasKidKeyword, smallMeasurements, sm });
      } else if (!rawDetected) {
        console.log("[ProductEditor] 📌 detected_audience inferido do conteúdo:", effectiveDetectedAudience, { hasKidKeyword, smallMeasurements });
      }

      const newAiAnalysisData = {
        nome_sugerido: analysisData.nome_sugerido || "",
        descricao_seo: descricaoSEOLimpa,
        tags: analysisData.tags || [], // Mantido apenas internamente
        suggested_category: mappedCategory,
        categoria_sugerida: mappedCategory, // Compatibilidade
        product_type: productType,
        detected_fabric: finalDetectedFabric,
        tecido_estimado: finalDetectedFabric,
        dominant_colors: processedColors,
        colors_by_item: processedColorsByItem && processedColorsByItem.length > 0 
          ? processedColorsByItem 
          : undefined,
        standard_measurements: standardMeasurementsFromApi || undefined,
        cor_predominante: processedColors[0]?.name || "",
        detalhes: analysisData.detalhes || [], // Compatibilidade
        detected_audience: effectiveDetectedAudience,
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
        detected_audience: newAiAnalysisData.detected_audience,
      });
      
      // Verificar inconsistência entre público alvo selecionado e detectado (ou inferido)
      const detectedAudience = effectiveDetectedAudience;
      const selectedAudience = state.targetAudience;
      let hasInconsistency = false;
      
      if (detectedAudience) {
        const isSelectedAdult = selectedAudience === 'female' || selectedAudience === 'male';
        const isDetectedAdult = detectedAudience === 'ADULT';
        const isSelectedKids = selectedAudience === 'kids';
        const isDetectedKids = detectedAudience === 'KIDS';
        
        if ((isSelectedAdult && isDetectedKids) || (isSelectedKids && isDetectedAdult)) {
          hasInconsistency = true;
          console.log("[ProductEditor] ⚠️ Inconsistência detectada (público/grade):", {
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

      // Preencher medidas junto com a análise: uma medida por tamanho da grade (ABNT), usando API só no tamanho de referência
      let initialSmartMeasurements: SmartGuideData | undefined;
      const apiStandardMeasurements = newAiAnalysisData.standard_measurements;
      const productTypeRaw = (newAiAnalysisData.product_type || '').trim();
      const isConjuntoTypeMeasure = /conjunto/i.test(productTypeRaw);
      const gradeSizes = getSizesForGrade(effectiveSizeCategory, effectiveAudience);
      const refIdx = Math.floor(gradeSizes.length / 2);
      const refSize = gradeSizes[refIdx] || gradeSizes[0];
      const abntAudience = effectiveAudience === 'kids' ? 'KIDS' : effectiveAudience === 'male' ? 'MALE' : 'FEMALE';
      if (apiStandardMeasurements && (apiStandardMeasurements.bust != null || apiStandardMeasurements.waist != null || apiStandardMeasurements.hip != null || apiStandardMeasurements.length != null)) {
        const sizesRecord: Record<string, MeasurementPoint[]> = {};
        gradeSizes.forEach((sizeKey) => {
          const abnt = getStandardMeasurements(abntAudience, sizeKey);
          const useApi = sizeKey === refSize;
          const bust = useApi && (apiStandardMeasurements.bust != null && apiStandardMeasurements.bust > 0)
            ? apiStandardMeasurements.bust
            : (abnt?.bust ?? 0);
          const waist = useApi && (apiStandardMeasurements.waist != null && apiStandardMeasurements.waist > 0)
            ? apiStandardMeasurements.waist
            : (abnt?.waist ?? 0);
          const hip = useApi && (apiStandardMeasurements.hip != null && apiStandardMeasurements.hip > 0)
            ? apiStandardMeasurements.hip
            : (abnt?.hip ?? 0);
          const length = useApi && (apiStandardMeasurements.length != null && apiStandardMeasurements.length > 0)
            ? apiStandardMeasurements.length
            : (abnt?.length ?? 0);
          const points: MeasurementPoint[] = [];
          if (bust > 0) points.push({ id: 'bust', label: 'Busto', value: bust, startX: 0, startY: 0, endX: 0, endY: 0 });
          if (waist > 0) points.push({ id: 'waist', label: 'Cintura', value: waist, startX: 0, startY: 0, endX: 0, endY: 0 });
          if (hip > 0) points.push({ id: 'hip', label: 'Quadril', value: hip, startX: 0, startY: 0, endX: 0, endY: 0 });
          if (length > 0) points.push({ id: 'length', label: 'Comprimento', value: length, startX: 0, startY: 0, endX: 0, endY: 0 });
          if (points.length > 0) sizesRecord[sizeKey] = points;
        });
        if (Object.keys(sizesRecord).length > 0) {
          const firstSizeKey = (gradeSizes[0] || refSize) as SizeKey;
          const isConjunto = isConjuntoTypeMeasure;

          if (isConjunto) {
            // Conjunto: construir groups (Medidas Cropped, Medidas Saia) na primeira análise
            let topLabel = 'Parte de cima';
            let bottomLabel = 'Parte de baixo';
            const parts = productTypeRaw.split(/\s+e\s+/i);
            if (parts.length >= 2) {
              topLabel = (parts[0].replace(/^conjunto\s+/i, '').trim() || topLabel);
              bottomLabel = (parts[1].trim() || bottomLabel);
            }
            if (newAiAnalysisData.colors_by_item?.length >= 2) {
              topLabel = newAiAnalysisData.colors_by_item[0].item;
              bottomLabel = newAiAnalysisData.colors_by_item[1].item;
            }

            const groupsBuild: MeasurementGroup[] = [];
            // Grupo 1: parte de cima (busto, comprimento)
            const topSizes: Record<string, MeasurementPoint[]> = {};
            gradeSizes.forEach((sizeKey) => {
              const abnt = getStandardMeasurements(abntAudience, sizeKey);
              const useApi = sizeKey === refSize;
              const bust = useApi && (apiStandardMeasurements.bust != null && apiStandardMeasurements.bust > 0)
                ? apiStandardMeasurements.bust
                : (abnt?.bust ?? 0);
              const length = useApi && (apiStandardMeasurements.length != null && apiStandardMeasurements.length > 0)
                ? apiStandardMeasurements.length
                : (abnt?.length ?? 0);
              const points: MeasurementPoint[] = [];
              if (bust > 0) points.push({ id: 'bust', label: 'Busto', value: bust, startX: 0, startY: 0, endX: 0, endY: 0 });
              if (length > 0) points.push({ id: 'length', label: 'Comprimento', value: length, startX: 0, startY: 0, endX: 0, endY: 0 });
              if (points.length > 0) topSizes[sizeKey] = points;
            });
            if (Object.keys(topSizes).length > 0) {
              groupsBuild.push({
                id: 'top',
                label: topLabel,
                sizes: topSizes as Record<SizeKey, MeasurementPoint[]>,
              });
            }

            // Grupo 2: parte de baixo (cintura, quadril, comprimento)
            const bottomSizes: Record<string, MeasurementPoint[]> = {};
            gradeSizes.forEach((sizeKey) => {
              const abnt = getStandardMeasurements(abntAudience, sizeKey);
              const useApi = sizeKey === refSize;
              const waist = useApi && (apiStandardMeasurements.waist != null && apiStandardMeasurements.waist > 0)
                ? apiStandardMeasurements.waist
                : (abnt?.waist ?? 0);
              const hip = useApi && (apiStandardMeasurements.hip != null && apiStandardMeasurements.hip > 0)
                ? apiStandardMeasurements.hip
                : (abnt?.hip ?? 0);
              const length = useApi && (apiStandardMeasurements.length != null && apiStandardMeasurements.length > 0)
                ? apiStandardMeasurements.length
                : (abnt?.length ?? 0);
              const points: MeasurementPoint[] = [];
              if (waist > 0) points.push({ id: 'waist', label: 'Cintura', value: waist, startX: 0, startY: 0, endX: 0, endY: 0 });
              if (hip > 0) points.push({ id: 'hip', label: 'Quadril', value: hip, startX: 0, startY: 0, endX: 0, endY: 0 });
              if (length > 0) points.push({ id: 'length', label: 'Comprimento', value: length, startX: 0, startY: 0, endX: 0, endY: 0 });
              if (points.length > 0) bottomSizes[sizeKey] = points;
            });
            if (Object.keys(bottomSizes).length > 0) {
              groupsBuild.push({
                id: 'bottom',
                label: bottomLabel,
                sizes: bottomSizes as Record<SizeKey, MeasurementPoint[]>,
              });
            }

            if (groupsBuild.length > 0) {
              initialSmartMeasurements = {
                baseImage: imageUrl || state.rawImageUrl || '',
                activeSize: firstSizeKey,
                autoGrading: true,
                sizes: {} as Record<SizeKey, MeasurementPoint[]>,
                groups: groupsBuild,
              };
            }
          }

          if (!initialSmartMeasurements) {
            initialSmartMeasurements = {
              baseImage: imageUrl || state.rawImageUrl || '',
              activeSize: firstSizeKey,
              autoGrading: true,
              sizes: sizesRecord as Record<SizeKey, MeasurementPoint[]>,
            };
          }
        }
      }

      // Fallback para conjuntos: se a API não retornou standard_measurements, construir groups só com ABNT para primeiro carregamento correto (Medidas Cropped / Short)
      if (isConjuntoTypeMeasure && !initialSmartMeasurements && gradeSizes.length > 0) {
        let topLabel = 'Parte de cima';
        let bottomLabel = 'Parte de baixo';
        const parts = productTypeRaw.split(/\s+e\s+/i);
        if (parts.length >= 2) {
          topLabel = (parts[0].replace(/^conjunto\s+/i, '').trim() || topLabel);
          bottomLabel = (parts[1].trim() || bottomLabel);
        }
        if (newAiAnalysisData.colors_by_item?.length >= 2) {
          topLabel = newAiAnalysisData.colors_by_item[0].item;
          bottomLabel = newAiAnalysisData.colors_by_item[1].item;
        }
        const groupsBuild: MeasurementGroup[] = [];
        const firstSizeKey = (gradeSizes[0] || refSize) as SizeKey;
        const topSizes: Record<string, MeasurementPoint[]> = {};
        gradeSizes.forEach((sizeKey) => {
          const abnt = getStandardMeasurements(abntAudience, sizeKey);
          const bust = abnt?.bust ?? 0;
          const length = abnt?.length ?? 0;
          const points: MeasurementPoint[] = [];
          if (bust > 0) points.push({ id: 'bust', label: 'Busto', value: bust, startX: 0, startY: 0, endX: 0, endY: 0 });
          if (length > 0) points.push({ id: 'length', label: 'Comprimento', value: length, startX: 0, startY: 0, endX: 0, endY: 0 });
          if (points.length > 0) topSizes[sizeKey] = points;
        });
        if (Object.keys(topSizes).length > 0) {
          groupsBuild.push({ id: 'top', label: topLabel, sizes: topSizes as Record<SizeKey, MeasurementPoint[]> });
        }
        const bottomSizes: Record<string, MeasurementPoint[]> = {};
        gradeSizes.forEach((sizeKey) => {
          const abnt = getStandardMeasurements(abntAudience, sizeKey);
          const waist = abnt?.waist ?? 0;
          const hip = abnt?.hip ?? 0;
          const length = abnt?.length ?? 0;
          const points: MeasurementPoint[] = [];
          if (waist > 0) points.push({ id: 'waist', label: 'Cintura', value: waist, startX: 0, startY: 0, endX: 0, endY: 0 });
          if (hip > 0) points.push({ id: 'hip', label: 'Quadril', value: hip, startX: 0, startY: 0, endX: 0, endY: 0 });
          if (length > 0) points.push({ id: 'length', label: 'Comprimento', value: length, startX: 0, startY: 0, endX: 0, endY: 0 });
          if (points.length > 0) bottomSizes[sizeKey] = points;
        });
        if (Object.keys(bottomSizes).length > 0) {
          groupsBuild.push({ id: 'bottom', label: bottomLabel, sizes: bottomSizes as Record<SizeKey, MeasurementPoint[]> });
        }
        if (groupsBuild.length > 0) {
          initialSmartMeasurements = {
            baseImage: imageUrl || state.rawImageUrl || '',
            activeSize: firstSizeKey,
            autoGrading: true,
            sizes: {} as Record<SizeKey, MeasurementPoint[]>,
            groups: groupsBuild,
          };
          console.log("[ProductEditor] 📦 Conjunto: fallback com groups ABNT (sem standard_measurements da API)");
        }
      }

      setState(prev => ({
        ...prev,
        aiAnalysisData: newAiAnalysisData,
        ...(initialSmartMeasurements && { smartMeasurements: initialSmartMeasurements }),
        ...(contextOverride?.targetAudience != null && { targetAudience: contextOverride.targetAudience }),
        ...(contextOverride?.sizeCategory != null && { sizeCategory: contextOverride.sizeCategory }),
      }));

      // Só esconder o overlay depois do React aplicar o state (evita tela zerada no primeiro frame)
      queueMicrotask(() => {
        analyzingRef.current = false;
        setAnalyzing(false);
      });
      
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
      // Em caso de erro, garantir que o overlay seja desligado (sucesso já desliga via queueMicrotask)
      if (analyzingRef.current) {
        analyzingRef.current = false;
        setAnalyzing(false);
      }
    }
  };

  // Análise inteligente NÃO é mais automática: é acionada pelo botão "Análise do Produto (IA)" na Caixa 1 (após Foto Frente e Foto Verso carregadas).
  // Este useEffect não dispara análise; mantido vazio para referência.
  useEffect(() => {
    // Análise apenas via botão "Análise do Produto (IA)" no rodapé da Configuração Inicial.
  }, []);

  // Caixas 2, 3 e 4 aparecem juntas quando a análise fica pronta (sem efeito escalonado)
  useEffect(() => {
    if (!state.aiAnalysisData || analyzing) return;
    setShowBox3Content(true);
    setShowBox4Content(true);
    setAnimateBox3(true);
    setAnimateBox4(true);
  }, [state.aiAnalysisData, analyzing]);

  // Frases em rotação no overlay de análise
  const LOADING_PHRASES = [
    "Analisando imagem do produto...",
    "Extraindo características e tecidos...",
    "Gerando nome e descrição comercial...",
    "Identificando categorias e medidas ABNT...",
    "Quase lá, preparando a ficha técnica...",
  ];
  useEffect(() => {
    if (!analyzing) return;
    const id = setInterval(() => setLoadingPhraseIndex((i) => (i + 1) % LOADING_PHRASES.length), 2200);
    return () => clearInterval(id);
  }, [analyzing]);

  // Mostrar overlay até ter análise E medidas com pelo menos um valor não zero (evita tela zerada)
  const hasSmartMeasurementsData = (() => {
    const sm = state.smartMeasurements;
    if (!sm) return false;
    const hasGroups = (sm.groups?.length ?? 0) > 0;
    const hasSizes = Object.keys(sm.sizes || {}).length > 0;
    if (!hasGroups && !hasSizes) return false;
    const hasNonZero = (points: { value?: number }[]) =>
      points?.some((p) => typeof p.value === "number" && p.value > 0) ?? false;
    if (hasGroups && sm.groups) {
      for (const g of sm.groups) {
        for (const sizeKey of Object.keys(g.sizes || {})) {
          if (hasNonZero(g.sizes![sizeKey as SizeKey] || [])) return true;
        }
      }
    }
    if (hasSizes && sm.sizes) {
      for (const sizeKey of Object.keys(sm.sizes)) {
        if (hasNonZero(sm.sizes[sizeKey as SizeKey] || [])) return true;
      }
    }
    return false;
  })();
  const showBox2LoadingOverlay =
    analyzing || (showBox2Content && !!state.aiAnalysisData && !hasSmartMeasurementsData);

  // Cursor de espera em toda a página enquanto overlay da Caixa 2 estiver ativo
  useEffect(() => {
    if (!showBox2LoadingOverlay) return;
    const prev = document.body.style.cursor;
    document.body.style.cursor = "wait";
    return () => {
      document.body.style.cursor = prev;
    };
  }, [showBox2LoadingOverlay]);

  // Centralizar Caixa 2 na janela quando abrir o carregamento (ao clicar em "Análise do Produto")
  useEffect(() => {
    if (showBox2LoadingOverlay && box2CardRef.current) {
      const el = box2CardRef.current;
      const timer = setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showBox2LoadingOverlay]);

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
    // Fotos Extra 1–4 só podem ser carregadas depois de Foto Frente e Foto Verso
    if (imageIndex != null && imageIndex >= 3) {
      const hasFotoFrente = !!state.rawImageUrl;
      const hasFotoVerso = state.extraImages.some((img) => img.idx === 2 && img.url);
      if (!hasFotoFrente || !hasFotoVerso) {
        alert("Carregue primeiro a Foto Frente e a Foto Verso para habilitar as fotos extras.");
        return;
      }
    }

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
      
      // GATILHO ÚNICO: apenas na primeira imagem (Foto de Frente — Container 1)
      if (imageIndex === undefined || imageIndex === 1) {
        // Resetar referências para permitir nova análise
        lastAnalyzedUrlRef.current = "";
        has429ErrorRef.current = false;
        last429ErrorTimeRef.current = 0;
        analyzingRef.current = false;

        // Calibração por objeto de referência (ex.: cartão) — SOMENTE na foto frontal.
        // Não rodar na foto de costas nem nas extras; se achar na frente, a escala vale para todo o produto.
        let calibrationScale: number | null = null;
        let isCalibratedByCard = false;
        try {
          const calibrationResult = await analyzeImageForReference(file);
          if (calibrationResult.found && calibrationResult.pixelsPerCm != null) {
            isCalibratedByCard = true;
            calibrationScale = calibrationResult.pixelsPerCm;
            console.log("[ProductEditor] 📏 Calibração por cartão (foto frontal): régua universal", { pixelsPerCm: calibrationScale });
          } else {
            console.log("[ProductEditor] 📏 Sem objeto de referência na frente; usando ABNT/IA.");
          }
        } catch (err) {
          console.warn("[ProductEditor] Calibração ignorada:", err);
        }
        
        setState(prev => ({
          ...prev,
          rawImageUrl: data.imageUrl,
          rawImageFile: file,
          selectedCoverImage: data.imageUrl,
          aiAnalysisData: null,
          calibrationScale,
          isCalibratedByCard,
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
      // Excluir foto frente (rawImageUrl) e resetar calibração
      setState(prev => ({
        ...prev,
        rawImageUrl: "",
        rawImageFile: null,
        selectedCoverImage: null,
        aiAnalysisData: null,
        calibrationScale: null,
        isCalibratedByCard: false,
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

  // Limpar campos da Configuração Inicial: fotos, análise e calibração
  const handleLimparCampos = () => {
    lastAnalyzedUrlRef.current = "";
    setUploadViewerIndex(0);
    setState(prev => ({
      ...prev,
      rawImageUrl: "",
      rawImageFile: null,
      selectedCoverImage: null,
      extraImages: [],
      aiAnalysisData: null,
      calibrationScale: null,
      isCalibratedByCard: false,
      smartMeasurements: undefined,
      imagemMedidasCustomizada: null,
      persistedMeasurementsByAudience: undefined,
    }));
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
      const standardMeasurements = analysisData.standard_measurements || {};
      console.log("[ProductEditor] 📏 Medidas padrão da análise:", standardMeasurements);
      
      const currentGradeSizes = getSizesForGrade(state.sizeCategory, state.targetAudience);
      const activeSize = (currentGradeSizes[0] || 'M') as SizeKey;
      
      console.log("[ProductEditor] 🎯 Primeira medida da grade (padrão):", {
        sizeCategory: state.sizeCategory,
        targetAudience: state.targetAudience,
        gradeSizes: currentGradeSizes,
        activeSize,
      });
      
      // Fallback ABNT quando a análise não traz valor (0 ou ausente) — evita medidas em 0 cm
      const abntAudience = state.targetAudience === 'kids' ? 'KIDS' : state.targetAudience === 'male' ? 'MALE' : 'FEMALE';
      const abntFallback = getStandardMeasurements(abntAudience, String(activeSize));
      const fallback = (key: 'bust' | 'waist' | 'hip' | 'length') => {
        const fromAnalysis = standardMeasurements[key];
        if (fromAnalysis != null && fromAnalysis > 0) return fromAnalysis;
        return abntFallback?.[key] ?? 0;
      };
      
      const pixelsToCm = (start: { x: number; y: number }, end: { x: number; y: number }, pixelsPerCm: number): number => {
        const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        return Math.round((dist / pixelsPerCm) * 10) / 10;
      };
      const scale = state.calibrationScale;
      const useCalibration = state.isCalibratedByCard && scale != null;
      
      const measurementPoints: MeasurementPoint[] = [];
      
      if ('bust_start' in landmarksData && 'bust_end' in landmarksData) {
        const value = useCalibration
          ? pixelsToCm(landmarksData.bust_start, landmarksData.bust_end, scale)
          : fallback('bust');
        console.log("[ProductEditor] 📐 Processando busto - valor:", value, useCalibration ? "(calibrado)" : value ? "análise/ABNT" : "landmarks");
        measurementPoints.push({
          id: 'bust',
          label: 'Busto',
          value,
          startX: landmarksData.bust_start.x,
          startY: landmarksData.bust_start.y,
          endX: landmarksData.bust_end.x,
          endY: landmarksData.bust_end.y,
        });
      }
      
      if ('waist_start' in landmarksData && 'waist_end' in landmarksData) {
        const value = useCalibration
          ? pixelsToCm(landmarksData.waist_start, landmarksData.waist_end, scale)
          : fallback('waist');
        console.log("[ProductEditor] 📐 Processando cintura - valor:", value, useCalibration ? "(calibrado)" : value ? "análise/ABNT" : "landmarks");
        measurementPoints.push({
          id: 'waist',
          label: 'Cintura',
          value,
          startX: landmarksData.waist_start.x,
          startY: landmarksData.waist_start.y,
          endX: landmarksData.waist_end.x,
          endY: landmarksData.waist_end.y,
        });
      }
      
      if ('length_top' in landmarksData && 'length_bottom' in landmarksData) {
        const value = useCalibration
          ? pixelsToCm(landmarksData.length_top, landmarksData.length_bottom, scale)
          : fallback('length');
        console.log("[ProductEditor] 📐 Processando comprimento - valor:", value, useCalibration ? "(calibrado)" : value ? "análise/ABNT" : "landmarks");
        measurementPoints.push({
          id: 'length',
          label: 'Comprimento',
          value,
          startX: landmarksData.length_top.x,
          startY: landmarksData.length_top.y,
          endX: landmarksData.length_bottom.x,
          endY: landmarksData.length_bottom.y,
        });
      }
      
      if ('hip_start' in landmarksData && 'hip_end' in landmarksData) {
        const value = useCalibration
          ? pixelsToCm(landmarksData.hip_start, landmarksData.hip_end, scale)
          : fallback('hip');
        console.log("[ProductEditor] 📐 Processando quadril - valor:", value, useCalibration ? "(calibrado)" : value ? "análise/ABNT" : "landmarks");
        measurementPoints.push({
          id: 'hip',
          label: 'Quadril',
          value,
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
      
      const measurementKey = `${state.targetAudience}_${state.sizeCategory}`;
      const persistedMeasurements = state.persistedMeasurementsByAudience || {};
      const productType = (analysisData.product_type || '').trim();
      const isConjunto = /conjunto/i.test(productType);

      if (isConjunto) {
        // Conjunto: manter/criar groups (Medidas Cropped, Medidas Saia/Shorts) em vez de sobrescrever com flat
        let topLabel = 'Parte de cima';
        let bottomLabel = 'Parte de baixo';
        const parts = productType.split(/\s+e\s+/i);
        if (parts.length >= 2) {
          topLabel = (parts[0].replace(/^conjunto\s+/i, '').trim() || topLabel);
          bottomLabel = (parts[1].trim() || bottomLabel);
        }
        if (analysisData.colors_by_item?.length >= 2) {
          topLabel = analysisData.colors_by_item[0].item;
          bottomLabel = analysisData.colors_by_item[1].item;
        }

        const topPoints = measurementPoints.filter((p) => p.id === 'bust' || p.id === 'length');
        const bottomPoints = measurementPoints.filter((p) => p.id === 'waist' || p.id === 'hip' || p.id === 'length');
        const topSizes: Record<string, MeasurementPoint[]> = {};
        const bottomSizes: Record<string, MeasurementPoint[]> = {};
        currentGradeSizes.forEach((size) => {
          topSizes[size] = topPoints.length > 0 ? topPoints : [];
          bottomSizes[size] = bottomPoints.length > 0 ? bottomPoints : [];
        });

        const groupsBuild: MeasurementGroup[] = [];
        if (Object.keys(topSizes).length > 0 && topPoints.length > 0) {
          groupsBuild.push({
            id: 'top',
            label: topLabel,
            sizes: topSizes as Record<SizeKey, MeasurementPoint[]>,
          });
        }
        if (Object.keys(bottomSizes).length > 0 && bottomPoints.length > 0) {
          groupsBuild.push({
            id: 'bottom',
            label: bottomLabel,
            sizes: bottomSizes as Record<SizeKey, MeasurementPoint[]>,
          });
        }

        if (groupsBuild.length > 0) {
          const smartMeasurementsData: any = {
            baseImage: imageUrl,
            activeSize: activeSize,
            autoGrading: true,
            sizes: {} as Record<SizeKey, MeasurementPoint[]>,
            groups: groupsBuild,
          };
          console.log("[ProductEditor] 📐 Conjunto: medidas em groups (não flat):", groupsBuild.map((g) => g.label));
          setState((prev) => ({
            ...prev,
            smartMeasurements: smartMeasurementsData,
            persistedMeasurementsByAudience: {
              ...persistedMeasurements,
              [measurementKey]: smartMeasurementsData,
            },
          }));
          return;
        }
      }

      // 3. Produto único: criar SmartGuideData flat (sizes)
      const sizes: Record<string, MeasurementPoint[]> = {};
      currentGradeSizes.forEach((size) => {
        sizes[size] = measurementPoints;
      });
      const standardSizes: SizeKey[] = ['PP', 'P', 'M', 'G', 'GG', 'XG'];
      standardSizes.forEach((size) => {
        if (!sizes[size]) sizes[size] = [];
      });

      const smartMeasurementsData: any = {
        baseImage: imageUrl,
        activeSize: activeSize,
        autoGrading: true,
        sizes,
      };

      console.log("[ProductEditor] 📊 Medidas criadas para grade:", {
        grade: state.sizeCategory,
        tamanhos: currentGradeSizes,
        tamanhoIntermediario: activeSize,
        medidasPorTamanho: Object.keys(sizes).map((size) => `${size}: ${sizes[size].length} medidas`),
      });

      setState((prev) => ({
        ...prev,
        smartMeasurements: smartMeasurementsData,
        persistedMeasurementsByAudience: {
          ...persistedMeasurements,
          [measurementKey]: smartMeasurementsData,
        },
      }));

      console.log("[ProductEditor] ✅ Medidas processadas e carregadas automaticamente:", {
        measurementsCount: measurementPoints.length,
        measurements: measurementPoints.map((m) => `${m.label}: ${m.value}cm`),
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
                {(() => {
                  const hasFotoFrente = !!state.rawImageUrl;
                  const hasFotoVerso = state.extraImages.some((img) => img.idx === 2 && img.url);
                  const extrasHabilitados = hasFotoFrente && hasFotoVerso;
                  return [
                    { idx: 1, label: 'Foto Frente', subtitle: '', required: true },
                    { idx: 2, label: 'Foto Verso', subtitle: '', required: true },
                    { idx: 3, label: 'Foto Extra 1', subtitle: '', required: false },
                    { idx: 4, label: 'Foto Extra 2', subtitle: '', required: false },
                    { idx: 5, label: 'Foto Extra 3', subtitle: '', required: false },
                    { idx: 6, label: 'Foto Extra 4', subtitle: '', required: false },
                  ].map(({ idx, label, subtitle, required }) => {
                    const isExtra = idx >= 3;
                    const desabilitado = isExtra && !extrasHabilitados;
                    return (
                  <div
                    key={idx}
                    className="flex flex-col gap-0.5 w-full h-full"
                  >
                    <div
                      ref={(el) => {
                        if (idx === 1) dropzoneRef.current = el;
                        dropzoneRefs.current[idx - 1] = el;
                      }}
                      onDrop={(e) => {
                        if (desabilitado) {
                          e.preventDefault();
                          return;
                        }
                        handleDrop(e, idx);
                      }}
                      onDragOver={handleDragOver}
                      onClick={() => {
                        if (desabilitado) return;
                        if (idx === 1) {
                          fileInputRef.current?.click();
                        } else {
                          fileInputRefs.current[idx - 1]?.click();
                        }
                      }}
                      className={`relative flex-1 w-full border-2 rounded-lg flex items-center justify-center transition-colors overflow-hidden ${desabilitado ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-70' : 'bg-white cursor-pointer'} ${!desabilitado && (idx === 1 || idx === 2) ? 'border-red-300 hover:border-red-400 hover:bg-red-50/30' : ''} ${!desabilitado && isExtra ? 'border-blue-300 hover:border-blue-400 hover:bg-blue-50/30' : ''}`}
                      title={desabilitado ? 'Carregue a Foto Frente e a Foto Verso primeiro' : 'Clique para fazer upload'}
                    >
                      {idx === 1 && (
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-semibold shadow-md z-10 whitespace-nowrap" style={{ color: 'white' }}>
                          Calibrar imagem
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
                          <ImageIcon className="w-10 h-10" strokeWidth={2} style={{ color: '#d1d5db', stroke: '#d1d5db' }} />
                          {desabilitado && (
                            <span className="absolute bottom-10 left-1 right-1 text-center text-[10px] text-slate-500 px-1">
                              Frente e Verso primeiro
                            </span>
                          )}
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
                    );
                  });
                })()}
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
          
          {/* Rodapé Caixa 1 - Configuração Inicial: Análise (IA) e Limpar campos */}
          {(() => {
            const hasFotoFrente = !!state.rawImageUrl;
            const hasFotoVerso = state.extraImages.some(img => img.idx === 2 && img.url);
            const podeAnalisar = hasFotoFrente && hasFotoVerso;
            return (
              <div className="mt-2 pt-2 flex gap-3 items-center flex-wrap justify-center">
                  <button
                  type="button"
                  onClick={() => {
                    const imageUrlToAnalyze = state.rawImageUrl || state.selectedCoverImage;
                    if (!imageUrlToAnalyze) return;
                    lastAnalyzedUrlRef.current = "";
                    // 1) Abrir Caixa 2 e mostrar overlay/cursor imediatamente
                    setShowBox2Content(true);
                    setAnalyzing(true);
                    // 2) Deixar o React pintar o overlay e só então iniciar a análise (evita tela em branco sem spinner)
                    const runAnalysis = async () => {
                      try {
                        await analyzeImage(imageUrlToAnalyze);
                      } catch (error: unknown) {
                        console.error("[ProductEditor] Erro na análise do produto:", error);
                        alert(`Erro na análise: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
                      }
                    };
                    requestAnimationFrame(() => {
                      setTimeout(runAnalysis, 0);
                    });
                  }}
                  disabled={!podeAnalisar || analyzing}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 text-white text-sm font-semibold rounded-lg shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analisando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Análise do Produto (IA)</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleLimparCampos}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg border border-slate-300 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Limpar campos</span>
                </button>
              </div>
            );
          })()}
          
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
      
      {/* CONTAINER 2: Análise Inteligente via IA (posição 2) — centralizado na tela ao carregar */}
      <div ref={box2CardRef} className="scroll-mt-8">
        <AnimatedCard className="p-0 overflow-hidden bg-white shadow-sm">
        {/* CardHeader */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-6 py-4 flex items-center gap-3 border-b border-purple-500/20">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg" style={{ color: 'white' }}>
            2
          </div>
          <div className="flex-1 text-white" style={{ color: 'white' }}>
            <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ color: 'white' }}>
              <Sparkles className="w-5 h-5" stroke="white" style={{ stroke: 'white' }} />
              <span style={{ color: 'white' }}>Análise Inteligente via IA</span>
            </h2>
            <p className="text-sm text-white mt-0.5" style={{ color: 'white' }}>Análise inteligente, medidas ABNT e informações do produto geradas automaticamente</p>
          </div>
        </div>
        
        {showBox2Content && (
        <>
        {/* Corpo - Duas colunas: esquerda Marketing & SEO + Ficha Técnica | direita Medidas do Produto */}
        <div
          className={`p-6 relative ${showBox2LoadingOverlay ? "min-h-[420px]" : ""}`}
          style={showBox2LoadingOverlay ? { cursor: "wait" } : undefined}
        >
          {/* Overlay de carregamento: spinner + cursor de espera até análise e medidas prontos */}
          {showBox2LoadingOverlay && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg"
              style={{ cursor: "wait", minHeight: "400px" }}
              aria-busy="true"
              aria-live="polite"
            >
              <div className="text-center max-w-md px-8">
                <div className="relative w-28 h-28 mx-auto mb-8">
                  <div className="absolute inset-0 rounded-full border-4 border-purple-200" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 animate-spin" />
                  <div className="absolute inset-3 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin" style={{ animationDuration: '1.2s', animationDirection: 'reverse' }} />
                </div>
                <p className="text-xl font-bold text-slate-800 mb-3">
                  IA analisando o produto
                </p>
                <p className="text-base text-slate-600 leading-relaxed min-h-10 flex items-center justify-center transition-opacity duration-300">
                  {LOADING_PHRASES[loadingPhraseIndex]}
                </p>
                <p className="text-sm text-slate-500 mt-3">
                  Fazendo o trabalho pesado e facilitando a vida do lojista
                </p>
              </div>
            </div>
          )}
          {/* Conteúdo (Marketing, Ficha Técnica, Medidas) só quando análise E medidas estiverem prontos — tudo de uma vez */}
          {!showBox2LoadingOverlay && (
          <div className="w-full flex gap-4 items-start min-w-0 overflow-hidden">
            {/* Coluna esquerda: Marketing & SEO + Ficha Técnica Automática (mesma largura que a direita) */}
            <div className="flex-1 min-w-0 basis-0 flex flex-col gap-4">
              {/* Marketing & SEO */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Marketing & SEO
                </h3>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Nome Sugerido</label>
                  {analyzing && !state.aiAnalysisData ? (
                    <div className="h-8 bg-slate-200 rounded animate-pulse" />
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
                      className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-700">Descrição Comercial/SEO</label>
                    <span className="text-xs text-slate-500">{(state.aiAnalysisData?.descricao_seo?.length || 0)} caracteres</span>
                  </div>
                  {analyzing && !state.aiAnalysisData ? (
                    <div className="space-y-1">
                      <div className="h-3 bg-slate-200 rounded animate-pulse w-full" />
                      <div className="h-3 bg-slate-200 rounded animate-pulse w-5/6" />
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
                      rows={3}
                      placeholder={analyzing ? "Analisando imagem..." : "Aguardando análise da imagem..."}
                      className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 resize-y min-h-[72px]"
                    />
                  )}
                </div>
              </div>

              {/* Ficha Técnica Automática */}
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
                        className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
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
                        className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
                      />
                    )}
                  </div>

                  {/* Tecido Detectado (para conjunto: mostrar por peça) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">
                      {(() => {
                        const pt = (state.aiAnalysisData?.product_type || "").toLowerCase();
                        return pt.includes("conjunto") ? "Tecido por peça" : "Tecido Detectado";
                      })()}
                    </label>
                    {analyzing && !state.aiAnalysisData ? (
                      <div className="h-9 bg-slate-200 rounded animate-pulse" />
                    ) : (() => {
                      const fabric = state.aiAnalysisData?.detected_fabric || state.aiAnalysisData?.tecido_estimado || "";
                      const productType = (state.aiAnalysisData?.product_type || "").toLowerCase();
                      const isConjunto = productType.includes("conjunto");
                      if (isConjunto && fabric) {
                        const match = (state.aiAnalysisData?.product_type || "").match(/conjunto\s+(.+)\s+e\s+(.+)/i);
                        const part1 = match ? match[1].trim() : "Parte 1";
                        const part2 = match ? match[2].trim() : "Parte 2";
                        return (
                          <div className="space-y-2">
                            <div className="space-y-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                              <span className="text-xs font-bold text-slate-800 uppercase">{part1}:</span>
                              <span className="text-sm text-slate-700 ml-1">{fabric}</span>
                            </div>
                            <div className="space-y-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                              <span className="text-xs font-bold text-slate-800 uppercase">{part2}:</span>
                              <span className="text-sm text-slate-700 ml-1">{fabric}</span>
                            </div>
                            <input
                              type="text"
                              value={fabric}
                              onChange={(e) => {
                                const v = e.target.value;
                                setState(prev => ({
                                  ...prev,
                                  aiAnalysisData: prev.aiAnalysisData
                                    ? { ...prev.aiAnalysisData, detected_fabric: v, tecido_estimado: v }
                                    : { detected_fabric: v, tecido_estimado: v },
                                }));
                              }}
                              placeholder="Editar tecido (aplica às duas peças)"
                              className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
                            />
                          </div>
                        );
                      }
                      return (
                        <input
                          type="text"
                          value={fabric}
                          onChange={(e) => {
                            const v = e.target.value;
                            setState(prev => ({
                              ...prev,
                              aiAnalysisData: prev.aiAnalysisData
                                ? { ...prev.aiAnalysisData, detected_fabric: v, tecido_estimado: v }
                                : { detected_fabric: v, tecido_estimado: v },
                            }));
                          }}
                          placeholder="Ex: Algodão, Linho, Couro"
                          className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
                        />
                      );
                    })()}
                  </div>

                  {/* Cores Predominantes */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Cores Predominantes
                    </label>
                    {analyzing && !state.aiAnalysisData ? (
                      <div className="h-9 bg-slate-200 rounded animate-pulse" />
                    ) : (() => {
                      const rawByItem = state.aiAnalysisData?.colors_by_item;
                      const rawDominant = state.aiAnalysisData?.dominant_colors || [];
                      const textForColor = ((state.aiAnalysisData?.nome_sugerido || "") + " " + (state.aiAnalysisData?.descricao_seo || "")).toLowerCase();
                      const colorHexMap: Record<string, string> = {
                        lilás: "#E6E6FA", lilas: "#E6E6FA", rosa: "#FFC0CB", azul: "#0000FF", vermelho: "#FF0000", verde: "#008000",
                        preto: "#000000", branco: "#FFFFFF", bege: "#F5F5DC", marrom: "#8B4513", amarelo: "#FFFF00", dourado: "#FFD700",
                        prateado: "#C0C0C0", bordô: "#722F37", bordo: "#722F37", coral: "#FF7F50", vinho: "#722F37",
                      };
                      // Hex mais saturados/visíveis para as bolinhas (evitar cores lavadas que parecem cinza)
                      const displayColorHexMap: Record<string, string> = {
                        lilás: "#B57EDC", lilas: "#B57EDC", rosa: "#E91E8C", azul: "#2563EB", vermelho: "#DC2626", verde: "#16A34A",
                        preto: "#000000", branco: "#E5E7EB", bege: "#D4B896", marrom: "#78350F", amarelo: "#EAB308", dourado: "#CA8A04",
                        prateado: "#6B7280", bordô: "#722F37", bordo: "#722F37", coral: "#EA580C", vinho: "#722F37", cinza: "#4B5563",
                      };
                      const getDisplayHex = (hex: string, name: string) => {
                        const key = (name || "").toLowerCase().trim().replace("lilas", "lilás");
                        if (displayColorHexMap[key]) return displayColorHexMap[key];
                        // Se o hex for muito claro (luminância alta), escurecer um pouco para a bolinha ficar visível
                        const h = hex.replace("#", "");
                        if (h.length === 6) {
                          const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
                          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                          if (lum > 0.85) {
                            const darken = (v: number) => Math.round(Math.max(0, v * 255 * 0.7));
                            return `#${darken(r).toString(16).padStart(2, "0")}${darken(g).toString(16).padStart(2, "0")}${darken(b).toString(16).padStart(2, "0")}`;
                          }
                        }
                        return hex;
                      };
                      const colorFromNomeDesc = (): { hex: string; name: string } | null => {
                        const m = textForColor.match(/(lilás|lilas|rosa|azul|vermelho|verde|preto|branco|bege|marrom|amarelo|dourado|prateado|bordô|bordo|coral|vinho)/i);
                        if (m && m[1]) {
                          const key = m[1].toLowerCase().replace("lilas", "lilás");
                          return { hex: colorHexMap[key] || "#E6E6FA", name: key.charAt(0).toUpperCase() + key.slice(1) };
                        }
                        return null;
                      };
                      const isOnlyGray = (colors: Array<{ name?: string }>) =>
                        colors.length === 1 && ["cinza", "gray", "grey"].some(g => (colors[0]?.name || "").toLowerCase().includes(g));
                      const replacementColor = colorFromNomeDesc();
                      const dominantColors = (rawDominant.length === 1 && isOnlyGray(rawDominant) && replacementColor)
                        ? [replacementColor]
                        : rawDominant;
                      const colorsByItem = (Array.isArray(rawByItem) && rawByItem.length > 0 && replacementColor && rawByItem.every((item: { colors?: Array<{ name?: string }> }) => isOnlyGray(item.colors || [])))
                        ? rawByItem.map((item: { item: string; colors: Array<{ hex: string; name: string }> }) => ({ ...item, colors: [replacementColor] }))
                        : rawByItem;
                      const productType = (state.aiAnalysisData?.product_type || '').toLowerCase();
                      const isConjunto = productType.includes('conjunto');
                      // Conjunto: priorizar colors_by_item; se não tiver, montar a partir de product_type + dominant_colors (duas partes)
                      let itemsToShow: Array<{ item: string; colors: Array<{ hex: string; name: string }> }> = [];
                      if (colorsByItem && Array.isArray(colorsByItem) && colorsByItem.length > 0) {
                        itemsToShow = colorsByItem;
                      } else if (isConjunto && dominantColors && Array.isArray(dominantColors) && dominantColors.length > 0) {
                        const match = (state.aiAnalysisData?.product_type || '').match(/conjunto\s+(.+)\s+e\s+(.+)/i);
                        const part1 = match ? match[1].trim() : 'Parte 1';
                        const part2 = match ? match[2].trim() : 'Parte 2';
                        itemsToShow = [
                          { item: part1, colors: dominantColors },
                          { item: part2, colors: dominantColors },
                        ];
                      }
                      if (itemsToShow.length > 0) {
                        return (
                      /* CONJUNTO: Mostrar cores por item lado a lado */
                      <div className="flex flex-wrap gap-3 items-stretch">
                        {itemsToShow.map((itemData: { item: string; colors: Array<{ hex: string; name: string }> }, itemIdx: number) => {
                          // Validar se há cores válidas neste item
                          const validColors = (itemData.colors || []).filter(color => 
                            color?.hex && color.hex.startsWith('#') && 
                            color?.name && color.name.trim().length > 0
                          );
                          
                          if (validColors.length === 0) return null;
                          
                          return (
                            <div key={itemIdx} className="flex-1 min-w-0 space-y-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800 uppercase">
                                  {itemData.item || `Item ${itemIdx + 1}`}:
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {validColors.map((color, colorIdx) => {
                                  const colorHex = color.hex || "#808080";
                                  const colorName = color.name || "Não especificado";
                                  const displayHex = getDisplayHex(colorHex, colorName);
                                  return (
                                    <div
                                      key={colorIdx}
                                      className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-300 rounded shadow-sm hover:shadow-md transition-shadow"
                                    >
                                      <div
                                        className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0"
                                        style={{ backgroundColor: displayHex }}
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
                        );
                      }
                      if (dominantColors && Array.isArray(dominantColors) && dominantColors.length > 0) {
                        return (
                      /* PRODUTO ÚNICO: Mostrar cores gerais (já com correção Cinza → cor do nome/desc) */
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {dominantColors.map((color: { hex?: string; name?: string }, idx: number) => {
                          const colorHex = color?.hex || "#808080";
                          const colorName = color?.name || "Não especificado";
                          const displayHex = getDisplayHex(colorHex, colorName);
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded shadow-sm"
                            >
                              <div
                                className="w-4 h-4 rounded-full border border-slate-200 flex-shrink-0"
                                style={{ backgroundColor: displayHex }}
                              />
                              <span className="text-xs text-slate-700 font-medium">
                                {colorName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                        );
                      }
                      return (
                      <p className="text-xs text-slate-500 py-1">
                        {state.aiAnalysisData ? "Nenhuma cor detectada" : "Cores serão detectadas após a análise"}
                      </p>
                      );
                    })()}
                  </div>
                </div>
                  </div>
                </div>
                {/* Coluna direita: MEDIDAS DO PRODUTO (mesma largura que a esquerda) */}
                <div className="flex-1 min-w-0 basis-0 rounded-lg bg-slate-50/50 border border-slate-200 p-3">
                  <SmartMeasurementEditor
                  rawImageUrl={state.rawImageUrl}
                  rawImageFile={state.rawImageFile}
                  lojistaId={lojistaId}
                  produtoId={produtoId}
                  calibrationScale={state.calibrationScale}
                  isCalibratedByCard={state.isCalibratedByCard}
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
                  onMeasurementsChange={handleMeasurementsChange}
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
                  initialData={smartMeasurementInitialData}
                  uploading={uploadingMedidas}
                />
                </div>
              </div>
          )}
        </div>
        </>
        )}
      </AnimatedCard>
      </div>

      
      {/* CONTAINER 3: ESTÚDIO CRIATIVO - Tratamento de Imagem (posição 3) */}
      <AnimatedCard className="p-0 overflow-hidden bg-white shadow-sm">
        {/* CardHeader */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 flex items-center gap-3 border-b border-emerald-500/20">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg" style={{ color: 'white' }}>
            3
          </div>
          <div className="text-white" style={{ color: 'white' }}>
            <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ color: 'white' }}>
              <Sparkles className="w-5 h-5" stroke="white" style={{ stroke: 'white' }} />
              <span style={{ color: 'white' }}>Estúdio Criativo (IA) - Catálogo</span>
            </h2>
            <p className="text-sm text-white mt-0.5" style={{ color: 'white' }}>Gere imagens profissionais com IA: Ghost Mannequin, Modelo Virtual e Looks Combinados</p>
          </div>
        </div>
        
        {showBox3Content && (
        <div className={`overflow-hidden transition-all duration-500 ease-out ${animateBox3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
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
        </div>
        )}
        
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
        
        {showBox4Content && (
        <div className={`overflow-hidden transition-all duration-500 ease-out ${animateBox4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
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
        </div>
        )}
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

      {/* Modal: Público/Grade diferente do detectado — confirmar e alterar para refazer análise */}
      {showAudienceConfirmation && state.aiAnalysisData?.detected_audience && (() => {
        const detected = state.aiAnalysisData.detected_audience;
        const selectedLabel = state.targetAudience === 'female' ? 'Feminino' : state.targetAudience === 'male' ? 'Masculino' : 'Infantil';
        const detectedLabel = detected === 'KIDS' ? 'Infantil' : 'Adulto (Feminino/Masculino)';
        const suggestedAudience: 'female' | 'male' | 'kids' = detected === 'KIDS' ? 'kids' : (state.targetAudience === 'male' ? 'male' : 'female');
        const suggestedSizeCategory: typeof state.sizeCategory = detected === 'KIDS' ? 'kids_numeric' : 'standard';
        const gradeLabel = (id: string) => ({ standard: 'Letras (P, M, G)', numeric: 'Numérica (36, 38...)', plus: 'Plus Size', baby: 'Bebê (meses)', kids_numeric: 'Infantil (anos)', teen: 'Juvenil' })[id] || id;
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    Público ou grade diferente do selecionado
                  </h3>
                  <p className="text-xs text-slate-500">
                    A roupa na foto parece ser de outro público/grade
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-slate-700">
                  A IA identificou que a roupa na foto parece ser para <strong>{detectedLabel}</strong>, mas você selecionou <strong>{selectedLabel}</strong> e grade <strong>{gradeLabel(state.sizeCategory)}</strong>. Isso pode gerar tipo de produto, tecido e medidas incorretos.
                </p>
              
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-amber-200">
                    <span className="text-sm font-medium text-slate-700">Selecionado agora:</span>
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
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      IA detectou na foto:
                    </span>
                    <span className="text-sm font-bold px-3 py-1 rounded-lg bg-indigo-100 text-indigo-700">
                      {detected === 'KIDS' ? '👶 Infantil' : '👔 Adulto'}
                    </span>
                  </div>
                </div>
              
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800 leading-relaxed">
                    <strong>Recomendação:</strong> Alterar para o público e grade sugeridos e refazer a análise automaticamente para gerar tipo de produto, tecido e medidas corretos.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={async () => {
                    const imageUrlToAnalyze = state.rawImageUrl || state.selectedCoverImage;
                    if (!imageUrlToAnalyze) {
                      alert("Por favor, faça upload de uma imagem primeiro.");
                      return;
                    }
                    setShowAudienceConfirmation(false);
                    try {
                      setState(prev => ({
                        ...prev,
                        aiAnalysisData: null,
                        targetAudience: suggestedAudience,
                        sizeCategory: suggestedSizeCategory,
                        smartMeasurements: undefined,
                        persistedMeasurementsByAudience: undefined,
                      }));
                      lastAnalyzedUrlRef.current = "";
                      await new Promise(resolve => setTimeout(resolve, 150));
                      await analyzeImage(imageUrlToAnalyze, {
                        targetAudience: suggestedAudience,
                        sizeCategory: suggestedSizeCategory,
                      });
                    } catch (error: any) {
                      console.error("[ProductEditor] Erro ao refazer análise:", error);
                      alert(`Erro ao refazer análise: ${error.message || "Erro desconhecido"}`);
                    }
                  }}
                  className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Sim, alterar para {detected === 'KIDS' ? 'Infantil' : 'Adulto'} e refazer análise</span>
                </button>
              
                <button
                  onClick={() => setShowAudienceConfirmation(false)}
                  className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  Não, manter como está
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

