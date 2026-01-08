"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

export function EcommerceIntegrationCard() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      // Aqui você pode adicionar a lógica para salvar o email na lista de espera
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulação
      setSubmitted(true);
      setEmail("");
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="neon-card rounded-xl border-2 border-emerald-200 dark:border-emerald-500/50 bg-gradient-to-br from-emerald-50/50 to-green-50/50 dark:from-emerald-950/30 dark:to-green-950/30 p-5 space-y-3 shadow-lg shadow-emerald-500/20">
      <h4 className="text-sm font-semibold text-[var(--text-main)] mb-2">Conecte seu e-commerce</h4>
      <p className="text-xs font-medium text-[var(--text-secondary)] leading-relaxed">
        Estamos preparando integrações nativas com Shopify, Nuvemshop e VTEX para que seu catálogo fique sempre sincronizado. Cadastre-se na lista de espera e seja avisado em primeira mão.
      </p>
      {!submitted ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Seu melhor e-mail"
            className="flex-1 rounded-lg border border-emerald-300 dark:border-emerald-500/50 bg-white dark:bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 transition-colors"
            required
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-4 py-2 text-xs font-semibold shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              "Cadastrando..."
            ) : (
              <>
                Quero ser avisado
                <ExternalLink className="h-3 w-3" />
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          ✅ Cadastro realizado! Você será notificado quando as integrações estiverem disponíveis.
        </div>
      )}
    </div>
  );
}





