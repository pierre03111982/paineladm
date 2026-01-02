"use client";

import { useState, useRef, useEffect } from "react";
import { X, Upload, Info } from "lucide-react";
import { PRODUCT_CATEGORY_OPTIONS } from "./category-options";
import { useSearchParams } from "next/navigation";

type ManualProductFormProps = {
  lojistaId: string;
  onClose: () => void;
};

export function ManualProductForm({ lojistaId, onClose }: ManualProductFormProps) {
  const searchParams = useSearchParams();
  const lojistaIdFromUrl = searchParams?.get("lojistaId") || searchParams?.get("lojistald") || lojistaId;
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256); // Padrão: sidebar aberta (256px)
  
  // Detectar largura do sidebar observando o elemento
  useEffect(() => {
    const checkSidebarWidth = () => {
      // Em mobile, sidebar não está visível, então width = 0
      if (window.innerWidth < 768) {
        setSidebarWidth(0);
        return;
      }
      
      const sidebar = document.querySelector('aside[style*="width"]') as HTMLElement;
      if (sidebar) {
        const width = sidebar.offsetWidth || parseInt(getComputedStyle(sidebar).width) || 256;
        setSidebarWidth(width);
      } else {
        // Se não encontrar, assume sidebar aberta (256px) em desktop
        setSidebarWidth(window.innerWidth >= 768 ? 256 : 0);
      }
    };
    
    checkSidebarWidth();
    const interval = setInterval(checkSidebarWidth, 100);
    const observer = new MutationObserver(checkSidebarWidth);
    const sidebar = document.querySelector('aside');
    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ['style'] });
    }
    
    window.addEventListener('resize', checkSidebarWidth);
    
    return () => {
      clearInterval(interval);
      observer.disconnect();
      window.removeEventListener('resize', checkSidebarWidth);
    };
  }, []);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
      setFormData({ ...formData, imagemUrlOriginal: result.imageUrl });
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
        onClose();
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error("[ManualProductForm] Erro ao criar:", err);
      setError(err.message || "Erro ao criar produto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div 
        className="w-full h-full rounded-none border-0 bg-white dark:bg-[var(--bg-card)] p-4 md:p-6 shadow-2xl overflow-y-auto"
        style={{
          left: `${sidebarWidth}px`,
          width: `calc(100% - ${sidebarWidth}px)`,
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-main)]">Cadastro manual de produto</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Preencha os campos abaixo para disponibilizar uma nova peça no provador virtual. O envio real será conectado ao Firestore.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Foto Principal - Mostrar Original e Catálogo lado a lado */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">FOTO PRINCIPAL</label>
            <div className="rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[var(--bg-card)] p-3 space-y-3">
              {/* Preview lado a lado: Original e Catálogo */}
              <div className="grid grid-cols-2 gap-3">
                {/* Foto Original */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Foto Original</label>
                  <div className="w-full h-32 rounded-xl bg-white dark:bg-gray-800/50 flex items-center justify-center overflow-hidden">
                    {(formData.imagemUrlOriginal || formData.imagemUrl || uploadedImageUrl) ? (
                      <img
                        src={formData.imagemUrlOriginal || formData.imagemUrl || uploadedImageUrl}
                        alt="Foto Original"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="text-center">
                        <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">Sem imagem</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Foto Catálogo (IA) */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Foto Catálogo (IA) {formData.imagemUrlCatalogo && <span className="text-emerald-400">✓</span>}
                  </label>
                  <div className="w-full h-32 rounded-xl bg-white dark:bg-gray-800/50 flex items-center justify-center overflow-hidden">
                    {(formData.imagemUrlCatalogo || generatedCatalogImage) ? (
                      <img
                        src={formData.imagemUrlCatalogo || generatedCatalogImage || ""}
                        alt="Foto Catálogo IA"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Gere com IA</p>
                        <p className="text-[10px] text-gray-400 mt-1">Esta será exibida em todos os lugares</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Botão de Upload e Campo URL */}
              <div className="space-y-2">
                <p className="text-xs text-[var(--text-secondary)]">
                  Utilize imagens em PNG ou JPG com fundo limpo. O upload é salvo automaticamente no Firebase Storage.
                </p>
                {uploadedImageUrl && (
                  <p className="text-xs text-emerald-400">
                    Arquivo pronto para envio junto com o cadastro.
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingImage ? "Enviando..." : "Selecionar Imagem"}
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
                {/* Campo URL */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Ou adicione a imagem por URL
                  </label>
                  <input
                    type="url"
                    value={formData.imagemUrl}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        imagemUrl: e.target.value,
                        imagemUrlOriginal: e.target.value || formData.imagemUrlOriginal
                      });
                    }}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Estúdio Virtual & Display */}
          {(formData.imagemUrl || uploadedImageUrl) && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <label className="block text-xs font-medium text-[var(--text-main)] mb-2">
                ✨ ESTÚDIO VIRTUAL & DISPLAY
              </label>
              <div className="rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[var(--bg-card)] p-3 space-y-3">
                {/* Seletor de Cor do Manequim */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Cor do Manequim
                  </label>
                  <select
                    value={corManequim}
                    onChange={(e) => setCorManequim(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="branco fosco">Branco Fosco</option>
                    <option value="preto fosco">Preto Fosco</option>
                    <option value="invisível">Invisível</option>
                  </select>
                </div>

                {/* Seletor de Cenário */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Cenário de Fundo
                  </label>
                  <select
                    value={cenarioEscolhido}
                    onChange={(e) => setCenarioEscolhido(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none"
                  >
                    {cenarios.map((cenario) => (
                      <option key={cenario.id} value={cenario.id}>
                        {cenario.id}. {cenario.titulo}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                    Escolha o ambiente visual para o fundo da imagem
                  </p>
                </div>

                {/* Botão Gerar */}
                <button
                  type="button"
                  onClick={async () => {
                    const imagemUrlParaUsar = formData.imagemUrl || uploadedImageUrl;
                    if (!imagemUrlParaUsar || !lojistaIdFromUrl) {
                      setError("Imagem e ID da loja são necessários");
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
                          imagemUrl: imagemUrlParaUsar,
                          corManequim,
                          cenario: descricaoCenario,
                          lojistaId: lojistaIdFromUrl,
                          preco,
                          precoPromocional,
                          descontoEspecial,
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
                        
                        setFormData({
                          ...formData,
                          imagemUrlCatalogo: data.imageUrl,
                          imagemUrlOriginal: formData.imagemUrlOriginal || formData.imagemUrl || uploadedImageUrl,
                        });
                      }
                      
                      setGeneratedCatalogImage(data.imageUrl);
                    } catch (err: any) {
                      console.error("[ManualProductForm] Erro ao gerar catálogo:", err);
                      setError(err.message || "Erro ao gerar imagem de catálogo");
                    } finally {
                      setGeneratingCatalog(false);
                    }
                  }}
                  disabled={generatingCatalog || !formData.imagemUrl && !uploadedImageUrl}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-xs font-medium text-white transition hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingCatalog ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
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
                  <div className="space-y-2">
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2">
                      <p className="text-xs text-emerald-300 mb-2 font-semibold">
                        ✅ Imagem salva automaticamente como imagem principal do catálogo!
                      </p>
                      <div className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/50 p-2">
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
                      className="w-full rounded-lg bg-gray-700 px-3 py-2 text-xs font-medium text-gray-300 transition hover:bg-gray-600"
                    >
                      Fechar Preview
                    </button>
                  </div>
                )}

                {/* Info */}
                <div className="flex items-start gap-2 rounded-xl border border-purple-500/20 bg-purple-500/10 p-2">
                  <Info className="h-3.5 w-3.5 mt-0.5 text-purple-400 flex-shrink-0" />
                  <p className="text-xs text-purple-200">
                    Gere uma imagem profissional de catálogo com etiqueta de preço integrada, ideal para exibição na TV da loja sem riscos de direitos de imagem.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">NOME</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Vestido Aurora"
              required
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Preço e Categoria */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">PREÇO (R$)</label>
              <input
                type="text"
                value={formData.preco}
                onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                placeholder="Ex: 329,90"
                required
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">CATEGORIA</label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                required
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Selecione uma categoria</option>
                {PRODUCT_CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Desconto Especial */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">
              DESCONTO ESPECIAL (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.descontoProduto}
              onChange={(e) => setFormData({ ...formData, descontoProduto: e.target.value })}
              placeholder="Ex: 10"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none"
            />
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">
              Desconto adicional específico para este produto
            </p>
          </div>

          {/* Cores e Tamanhos */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">
                CORES (SEPARADAS POR -)
              </label>
              <input
                type="text"
                value={formData.cores}
                onChange={(e) => setFormData({ ...formData, cores: e.target.value })}
                placeholder="Ex: lilás - grafite"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">
                TAMANHOS (SEPARADOS POR ;)
              </label>
              <input
                type="text"
                value={formData.tamanhos}
                onChange={(e) => setFormData({ ...formData, tamanhos: e.target.value })}
                placeholder="Ex: P;M;G"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Estoque e Tags */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">ESTOQUE</label>
              <input
                type="text"
                value={formData.estoque}
                onChange={(e) => setFormData({ ...formData, estoque: e.target.value })}
                placeholder="Ex: 10"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">
                TAGS (SEPARADAS POR ,)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="Ex: promoção, novo, destaque"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Medidas */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">MEDIDAS</label>
            <input
              type="text"
              value={formData.medidas}
              onChange={(e) => setFormData({ ...formData, medidas: e.target.value })}
              placeholder="Ex: Altura: 150cm, Largura: 80cm"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Observações para IA */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">
              OBSERVAÇÕES PARA IA
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Ex: tecido em seda, caimento leve, ideal para looks noturnos."
              rows={2}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Info e Botões */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-2 mb-2">
              <Info className="h-3.5 w-3.5 mt-0.5 text-indigo-400 flex-shrink-0" />
              <p className="text-xs text-indigo-200">
                Os dados e a imagem são enviados para o Firestore. Você pode gerar uma imagem de catálogo com IA após fazer upload da foto original.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-white transition hover:bg-gray-50 dark:hover:bg-[var(--bg-card)]/80"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50"
              >
                {loading ? "Salvando..." : "Salvar produto"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
