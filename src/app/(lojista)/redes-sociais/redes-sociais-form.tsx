"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Instagram, Facebook, MessageCircle, Loader2, CheckCircle2 } from "lucide-react";

type LojaPerfil = {
  nome?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  descontoRedesSociais?: number | null;
};

type RedesSociaisFormProps = {
  lojistaId: string;
  perfil: LojaPerfil | null;
};

export function RedesSociaisForm({ lojistaId, perfil }: RedesSociaisFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Estados do desconto
  const [lojaDiscount, setLojaDiscount] = useState<number>(perfil?.descontoRedesSociais ?? 0);
  const [selectedDiscountOption, setSelectedDiscountOption] = useState<string>(() => {
    const discount = perfil?.descontoRedesSociais ?? 0;
    if (!discount) return "0";
    if (discount >= 1 && discount <= 20) {
      return discount.toString();
    }
    return "custom";
  });
  const [customDiscount, setCustomDiscount] = useState<string>(
    perfil?.descontoRedesSociais && perfil.descontoRedesSociais > 20 
      ? String(perfil.descontoRedesSociais) 
      : ""
  );
  const [isUpdatingGlobalDiscount, setIsUpdatingGlobalDiscount] = useState(false);

  const discountOptions = useMemo(() => Array.from({ length: 20 }, (_, index) => (index + 1).toString()), []);

  useEffect(() => {
    const discount = perfil?.descontoRedesSociais ?? 0;
    setLojaDiscount(discount);
    if (!discount) {
      setSelectedDiscountOption("0");
      setCustomDiscount("");
      return;
    }
    if (discount >= 1 && discount <= 20) {
      setSelectedDiscountOption(discount.toString());
      setCustomDiscount("");
    } else {
      setSelectedDiscountOption("custom");
      setCustomDiscount(String(discount));
    }
  }, [perfil?.descontoRedesSociais]);

  const [formData, setFormData] = useState({
    instagram: perfil?.instagram || "",
    facebook: perfil?.facebook || "",
    tiktok: perfil?.tiktok || "",
  });

  useEffect(() => {
    if (perfil) {
      setFormData({
        instagram: perfil.instagram || "",
        facebook: perfil.facebook || "",
        tiktok: perfil.tiktok || "",
      });
    }
  }, [perfil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/lojista/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lojistaId,
          instagram: formData.instagram.trim() || null,
          facebook: formData.facebook.trim() || null,
          tiktok: formData.tiktok.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao salvar configurações");
      }

      setSuccess("Configurações de redes sociais salvas com sucesso!");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error("[RedesSociaisForm] Erro ao salvar:", err);
      setError(err.message || "Erro ao salvar configurações");
      setTimeout(() => setError(null), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateGlobalDiscount = async (value: number) => {
    if (value < 0 || value > 80) {
      setError("O desconto deve estar entre 0% e 80%");
      setTimeout(() => setError(null), 4000);
      return;
    }
    
    try {
      setIsUpdatingGlobalDiscount(true);
      setError(null);
      const response = await fetch("/api/lojista/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lojistaId,
          descontoRedesSociais: value,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao atualizar desconto");
      }

      setLojaDiscount(value);
      setSuccess(
        value > 0
          ? `Desconto aplicado: ${value.toFixed(1).replace(".0", "")}%`
          : "Desconto das redes removido"
      );
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error("[RedesSociaisForm] Erro ao atualizar desconto global:", err);
      setError(err.message || "Erro ao atualizar desconto");
      setTimeout(() => setError(null), 4000);
    } finally {
      setIsUpdatingGlobalDiscount(false);
    }
  };

  const handleDiscountSelection = (value: string) => {
    setSelectedDiscountOption(value);
    if (value === "custom") {
      return;
    }
    if (value === "0") {
      handleUpdateGlobalDiscount(0);
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 20) {
      handleUpdateGlobalDiscount(numValue);
    }
  };

  const handleApplyCustomDiscount = () => {
    const numValue = parseFloat(customDiscount);
    if (isNaN(numValue) || numValue < 0 || numValue > 80) {
      setError("O desconto deve estar entre 0% e 80%");
      setTimeout(() => setError(null), 4000);
      return;
    }
    handleUpdateGlobalDiscount(numValue);
  };

  // Garantir que o botão sempre tenha texto e ícone brancos desde o início
  useEffect(() => {
    if (buttonRef.current) {
      buttonRef.current.style.setProperty('color', '#FFFFFF', 'important');
      const icon = buttonRef.current.querySelector('svg');
      const text = buttonRef.current.querySelector('span');
      if (icon) {
        (icon as HTMLElement).style.setProperty('color', '#FFFFFF', 'important');
        (icon as HTMLElement).style.setProperty('stroke', '#FFFFFF', 'important');
      }
      if (text) {
        (text as HTMLElement).style.setProperty('color', '#FFFFFF', 'important');
      }
    }
  }, [isLoading]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mensagens de Sucesso/Erro */}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Seção Unificada - Redes Sociais e Desconto */}
      <div className="neon-card rounded-2xl p-6">
        <div className="space-y-4 mb-8">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)] mb-2">
              <Instagram className="h-4 w-4 text-pink-600 dark:text-pink-400" />
              Instagram
            </label>
            <input
              type="text"
              value={formData.instagram}
              onChange={(e) =>
                setFormData({ ...formData, instagram: e.target.value })
              }
              className="w-full rounded-xl border-2 border-gray-300 dark:border-indigo-500/50 bg-[var(--bg-card)]/60 px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-colors"
              placeholder="@sualoja ou https://instagram.com/sualoja"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)] mb-2">
              <Facebook className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Facebook
            </label>
            <input
              type="text"
              value={formData.facebook}
              onChange={(e) =>
                setFormData({ ...formData, facebook: e.target.value })
              }
              className="w-full rounded-xl border-2 border-gray-300 dark:border-indigo-500/50 bg-[var(--bg-card)]/60 px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-colors"
              placeholder="@sualoja ou https://facebook.com/sualoja"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)] mb-2">
              <MessageCircle className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              TikTok
            </label>
            <input
              type="text"
              value={formData.tiktok}
              onChange={(e) =>
                setFormData({ ...formData, tiktok: e.target.value })
              }
              className="w-full rounded-xl border-2 border-gray-300 dark:border-indigo-500/50 bg-[var(--bg-card)]/60 px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-colors"
              placeholder="@sualoja ou https://tiktok.com/@sualoja"
            />
          </div>
        </div>

        {/* Desconto Redes Sociais */}
        <div className="mb-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">Desconto Redes Sociais</p>
              <p className="text-xs text-indigo-700 dark:text-indigo-300">
                Quando o cliente seguir suas redes, este percentual será aplicado em todos os produtos automaticamente.
              </p>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400">
                Use o campo <span className="font-semibold">Desconto Especial</span> dentro do formulário do produto para bonificar itens específicos.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end md:w-auto">
              <div className="w-full sm:w-48">
                <label className="block text-xs font-medium text-indigo-900 dark:text-indigo-200 mb-1">
                  Percentual padrão
                </label>
                <select
                  value={selectedDiscountOption}
                  onChange={(e) => handleDiscountSelection(e.target.value)}
                  className="w-full rounded-lg border border-indigo-300 dark:border-indigo-500 bg-white dark:bg-[var(--bg-card)] px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  disabled={isUpdatingGlobalDiscount}
                >
                  <option value="0">Sem desconto</option>
                  {discountOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}%
                    </option>
                  ))}
                  <option value="custom">Outro valor…</option>
                </select>
              </div>
              {selectedDiscountOption === "custom" && (
                <div className="flex flex-1 items-end gap-2">
                  <div className="w-full">
                    <label className="block text-xs font-medium text-indigo-900 dark:text-indigo-200 mb-1">
                      Informe o percentual
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={80}
                      step={0.1}
                      value={customDiscount}
                      onChange={(e) => setCustomDiscount(e.target.value)}
                      className="w-full rounded-lg border border-indigo-300 dark:border-indigo-500 bg-white dark:bg-[var(--bg-card)] px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Ex: 25"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCustomDiscount}
                    disabled={isUpdatingGlobalDiscount}
                    className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/30 px-4 py-2 text-sm font-semibold transition-all duration-300 disabled:opacity-50"
                  >
                    {isUpdatingGlobalDiscount ? "Aplicando..." : "Aplicar"}
                  </button>
                </div>
              )}
              {selectedDiscountOption !== "custom" && (
                <div className="rounded-xl border border-indigo-300 dark:border-indigo-500 bg-white dark:bg-[var(--bg-card)] px-4 py-2 text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Atual</p>
                  <p className="text-base font-bold text-indigo-900 dark:text-indigo-300">{lojaDiscount?.toFixed(1).replace(".0", "") || 0}%</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botão Salvar na parte inferior */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            ref={buttonRef}
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/30 px-6 py-3 text-sm font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed !text-white"
            style={{ 
              color: '#FFFFFF',
            } as React.CSSProperties}
            onMouseEnter={(e) => {
              e.currentTarget.style.setProperty('color', '#FFFFFF', 'important');
              const icon = e.currentTarget.querySelector('svg');
              const text = e.currentTarget.querySelector('span');
              if (icon) {
                (icon as HTMLElement).style.setProperty('color', '#FFFFFF', 'important');
                (icon as HTMLElement).style.setProperty('stroke', '#FFFFFF', 'important');
              }
              if (text) {
                (text as HTMLElement).style.setProperty('color', '#FFFFFF', 'important');
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.setProperty('color', '#FFFFFF', 'important');
              const icon = e.currentTarget.querySelector('svg');
              const text = e.currentTarget.querySelector('span');
              if (icon) {
                (icon as HTMLElement).style.setProperty('color', '#FFFFFF', 'important');
                (icon as HTMLElement).style.setProperty('stroke', '#FFFFFF', 'important');
              }
              if (text) {
                (text as HTMLElement).style.setProperty('color', '#FFFFFF', 'important');
              }
            }}
          >
            {isLoading ? (
              <>
                <Loader2 
                  className="h-4 w-4 animate-spin" 
                  style={{ 
                    color: '#FFFFFF', 
                    stroke: '#FFFFFF',
                  } as React.CSSProperties} 
                />
                <span style={{ color: '#FFFFFF' } as React.CSSProperties}>Salvando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 
                  className="h-4 w-4" 
                  style={{ 
                    color: '#FFFFFF', 
                    stroke: '#FFFFFF',
                  } as React.CSSProperties} 
                />
                <span style={{ color: '#FFFFFF' } as React.CSSProperties}>Salvar Redes Sociais</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

