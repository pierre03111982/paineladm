"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Ruler, Upload, Loader2, X, ImageIcon, Table2, Plus, Trash2 } from "lucide-react";
import { findMeasurementImage, getMeasurementImageUrl, type MeasurementManifestItem } from "@/data/measurementsManifest";

interface MeasurementGuideCardProps {
  aiCategory?: string;
  aiProductType?: string;
  aiKeywords?: string[];
  isPlusSize?: boolean;
  imagemMedidasCustomizada?: string | null;
  onUploadManual?: (file: File) => void;
  onRemoveCustom?: () => void;
  uploading?: boolean;
  medidasFileInputRef?: React.RefObject<HTMLInputElement>;
  className?: string;
  variacoes?: Array<{ id: string; variacao: string; estoque: string; sku: string }>; // Variações do produto (P, M, G, etc.)
  onMedidasChange?: (medidas: Record<string, Record<string, string>>) => void; // Callback para salvar medidas
  sizeCategory?: 'standard' | 'plus'; // NOVO: Grade de Tamanho selecionada pelo usuário
  targetAudience?: 'female' | 'male' | 'kids'; // NOVO: Público Alvo selecionado pelo usuário
}

/**
 * Componente de Tabela Manual de Medidas
 */
function ManualMeasurementTable({
  variacoes = [],
  defaultColumns = [],
  onMedidasChange
}: {
  variacoes: Array<{ id: string; variacao: string; estoque: string; sku: string }>;
  defaultColumns: string[];
  onMedidasChange?: (medidas: Record<string, Record<string, string>>) => void;
}) {
  const [columns, setColumns] = useState<string[]>(defaultColumns.length > 0 ? defaultColumns : ['Busto', 'Comprimento']);
  const [medidas, setMedidas] = useState<Record<string, Record<string, string>>>({});

  // Sincronizar com variações: adicionar/remover linhas automaticamente
  useEffect(() => {
    const novasMedidas: Record<string, Record<string, string>> = {};
    variacoes.forEach(variacao => {
      if (!medidas[variacao.variacao]) {
        novasMedidas[variacao.variacao] = {};
        columns.forEach(col => {
          novasMedidas[variacao.variacao][col] = '';
        });
      } else {
        novasMedidas[variacao.variacao] = { ...medidas[variacao.variacao] };
        // Garantir que todas as colunas existam
        columns.forEach(col => {
          if (!novasMedidas[variacao.variacao][col]) {
            novasMedidas[variacao.variacao][col] = '';
          }
        });
      }
    });
    // Remover variações que não existem mais
    Object.keys(medidas).forEach(variacao => {
      if (!variacoes.find(v => v.variacao === variacao)) {
        delete novasMedidas[variacao];
      }
    });
    setMedidas(novasMedidas);
  }, [variacoes.length, variacoes.map(v => v.variacao).join(',')]);

  // Notificar mudanças
  useEffect(() => {
    if (onMedidasChange) {
      onMedidasChange(medidas);
    }
  }, [medidas]);

  const handleAddColumn = () => {
    const novaColuna = prompt('Nome da nova coluna:');
    if (novaColuna && novaColuna.trim() && !columns.includes(novaColuna.trim())) {
      setColumns([...columns, novaColuna.trim()]);
      // Adicionar a coluna vazia para todas as variações
      const novasMedidas = { ...medidas };
      Object.keys(novasMedidas).forEach(variacao => {
        novasMedidas[variacao][novaColuna.trim()] = '';
      });
      setMedidas(novasMedidas);
    }
  };

  const handleRemoveColumn = (col: string) => {
    if (columns.length <= 1) {
      alert('A tabela deve ter pelo menos uma coluna.');
      return;
    }
    setColumns(columns.filter(c => c !== col));
    const novasMedidas = { ...medidas };
    Object.keys(novasMedidas).forEach(variacao => {
      delete novasMedidas[variacao][col];
    });
    setMedidas(novasMedidas);
  };

  const handleMedidaChange = (variacao: string, coluna: string, valor: string) => {
    setMedidas(prev => ({
      ...prev,
      [variacao]: {
        ...prev[variacao],
        [coluna]: valor
      }
    }));
  };

  if (variacoes.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-slate-500">
        Adicione variações (tamanhos) na Grade de Estoque para preencher as medidas.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Cabeçalho da Tabela com Botão de Adicionar Coluna */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-700">
          Tabela de Medidas Manual
        </h4>
        <button
          onClick={handleAddColumn}
          className="px-2 py-1 text-xs font-medium text-slate-700 border border-gray-300 rounded hover:bg-slate-50 transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          <span>Coluna</span>
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto border border-gray-300 rounded-lg">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-2 py-2 text-left font-semibold text-slate-700 border-r border-gray-300">
                Tamanho
              </th>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-2 py-2 text-center font-semibold text-slate-700 border-r border-gray-300 relative group"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{col}</span>
                    {columns.length > 1 && (
                      <button
                        onClick={() => handleRemoveColumn(col)}
                        className="p-0.5 text-red-500 hover:text-red-700 opacity-70 hover:opacity-100 transition-opacity"
                        title="Remover coluna"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variacoes.map((variacao) => (
              <tr
                key={variacao.id}
                className="border-b border-gray-300 hover:bg-slate-50"
              >
                <td className="px-2 py-2 font-medium text-slate-700 border-r border-gray-300">
                  {variacao.variacao}
                </td>
                {columns.map((col, idx) => (
                  <td key={idx} className="px-2 py-2 border-r border-gray-300">
                    <input
                      type="text"
                      value={medidas[variacao.variacao]?.[col] || ''}
                      onChange={(e) => handleMedidaChange(variacao.variacao, col, e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-center text-xs border border-gray-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MeasurementGuideCard({
  aiCategory,
  aiProductType,
  aiKeywords,
  isPlusSize,
  imagemMedidasCustomizada,
  onUploadManual,
  onRemoveCustom,
  uploading = false,
  medidasFileInputRef,
  className = "",
  variacoes = [],
  onMedidasChange,
  sizeCategory,
  targetAudience
}: MeasurementGuideCardProps) {
  // Estado para alternar entre imagem e tabela manual
  const [modoVisualizacao, setModoVisualizacao] = useState<'imagem' | 'tabela'>('imagem');
  /**
   * LÓGICA DE SELEÇÃO DA GUIA DE MEDIDAS:
   * 
   * Esta guia de medidas serve como REFERÊNCIA VISUAL baseada na análise da imagem original.
   * 
   * Fluxo:
   * 1. A IA analisa a imagem original do produto (upload)
   * 2. A análise retorna: categoria, tipo de produto, tags/keywords
   * 3. Com esses dados, buscamos a imagem de guia de medidas correspondente no manifest
   * 4. A guia exibida serve para confirmar visualmente se a análise da IA está correta
   * 
   * Prioridade:
   * - Se houver imagem customizada (upload manual), usar ela (prioridade máxima)
   * - Caso contrário, buscar imagem do manifest baseada na análise da IA
   */
  const measurementItem = !imagemMedidasCustomizada 
    ? findMeasurementImage(aiCategory, aiProductType, aiKeywords, isPlusSize, sizeCategory, targetAudience)
    : null;
  
  const measurementImageUrl = imagemMedidasCustomizada || getMeasurementImageUrl(measurementItem);
  const hasCustomImage = !!imagemMedidasCustomizada;
  const hasMatchImage = !hasCustomImage && !!measurementImageUrl;

  // Se não há imagem e o modo é 'imagem', mudar para 'tabela' automaticamente
  useEffect(() => {
    if (!measurementImageUrl && modoVisualizacao === 'imagem') {
      setModoVisualizacao('tabela');
    }
  }, [measurementImageUrl, modoVisualizacao]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadManual) {
      onUploadManual(file);
    }
  };

  const handleRemoveCustomImage = () => {
    if (medidasFileInputRef?.current) {
      medidasFileInputRef.current.value = "";
    }
    if (onRemoveCustom) {
      onRemoveCustom();
    }
  };

  // Renderizar conteúdo baseado no modo de visualização
  const renderContent = () => {
    if (modoVisualizacao === 'tabela') {
      return (
        <ManualMeasurementTable
          variacoes={variacoes}
          defaultColumns={measurementItem?.defaultColumns || []}
          onMedidasChange={onMedidasChange}
        />
      );
    }

    // Modo imagem
    if (measurementImageUrl) {
      return (
        <div className="relative w-full aspect-auto rounded-lg overflow-hidden border border-gray-300 bg-white">
          {hasCustomImage && onUploadManual && (
            <button
              onClick={handleRemoveCustomImage}
              className="absolute top-2 right-2 z-10 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg"
              aria-label="Remover imagem customizada"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <Image
            src={measurementImageUrl}
            alt={`Guia de medidas - ${hasCustomImage ? "customizado" : (measurementItem?.category || "produto")}`}
            width={800}
            height={1000}
            className="w-full h-auto object-contain"
            unoptimized
          />
        </div>
      );
    }

    return null;
  };

  // Se houver imagem ou modo tabela ativo, mostrar card completo
  if (measurementImageUrl || modoVisualizacao === 'tabela') {
    return (
      <div className={`rounded-lg border border-gray-300 bg-white p-4 shadow-sm ${className}`}>
        {/* Cabeçalho com Botões de Alternância */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-700">
              📏 Guia de Medidas {hasCustomImage ? "(Inserida Manualmente)" : hasMatchImage ? "Sugerido (IA)" : ""}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Botões de Alternância */}
            {measurementImageUrl && (
              <button
                onClick={() => setModoVisualizacao('imagem')}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                  modoVisualizacao === 'imagem'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-700 border border-gray-300 hover:bg-slate-50'
                }`}
              >
                <ImageIcon className="w-3 h-3" />
                <span>Imagem</span>
              </button>
            )}
            <button
              onClick={() => setModoVisualizacao('tabela')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                modoVisualizacao === 'tabela'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-700 border border-gray-300 hover:bg-slate-50'
              }`}
            >
              <Table2 className="w-3 h-3" />
              <span>Tabela</span>
            </button>
            {hasCustomImage && onUploadManual && modoVisualizacao === 'imagem' && (
              <button
                onClick={() => medidasFileInputRef?.current?.click()}
                className="px-2 py-1 text-xs font-medium text-slate-700 border border-gray-300 rounded hover:bg-slate-50 transition-colors flex items-center gap-1 bg-white"
              >
                <Upload className="w-3 h-3" />
                <span>Trocar</span>
              </button>
            )}
          </div>
        </div>

        {/* Conteúdo (Imagem ou Tabela) */}
        {renderContent()}

        {/* Input hidden para upload */}
        {onUploadManual && (
          <input
            ref={medidasFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        )}
      </div>
    );
  }

  // Se não houver categoria detectada ainda, mostrar placeholder
  if (!aiCategory && !aiProductType) {
    return (
      <div className={`rounded-lg border border-gray-300 bg-white p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-700">
              📏 Guia de Medidas Sugerido (IA)
            </h3>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-xs text-slate-600">
            Aguardando análise da IA para sugerir medidas...
          </p>
        </div>
      </div>
    );
  }

  // Se não encontrou imagem de medidas, mostrar área de upload manual
  return (
    <div className={`rounded-lg border border-gray-300 bg-white p-4 shadow-sm ${className}`}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Ruler className="w-5 h-5 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-700">
            📏 Guia de Medidas
          </h3>
        </div>
      </div>

      {/* Área de Upload Manual */}
      <div className="space-y-3">
        <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg bg-white">
          <div className="flex flex-col items-center gap-2">
            <Ruler className="w-8 h-8 text-slate-500" />
            <p className="text-xs text-slate-700 font-medium">
              Tabela de medidas não detectada
            </p>
            <p className="text-xs text-slate-600 px-4">
              Não encontramos uma tabela de medidas correspondente para este tipo de produto.
            </p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-2">
          {onUploadManual && (
            <button
              onClick={() => medidasFileInputRef?.current?.click()}
              disabled={uploading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando imagem...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Inserir Imagem</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={() => setModoVisualizacao('tabela')}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Table2 className="w-4 h-4" />
            <span>Tabela Manual</span>
          </button>
        </div>
        {onUploadManual && (
          <input
            ref={medidasFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        )}

        {/* Texto informativo */}
        <p className="text-xs text-slate-600 italic text-center px-2">
          *Referência de medidas padrão de mercado. Pequenas variações podem ocorrer entre modelagens.
        </p>
      </div>
    </div>
  );
}
