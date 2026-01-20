"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Upload, Info, Save, X, Package, Sparkles, Loader2, Trash2, Globe, Calendar } from "lucide-react";
import { PRODUCT_CATEGORY_OPTIONS } from "./category-options";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProductStudioInline } from "@/components/admin/products/ProductStudioInline";

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

type ManualProductFormProps = {
  lojistaId: string;
  onClose?: () => void;
};

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
          
          console.log("[VariacaoRow] ✅ SKU auto-gerado:", {
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
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
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
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
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
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
          title="SKU gerado automaticamente. Você pode editar se necessário."
        />
      </div>

      {/* Botão Remover */}
      <div className="col-span-1">
        <button
          type="button"
          onClick={onRemove}
          className="w-full flex items-center justify-center rounded-lg border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          title="Remover variação"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function ManualProductForm({ lojistaId, onClose }: ManualProductFormProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lojistaIdFromUrl = searchParams?.get("lojistaId") || searchParams?.get("lojistald") || lojistaId;
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const backHref = lojistaIdFromUrl 
    ? `/produtos?lojistaId=${lojistaIdFromUrl}`
    : "/produtos";
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [generatedCatalogImage, setGeneratedCatalogImage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nome: "",
    categoria: "Roupas",
    preco: "",
    imagemUrl: "",
    imagemUrlOriginal: "",
    imagemUrlCatalogo: "",
    tamanhos: "",
    cores: "",
    medidas: "",
    observacoes: "",
    estoque: "",
    tags: "",
    descontoProduto: "",
    unidadeMedida: "UN", // Nova: Unidade de medida
    marca: "", // Nova: Marca do Fabricante
    modelo: "", // Nova: Modelo
    garantia: "", // Nova: Garantia
    material: "", // Nova: Material
    statusProduto: "publicado", // Nova: Status do Produto (publicado/oculto)
    disponibilidade: "em_estoque", // Nova: Disponibilidade (em_estoque/fora_estoque)
    dataPublicacao: new Date().toISOString().split('T')[0], // Nova: Data de Publicação
  });

  // Estado para variações
  const [temVariacoes, setTemVariacoes] = useState(true); // Ativado por padrão
  const [variacoes, setVariacoes] = useState<Variacao[]>([
    { id: "1", variacao: "P", estoque: "10", sku: "CAM-AZ-P" },
    { id: "2", variacao: "M", estoque: "15", sku: "CAM-AZ-M" },
    { id: "3", variacao: "G", estoque: "5", sku: "CAM-AZ-G" },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());

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
      const newFormData = { ...formData, imagemUrlOriginal: result.imageUrl, imagemUrl: result.imageUrl };
      setFormData(newFormData);

      // PHASE 28: Análise automática após upload bem-sucedido
      console.log("[ManualProductForm] 📤 Upload concluído:", result.imageUrl.substring(0, 50) + "...");
      console.log("[ManualProductForm] 🔍 Iniciando análise automática...");
      
      // Chamar análise automaticamente após upload
      try {
        await analyzeProductImage(result.imageUrl);
      } catch (analysisError) {
        console.error("[ManualProductForm] Erro na análise automática após upload:", analysisError);
        // Não bloquear o fluxo - o usuário pode preencher manualmente
      }
    } catch (err) {
      console.error("[ManualProductForm] Erro ao fazer upload:", err);
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

      console.log("[ManualProductForm] 🔍 Iniciando análise automática de produto...");

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
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error("[ManualProductForm] ⚠️ Análise automática falhou:", errorMessage);
        setError(`Análise automática falhou: ${errorMessage}`);
        // Não bloquear o usuário - permitir preenchimento manual
        return;
      }

      const result = await response.json();
      console.log("[ManualProductForm] 📥 Resposta da análise recebida:", {
        success: result.success,
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : []
      });

      if (result.success && result.data) {
        const analysis = result.data;
        console.log("[ManualProductForm] 📊 Dados da análise recebidos:", {
          nome_sugerido: analysis.nome_sugerido,
          categoria_sugerida: analysis.categoria_sugerida || analysis.suggested_category,
          tags: analysis.tags,
          cor_predominante: analysis.cor_predominante,
          tem_descricao: !!analysis.descricao_seo,
          logistic_unit: analysis.logistic_unit,
          has_variations_likely: analysis.has_variations_likely
        });
        
        const newAiFilledFields = new Set<string>();

        // Preencher campos automaticamente
        if (analysis.nome_sugerido) {
          setFormData(prev => ({ ...prev, nome: analysis.nome_sugerido }));
          newAiFilledFields.add("nome");
        }

        if (analysis.descricao_seo) {
          setFormData(prev => ({ ...prev, observacoes: analysis.descricao_seo }));
          newAiFilledFields.add("observacoes");
        }

        // Compatibilidade: usar categoria_sugerida ou suggested_category
        const categoriaAnalisada = analysis.categoria_sugerida || analysis.suggested_category;
        if (categoriaAnalisada) {
          setFormData(prev => ({ ...prev, categoria: categoriaAnalisada }));
          newAiFilledFields.add("categoria");
        }

        if (analysis.tags && Array.isArray(analysis.tags) && analysis.tags.length > 0) {
          setFormData(prev => ({ ...prev, tags: analysis.tags.join(", ") }));
          newAiFilledFields.add("tags");
        }

        if (analysis.cor_predominante) {
          setFormData(prev => ({ 
            ...prev, 
            cores: prev.cores ? `${prev.cores} - ${analysis.cor_predominante}` : analysis.cor_predominante 
          }));
          newAiFilledFields.add("cores");
        }

        // NOVO: Preencher unidade de medida se retornada pela análise
        if (analysis.logistic_unit) {
          setFormData(prev => ({ ...prev, unidadeMedida: analysis.logistic_unit }));
          newAiFilledFields.add("unidadeMedida");
          console.log("[ManualProductForm] ✅ Unidade de medida preenchida automaticamente:", analysis.logistic_unit);
        }

        // NOVO: Ativar/desativar variações baseado na análise
        if (typeof analysis.has_variations_likely === 'boolean') {
          setTemVariacoes(analysis.has_variations_likely);
          console.log("[ManualProductForm] ✅ Variações configuradas automaticamente:", analysis.has_variations_likely);
          
          // Se não tem variações, limpar a lista de variações ou criar uma vazia
          if (!analysis.has_variations_likely) {
            setVariacoes([]);
          } else if (variacoes.length === 0) {
            // Se tem variações mas lista está vazia, criar 3 exemplos
            setVariacoes([
              { id: "1", variacao: "P", estoque: "10", sku: "CAM-AZ-P" },
              { id: "2", variacao: "M", estoque: "15", sku: "CAM-AZ-M" },
              { id: "3", variacao: "G", estoque: "5", sku: "CAM-AZ-G" },
            ]);
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

            setAiFilledFields(newAiFilledFields);
            setSuccess("✨ Produto analisado automaticamente pela IA! Campos preenchidos.");
            setTimeout(() => setSuccess(null), 5000);

            console.log("[ManualProductForm] ✅ Análise automática concluída com sucesso!");
            console.log("[ManualProductForm] 📊 Campos preenchidos:", Array.from(newAiFilledFields));
      }
    } catch (err: any) {
      console.error("[ManualProductForm] ❌ Erro na análise automática:", err);
      setError(`Erro na análise automática: ${err.message || "Erro desconhecido"}`);
      // Não bloquear o usuário - permitir preenchimento manual
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
        ? `/api/lojista/products?lojistaId=${lojistaIdFromUrl}`
        : `/api/lojista/products`;
      
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

      if (formData.descontoProduto && formData.descontoProduto.trim()) {
        const descontoNum = parseFloat(formData.descontoProduto.trim());
        if (!isNaN(descontoNum)) {
          payload.descontoProduto = descontoNum;
        }
      }

      // Novos campos adicionados
      if (formData.marca && formData.marca.trim()) {
        payload.marca = formData.marca.trim();
      }
      if (formData.modelo && formData.modelo.trim()) {
        payload.modelo = formData.modelo.trim();
      }
      if (formData.garantia && formData.garantia.trim()) {
        payload.garantia = formData.garantia.trim();
      }
      if (formData.material && formData.material.trim()) {
        payload.material = formData.material.trim();
      }
      if (formData.statusProduto) {
        payload.statusProduto = formData.statusProduto;
      }
      if (formData.disponibilidade) {
        payload.disponibilidade = formData.disponibilidade;
      }
      if (formData.dataPublicacao) {
        payload.dataPublicacao = formData.dataPublicacao;
      }

      console.log("[ManualProductForm] Enviando payload:", JSON.stringify(payload, null, 2));

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[ManualProductForm] Erro da API:", errorData);
        throw new Error(errorData.error || `Erro ao criar produto (${response.status})`);
      }
      
      setSuccess("Produto cadastrado com sucesso!");
      setTimeout(() => {
        if (lojistaIdFromUrl) {
          router.push(`/produtos?lojistaId=${lojistaIdFromUrl}`);
        } else {
          router.push("/produtos");
        }
        router.refresh();
      }, 1500);
    } catch (err: any) {
      console.error("[ManualProductForm] Erro ao criar:", err);
      setError(err.message || "Erro ao criar produto");
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
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-heading">Adicionar Produto</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">Preencha os campos abaixo para cadastrar uma nova peça no catálogo</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Grid com duas colunas: Produto e Imagens/Publicação */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* COLUNA ESQUERDA: PRODUTO */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            {/* Título com ícone e barra azul */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-gray-800 dark:text-gray-200 uppercase text-base tracking-wider">
                  Produto
                </h3>
              </div>
              <div className="h-1 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
            </div>
            
            <div className="space-y-4">
              {/* Nome do Produto (expandido) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Vestido Aurora"
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                />
              </div>

              {/* Preço de Venda */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Preço de Venda (R$) *
                </label>
                <input
                  type="text"
                  value={formData.preco}
                  onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                  placeholder="Ex: 329,90"
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                />
              </div>

              {/* Unidade de Medida */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Unidade de Medida *
                </label>
                <select
                  value={formData.unidadeMedida}
                  onChange={(e) => setFormData({ ...formData, unidadeMedida: e.target.value })}
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                >
                  <option value="UN">UN</option>
                  <option value="KG">KG</option>
                  <option value="M">M</option>
                  <option value="PAR">PAR</option>
                  <option value="CJ">CJ</option>
                </select>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Categoria *
                </label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                >
                  <option value="">Selecione uma categoria</option>
                  {PRODUCT_CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tamanhos */}
              {!temVariacoes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Tamanhos
                  </label>
                  <input
                    type="text"
                    value={formData.tamanhos}
                    onChange={(e) => setFormData({ ...formData, tamanhos: e.target.value })}
                    placeholder="Ex: P, M, G"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                  />
                </div>
              )}

              {/* Estoque */}
              {!temVariacoes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Estoque
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.estoque}
                    onChange={(e) => setFormData({ ...formData, estoque: e.target.value })}
                    placeholder="Ex: 10"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                  />
                </div>
              )}

              {/* Desconto % */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Desconto (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.descontoProduto}
                  onChange={(e) => setFormData({ ...formData, descontoProduto: e.target.value })}
                  placeholder="Ex: 10"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Tags
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Ex: promoção, novo, destaque"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                />
              </div>

              {/* Descrição (textarea grande) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Descrição
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Descreva o produto detalhadamente..."
                  rows={6}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none resize-none"
                />
              </div>

              {/* Marca do Fabricante */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Marca do Fabricante
                </label>
                <input
                  type="text"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  placeholder="Ex: Nike, Adidas"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                />
              </div>

              {/* Modelo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Modelo
                </label>
                <input
                  type="text"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  placeholder="Ex: Modelo XYZ-2024"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                />
              </div>

              {/* Garantia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Garantia
                </label>
                <input
                  type="text"
                  value={formData.garantia}
                  onChange={(e) => setFormData({ ...formData, garantia: e.target.value })}
                  placeholder="Ex: 12 meses"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                />
              </div>

              {/* Cor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Cor
                </label>
                <input
                  type="text"
                  value={formData.cores}
                  onChange={(e) => setFormData({ ...formData, cores: e.target.value })}
                  placeholder="Ex: lilás - grafite"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                />
              </div>

              {/* Material */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Material
                </label>
                <input
                  type="text"
                  value={formData.material}
                  onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  placeholder="Ex: Algodão, Poliéster"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                />
              </div>

              {/* Switch: Este produto possui variações? */}
              <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Este produto possui variações? (Ex: Cores, Tamanhos)
                </label>
                <button
                  type="button"
                  onClick={() => setTemVariacoes(!temVariacoes)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    temVariacoes ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
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
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
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
                    className="w-full rounded-lg border-2 border-solid border-blue-300 dark:border-blue-400 bg-blue-300 dark:bg-blue-400 px-3 py-2 text-xs font-medium hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors duration-200 flex items-center justify-center gap-1.5"
                    style={{ color: '#FFFFFF' }}
                  >
                    <span style={{ color: '#FFFFFF' }}>+</span>
                    <span style={{ color: '#FFFFFF' }}>Adicionar Variação</span>
                  </button>
                </div>
              )}

              {/* Medidas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Medidas
                </label>
                <input
                  type="text"
                  value={formData.medidas}
                  onChange={(e) => setFormData({ ...formData, medidas: e.target.value })}
                  placeholder="Ex: Altura: 150cm, Largura: 80cm"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: IMAGENS DO PRODUTO E PUBLICAÇÃO */}
          <div className="space-y-6">
            {/* Seção: Imagens do Produto */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              {/* Título com ícone e barra azul */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-bold text-gray-800 dark:text-gray-200 uppercase text-base tracking-wider">
                    Imagens do Produto
                  </h3>
                </div>
                <div className="h-1 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
              </div>

              {/* Upload de Imagens */}
              <div className="space-y-4">
                <div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-full rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-slate-700 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingImage ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </span>
                    ) : (
                      "Escolher arquivos"
                    )}
                  </button>
                </div>

                {/* Preview de Imagens */}
                {(formData.imagemUrl || uploadedImageUrl || formData.imagemUrlOriginal) && (
                  <div className="space-y-2">
                    <img
                      src={formData.imagemUrl || uploadedImageUrl || formData.imagemUrlOriginal}
                      alt="Preview do produto"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 object-cover max-h-64"
                    />
                  </div>
                )}

                {/* Estúdio de Criação IA (Inline) - Oculta o título próprio */}
                {(formData.imagemUrl || uploadedImageUrl || formData.imagemUrlOriginal) && (
                  <ProductStudioInline
                    produtoId={undefined}
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
                )}
              </div>
            </div>

            {/* Seção: Publicação */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              {/* Título com ícone e barra azul */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-bold text-gray-800 dark:text-gray-200 uppercase text-base tracking-wider">
                    Publicação
                  </h3>
                </div>
                <div className="h-1 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
              </div>

              <div className="space-y-4">
                {/* Status do Produto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status do Produto
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="statusProduto"
                        value="publicado"
                        checked={formData.statusProduto === "publicado"}
                        onChange={(e) => setFormData({ ...formData, statusProduto: e.target.value })}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Publicado</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="statusProduto"
                        value="oculto"
                        checked={formData.statusProduto === "oculto"}
                        onChange={(e) => setFormData({ ...formData, statusProduto: e.target.value })}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Oculto</span>
                    </label>
                  </div>
                </div>

                {/* Disponibilidade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Disponibilidade
                  </label>
                  <select
                    value={formData.disponibilidade}
                    onChange={(e) => setFormData({ ...formData, disponibilidade: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                  >
                    <option value="em_estoque">Em Estoque</option>
                    <option value="fora_estoque">Fora de Estoque</option>
                  </select>
                </div>

                {/* Data de Publicação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    Data de Publicação
                  </label>
                  <input
                    type="date"
                    value={formData.dataPublicacao}
                    onChange={(e) => setFormData({ ...formData, dataPublicacao: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                  />
                </div>

                {/* Botão Salvar (grande, azul) */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 text-base transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  <Save className="h-5 w-5" />
                  {loading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
