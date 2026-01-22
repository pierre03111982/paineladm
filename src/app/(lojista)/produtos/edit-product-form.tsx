"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Upload, Info, Save, X, Package, Sparkles } from "lucide-react";
import { ProductStudioInline } from "@/components/admin/products/ProductStudioInline";
import { PRODUCT_CATEGORY_OPTIONS } from "./category-options";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { ProdutoDoc } from "@/lib/firestore/types";

type Variacao = {
  id: string;
  variacao: string;
  estoque: string;
  sku: string;
};

/**
 * Função utilitária para gerar SKU automaticamente
 * Formato: SLUG-DO-PRODUTO-VARIAÇÃO-XXXX
 * - SLUG-DO-PRODUTO: Primeiros 10 caracteres do nome, maiúsculas, espaços por hífen
 * - VARIAÇÃO: Nome da variação em maiúsculas
 * - XXXX: Sufixo aleatório de 4 caracteres (letras e números)
 */
function generateSKU(nomeProduto: string, variacao: string): string {
  // Validar entradas
  if (!nomeProduto || !nomeProduto.trim()) {
    nomeProduto = "PRODUTO";
  }
  
  if (!variacao || !variacao.trim()) {
    variacao = "VAR";
  }
  
  // 1. SLUG-DO-PRODUTO: Primeiros 10 caracteres, maiúsculas, substituir espaços por hífen
  const slugProduto = nomeProduto
    .trim()
    .toUpperCase()
    .substring(0, 10)
    .replace(/\s+/g, '-') // Substituir espaços múltiplos por hífen
    .replace(/[^A-Z0-9-]/g, '') // Remover caracteres especiais (manter apenas letras, números e hífen)
    .replace(/-+/g, '-') // Substituir múltiplos hífens por um único
    .replace(/^-|-$/g, ''); // Remover hífens no início e fim
  
  // Garantir que tenha pelo menos 3 caracteres
  const produtoSlug = slugProduto.length >= 3 ? slugProduto : slugProduto.padEnd(3, 'X');
  
  // 2. VARIAÇÃO: Maiúsculas, remover espaços e caracteres especiais
  const variacaoSlug = variacao
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Garantir que tenha pelo menos 1 caractere
  const variacaoFinal = variacaoSlug || "VAR";
  
  // 3. XXXX: Sufixo aleatório de 4 caracteres (letras e números)
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let sufixo = '';
  for (let i = 0; i < 4; i++) {
    sufixo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  
  // 4. Montar SKU: SLUG-VARIAÇÃO-XXXX
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
  variacao: Variacao; 
  nomeProduto: string;
  onUpdate: (updated: Variacao) => void;
  onRemove: () => void;
}) {
  // useRef para rastrear se o SKU foi editado manualmente pelo usuário (não regenerar se editado)
  const skuEditadoManualRef = useRef<boolean>(false);
  // Refs para rastrear os últimos valores processados (evitar loop infinito)
  const ultimaVariacaoProcessadaRef = useRef<string>(variacao.variacao || "");
  const ultimoNomeProdutoProcessadoRef = useRef<string>(nomeProduto || "");
  
  // Inicializar: Se SKU já existe ao montar, assumir que foi editado manualmente ou carregado
  useEffect(() => {
    if (variacao.sku && variacao.sku.trim()) {
      skuEditadoManualRef.current = true;
    }
  }, []); // Apenas na montagem inicial
  
  // useEffect para auto-gerar SKU quando variacao ou nomeProduto mudarem
  useEffect(() => {
    // Só gerar SKU se:
    // 1. A variação não estiver vazia
    // 2. O nome do produto não estiver vazio
    // 3. A variação ou nome do produto realmente mudaram (não apenas o SKU)
    // 4. O SKU não foi editado manualmente pelo usuário
    
    const variacaoAtual = (variacao.variacao || "").trim();
    const nomeProdutoAtual = (nomeProduto || "").trim();
    const variacaoMudou = ultimaVariacaoProcessadaRef.current !== variacaoAtual;
    const nomeProdutoMudou = ultimoNomeProdutoProcessadoRef.current !== nomeProdutoAtual;
    
    // Não processar se nem variação nem nome do produto mudaram (evitar processamento desnecessário)
    if (!variacaoMudou && !nomeProdutoMudou) {
      return;
    }
    
    if (variacaoAtual && nomeProdutoAtual) {
      const skuVazio = !variacao.sku || !variacao.sku.trim();
      const precisaRegenerar = variacaoMudou || nomeProdutoMudou;
      
      // Se SKU está vazio OU (variacao/nome mudou E SKU não foi editado manualmente), gerar novo
      if (skuVazio || (precisaRegenerar && !skuEditadoManualRef.current)) {
        const skuGerado = generateSKU(nomeProdutoAtual, variacaoAtual);
        
        // Só atualizar se o SKU realmente mudou (evitar atualizações desnecessárias que causam loop)
        if (variacao.sku !== skuGerado) {
          onUpdate({ ...variacao, sku: skuGerado });
          
          console.log("[EditVariacaoRow] ✅ SKU auto-gerado:", {
            nomeProduto: nomeProdutoAtual.substring(0, 20),
            variacao: variacaoAtual,
            sku: skuGerado,
            motivo: skuVazio ? "SKU vazio" : (variacaoMudou ? "Variação mudou" : "Nome produto mudou")
          });
        }
        
        // Atualizar refs para marcar que processamos estes valores
        ultimaVariacaoProcessadaRef.current = variacaoAtual;
        ultimoNomeProdutoProcessadoRef.current = nomeProdutoAtual;
      }
    }
  }, [variacao.variacao, nomeProduto, variacao.id]); // Dependências: variacao.variacao, nomeProduto e id (não incluir variacao.sku para evitar loop)

  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      {/* Input Variação */}
      <div className="col-span-3">
        <input
          type="text"
          value={variacao.variacao}
          onChange={(e) => {
            onUpdate({ ...variacao, variacao: e.target.value });
          }}
          placeholder="P"
          className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-slate-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
        />
      </div>

      {/* Input Estoque */}
      <div className="col-span-3">
        <input
          type="number"
          min="0"
          value={variacao.estoque}
          onChange={(e) => {
            onUpdate({ ...variacao, estoque: e.target.value });
          }}
          placeholder="10"
          className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-slate-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
        />
      </div>

      {/* Input SKU (editável, mas preenchido automaticamente) */}
      <div className="col-span-5">
        <input
          type="text"
          value={variacao.sku}
          onChange={(e) => {
            // Quando usuário edita manualmente, marcar como editado manualmente
            skuEditadoManualRef.current = true;
            onUpdate({ ...variacao, sku: e.target.value });
          }}
          onFocus={() => {
            // Se campo está vazio ao focar, permitir auto-geração
            if (!variacao.sku || !variacao.sku.trim()) {
              skuEditadoManualRef.current = false;
            }
          }}
          placeholder="Auto-gerado"
          className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-slate-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
          title="SKU gerado automaticamente. Você pode editar se necessário."
        />
      </div>

      {/* Botão Remover */}
      <div className="col-span-1">
        <button
          type="button"
          onClick={onRemove}
          className="w-full flex items-center justify-center rounded-lg border border-red-300 bg-red-50 px-2 py-1.5 text-red-600 hover:bg-red-100 transition-colors"
          title="Remover variação"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

type EditProductFormProps = {
  produto: ProdutoDoc;
  lojistaId: string;
};

export function EditProductForm({ produto, lojistaId }: EditProductFormProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lojistaIdFromUrl = searchParams?.get("lojistaId") || searchParams?.get("lojistald") || lojistaId;
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const backHref = lojistaIdFromUrl 
    ? `/produtos?lojistaId=${lojistaIdFromUrl}`
    : "/produtos";
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [generatedCatalogImage, setGeneratedCatalogImage] = useState<string | null>(null);
  const [generatingCatalog, setGeneratingCatalog] = useState(false);
  const [corManequim, setCorManequim] = useState<string>("branco fosco");
  const [cenarioEscolhido, setCenarioEscolhido] = useState<string>("1");
  
  const cenarios = [
    { id: "1", titulo: "Apartamento Parisiense", descricao: "Crie um fundo extremamente desfocado (bokeh cremoso) que sugira um apartamento parisiense clássico, com painéis de parede brancos ornamentados (boiserie), piso de madeira chevron e luz natural suave entrando por uma janela alta distante." },
    { id: "2", titulo: "Villa Minimalista", descricao: "O fundo deve ser uma sugestão fortemente desfocada de arquitetura contemporânea de concreto polido e grandes painéis de vidro. Use uma luz fria e sofisticada que crie reflexos suaves e difusos no piso, sugerindo um ambiente de design exclusivo." },
    { id: "3", titulo: "Boutique de Luxo", descricao: "Gere um fundo que evoque o interior de uma loja de alta costura, mas mantenha-o completamente fora de foco. Use tons quentes de madeira escura, reflexos sutis de latão dourado e luzes de prateleira distantes transformadas em um bokeh suave e rico." },
    { id: "4", titulo: "Hotel Lobby", descricao: "O cenário deve sugerir o saguão de um hotel cinco estrelas histórico. O fundo extremamente desfocado deve apresentar tons de mármore quente, brilhos distantes de lustres de cristal e uma atmosfera dourada e envolvente." },
    { id: "5", titulo: "Galeria de Arte", descricao: "Use um fundo de galeria minimalista e etéreo. Paredes brancas imaculadas e piso de cimento claro, com formas indistintas e suaves de esculturas modernas ao longe, mantidas em um desfoque limpo com luz difusa de claraboia." },
    { id: "6", titulo: "Rooftop Urbano", descricao: "O fundo deve capturar a atmosfera de um rooftop sofisticado durante a \"hora azul\". Crie um bokeh dramático com as luzes da cidade distante e tons profundos de azul e laranja no céu, sugerindo um evento noturno de luxo." },
    { id: "7", titulo: "Parede Veneziana", descricao: "Crie um fundo focado na textura de uma parede de gesso veneziano (stucco) artesanal em um tom neutro e quente (como areia ou terracota pálida). Mantenha a textura extremamente desfocada para criar um pano de fundo orgânico, rico e tátil." },
    { id: "8", titulo: "Jardim Privado", descricao: "Sugira um jardim manicurado em uma propriedade privada logo após o pôr do sol. O fundo deve ser um mix de tons de verde escuro da folhagem e o azul profundo do céu, com pequenas luzes quentes (fairy lights) criando um bokeh cintilante e romântico ao longe." },
    { id: "9", titulo: "Villa Toscana", descricao: "O fundo deve evocar um pátio de pedra antigo e ensolarado na Itália. Use paredes de pedra rústica bege e a sugestão de luz solar filtrada por oliveiras ou pérgolas, criando sombras suaves e um ambiente quente e desfocado." },
    { id: "10", titulo: "Estúdio Arquitetônico", descricao: "Use um fundo de estúdio ciclorama em tom off-white. Adicione profundidade projetando uma grande sombra arquitetônica suave e difusa (como a forma de um arco ou janela grande) na parede de fundo curva, mantendo tudo em um desfoque artístico." },
  ];
  
  // Converter dados do produto para o formato do formulário
  const [formData, setFormData] = useState({
    nome: produto.nome || "",
    categoria: produto.categoria || "Roupas",
    preco: produto.preco ? produto.preco.toString().replace(".", ",") : "",
    imagemUrl: produto.imagemUrl || "",
    imagemUrlOriginal: produto.imagemUrlOriginal || produto.imagemUrl || "",
    imagemUrlCatalogo: produto.imagemUrlCatalogo || "",
    tamanhos: produto.tamanhos?.join(";") || "",
    cores: produto.cores?.join(" - ") || "",
    medidas: produto.medidas || "",
    observacoes: produto.obs || "",
    estoque: produto.estoque?.toString() || "",
    tags: produto.tags?.join(",") || "",
    descontoProduto: produto.descontoProduto?.toString() || "",
    unidadeMedida: (produto as any).unidadeMedida || "UN", // Nova: Unidade de medida
  });

  // Estado para variações - carregar do produto se existir
  const [temVariacoes, setTemVariacoes] = useState(() => {
    // Verificar se produto tem variações
    return !!(produto as any).variacoes && Array.isArray((produto as any).variacoes) && (produto as any).variacoes.length > 0;
  });

  const [variacoes, setVariacoes] = useState<Variacao[]>(() => {
    // Se produto tem variações, carregar elas
    if ((produto as any).variacoes && Array.isArray((produto as any).variacoes)) {
      return (produto as any).variacoes.map((v: any, index: number) => ({
        id: `existing-${index}-${Date.now()}`,
        variacao: v.variacao || produto.tamanhos?.[index] || "",
        estoque: v.estoque?.toString() || "",
        sku: v.sku || "",
      }));
    }
    // Senão, criar variações a partir dos tamanhos se existirem
    if (produto.tamanhos && produto.tamanhos.length > 0) {
      return produto.tamanhos.map((tamanho, index) => ({
        id: `generated-${index}-${Date.now()}`,
        variacao: tamanho,
        estoque: produto.estoque?.toString() || "",
        sku: "",
      }));
    }
    // Padrão: 3 variações de exemplo
    return [
      { id: "1", variacao: "P", estoque: "10", sku: "CAM-AZ-P" },
      { id: "2", variacao: "M", estoque: "15", sku: "CAM-AZ-M" },
      { id: "3", variacao: "G", estoque: "5", sku: "CAM-AZ-G" },
    ];
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleImageUpload = async (fileOrEvent: File | React.ChangeEvent<HTMLInputElement>) => {
    let file: File | null = null;
    
    if (fileOrEvent instanceof File) {
      file = fileOrEvent;
    } else {
      file = fileOrEvent.target.files?.[0] || null;
    }
    
    if (!file) return;

    try {
      setUploadingImage(true);
      const formDataUpload = new FormData();
      formDataUpload.append("image", file);
      if (lojistaIdFromUrl) {
        formDataUpload.append("lojistaId", lojistaIdFromUrl);
      }

      const url = lojistaIdFromUrl
        ? `/api/lojista/products/upload-image?lojistaId=${lojistaIdFromUrl}`
        : `/api/lojista/products/upload-image`;
      
      const response = await fetch(url, {
        method: "POST",
        body: formDataUpload,
      });

      if (!response.ok) throw new Error("Erro ao fazer upload da imagem");
      const result = await response.json();
      
      setUploadedImageUrl(result.imageUrl);
      setFormData({ ...formData, imagemUrlOriginal: result.imageUrl, imagemUrl: result.imageUrl });

      // PHASE 28: Análise automática após upload bem-sucedido
      await analyzeProductImage(result.imageUrl);
    } catch (err) {
      console.error("[EditProductForm] Erro ao fazer upload:", err);
      setError("Erro ao fazer upload da imagem");
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  // PHASE 28: Função para analisar produto com IA
  const analyzeProductImage = async (imageUrl: string) => {
    if (!imageUrl || (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://"))) {
      return; // Não analisar se não for URL válida
    }

    try {
      setIsAnalyzing(true);
      setError(null);

      console.log("[EditProductForm] 🔍 Iniciando análise automática de produto...");

      const url = lojistaIdFromUrl
        ? `/api/lojista/products/analyze?lojistaId=${lojistaIdFromUrl}`
        : `/api/lojista/products/analyze`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn("[EditProductForm] Análise automática falhou:", errorData.error);
        // Não mostrar erro ao usuário - permitir preenchimento manual
        return;
      }

      const result = await response.json();

      if (result.success && result.data) {
        const analysis = result.data;
        console.log("[EditProductForm] 📊 Dados da análise recebidos:", {
          nome_sugerido: analysis.nome_sugerido,
          categoria_sugerida: analysis.categoria_sugerida || analysis.suggested_category,
          tags: analysis.tags,
          cor_predominante: analysis.cor_predominante,
          tem_descricao: !!analysis.descricao_seo,
          logistic_unit: analysis.logistic_unit,
          has_variations_likely: analysis.has_variations_likely
        });

        // Preencher campos automaticamente
        if (analysis.nome_sugerido) {
          setFormData(prev => ({ ...prev, nome: analysis.nome_sugerido }));
        }

        if (analysis.descricao_seo) {
          setFormData(prev => ({ ...prev, observacoes: analysis.descricao_seo }));
        }

        // Compatibilidade: usar categoria_sugerida ou suggested_category
        const categoriaAnalisada = analysis.categoria_sugerida || analysis.suggested_category;
        if (categoriaAnalisada) {
          setFormData(prev => ({ ...prev, categoria: categoriaAnalisada }));
        }

        if (analysis.tags && Array.isArray(analysis.tags) && analysis.tags.length > 0) {
          setFormData(prev => ({ ...prev, tags: analysis.tags.join(", ") }));
        }

        if (analysis.cor_predominante) {
          setFormData(prev => ({ 
            ...prev, 
            cores: prev.cores ? `${prev.cores} - ${analysis.cor_predominante}` : analysis.cor_predominante 
          }));
        }

        // NOVO: Preencher unidade de medida se retornada pela análise
        if (analysis.logistic_unit) {
          setFormData(prev => ({ ...prev, unidadeMedida: analysis.logistic_unit }));
          console.log("[EditProductForm] ✅ Unidade de medida preenchida automaticamente:", analysis.logistic_unit);
        }

        // NOVO: Ativar/desativar variações baseado na análise
        if (typeof analysis.has_variations_likely === 'boolean') {
          setTemVariacoes(analysis.has_variations_likely);
          console.log("[EditProductForm] ✅ Variações configuradas automaticamente:", analysis.has_variations_likely);
          
          // Se não tem variações, limpar a lista de variações ou criar uma vazia
          if (!analysis.has_variations_likely) {
            setVariacoes([]);
          } else if (variacoes.length === 0) {
            // Se tem variações mas lista está vazia, criar variações baseadas nos tamanhos existentes ou exemplos
            if (produto.tamanhos && produto.tamanhos.length > 0) {
              const novasVariacoes = produto.tamanhos.map((tamanho, index) => ({
                id: `existing-${index}-${Date.now()}`,
                variacao: tamanho,
                estoque: produto.estoque?.toString() || "",
                sku: "",
              }));
              setVariacoes(novasVariacoes);
            } else {
              // Criar 3 exemplos
              setVariacoes([
                { id: "1", variacao: "P", estoque: "10", sku: "CAM-AZ-P" },
                { id: "2", variacao: "M", estoque: "15", sku: "CAM-AZ-M" },
                { id: "3", variacao: "G", estoque: "5", sku: "CAM-AZ-G" },
              ]);
            }
          }
        }

        // Adicionar detalhes ao campo observações se já houver conteúdo
        if (analysis.detalhes && Array.isArray(analysis.detalhes) && analysis.detalhes.length > 0) {
          const detalhesText = analysis.detalhes.join(", ");
          setFormData(prev => ({ 
            ...prev, 
            observacoes: prev.observacoes 
              ? `${prev.observacoes}\n\nDetalhes: ${detalhesText}` 
              : `Detalhes: ${detalhesText}` 
          }));
        }

        // Adicionar tecido ao campo observações
        if (analysis.tecido_estimado) {
          setFormData(prev => ({ 
            ...prev, 
            observacoes: prev.observacoes 
              ? `${prev.observacoes}\n\nTecido: ${analysis.tecido_estimado}` 
              : `Tecido: ${analysis.tecido_estimado}` 
          }));
        }

        setSuccess("✨ Produto analisado automaticamente pela IA! Campos preenchidos.");
        setTimeout(() => setSuccess(null), 5000);

        console.log("[EditProductForm] ✅ Análise automática concluída:", analysis);
      }
    } catch (err: any) {
      console.error("[EditProductForm] Erro na análise automática:", err);
      // Não mostrar erro ao usuário - permitir preenchimento manual
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = lojistaIdFromUrl
        ? `/api/lojista/products/${produto.id}?lojistaId=${lojistaIdFromUrl}`
        : `/api/lojista/products/${produto.id}`;
      
      const imagemUrlFinal = formData.imagemUrl.trim() || uploadedImageUrl || formData.imagemUrlOriginal;
      
      const payload: any = {
        nome: formData.nome.trim(),
        categoria: formData.categoria.trim(),
        preco: parseFloat(formData.preco.replace(",", ".")) || 0,
        imagemUrl: imagemUrlFinal,
        imagemUrlOriginal: formData.imagemUrlOriginal || imagemUrlFinal,
        imagemUrlCatalogo: formData.imagemUrlCatalogo || generatedCatalogImage || null,
        cores: formData.cores ? formData.cores.split("-").map((c) => c.trim()).filter(Boolean) : [],
        medidas: formData.medidas.trim() || "",
        observacoes: formData.observacoes.trim() || "",
        tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        unidadeMedida: formData.unidadeMedida || "UN",
      };

      // Se produto tem variações, processar grade de estoque
      if (temVariacoes && variacoes.length > 0) {
        // Extrair tamanhos das variações válidas (com variação preenchida)
        const variacoesValidas = variacoes.filter(v => v.variacao && v.variacao.trim());
        const tamanhosVariacoes = variacoesValidas.map(v => v.variacao.trim());
        
        if (tamanhosVariacoes.length > 0) {
          payload.tamanhos = tamanhosVariacoes;
          payload.variacoes = variacoesValidas.map(v => ({
            variacao: v.variacao.trim(),
            estoque: parseInt(v.estoque) || 0,
            sku: v.sku?.trim() || "",
          }));
          
          // Calcular estoque total
          const estoqueTotal = variacoesValidas.reduce((sum, v) => sum + (parseInt(v.estoque) || 0), 0);
          if (estoqueTotal > 0) {
            payload.estoque = estoqueTotal;
          }
        }
      }
      
      // Se não tem variações ou variações inválidas, usar campo tamanhos manual (compatibilidade)
      if (!temVariacoes || !payload.tamanhos || payload.tamanhos.length === 0) {
        if (formData.tamanhos && formData.tamanhos.trim()) {
          payload.tamanhos = formData.tamanhos.split(";").map((s) => s.trim()).filter(Boolean);
        }
        
        if (formData.estoque && formData.estoque.trim()) {
          const estoqueNum = parseInt(formData.estoque.trim());
          if (!isNaN(estoqueNum)) {
            payload.estoque = estoqueNum;
          }
        }
      }

      if (formData.descontoProduto !== undefined) {
        const raw = formData.descontoProduto.trim();
        if (!raw) {
          payload.descontoProduto = null;
        } else {
          const desconto = parseFloat(raw.replace(",", "."));
          if (!isNaN(desconto) && desconto >= 0 && desconto <= 100) {
            payload.descontoProduto = desconto;
          }
        }
      }

      console.log("[EditProductForm] Enviando payload:", JSON.stringify(payload, null, 2));

      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[EditProductForm] Erro da API:", errorData);
        throw new Error(errorData.error || `Erro ao atualizar produto (${response.status})`);
      }
      
      setSuccess("Produto atualizado com sucesso!");
      setTimeout(() => {
        if (lojistaIdFromUrl) {
          router.push(`/produtos?lojistaId=${lojistaIdFromUrl}`);
        } else {
          router.push("/produtos");
        }
        router.refresh();
      }, 1500);
    } catch (err: any) {
      console.error("[EditProductForm] Erro ao atualizar:", err);
      setError(err.message || "Erro ao atualizar produto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com botão voltar */}
      <div className="flex items-center gap-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        <div className="flex items-center gap-3">
          <div 
            className="rounded-xl p-3 shadow-lg text-white flex-shrink-0"
            style={{
              background: 'linear-gradient(to bottom right, #4f46e5, #6366f1)',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 0 20px rgba(99, 102, 241, 0.4), 0 0 40px rgba(99, 102, 241, 0.2)',
            }}
          >
            <Package className="h-6 w-6 icon-animate-once" style={{ color: '#FFFFFF', stroke: '#FFFFFF', fill: 'none' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-red-600 font-heading">Editar Produto</h1>
            <p className="text-sm text-slate-600 mt-1 font-medium">Atualize os campos abaixo para modificar o produto</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Estúdio de Criação IA (Inline) */}
        <ProductStudioInline
          produtoId={produto.id}
          imagemUrlOriginal={formData.imagemUrl || uploadedImageUrl || formData.imagemUrlOriginal || ""}
          nomeProduto={formData.nome || "Produto"}
          categoria={formData.categoria}
          preco={parseFloat(formData.preco.replace(",", ".")) || 0}
          lojistaId={lojistaIdFromUrl}
          uploadingImage={uploadingImage}
          isAnalyzing={isAnalyzing}
          onImageUpload={async (file) => {
            await handleImageUpload(file);
          }}
          onImageUrlChange={(url) => {
            setFormData({ 
              ...formData, 
              imagemUrl: url,
              imagemUrlOriginal: url || formData.imagemUrlOriginal
            });
          }}
          onAnalyzeImage={async (imageUrl) => {
            await analyzeProductImage(imageUrl);
          }}
          onImageGenerated={(type, imageUrl) => {
            setFormData({
              ...formData,
              imagemUrlCatalogo: imageUrl,
              imagemUrlOriginal: formData.imagemUrlOriginal || formData.imagemUrl || uploadedImageUrl,
            });
            setGeneratedCatalogImage(imageUrl);
            setSuccess(`Imagem de ${type === "catalog" ? "catálogo" : "look combinado"} gerada com sucesso!`);
            setTimeout(() => setSuccess(null), 5000);
          }}
        />

        {/* Card de Estúdio Virtual & Display */}
        {(formData.imagemUrl || uploadedImageUrl) && (
          <div className="neon-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
              ✨ Estúdio Virtual & Display
            </h3>
            <div className="space-y-4">
              {/* Seletor de Cor do Manequim */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Cor do Manequim
                </label>
                <select
                  value={corManequim}
                  onChange={(e) => setCorManequim(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="branco fosco">Branco Fosco</option>
                  <option value="preto fosco">Preto Fosco</option>
                  <option value="invisível">Invisível</option>
                </select>
              </div>

              {/* Seletor de Cenário */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Cenário de Fundo
                </label>
                <select
                  value={cenarioEscolhido}
                  onChange={(e) => setCenarioEscolhido(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                >
                  {cenarios.map((cenario) => (
                    <option key={cenario.id} value={cenario.id}>
                      {cenario.id}. {cenario.titulo}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Escolha o ambiente visual para o fundo da imagem
                </p>
              </div>

              {/* Botão Gerar */}
              <button
                type="button"
                onClick={async () => {
                    const imagemUrlParaUsar = formData.imagemUrl || uploadedImageUrl;
                    console.log("[EditProductForm] Gerando catálogo:", { 
                      imagemUrlParaUsar, 
                      lojistaIdFromUrl,
                      formDataImagemUrl: formData.imagemUrl,
                      uploadedImageUrl 
                    });
                    
                    if (!imagemUrlParaUsar) {
                      setError("Por favor, faça upload de uma imagem ou adicione uma URL de imagem primeiro");
                      return;
                    }
                    
                    if (!lojistaIdFromUrl) {
                      setError("ID da loja não encontrado");
                      return;
                    }

                    try {
                      setGeneratingCatalog(true);
                      setError(null);

                      const preco = parseFloat(formData.preco.replace(",", ".")) || 0;
                      const descontoEspecial = parseFloat(formData.descontoProduto || "0") || 0;
                      const precoPromocional = descontoEspecial > 0 && preco > 0
                        ? preco * (1 - descontoEspecial / 100)
                        : null;

                      const cenarioSelecionado = cenarios.find(c => c.id === cenarioEscolhido);
                      const descricaoCenario = cenarioSelecionado?.descricao || cenarios[0].descricao;

                      const response = await fetch("/api/ai/catalog", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          produtoId: produto.id,
                          imagemUrl: imagemUrlParaUsar,
                          corManequim,
                          cenario: descricaoCenario,
                          lojistaId: lojistaIdFromUrl,
                          preco,
                          precoPromocional,
                          descontoEspecial,
                          nome: formData.nome || "Produto",
                        }),
                      });

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || "Erro ao gerar imagem");
                      }

                      const data = await response.json();
                      
                      if (data.savedAsMain) {
                        setSuccess("Imagem de catálogo gerada e salva automaticamente!");
                        setTimeout(() => setSuccess(null), 5000);
                      } else {
                        setSuccess("Imagem de catálogo gerada com sucesso! Ela será salva quando você salvar o produto.");
                        setTimeout(() => setSuccess(null), 5000);
                      }
                      
                      // Atualizar formData com a imagem gerada
                      setFormData({
                        ...formData,
                        imagemUrlCatalogo: data.imageUrl,
                        imagemUrlOriginal: formData.imagemUrlOriginal || formData.imagemUrl || uploadedImageUrl,
                      });
                      
                      setGeneratedCatalogImage(data.imageUrl);
                    } catch (err: any) {
                      console.error("[EditProductForm] Erro ao gerar catálogo:", err);
                      setError(err.message || "Erro ao gerar imagem de catálogo");
                    } finally {
                      setGeneratingCatalog(false);
                    }
                  }}
                disabled={generatingCatalog || (!formData.imagemUrl && !uploadedImageUrl)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:via-pink-500 hover:to-purple-500 px-4 py-2.5 text-sm font-semibold text-white transition shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-purple-600 disabled:hover:via-pink-600 disabled:hover:to-purple-600"
              >
                {generatingCatalog ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    Gerando...
                  </>
                ) : (
                  <>
                    ✨ Gerar Imagem de Catálogo
                  </>
                )}
              </button>

              {/* Preview da Imagem Gerada */}
              {generatedCatalogImage && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-emerald-400 bg-emerald-50 p-3">
                    <p className="text-sm text-emerald-700 mb-2 font-semibold">
                      ✅ Imagem salva automaticamente como imagem principal do catálogo!
                    </p>
                    <div className="rounded-lg border border-gray-200 bg-white p-3">
                      <img
                        src={generatedCatalogImage}
                        alt="Imagem de catálogo gerada"
                        className="w-full rounded-lg object-contain max-h-64"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGeneratedCatalogImage(null)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Fechar Preview
                  </button>
                </div>
              )}

              {/* Info */}
              <div className="flex items-start gap-2 rounded-lg border border-purple-300 bg-purple-50 p-3">
                <Info className="h-4 w-4 mt-0.5 text-purple-600 flex-shrink-0" />
                <p className="text-sm text-purple-800">
                  Gere uma imagem profissional de catálogo com etiqueta de preço integrada, ideal para exibição na TV da loja sem riscos de direitos de imagem.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Grid com duas colunas: Dados Manuais e Análise IA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* COLUNA ESQUERDA: PREENCHIMENTO OBRIGATÓRIO * */}
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-gray-800">
            <h3 className="font-bold text-gray-800 mb-4 uppercase text-sm tracking-wider">
              Preenchimento Obrigatório *
            </h3>
            <div className="space-y-4">
              {/* TOPO: Preço e Unidade lado a lado */}
              <div className="grid grid-cols-2 gap-3">
                {/* Preço de Venda */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="text"
                    value={formData.preco}
                    onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                    placeholder="Ex: 329,90"
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
                  />
                </div>

                {/* Unidade de Medida */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Unidade de Medida *
                  </label>
                  <select
                    value={formData.unidadeMedida}
                    onChange={(e) => setFormData({ ...formData, unidadeMedida: e.target.value })}
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-gray-500 focus:outline-none"
                  >
                    <option value="UN">UN</option>
                    <option value="KG">KG</option>
                    <option value="M">M</option>
                    <option value="PAR">PAR</option>
                    <option value="CJ">CJ</option>
                  </select>
                </div>
              </div>

              {/* Desconto Especial */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Desconto Especial (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.descontoProduto}
                  onChange={(e) => setFormData({ ...formData, descontoProduto: e.target.value })}
                  placeholder="Ex: 10"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Desconto adicional específico para este produto
                </p>
              </div>

              {/* Switch: Este produto possui variações? */}
              <div className="flex items-center justify-between py-2 border-t border-gray-200 pt-4">
                <label className="text-sm font-medium text-gray-700">
                  Este produto possui variações? (Ex: Cores, Tamanhos)
                </label>
                <button
                  type="button"
                  onClick={() => setTemVariacoes(!temVariacoes)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    temVariacoes ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      temVariacoes ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* ÁREA DINÂMICA: Grade de Estoque (quando variações ativadas) */}
              {temVariacoes && (
                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Grade de Estoque
                  </h4>
                  
                  {/* Lista de Variações */}
                  <div className="space-y-2">
                    {variacoes.map((variacao) => (
                      <VariacaoRow
                        key={variacao.id}
                        variacao={variacao}
                        nomeProduto={formData.nome}
                        onUpdate={(updated) => {
                          setVariacoes(variacoes.map(v => v.id === variacao.id ? updated : v));
                        }}
                        onRemove={() => {
                          setVariacoes(variacoes.filter(v => v.id !== variacao.id));
                        }}
                      />
                    ))}
                  </div>

                  {/* Botão Adicionar Variação */}
                  <button
                    type="button"
                    onClick={() => {
                      const novaId = Date.now().toString();
                      setVariacoes([
                        ...variacoes,
                        { id: novaId, variacao: "", estoque: "", sku: "" }
                      ]);
                    }}
                    className="w-full rounded-lg border-2 border-solid border-blue-300 bg-blue-300 px-3 py-2 text-xs font-medium hover:bg-blue-400 transition-colors duration-200 flex items-center justify-center gap-1.5"
                    style={{ color: '#FFFFFF' }}
                  >
                    <span style={{ color: '#FFFFFF' }}>+</span>
                    <span style={{ color: '#FFFFFF' }}>Adicionar Variação</span>
                  </button>
                </div>
              )}

              {/* Medidas (sempre visível) */}
              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Medidas
                </label>
                <input
                  type="text"
                  value={formData.medidas}
                  onChange={(e) => setFormData({ ...formData, medidas: e.target.value })}
                  placeholder="Ex: Altura: 150cm, Largura: 80cm"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: ANÁLISE AUTOMÁTICA (IA - Sugestões) */}
          <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-xl shadow-sm border border-indigo-100 relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-indigo-700 uppercase text-sm tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                2. Análise Automática
              </h3>
            </div>

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Vestido Aurora"
                  required
                  className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Categoria *
                </label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  required
                  className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Selecione uma categoria</option>
                  {PRODUCT_CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cores */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Cores (separadas por -)
                </label>
                <input
                  type="text"
                  value={formData.cores}
                  onChange={(e) => setFormData({ ...formData, cores: e.target.value })}
                  placeholder="Ex: lilás - grafite"
                  className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tags (separadas por ,)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Ex: promoção, novo, destaque"
                  className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Observações para IA */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Descrição SEO
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Ex: tecido em seda, caimento leve, ideal para looks noturnos."
                  rows={3}
                  className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card de Ações */}
        <div className="neon-card rounded-2xl p-6">
          <div className="flex items-start gap-2 rounded-lg border border-indigo-300 bg-indigo-50 p-3 mb-4">
            <Info className="h-4 w-4 mt-0.5 text-indigo-600 flex-shrink-0" />
            <p className="text-sm text-indigo-800">
              Os dados e a imagem são enviados para o Firestore. Você pode gerar uma imagem de catálogo com IA após fazer upload da foto original.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 rounded-lg bg-white border-2 border-red-500 hover:bg-red-50 px-4 py-2 text-sm font-semibold transition shadow-lg shadow-red-500/20"
              style={{ color: '#DC2626' }}
            >
              <X className="h-4 w-4" style={{ color: '#DC2626', stroke: '#DC2626', fill: 'none' }} />
              <span style={{ color: '#DC2626' }}>Cancelar</span>
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:via-blue-500 hover:to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-indigo-600 disabled:hover:via-blue-600 disabled:hover:to-indigo-600"
            >
              <Save className="h-4 w-4" style={{ color: '#FFFFFF', stroke: '#FFFFFF', fill: 'none' }} />
              {loading ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

