"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Package, Search, Edit, Eye, Archive, ArchiveRestore, Trash2, Filter, X, Upload, Info } from "lucide-react";
import type { ProdutoDoc } from "@/lib/firestore/types";
import { useSearchParams } from "next/navigation";
import { PRODUCT_CATEGORY_OPTIONS } from "./category-options";

type ProductsTableProps = {
  initialProdutos: ProdutoDoc[];
};

export function ProductsTable({ initialProdutos }: ProductsTableProps) {
  const searchParams = useSearchParams();
  const isAdminView = searchParams?.get("admin") === "true";
  // Tentar ler tanto lojistaId quanto lojistald (para compatibilidade com typos)
  const lojistaIdFromUrl = searchParams?.get("lojistaId") || searchParams?.get("lojistald");
  
  const [produtos, setProdutos] = useState(initialProdutos);
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Atualizar produtos quando initialProdutos mudar (após criar novo produto)
  useEffect(() => {
    console.log("[ProductsTable] initialProdutos recebido:", initialProdutos.length);
    setProdutos(initialProdutos);
  }, [initialProdutos.length]); // Usar apenas o length para evitar loops
  const [editingProduto, setEditingProduto] = useState<ProdutoDoc | null>(null);
  const [viewingProduto, setViewingProduto] = useState<ProdutoDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Recarregar produtos quando showArchived mudar
  useEffect(() => {
    const loadProdutos = async () => {
      try {
        setLoading(true);
        const url = lojistaIdFromUrl 
          ? `/api/lojista/products?lojistaId=${lojistaIdFromUrl}&includeArchived=${showArchived}`
          : `/api/lojista/products?includeArchived=${showArchived}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Erro ao carregar produtos");
        const data = await response.json();
        // A API retorna array direto ou objeto com { produtos: [...] }
        const produtosArray = Array.isArray(data) ? data : (data?.produtos || []);
        console.log("[ProductsTable] Produtos carregados:", produtosArray.length);
        setProdutos(produtosArray);
      } catch (err) {
        console.error("[ProductsTable] Erro ao carregar:", err);
        setError("Erro ao carregar produtos");
      } finally {
        setLoading(false);
      }
    };
    loadProdutos();
  }, [showArchived, lojistaIdFromUrl]);

  const filteredProdutos = useMemo(() => {
    let filtered = produtos;

    // Filtrar arquivados
    if (!showArchived) {
      filtered = filtered.filter((p) => !p.arquivado);
    }

    // Filtrar por busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.nome.toLowerCase().includes(term) ||
          p.categoria.toLowerCase().includes(term) ||
          (p.obs && p.obs.toLowerCase().includes(term))
      );
    }

    // Filtrar por categoria
    if (categoryFilter !== "all") {
      filtered = filtered.filter((p) => p.categoria === categoryFilter);
    }

    return filtered;
  }, [produtos, searchTerm, categoryFilter, showArchived]);

  const handleArchive = async (produto: ProdutoDoc, archive: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const url = lojistaIdFromUrl
        ? `/api/lojista/products/${produto.id}?lojistaId=${lojistaIdFromUrl}`
        : `/api/lojista/products/${produto.id}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: archive ? "archive" : "restore" }),
      });

      if (!response.ok) throw new Error("Erro ao arquivar produto");

      setProdutos((prev) =>
        prev.map((p) => (p.id === produto.id ? { ...p, arquivado: archive } : p))
      );
      setSuccess(archive ? "Produto arquivado" : "Produto restaurado");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("[ProductsTable] Erro ao arquivar:", err);
      setError("Erro ao arquivar produto");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (produto: ProdutoDoc) => {
    if (!confirm(`Tem certeza que deseja excluir "${produto.nome}"?`)) return;

    try {
      setLoading(true);
      setError(null);
      const url = lojistaIdFromUrl
        ? `/api/lojista/products/${produto.id}?lojistaId=${lojistaIdFromUrl}`
        : `/api/lojista/products/${produto.id}`;
      
      const response = await fetch(url, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erro ao excluir produto");

      setProdutos((prev) => prev.filter((p) => p.id !== produto.id));
      setSuccess("Produto excluído");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("[ProductsTable] Erro ao excluir:", err);
      setError("Erro ao excluir produto");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (data: Partial<ProdutoDoc>) => {
    if (!editingProduto) return;

    try {
      setLoading(true);
      setError(null);
      const url = lojistaIdFromUrl
        ? `/api/lojista/products/${editingProduto.id}?lojistaId=${lojistaIdFromUrl}`
        : `/api/lojista/products/${editingProduto.id}`;
      
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Erro ao atualizar produto");

      setProdutos((prev) =>
        prev.map((p) => (p.id === editingProduto.id ? { ...p, ...data } : p))
      );
      setEditingProduto(null);
      setSuccess("Produto atualizado");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("[ProductsTable] Erro ao salvar:", err);
      setError("Erro ao atualizar produto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/40">
        <div className="flex flex-col gap-3 border-b border-zinc-800/60 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="text-xs text-zinc-500">
              {searchTerm.trim() || categoryFilter !== "all"
                ? `${filteredProdutos.length} produto(s) encontrado(s).`
                : `${produtos.length} produto(s) cadastrado(s).`}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-indigo-500"
                />
                Mostrar arquivados
              </label>
            </div>
          </div>
          <div className="flex w-full gap-2 md:w-auto md:flex-row">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nome, categoria..."
                className="w-full rounded-lg border border-zinc-700/60 bg-zinc-900/60 pl-10 pr-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none focus:ring-0"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-500" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-200 focus:border-indigo-400 focus:outline-none"
              >
                <option value="all">Todas</option>
                {PRODUCT_CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-900/40 text-left uppercase text-xs tracking-[0.18em] text-zinc-500">
              <tr>
                <th className="px-6 py-3">Produto</th>
                <th className="px-6 py-3">Categoria</th>
                <th className="px-6 py-3">Preço</th>
                <th className="px-6 py-3">Tamanhos</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-sm text-zinc-500">
                    Carregando...
                  </td>
                </tr>
              ) : filteredProdutos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-sm text-zinc-500">
                    <Package className="mx-auto mb-4 h-10 w-10 text-zinc-700" />
                    {produtos.length === 0
                      ? "Nenhum produto cadastrado ainda. Clique em 'Adicionar Produto' para começar."
                      : "Nenhum produto corresponde aos filtros aplicados."}
                  </td>
                </tr>
              ) : (
                filteredProdutos.map((produto) => (
                  <tr key={produto.id} className="hover:bg-zinc-900/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {produto.imagemUrl && (
                          <img
                            src={produto.imagemUrl}
                            alt={produto.nome}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium text-zinc-100">{produto.nome}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            ID {produto.id.slice(0, 6)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-300">{produto.categoria}</td>
                    <td className="px-6 py-4 text-zinc-100">
                      R$ {produto.preco.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-zinc-300">
                      {produto.tamanhos && produto.tamanhos.length > 0
                        ? produto.tamanhos.join(", ")
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          produto.arquivado
                            ? "bg-zinc-500/10 text-zinc-400"
                            : "bg-emerald-500/10 text-emerald-200"
                        }`}
                      >
                        {produto.arquivado ? "Arquivado" : "Ativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setViewingProduto(produto)}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-indigo-200 transition hover:border-indigo-300/60"
                          title="Visualizar"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingProduto(produto)}
                          className="inline-flex items-center gap-1 rounded-lg border border-purple-400/40 bg-purple-500/10 px-3 py-1 text-purple-200 transition hover:border-purple-300/60"
                          title="Editar"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchive(produto, !produto.arquivado)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-amber-200 transition hover:border-amber-300/60"
                          title={produto.arquivado ? "Desarquivar" : "Arquivar"}
                        >
                          {produto.arquivado ? (
                            <ArchiveRestore className="h-3.5 w-3.5" />
                          ) : (
                            <Archive className="h-3.5 w-3.5" />
                          )}
                        </button>
                        {isAdminView && (
                          <button
                            onClick={() => handleDelete(produto)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-1 text-red-200 transition hover:border-red-300/60"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Visualização */}
      {viewingProduto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Detalhes do Produto</h2>
              <button
                onClick={() => setViewingProduto(null)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {viewingProduto.imagemUrl && (
                <img
                  src={viewingProduto.imagemUrl}
                  alt={viewingProduto.nome}
                  className="h-48 w-full rounded-lg object-cover"
                />
              )}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nome</label>
                <p className="text-sm text-zinc-100">{viewingProduto.nome}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Categoria</label>
                <p className="text-sm text-zinc-100">{viewingProduto.categoria}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Preço</label>
                <p className="text-sm text-zinc-100">R$ {viewingProduto.preco.toFixed(2)}</p>
              </div>
              {viewingProduto.tamanhos && viewingProduto.tamanhos.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Tamanhos</label>
                  <p className="text-sm text-zinc-100">{viewingProduto.tamanhos.join(", ")}</p>
                </div>
              )}
              {viewingProduto.cores && viewingProduto.cores.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Cores</label>
                  <p className="text-sm text-zinc-100">{viewingProduto.cores.join(", ")}</p>
                </div>
              )}
              {viewingProduto.medidas && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Medidas</label>
                  <p className="text-sm text-zinc-100">{viewingProduto.medidas}</p>
                </div>
              )}
              {viewingProduto.obs && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Observações</label>
                  <p className="text-sm text-zinc-100">{viewingProduto.obs}</p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingProduto(null)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editingProduto && (
        <EditProdutoModal
          produto={editingProduto}
          onClose={() => setEditingProduto(null)}
          onSave={handleSaveEdit}
        />
      )}

    </>
  );
}

type EditProdutoModalProps = {
  produto: ProdutoDoc;
  onClose: () => void;
  onSave: (data: Partial<ProdutoDoc>) => Promise<void>;
};

function EditProdutoModal({ produto, onClose, onSave }: EditProdutoModalProps) {
  const searchParams = useSearchParams();
  const lojistaIdFromUrl = searchParams?.get("lojistaId") || searchParams?.get("lojistald");
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>(""); // URL da imagem do upload (não preenche o campo URL)
  
  // Converter dados do produto para o formato do formulário
  const [formData, setFormData] = useState({
    nome: produto.nome || "",
    categoria: produto.categoria || "Roupas",
    preco: produto.preco ? produto.preco.toString().replace(".", ",") : "",
    imagemUrl: produto.imagemUrl || "", // Campo manual para URL
    tamanhos: produto.tamanhos?.join(";") || "", // Separador: ponto e vírgula
    cores: produto.cores?.join(" - ") || "", // Separador: hífen
    medidas: produto.medidas || "",
    observacoes: produto.obs || "",
    estoque: produto.estoque?.toString() || "",
    tags: produto.tags?.join(",") || "", // Separador: vírgula
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
      console.error("[EditProdutoModal] Erro ao fazer upload:", err);
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
        estoque: formData.estoque ? parseInt(formData.estoque) : undefined,
        tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };

      console.log("[EditProdutoModal] Enviando payload:", JSON.stringify(payload, null, 2));

      // Usar onSave que já faz o PATCH e atualiza o estado
      await onSave(payload);
      
      // onSave já fecha o modal e atualiza a lista, não precisa fazer reload
    } catch (err: any) {
      console.error("[EditProdutoModal] Erro ao atualizar:", err);
      setError(err.message || "Erro ao atualizar produto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Editar produto</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 mb-3">
          Atualize os campos abaixo para modificar o produto. O envio real será conectado ao Firestore.
        </p>

        {error && (
          <div className="mb-2 rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-1.5 text-xs text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Foto Principal */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">FOTO PRINCIPAL</label>
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 flex gap-4 items-start">
              {/* Área de Preview */}
              <div className="flex-shrink-0 w-32 h-32 rounded-lg border border-zinc-700 bg-zinc-900/50 flex items-center justify-center overflow-hidden">
                {(formData.imagemUrl || uploadedImageUrl) ? (
                  <img
                    src={formData.imagemUrl || uploadedImageUrl}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <Upload className="h-8 w-8 text-zinc-600 mx-auto mb-1" />
                    <p className="text-xs text-zinc-500">Sem imagem</p>
                  </div>
                )}
              </div>
              
              {/* Texto e Botão */}
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-zinc-400">
                    Utilize imagens em PNG ou JPG com fundo limpo. O upload é salvo automaticamente no Firebase Storage.
                  </p>
                  {uploadedImageUrl && (
                    <p className="text-xs text-emerald-400">
                      Arquivo pronto para envio junto com o cadastro.
                    </p>
                  )}
                </div>
                <div className="mt-2">
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
              </div>
            </div>
            
            {/* Campo URL */}
            <div className="mt-2">
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Ou adicione a imagem por URL
              </label>
              <input
                type="url"
                value={formData.imagemUrl}
                onChange={(e) => setFormData({ ...formData, imagemUrl: e.target.value })}
                placeholder="https://exemplo.com/imagem.jpg"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">NOME</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Vestido Aurora"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none"
            />
          </div>

          {/* Preço e Categoria */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">PREÇO (R$)</label>
              <input
                type="text"
                value={formData.preco}
                onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                placeholder="Ex: 329,90"
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">CATEGORIA</label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:border-indigo-400 focus:outline-none"
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
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                CORES (SEPARADAS POR -)
              </label>
              <input
                type="text"
                value={formData.cores}
                onChange={(e) => setFormData({ ...formData, cores: e.target.value })}
                placeholder="Ex: lilás - grafite"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                TAMANHOS (SEPARADOS POR ;)
              </label>
              <input
                type="text"
                value={formData.tamanhos}
                onChange={(e) => setFormData({ ...formData, tamanhos: e.target.value })}
                placeholder="Ex: P;M;G"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Estoque e Tags */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">ESTOQUE</label>
              <input
                type="text"
                value={formData.estoque}
                onChange={(e) => setFormData({ ...formData, estoque: e.target.value })}
                placeholder="Ex: 10"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                TAGS (SEPARADAS POR ,)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="Ex: promoção, novo, destaque"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Medidas */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">MEDIDAS</label>
            <input
              type="text"
              value={formData.medidas}
              onChange={(e) => setFormData({ ...formData, medidas: e.target.value })}
              placeholder="Ex: Altura: 150cm, Largura: 80cm"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none"
            />
          </div>

          {/* Observações para IA */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              OBSERVAÇÕES PARA IA
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Ex: tecido em seda, caimento leve, ideal para looks noturnos."
              rows={2}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none"
            />
          </div>

          {/* Info e Botões */}
          <div className="pt-2 border-t border-zinc-800">
            <div className="flex items-start gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-2 mb-2">
              <Info className="h-3.5 w-3.5 mt-0.5 text-indigo-400 flex-shrink-0" />
              <p className="text-xs text-indigo-200">
                Os dados e a imagem são enviados para o Firestore. Em breve, você poderá definir estoque, status e vitrine.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
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





