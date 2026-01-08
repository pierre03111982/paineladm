"use client";

import { useState, useRef } from "react";
import { ArrowLeft, Upload, Info, Save, X, Package, Sparkles, Loader2 } from "lucide-react";
import { PRODUCT_CATEGORY_OPTIONS } from "./category-options";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProductStudioInline } from "@/components/admin/products/ProductStudioInline";

type ManualProductFormProps = {
  lojistaId: string;
  onClose?: () => void;
};

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
  });

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
          categoria_sugerida: analysis.categoria_sugerida,
          tags: analysis.tags,
          cor_predominante: analysis.cor_predominante,
          tem_descricao: !!analysis.descricao_seo
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

        if (analysis.categoria_sugerida) {
          setFormData(prev => ({ ...prev, categoria: analysis.categoria_sugerida }));
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
        tamanhos: formData.tamanhos ? formData.tamanhos.split(";").map((s) => s.trim()).filter(Boolean) : [],
        cores: formData.cores ? formData.cores.split("-").map((c) => c.trim()).filter(Boolean) : [],
        medidas: formData.medidas.trim() || "",
        observacoes: formData.observacoes.trim() || "",
        tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };

      if (formData.estoque && formData.estoque.trim()) {
        const estoqueNum = parseInt(formData.estoque.trim());
        if (!isNaN(estoqueNum)) {
          payload.estoque = estoqueNum;
        }
      }

      if (formData.descontoProduto && formData.descontoProduto.trim()) {
        const descontoNum = parseFloat(formData.descontoProduto.trim());
        if (!isNaN(descontoNum)) {
          payload.descontoProduto = descontoNum;
        }
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
        {/* Estúdio de Criação IA (Inline) */}
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

        {/* Grid com duas colunas: Dados Manuais e Análise IA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* COLUNA ESQUERDA: DADOS DO LOJISTA (Manuais - Obrigatórios) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border-l-4 border-gray-800 dark:border-gray-600">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4 uppercase text-sm tracking-wider">
              1. Dados do Lojista
            </h3>
            <div className="space-y-4">
              {/* Preço */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Preço (R$) *
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

              {/* Desconto Especial */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
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
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Desconto adicional específico para este produto
                </p>
              </div>

              {/* Tamanhos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Tamanhos (separados por ;) *
                </label>
                <input
                  type="text"
                  value={formData.tamanhos}
                  onChange={(e) => setFormData({ ...formData, tamanhos: e.target.value })}
                  placeholder="Ex: P;M;G"
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                />
              </div>

              {/* Estoque */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Estoque
                </label>
                <input
                  type="text"
                  value={formData.estoque}
                  onChange={(e) => setFormData({ ...formData, estoque: e.target.value })}
                  placeholder="Ex: 10"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-gray-500 dark:focus:border-gray-400 focus:outline-none"
                />
              </div>

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

          {/* COLUNA DIREITA: ANÁLISE AUTOMÁTICA (IA - Sugestões) */}
          <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-800 p-6 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-500/20 relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-indigo-700 dark:text-indigo-300 uppercase text-sm tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                2. Análise Automática
              </h3>
              <button
                type="button"
                onClick={async () => {
                  const imagemUrlParaUsar = formData.imagemUrl || uploadedImageUrl;
                  if (imagemUrlParaUsar) {
                    await analyzeProductImage(imagemUrlParaUsar);
                  }
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline"
              >
                Regenerar Análise
              </button>
            </div>

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                  Nome *
                  {aiFilledFields.has("nome") && (
                    <span title="Preenchido automaticamente pela IA">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => {
                    setFormData({ ...formData, nome: e.target.value });
                    if (aiFilledFields.has("nome")) {
                      setAiFilledFields(prev => {
                        const newSet = new Set(prev);
                        newSet.delete("nome");
                        return newSet;
                      });
                    }
                  }}
                  placeholder="Ex: Vestido Aurora"
                  required
                  className="w-full rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                  Categoria *
                  {aiFilledFields.has("categoria") && (
                    <span title="Preenchido automaticamente pela IA">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                    </span>
                  )}
                </label>
                <select
                  value={formData.categoria}
                  onChange={(e) => {
                    setFormData({ ...formData, categoria: e.target.value });
                    if (aiFilledFields.has("categoria")) {
                      setAiFilledFields(prev => {
                        const newSet = new Set(prev);
                        newSet.delete("categoria");
                        return newSet;
                      });
                    }
                  }}
                  required
                  className="w-full rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                  Cores (separadas por -)
                  {aiFilledFields.has("cores") && (
                    <span title="Preenchido automaticamente pela IA">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.cores}
                  onChange={(e) => {
                    setFormData({ ...formData, cores: e.target.value });
                    if (aiFilledFields.has("cores")) {
                      setAiFilledFields(prev => {
                        const newSet = new Set(prev);
                        newSet.delete("cores");
                        return newSet;
                      });
                    }
                  }}
                  placeholder="Ex: lilás - grafite"
                  className="w-full rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                  Tags (separadas por ,)
                  {aiFilledFields.has("tags") && (
                    <span title="Preenchido automaticamente pela IA">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => {
                    setFormData({ ...formData, tags: e.target.value });
                    if (aiFilledFields.has("tags")) {
                      setAiFilledFields(prev => {
                        const newSet = new Set(prev);
                        newSet.delete("tags");
                        return newSet;
                      });
                    }
                  }}
                  placeholder="Ex: promoção, novo, destaque"
                  className="w-full rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
                />
                {aiFilledFields.has("tags") && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                    ✨ Tags geradas automaticamente para ativar cenários corretos
                  </p>
                )}
              </div>

              {/* Observações para IA */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                  Descrição SEO
                  {aiFilledFields.has("observacoes") && (
                    <span title="Preenchido automaticamente pela IA">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                    </span>
                  )}
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => {
                    setFormData({ ...formData, observacoes: e.target.value });
                    if (aiFilledFields.has("observacoes")) {
                      setAiFilledFields(prev => {
                        const newSet = new Set(prev);
                        newSet.delete("observacoes");
                        return newSet;
                      });
                    }
                  }}
                  placeholder="Ex: tecido em seda, caimento leve, ideal para looks noturnos."
                  rows={3}
                  className="w-full rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none"
                />
                {aiFilledFields.has("observacoes") && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                    ✨ Descrição SEO gerada automaticamente pela IA
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card de Ações */}
        <div className="neon-card rounded-2xl p-6">
          <div className="flex items-start gap-2 rounded-lg border border-indigo-300 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 p-3 mb-4">
            <Info className="h-4 w-4 mt-0.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <p className="text-sm text-indigo-800 dark:text-indigo-300">
              Os dados e a imagem são enviados para o Firestore. Você pode gerar uma imagem de catálogo com IA após fazer upload da foto original.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-slate-700 border-2 border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 text-sm font-semibold transition shadow-lg shadow-red-500/20"
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
              {loading ? "Salvando..." : "Salvar Produto"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
