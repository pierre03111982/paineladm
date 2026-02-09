"use client";

import { useState, useEffect } from "react";
import { ImageOff } from "lucide-react";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import type { DisplayProdutoItem } from "@/app/api/lojista/display-produtos/route";

const SLIDE_INTERVAL_MS = 4000;

type DisplayPreviewProps = {
  lojistaId: string;
};

/**
 * Visualizador 9:16 do que está passando no display da loja.
 * Mostra em slides os produtos em promoção (exibirNoDisplay), usando a imagem Modelo Frente.
 */
export function DisplayPreview({ lojistaId }: DisplayPreviewProps) {
  const [produtos, setProdutos] = useState<DisplayProdutoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!lojistaId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/lojista/display-produtos?lojistaId=${encodeURIComponent(lojistaId)}`)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error("Erro ao carregar")))
      .then((data) => {
        if (!cancelled && Array.isArray(data.produtos)) {
          setProdutos(data.produtos);
          setCurrentIndex(0);
        }
      })
      .catch(() => {
        if (!cancelled) setProdutos([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [lojistaId]);

  // Avançar slide automaticamente
  useEffect(() => {
    if (produtos.length <= 1) return;
    const t = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % produtos.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(t);
  }, [produtos.length]);

  const current = produtos[currentIndex];

  // Mesmas medidas da caixa "Visualizar Fotos Catálogo IA": 282px externo, 250×444px área da imagem.
  // Sem margin-bottom para não quebrar o alinhamento da base com a caixa Insights. AnimatedCard = sombra + hover zoom como as outras.
  return (
    <AnimatedCard
      className="border-2 border-slate-200 p-3 bg-slate-50 flex flex-col shrink-0"
      style={{ width: "282px", flexShrink: 0 }}
    >
      <div className="block text-xs font-semibold mb-1.5 px-2 py-1 rounded-lg bg-gradient-to-r from-slate-100 to-slate-200 border border-slate-200 shadow-sm text-slate-700">
        Display da loja — Prévia 9:16
      </div>
      <div className="flex items-center justify-center relative shrink-0" style={{ width: "250px", height: "444px" }}>
        <div className="relative w-full h-full rounded-lg overflow-hidden border border-slate-200 bg-white">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
              Carregando...
            </div>
          )}
          {!loading && produtos.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm p-4">
              <ImageOff className="h-10 w-10" />
              <span className="text-center">Nenhum produto no display</span>
              <span className="text-xs text-center">Ative “Exibir no display” na tela do produto</span>
            </div>
          )}
          {!loading && current && (
            <>
              <img
                src={current.imagemModeloFrente}
                alt={current.nome}
                className="absolute inset-0 w-full h-full object-cover object-center bg-white"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="text-white text-sm font-medium truncate">{current.nome}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Indicadores / dots */}
      {!loading && produtos.length > 1 && (
        <div className="flex gap-1.5 mt-2 justify-center">
          {produtos.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentIndex ? "bg-slate-700" : "bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      )}
    </AnimatedCard>
  );
}
