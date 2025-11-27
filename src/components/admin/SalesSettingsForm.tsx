"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, Truck } from "lucide-react";
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
      className="rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-6 space-y-6"
    >
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-emerald-300" />
        <div>
          <h2 className="text-lg font-semibold text-white">Vendas no Aplicativo</h2>
          <p className="text-sm text-zinc-400">
            Configure pagamento via Mercado Pago e cálculo de frete.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
        <label className="flex items-center justify-between text-sm text-white">
          <span>Habilitar carrinho e checkout</span>
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-zinc-700 bg-zinc-800 text-indigo-500"
            checked={form.enabled}
            onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Gateway de Pagamento</label>
            <select
              value={form.paymentGateway}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  paymentGateway: e.target.value as SalesConfigPayload["payment_gateway"],
                }))
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="mercadopago">Mercado Pago</option>
              <option value="manual_whatsapp">Manual via WhatsApp</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-zinc-300 mb-1">Tipo de Frete</label>
            <select
              value={form.shippingProvider}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  shippingProvider: e.target.value as SalesConfigPayload["shipping_provider"],
                }))
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="none">Sem cálculo automático</option>
              <option value="fixed_price">Valor fixo</option>
              <option value="melhor_envio">Melhor Envio (API)</option>
            </select>
          </div>
        </div>
      </div>

      {form.paymentGateway === "manual_whatsapp" && (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 space-y-3">
          <p className="text-sm font-semibold text-white">Contato via WhatsApp</p>
          <input
            type="tel"
            value={form.manualContact}
            onChange={(e) => setForm((prev) => ({ ...prev, manualContact: e.target.value }))}
            placeholder="(11) 99999-0000"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
          <p className="text-xs text-zinc-400">
            O botão “Comprar agora” abrirá essa conversa para concluir manualmente.
          </p>
        </div>
      )}

      {form.paymentGateway === "mercadopago" && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-white">Credenciais Mercado Pago</p>
          <div className="grid gap-3">
            <div>
              <label className="block text-xs text-indigo-200 mb-1">Public Key</label>
              <input
                type="text"
                value={form.mpPublicKey}
                onChange={(e) => setForm((prev) => ({ ...prev, mpPublicKey: e.target.value }))}
                placeholder="APP_USR-..."
                className="w-full rounded-lg border border-indigo-500/30 bg-zinc-900/60 px-4 py-2 text-white placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none"
                required={form.enabled}
              />
            </div>
            <div>
              <label className="block text-xs text-indigo-200 mb-1">Access Token</label>
              <input
                type="password"
                value={form.mpAccessToken}
                onChange={(e) => setForm((prev) => ({ ...prev, mpAccessToken: e.target.value }))}
                placeholder="APP_USR-..."
                className="w-full rounded-lg border border-indigo-500/30 bg-zinc-900/60 px-4 py-2 text-white placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none"
                required={form.enabled}
              />
            </div>
          </div>
          <p className="text-xs text-indigo-200">
            Pegue suas credenciais em{" "}
            <a
              href="https://www.mercadopago.com.br/developers/pt/docs"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              developers.mercadopago.com.br → Minhas integrações
            </a>
          </p>
        </div>
      )}

      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-white">
          <Truck className="h-4 w-4 text-amber-300" />
          <span>Frete & Origem</span>
        </div>
        <input
          type="text"
          value={form.originZip}
          onChange={(e) => setForm((prev) => ({ ...prev, originZip: e.target.value }))}
          placeholder="CEP de origem (ex: 01311-200)"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none"
        />
        {form.shippingProvider === "fixed_price" && (
          <input
            type="number"
            min="0"
            value={form.fixedShippingPrice}
            onChange={(e) => setForm((prev) => ({ ...prev, fixedShippingPrice: e.target.value }))}
            placeholder="Valor fixo do frete (R$)"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        )}
        {form.shippingProvider === "melhor_envio" && (
          <input
            type="password"
            value={form.melhorEnvioToken}
            onChange={(e) => setForm((prev) => ({ ...prev, melhorEnvioToken: e.target.value }))}
            placeholder="Token da API Melhor Envio"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="submit"
          disabled={isSaving}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar configurações de vendas"
          )}
        </Button>
        {feedback && <p className="text-center text-xs text-indigo-100">{feedback}</p>}
      </div>
    </form>
  );
}

