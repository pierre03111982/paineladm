"use client";

import { useState, useRef } from "react";
import { X, Upload, FileText, Copy, CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

type ImportCatalogModalProps = {
  lojistaId: string;
  onClose: () => void;
};

export function ImportCatalogModal({ lojistaId, onClose }: ImportCatalogModalProps) {
  const searchParams = useSearchParams();
  const lojistaIdFromUrl = searchParams?.get("lojistaId") || searchParams?.get("lojistald") || lojistaId;
  const [importType, setImportType] = useState<"csv" | "ecommerce">("csv");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const csvTemplate = `nome,preco,categoria,imagemUrl,cores,tamanhos,estoque
Vestido Aurora,329.90,Roupas,https://exemplo.com/imagem1.jpg,lilás - grafite,P;M;G,10
Blusa Primavera,149.90,Roupas,https://exemplo.com/imagem2.jpg,branco - preto,PP;P;M;G,15`;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(csvTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = async () => {
    if (!selectedFile && importType === "csv") {
      setError("Selecione um arquivo CSV");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (importType === "csv") {
        const text = await selectedFile!.text();
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        const produtos = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim());
          const produto: any = {};
          headers.forEach((header, i) => {
            produto[header] = values[i] || '';
          });
          return { linha: index + 2, dados: produto };
        });

        const produtosFormatados = produtos.map((p) => ({
          linha: p.linha,
          dados: {
            nome: p.dados.nome || "",
            categoria: p.dados.categoria || "Outros",
            preco: parseFloat(p.dados.preco?.replace(",", ".") || "0") || 0,
            imagemUrl: p.dados.imagemUrl || "",
            cores: typeof p.dados.cores === 'string' 
              ? p.dados.cores.split("-").map((c: string) => c.trim()).filter(Boolean)
              : [],
            tamanhos: typeof p.dados.tamanhos === 'string'
              ? p.dados.tamanhos.split(";").map((t: string) => t.trim()).filter(Boolean)
              : [],
            estoque: p.dados.estoque ? parseInt(p.dados.estoque) : undefined,
          },
        }));

        const url = lojistaIdFromUrl
          ? `/api/lojista/products/import?lojistaId=${lojistaIdFromUrl}`
          : `/api/lojista/products/import`;
        
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ produtos: produtosFormatados }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao importar produtos");
        }

        const result = await response.json();
        setSuccess(`Importação concluída: ${result.criados || 0} produto(s) criado(s)`);
        
        if (result.falhasValidacao?.length > 0 || result.falhasEscrita?.length > 0) {
          setError(`${(result.falhasValidacao?.length || 0) + (result.falhasEscrita?.length || 0)} produto(s) falharam na importação`);
        }

        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 2000);
      }
    } catch (err: any) {
      console.error("[ImportCatalogModal] Erro ao importar:", err);
      setError(err.message || "Erro ao importar produtos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-8 sm:pt-12 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Importar catálogo de produtos</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-zinc-400 mb-6">
          Faça o upload de uma planilha ou configure integrações para sincronizar o inventário do seu e-commerce com o provador virtual.
        </p>

        {/* Tipo de Importação */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setImportType("csv")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              importType === "csv"
                ? "bg-indigo-500 text-white"
                : "border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            Planilha CSV
          </button>
          <button
            onClick={() => setImportType("ecommerce")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              importType === "ecommerce"
                ? "bg-indigo-500 text-white"
                : "border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            Integração e-commerce
          </button>
        </div>

        {importType === "csv" ? (
          <>
            <div className="mb-4 rounded-lg border border-zinc-700/60 bg-zinc-800/40 p-4">
              <p className="text-xs text-zinc-400 mb-2">
                A planilha deve conter as colunas: <strong className="text-zinc-300">nome</strong>, <strong className="text-zinc-300">preço</strong>, <strong className="text-zinc-300">categoria</strong>, <strong className="text-zinc-300">imagemUrl</strong>, <strong className="text-zinc-300">cores</strong>, <strong className="text-zinc-300">tamanhos</strong> e <strong className="text-zinc-300">estoque</strong>.
              </p>
              <p className="text-xs text-zinc-400">
                Utilize ponto ou vírgula para os valores de preço. Separe cores com "-" e tamanhos com ";".
              </p>
            </div>

            <button
              onClick={handleCopyTemplate}
              className="mb-4 inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Modelo copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar modelo CSV
                </>
              )}
            </button>

            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="mb-4 cursor-pointer rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-800/40 p-8 text-center transition hover:border-indigo-400 hover:bg-zinc-800/60"
            >
              <Upload className="mx-auto mb-3 h-12 w-12 text-zinc-600" />
              <p className="text-sm text-zinc-300 mb-1">
                {selectedFile ? selectedFile.name : "Arraste o arquivo ou clique para selecionar"}
              </p>
              <p className="text-xs text-zinc-500">CSV até 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {success}
              </div>
            )}

            <p className="mb-6 text-xs text-zinc-500">
              Integrações com Shopify e Nuvemshop estarão disponíveis na próxima etapa.
            </p>
          </>
        ) : (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
            <p className="text-sm text-emerald-200/80 mb-4">
              As integrações com e-commerce estarão disponíveis em breve. Por enquanto, utilize a importação via CSV.
            </p>
            <button
              onClick={() => setImportType("csv")}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-400"
            >
              Voltar para CSV
            </button>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
          >
            Cancelar
          </button>
          {importType === "csv" && (
            <button
              onClick={handleImport}
              disabled={loading || !selectedFile}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
            >
              {loading ? "Importando..." : `Importar ${selectedFile ? "1 arquivo" : "0 produto(s)"}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


