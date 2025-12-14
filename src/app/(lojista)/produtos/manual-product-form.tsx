"use client";

import { useState, useRef } from "react";
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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>(""); // URL da imagem do upload (não preenche o campo URL)
  
  const [formData, setFormData] = useState({
    nome: "",
    categoria: "Roupas",
    preco: "",
    imagemUrl: "", // Campo manual para URL
    tamanhos: "",
    cores: "",
    medidas: "",
    observacoes: "",
    estoque: "",
    tags: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      
      // Armazena a URL do upload separadamente, sem preencher o campo URL manual
      setUploadedImageUrl(result.imageUrl);
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
      
      // Prioriza URL manual, se não houver, usa a do upload
      const imagemUrlFinal = formData.imagemUrl.trim() || uploadedImageUrl;
      
      const payload = {
        nome: formData.nome.trim(),
        categoria: formData.categoria.trim(),
        preco: parseFloat(formData.preco.replace(",", ".")) || 0,
        imagemUrl: imagemUrlFinal,
        tamanhos: formData.tamanhos ? formData.tamanhos.split(";").map((s) => s.trim()).filter(Boolean) : [],
        cores: formData.cores ? formData.cores.split("-").map((c) => c.trim()).filter(Boolean) : [],
        medidas: formData.medidas.trim() || "",
        observacoes: formData.observacoes.trim() || "",
        // Não envia estoque se estiver vazio/undefined
        tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };

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
      
      alert("Produto cadastrado com sucesso!");
      onClose();
      window.location.reload();
    } catch (err: any) {
      console.error("[ManualProductForm] Erro ao criar:", err);
      setError(err.message || "Erro ao criar produto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-8 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] p-5 shadow-lg mt-4 mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-main)]">Cadastro manual de produto</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-[var(--text-secondary)] mb-3">
          Preencha os campos abaixo para disponibilizar uma nova peça no provador virtual. O envio real será conectado ao Firestore.
        </p>

        {error && (
          <div className="mb-2 rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-1.5 text-xs text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Foto Principal */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-main)] mb-1.5">FOTO PRINCIPAL</label>
            <div className="rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[var(--bg-card)] p-3 flex gap-4 items-start">
              {/* Área de Preview */}
              <div className="flex-shrink-0 w-32 h-32 rounded-lg bg-white dark:bg-gray-800/50 flex items-center justify-center overflow-hidden">
                {(formData.imagemUrl || uploadedImageUrl) ? (
                  <img
                    src={formData.imagemUrl || uploadedImageUrl}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-1" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sem imagem</p>
                  </div>
                )}
              </div>
              
              {/* Texto e Botão */}
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Utilize imagens em PNG ou JPG com fundo limpo. O upload é salvo automaticamente no Firebase Storage.
                  </p>
                  {uploadedImageUrl && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Arquivo pronto para envio junto com o cadastro.
                    </p>
                  )}
                </div>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-50"
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
              </div>
            </div>
            
            {/* Campo URL */}
            <div className="mt-2">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Ou adicione a imagem por URL
              </label>
              <input
                type="url"
                value={formData.imagemUrl}
                onChange={(e) => setFormData({ ...formData, imagemUrl: e.target.value })}
                placeholder="https://exemplo.com/imagem.jpg"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[var(--bg-card)] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

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
            <div className="flex items-start gap-2 rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 p-2 mb-2">
              <Info className="h-3.5 w-3.5 mt-0.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <p className="text-xs text-indigo-900 dark:text-indigo-200">
                Os dados e a imagem são enviados para o Firestore. Em breve, você poderá definir estoque, status e vitrine.
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

