"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, Instagram, MessageCircle, ShoppingCart, Loader2, Facebook } from "lucide-react";

type LojaPerfil = {
  nome?: string | null;
  logoUrl?: string | null;
  descricao?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  checkoutLink?: string | null;
  descontoRedesSociais?: number | null;
   descontoRedesSociaisExpiraEm?: string | null;
  salesConfig?: {
    channel?: string;
    salesWhatsapp?: string | null;
    checkoutLink?: string | null;
  } | null;
};

type ConfiguracoesFormProps = {
  lojistaId: string;
  perfil: LojaPerfil | null;
};

export function ConfiguracoesForm({ lojistaId, perfil }: ConfiguracoesFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(perfil?.logoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Formatação: nome em caixa alta
  const handleNomeChange = (value: string) => {
    const formatted = value.toUpperCase();
    setFormData((prev) => ({ ...prev, nome: formatted }));
  };

  // Formatação de WhatsApp para vendas: (DDD) 99999-9999
  const formatSalesWhatsapp = (value: string): string => {
    const numbers = value.replace(/\D/g, "");
    const limited = numbers.slice(0, 11);

    if (limited.length === 0) return "";
    if (limited.length <= 2) return `(${limited}`;
    if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7, 11)}`;
  };

  const handleSalesWhatsappChange = (value: string) => {
    const formatted = formatSalesWhatsapp(value);
    setFormData((prev) => ({ ...prev, salesWhatsapp: formatted }));
  };

  const handleClearDiscount = async () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Tem certeza que deseja limpar o desconto? O aviso de desconto deixará de aparecer para todos os clientes."
      );
      if (!confirmed) return;
    }

    setIsLoading(true);
    try {
      const payload: any = {
        lojistaId,
        descontoRedesSociais: null,
        descontoRedesSociaisExpiraEm: null,
      };

      console.log("[SettingsForm] Limpando desconto:", JSON.stringify(payload, null, 2));

      const response = await fetch("/api/lojista/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[SettingsForm] Erro ao limpar desconto:", response.status, errorData);
        throw new Error(errorData.error || "Erro ao limpar desconto");
      }

      setFormData((prev) => ({
        ...prev,
        descontoRedesSociais: 0,
        descontoRedesSociaisExpiraEm: "",
      }));

      alert("Desconto limpo com sucesso para todos os clientes.");

      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error) {
      console.error("[SettingsForm] Erro ao limpar desconto:", error);
      alert(
        `Erro ao limpar desconto: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Inicializar formData com os dados do perfil
  const [formData, setFormData] = useState(() => {
    console.log("[SettingsForm] Inicializando formData com perfil:", perfil);
    return {
      nome: perfil?.nome || "",
      descricao: perfil?.descricao || "",
      instagram: perfil?.instagram || "",
      facebook: perfil?.facebook || "",
      tiktok: perfil?.tiktok || "",
      descontoRedesSociais: perfil?.descontoRedesSociais || 0,
      descontoRedesSociaisExpiraEm: perfil?.descontoRedesSociaisExpiraEm || "",
      salesChannel: (perfil?.salesConfig?.channel as "checkout" | "whatsapp") || "whatsapp",
      salesWhatsapp: perfil?.salesConfig?.salesWhatsapp || perfil?.whatsapp || "",
      checkoutLink: perfil?.salesConfig?.checkoutLink || perfil?.checkoutLink || "",
    };
  });

  // Atualizar formData quando perfil mudar (após recarregar)
  useEffect(() => {
    if (perfil) {
      console.log("[SettingsForm] Perfil atualizado, sincronizando formData:", perfil);
      setFormData({
        nome: perfil.nome || "",
        descricao: perfil.descricao || "",
        instagram: perfil.instagram || "",
        facebook: perfil.facebook || "",
        tiktok: perfil.tiktok || "",
        descontoRedesSociais: perfil.descontoRedesSociais || 0,
        descontoRedesSociaisExpiraEm: perfil.descontoRedesSociaisExpiraEm || "",
        salesChannel: (perfil.salesConfig?.channel as "checkout" | "whatsapp") || "whatsapp",
        salesWhatsapp: perfil.salesConfig?.salesWhatsapp || perfil.whatsapp || "",
        checkoutLink: perfil.salesConfig?.checkoutLink || perfil.checkoutLink || "",
      });
      if (perfil.logoUrl) {
        setLogoPreview(perfil.logoUrl);
      }
    }
  }, [perfil]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione uma imagem válida");
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 5MB");
      return;
    }

    setIsUploadingLogo(true);

    try {
      // Criar preview temporário
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);

      // Upload para o servidor
      const uploadFormData = new FormData();
      uploadFormData.append("logo", file);
      uploadFormData.append("lojistaId", lojistaId);

      console.log("[SettingsForm] Fazendo upload do logo...");

      const response = await fetch("/api/lojista/perfil/upload-logo", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[SettingsForm] Erro no upload:", response.status, errorData);
        throw new Error(errorData.error || "Erro ao fazer upload do logo");
      }

      const data = await response.json();
      console.log("[SettingsForm] Logo upload response:", data);
      
      if (data.logoUrl) {
        // Limpar preview temporário
        URL.revokeObjectURL(previewUrl);
        // Atualizar com URL real do Firebase Storage
        setLogoPreview(data.logoUrl);
        console.log("[SettingsForm] Logo preview atualizado para:", data.logoUrl);
      } else {
        throw new Error("Logo URL não retornada pela API");
      }
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      alert("Erro ao fazer upload do logo. Tente novamente.");
      setLogoPreview(perfil?.logoUrl || null);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Preparar payload - garantir que logoUrl e salesConfig sejam sempre enviados
      const payload: any = {
        lojistaId,
        nome: formData.nome || "",
        descricao: formData.descricao || "",
        instagram: formData.instagram || "",
        facebook: formData.facebook || "",
        tiktok: formData.tiktok || "",
        descontoRedesSociais: formData.descontoRedesSociais || null,
        descontoRedesSociaisExpiraEm: formData.descontoRedesSociaisExpiraEm || null,
      };

      // LogoUrl - sempre incluir (pode ser null se não houver logo)
      payload.logoUrl = logoPreview || null;

      // SalesConfig - sempre incluir
      payload.salesConfig = {
        channel: formData.salesChannel || "whatsapp",
        salesWhatsapp: formData.salesChannel === "whatsapp" ? (formData.salesWhatsapp || null) : null,
        checkoutLink: formData.salesChannel === "checkout" ? (formData.checkoutLink || null) : null,
      };

      console.log("[SettingsForm] Enviando dados para salvar:", JSON.stringify(payload, null, 2));

      const response = await fetch("/api/lojista/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[SettingsForm] Erro na resposta:", response.status, errorData);
        throw new Error(errorData.error || "Erro ao salvar configurações");
      }

      const result = await response.json();
      console.log("[SettingsForm] Resposta do servidor:", result);

      // Atualizar o estado local com os dados salvos
      setFormData({
        ...formData,
        // Manter os dados atuais (já estão corretos)
      });
      
      // O logoPreview já está atualizado após o upload
      // Não precisa atualizar aqui

      alert("Configurações salvas com sucesso!");
      
      // Aguardar um pouco para garantir que o Firestore foi atualizado
      // e então recarregar a página para mostrar os dados atualizados
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("[SettingsForm] Erro ao salvar:", error);
      alert(`Erro ao salvar configurações: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Logo da Loja */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-6">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            {logoPreview ? (
              <div className="relative">
                <img
                  src={logoPreview}
                  alt="Logo da loja"
                  className="h-24 w-24 rounded-xl object-cover border border-zinc-800/60"
                />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50">
                <ImageIcon className="h-8 w-8 text-zinc-500" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-lg font-semibold text-white">Logo da Loja</h3>
            <p className="text-sm text-zinc-400">
              O logo aparece no provador virtual e no simulador. Use uma imagem quadrada (recomendado: 512x512px).
            </p>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
              >
                {isUploadingLogo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {logoPreview ? "Trocar logo" : "Enviar logo"}
                  </>
                )}
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Informações Básicas */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Informações Básicas</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Nome da Loja *
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => handleNomeChange(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-colors"
              placeholder="Ex: Pierre Loja"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.descricao}
              onChange={(e) =>
                setFormData({ ...formData, descricao: e.target.value })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-colors resize-none"
              rows={3}
              placeholder="Descreva sua loja em poucas palavras..."
            />
          </div>
        </div>
      </div>

      {/* Redes Sociais e Desconto */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Redes Sociais e Desconto</h3>
        <p className="mb-4 text-sm text-zinc-400">
          Configure suas redes sociais e defina um desconto para clientes que seguirem sua loja.
        </p>
        
        <div className="mb-6 rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Desconto por Seguir Redes Sociais (%)
          </label>
          <div className="space-y-3">
            <div>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.descontoRedesSociais}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    descontoRedesSociais: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-colors"
                placeholder="Ex: 10 (para 10% de desconto)"
              />
              <p className="mt-1 text-xs text-zinc-500">
                O desconto será aplicado automaticamente em todos os produtos quando o cliente seguir qualquer uma das suas redes sociais.
              </p>
            </div>
            
            <div className="pt-1">
            <button
              type="button"
              onClick={handleClearDiscount}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-300 shadow-sm shadow-red-500/30 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              Excluir descontos
            </button>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Data de expiração do desconto (opcional)
            </label>
            <input
              type="date"
              value={formData.descontoRedesSociaisExpiraEm || ""}
              onChange={(e) =>
                setFormData({ ...formData, descontoRedesSociaisExpiraEm: e.target.value })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-colors"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Após essa data o aviso de desconto deixará de aparecer automaticamente no Passo 2.
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
              <Instagram className="h-4 w-4" />
              Instagram
            </label>
            <input
              type="text"
              value={formData.instagram}
              onChange={(e) =>
                setFormData({ ...formData, instagram: e.target.value })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-colors"
              placeholder="@sualoja ou https://instagram.com/sualoja"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
              <Facebook className="h-4 w-4" />
              Facebook
            </label>
            <input
              type="text"
              value={formData.facebook}
              onChange={(e) =>
                setFormData({ ...formData, facebook: e.target.value })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-colors"
              placeholder="@sualoja ou https://facebook.com/sualoja"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
              <MessageCircle className="h-4 w-4" />
              TikTok
            </label>
            <input
              type="text"
              value={formData.tiktok}
              onChange={(e) =>
                setFormData({ ...formData, tiktok: e.target.value })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-colors"
              placeholder="@sualoja ou https://tiktok.com/@sualoja"
            />
          </div>
        </div>
      </div>

      {/* Configurações de Venda */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Configurações de Venda</h3>
        <p className="mb-4 text-sm text-zinc-400">
          Defina como os clientes vão comprar os produtos no provador virtual.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Canal de Venda
            </label>
            <select
              value={formData.salesChannel}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  salesChannel: e.target.value as "checkout" | "whatsapp",
                })
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-colors"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="checkout">Link de Checkout/E-commerce</option>
            </select>
          </div>

          {formData.salesChannel === "whatsapp" && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                <MessageCircle className="h-4 w-4" />
                WhatsApp para Vendas *
              </label>
              <input
                type="text"
                value={formData.salesWhatsapp}
                onChange={(e) => handleSalesWhatsappChange(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-colors"
                placeholder="(11) 99999-9999"
                required={formData.salesChannel === "whatsapp"}
              />
              <p className="mt-1 text-xs text-zinc-500">
                Número usado no botão "Comprar agora" do provador virtual
              </p>
            </div>
          )}

          {formData.salesChannel === "checkout" && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                <ShoppingCart className="h-4 w-4" />
                Link de Checkout/E-commerce *
              </label>
              <input
                type="url"
                value={formData.checkoutLink}
                onChange={(e) =>
                  setFormData({ ...formData, checkoutLink: e.target.value })
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-colors"
                placeholder="https://sualoja.com/produto ou https://checkout.sualoja.com"
                required={formData.salesChannel === "checkout"}
              />
              <p className="mt-1 text-xs text-zinc-500">
                Link usado no botão "Comprar agora" do provador virtual
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Botão Salvar */}
      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold px-6 py-2.5 rounded-lg transition-all shadow-lg shadow-purple-500/20"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Configurações"
          )}
        </Button>
      </div>
    </form>
  );
}

