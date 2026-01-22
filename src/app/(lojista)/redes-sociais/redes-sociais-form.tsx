"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

// Ícones oficiais coloridos das redes sociais
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="instagram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f09433" />
        <stop offset="25%" stopColor="#e6683c" />
        <stop offset="50%" stopColor="#dc2743" />
        <stop offset="75%" stopColor="#cc2366" />
        <stop offset="100%" stopColor="#bc1888" />
      </linearGradient>
    </defs>
    <rect
      x="2"
      y="2"
      width="20"
      height="20"
      rx="5"
      fill="url(#instagram-gradient)"
    />
    <circle cx="12" cy="12" r="4" fill="white" />
    <circle cx="17" cy="7" r="1.5" fill="white" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="#1877F2"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="tiktok-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF0050" />
        <stop offset="50%" stopColor="#00F2EA" />
        <stop offset="100%" stopColor="#000000" />
      </linearGradient>
    </defs>
    <path
      d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743 2.895 2.895 0 0 1 2.31-4.644 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.041-.104z"
      fill="url(#tiktok-gradient)"
    />
  </svg>
);

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
      const icon = buttonRef.current.querySelector('svg') as SVGSVGElement | null;
      const text = buttonRef.current.querySelector('span') as HTMLSpanElement | null;
      if (icon) {
        icon.style.setProperty('color', '#FFFFFF', 'important');
        icon.style.setProperty('stroke', '#FFFFFF', 'important');
      }
      if (text) {
        text.style.setProperty('color', '#FFFFFF', 'important');
      }
    }
  }, [isLoading]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mensagens de Sucesso/Erro */}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Seção Unificada - Redes Sociais e Desconto */}
      <div className="neon-card rounded-2xl p-6">
        <div className="space-y-4 mb-8">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)] mb-2">
              <InstagramIcon className="h-5 w-5" />
              Instagram
            </label>
            <input
              type="text"
              value={formData.instagram}
              onChange={(e) =>
                setFormData({ ...formData, instagram: e.target.value })
              }
              className="w-full rounded-xl border-2 border-gray-300 bg-[var(--bg-card)]/60 px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-colors"
              placeholder="@sualoja ou https://instagram.com/sualoja"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)] mb-2">
              <FacebookIcon className="h-5 w-5" />
              Facebook
            </label>
            <input
              type="text"
              value={formData.facebook}
              onChange={(e) =>
                setFormData({ ...formData, facebook: e.target.value })
              }
              className="w-full rounded-xl border-2 border-gray-300 bg-[var(--bg-card)]/60 px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-colors"
              placeholder="@sualoja ou https://facebook.com/sualoja"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)] mb-2">
              <TikTokIcon className="h-5 w-5" />
              TikTok
            </label>
            <input
              type="text"
              value={formData.tiktok}
              onChange={(e) =>
                setFormData({ ...formData, tiktok: e.target.value })
              }
              className="w-full rounded-xl border-2 border-gray-300 bg-[var(--bg-card)]/60 px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-colors"
              placeholder="@sualoja ou https://tiktok.com/@sualoja"
            />
          </div>
        </div>

        {/* Desconto Redes Sociais */}
        <div className="mb-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-indigo-900">Desconto Redes Sociais</p>
              <p className="text-xs text-indigo-700">
                Quando o cliente seguir suas redes, este percentual será aplicado em todos os produtos automaticamente.
              </p>
              <p className="text-[11px] text-indigo-600">
                Use o campo <span className="font-semibold">Desconto Especial</span> dentro do formulário do produto para bonificar itens específicos.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end md:w-auto">
              <div className="w-full sm:w-48">
                <label className="block text-xs font-medium text-indigo-900 mb-1">
                  Percentual padrão
                </label>
                <select
                  value={selectedDiscountOption}
                  onChange={(e) => handleDiscountSelection(e.target.value)}
                  className="w-full rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                    <label className="block text-xs font-medium text-indigo-900 mb-1">
                      Informe o percentual
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={80}
                      step={0.1}
                      value={customDiscount}
                      onChange={(e) => setCustomDiscount(e.target.value)}
                      className="w-full rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                <div className="rounded-xl border border-indigo-300 bg-white px-4 py-2 text-center">
                  <p className="text-xs text-gray-600">Atual</p>
                  <p className="text-base font-bold text-indigo-900">{lojaDiscount?.toFixed(1).replace(".0", "") || 0}%</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botão Salvar na parte inferior */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
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
              const icon = e.currentTarget.querySelector('svg') as SVGSVGElement | null;
              const text = e.currentTarget.querySelector('span') as HTMLSpanElement | null;
              if (icon) {
                icon.style.setProperty('color', '#FFFFFF', 'important');
                icon.style.setProperty('stroke', '#FFFFFF', 'important');
              }
              if (text) {
                text.style.setProperty('color', '#FFFFFF', 'important');
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.setProperty('color', '#FFFFFF', 'important');
              const icon = e.currentTarget.querySelector('svg') as SVGSVGElement | null;
              const text = e.currentTarget.querySelector('span') as HTMLSpanElement | null;
              if (icon) {
                icon.style.setProperty('color', '#FFFFFF', 'important');
                icon.style.setProperty('stroke', '#FFFFFF', 'important');
              }
              if (text) {
                text.style.setProperty('color', '#FFFFFF', 'important');
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

