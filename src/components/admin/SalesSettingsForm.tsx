"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, Truck, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type SalesConfigPayload = {
  enabled: boolean;
  payment_gateway: "mercadopago" | "manual_whatsapp";
  shipping_provider: "melhor_envio" | "fixed_price" | "none";
  origin_zip?: string | null;
  manual_contact?: string | null;
  fixed_shipping_price?: number | null;
  integrations?: {
    mercadopago_public_key?: string | null;
    mercadopago_access_token?: string | null;
    melhor_envio_token?: string | null;
    melhor_envio_client_id?: string | null;
    melhor_envio_client_secret?: string | null;
  };
};

type SalesSettingsFormProps = {
  lojistaId: string;
  initialConfig?: Partial<SalesConfigPayload> | null;
};

export function SalesSettingsForm({ lojistaId, initialConfig }: SalesSettingsFormProps) {
  const [form, setForm] = useState({
    enabled: initialConfig?.enabled ?? false,
    paymentGateway: initialConfig?.payment_gateway ?? "manual_whatsapp",
    manualContact: initialConfig?.manual_contact ?? "",
    shippingProvider: initialConfig?.shipping_provider ?? "none",
    originZip: initialConfig?.origin_zip ?? "",
    fixedShippingPrice:
      typeof initialConfig?.fixed_shipping_price === "number"
        ? String(initialConfig.fixed_shipping_price)
        : "",
    mpPublicKey: initialConfig?.integrations?.mercadopago_public_key ?? "",
    mpAccessToken: initialConfig?.integrations?.mercadopago_access_token ?? "",
    melhorEnvioToken: initialConfig?.integrations?.melhor_envio_token ?? "",
    melhorEnvioClientId: "", // Sempre começar vazio
    melhorEnvioClientSecret: "", // Sempre começar vazio
  });

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const payload: SalesConfigPayload = {
        enabled: form.enabled,
        payment_gateway: form.paymentGateway as SalesConfigPayload["payment_gateway"],
        shipping_provider: form.shippingProvider as SalesConfigPayload["shipping_provider"],
        origin_zip: form.originZip?.trim() || null,
        manual_contact:
          form.paymentGateway === "manual_whatsapp" ? form.manualContact.trim() || null : null,
        fixed_shipping_price:
          form.shippingProvider === "fixed_price"
            ? Number(form.fixedShippingPrice) || 0
            : null,
        integrations: {
          mercadopago_public_key:
            form.paymentGateway === "mercadopago" ? form.mpPublicKey.trim() || null : null,
          mercadopago_access_token:
            form.paymentGateway === "mercadopago" ? form.mpAccessToken.trim() || null : null,
          melhor_envio_token:
            form.shippingProvider === "melhor_envio" ? form.melhorEnvioToken.trim() || null : null,
          melhor_envio_client_id:
            form.shippingProvider === "melhor_envio" ? form.melhorEnvioClientId.trim() || null : null,
          melhor_envio_client_secret:
            form.shippingProvider === "melhor_envio" ? form.melhorEnvioClientSecret.trim() || null : null,
        },
      };

      const response = await fetch("/api/lojista/sales-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lojistaId, salesConfig: payload }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || "Erro ao salvar configurações de vendas.");
      }

      setFeedback("Configurações de vendas atualizadas com sucesso!");
    } catch (error: any) {
      console.error("[SalesSettingsForm] Erro ao salvar:", error);
      setFeedback(error?.message || "Erro ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="neon-card rounded-2xl p-6 space-y-6"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3 shadow-lg shadow-emerald-500/30 text-white">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-[var(--text-main)] mb-2">Vendas no Aplicativo</h2>
          <p className="text-sm font-medium text-[var(--text-secondary)] leading-relaxed">
            Configure pagamento via Mercado Pago e cálculo de frete.
          </p>
        </div>
      </div>

      <div className="neon-card flex flex-col gap-5 rounded-xl border-2 border-gray-300/30 dark:border-indigo-500/30 bg-[var(--bg-card)]/60 p-5">
        <label className="flex items-center justify-between text-sm font-semibold text-[var(--text-main)]">
          <span>Habilitar carrinho e checkout</span>
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-2 border-gray-300 dark:border-indigo-500/50 bg-[var(--bg-card)]/60 text-indigo-600 focus:ring-2 focus:ring-indigo-500/60 transition-colors cursor-pointer"
            checked={form.enabled}
            onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-[var(--text-main)] mb-2">Gateway de Pagamento</label>
            <select
              value={form.paymentGateway}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  paymentGateway: e.target.value as SalesConfigPayload["payment_gateway"],
                }))
              }
              className="w-full rounded-xl border-2 border-gray-300 dark:border-indigo-500/50 bg-[var(--bg-card)]/60 px-4 py-2.5 text-[var(--text-main)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-colors"
            >
              <option value="mercadopago">Mercado Pago</option>
              <option value="manual_whatsapp">Manual via WhatsApp</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--text-main)] mb-2">Tipo de Frete</label>
            <select
              value={form.shippingProvider}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  shippingProvider: e.target.value as SalesConfigPayload["shipping_provider"],
                }))
              }
              className="w-full rounded-xl border-2 border-gray-300 dark:border-indigo-500/50 bg-[var(--bg-card)]/60 px-4 py-2.5 text-[var(--text-main)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-colors"
            >
              <option value="none">Sem cálculo automático</option>
              <option value="fixed_price">Valor fixo</option>
              <option value="melhor_envio">Melhor Envio (API)</option>
            </select>
          </div>
        </div>
      </div>

      {form.paymentGateway === "manual_whatsapp" && (
        <div className="neon-card rounded-xl border-2 border-gray-300/30 dark:border-green-500/30 bg-[var(--bg-card)]/60 p-5 space-y-3">
          <p className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            Contato via WhatsApp
          </p>
          <input
            type="tel"
            value={form.manualContact}
            onChange={(e) => setForm((prev) => ({ ...prev, manualContact: e.target.value }))}
            placeholder="(11) 99999-0000"
            className="w-full rounded-xl border-2 border-gray-300 dark:border-indigo-500/50 bg-[var(--bg-card)]/60 px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-colors"
          />
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            O botão "Comprar agora" abrirá essa conversa para concluir manualmente.
          </p>
        </div>
      )}

      {form.paymentGateway === "mercadopago" && (
        <div className="neon-card rounded-xl border-2 border-indigo-400/60 dark:border-indigo-500/60 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/30 p-5 space-y-4 shadow-lg shadow-indigo-500/20">
          <p className="text-sm font-bold text-[var(--text-main)]">Credenciais Mercado Pago</p>
          <div className="grid gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-2">Public Key</label>
              <input
                type="text"
                value={form.mpPublicKey}
                onChange={(e) => setForm((prev) => ({ ...prev, mpPublicKey: e.target.value }))}
                placeholder="APP_USR-..."
                className="w-full rounded-xl border-2 border-gray-300 dark:border-indigo-500/50 bg-[var(--bg-card)]/60 px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-colors"
                required={form.enabled}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-2">Access Token</label>
              <input
                type="password"
                value={form.mpAccessToken}
                onChange={(e) => setForm((prev) => ({ ...prev, mpAccessToken: e.target.value }))}
                placeholder="APP_USR-..."
                className="w-full rounded-xl border-2 border-gray-300 dark:border-indigo-500/50 bg-[var(--bg-card)]/60 px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-colors"
                required={form.enabled}
              />
            </div>
          </div>
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Pegue suas credenciais em{" "}
            <a
              href="https://www.mercadopago.com.br/developers/pt/docs"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              developers.mercadopago.com.br → Minhas integrações
            </a>
          </p>
        </div>
      )}

      <div className="neon-card rounded-xl border-2 border-gray-300/30 dark:border-amber-500/30 bg-[var(--bg-card)]/60 p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-main)]">
          <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-2 shadow-lg shadow-amber-500/30 text-white">
            <Truck className="h-4 w-4" />
          </div>
          <span>Frete & Origem</span>
        </div>
        <input
          type="text"
          value={form.originZip}
          onChange={(e) => setForm((prev) => ({ ...prev, originZip: e.target.value }))}
          placeholder="CEP de origem (ex: 01311-200)"
          className="w-full rounded-xl border-2 border-gray-300 dark:border-indigo-500/50 bg-[var(--bg-card)]/60 px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-colors"
        />
        {form.shippingProvider === "fixed_price" && (
          <input
            type="number"
            min="0"
            value={form.fixedShippingPrice}
            onChange={(e) => setForm((prev) => ({ ...prev, fixedShippingPrice: e.target.value }))}
            placeholder="Valor fixo do frete (R$)"
            className="w-full rounded-xl border-2 border-gray-300 dark:border-indigo-500/50 bg-[var(--bg-card)]/60 px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-colors"
          />
        )}
        {form.shippingProvider === "melhor_envio" && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-2">
                  Client ID do Melhor Envio
                </label>
                <input
                  type="text"
                  value={form.melhorEnvioClientId}
                  onChange={(e) => setForm((prev) => ({ ...prev, melhorEnvioClientId: e.target.value }))}
                  placeholder="Digite o Client ID"
                  className="w-full rounded-xl border-2 border-gray-300 dark:border-indigo-500/50 bg-[var(--bg-card)]/60 px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-main)] mb-2">
                  Secret do Melhor Envio
                </label>
                <input
                  type="password"
                  value={form.melhorEnvioClientSecret}
                  onChange={(e) => setForm((prev) => ({ ...prev, melhorEnvioClientSecret: e.target.value }))}
                  placeholder="Digite o Secret"
                  className="w-full rounded-xl border-2 border-gray-300 dark:border-indigo-500/50 bg-[var(--bg-card)]/60 px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-colors"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                type="button"
                disabled={!form.melhorEnvioClientId?.trim() || !form.melhorEnvioClientSecret?.trim()}
                onClick={async () => {
                  if (!form.melhorEnvioClientId?.trim() || !form.melhorEnvioClientSecret?.trim()) {
                    alert("Por favor, preencha o Client ID e Secret antes de autorizar.")
                    return
                  }
                    // Primeiro salvar as credenciais
                    try {
                      const payload = {
                        enabled: form.enabled,
                        payment_gateway: form.paymentGateway as SalesConfigPayload["payment_gateway"],
                        shipping_provider: form.shippingProvider as SalesConfigPayload["shipping_provider"],
                        origin_zip: form.originZip?.trim() || null,
                        integrations: {
                          melhor_envio_client_id: form.melhorEnvioClientId.trim() || null,
                          melhor_envio_client_secret: form.melhorEnvioClientSecret.trim() || null,
                        },
                      };

                      await fetch("/api/lojista/sales-config", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ lojistaId, salesConfig: payload }),
                      });
                    } catch (error) {
                      console.error("Erro ao salvar credenciais:", error);
                    }

                    // Redirecionar para autorização OAuth no app cliente
                    // Usar URL fixa do app cliente em produção
                    const authUrl = `https://app2.experimenteai.com.br/api/melhor-envio/auth?lojistaId=${lojistaId}`;
                    window.open(authUrl, "_blank", "noopener,noreferrer");
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🔐 Autorizar e Obter Token
                </Button>
              </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-2">
                Token da API Melhor Envio
                {form.melhorEnvioToken && (
                  <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400 font-normal">
                    ✓ Token configurado
                  </span>
                )}
              </label>
              <input
                type="password"
                value={form.melhorEnvioToken}
                onChange={(e) => setForm((prev) => ({ ...prev, melhorEnvioToken: e.target.value }))}
                placeholder={form.melhorEnvioToken ? "Token configurado (oculto)" : "Token será obtido automaticamente após autorização"}
                disabled={!!form.melhorEnvioToken}
                className="w-full rounded-xl border-2 border-gray-300 dark:border-indigo-500/50 bg-[var(--bg-card)]/60 px-4 py-2.5 text-[var(--text-main)] placeholder:text-[var(--text-secondary)] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="mt-2 text-xs font-medium text-[var(--text-secondary)]">
                {form.melhorEnvioToken 
                  ? "Token obtido via OAuth. Clique em 'Autorizar e Obter Token' para renovar."
                  : "Preencha Client ID e Secret acima, depois clique em 'Autorizar e Obter Token' para obter o token automaticamente via OAuth."}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Button
          type="submit"
          disabled={isSaving}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar configurações de vendas"
          )}
        </Button>
        {feedback && (
          <p className={`text-center text-sm font-semibold ${
            feedback.includes("sucesso") 
              ? "text-emerald-600 dark:text-emerald-400" 
              : "text-rose-600 dark:text-rose-400"
          }`}>
            {feedback}
          </p>
        )}
      </div>
    </form>
  );
}



