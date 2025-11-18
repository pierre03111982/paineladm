"use client";

import { useState, useRef, useEffect } from "react";
import { PageHeader } from "../../(lojista)/components/page-header";
import Image from "next/image";
import {
  Settings,
  Key,
  Mail,
  Database,
  Shield,
  Save,
  CheckCircle2,
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";

type AdminConfig = {
  logoUrl?: string | null;
  nome?: string | null;
  marca?: string | null; // "EXPERIMENTE AI"
  emailSuporte?: string | null;
  emailNotificacoes?: string | null;
};

export function AdminConfiguracoesContent() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [config, setConfig] = useState<AdminConfig>({
    nome: "Painel Administrativo",
    marca: "EXPERIMENTE AI",
    emailSuporte: "suporte@experimente.ai",
    emailNotificacoes: "notificacoes@experimente.ai",
  });

  // Carregar configurações ao montar
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("/api/admin/config");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.config) {
            setConfig(data.config);
            if (data.config.logoUrl) {
              setLogoPreview(data.config.logoUrl);
            }
          }
        }
      } catch (error) {
        console.error("[AdminConfig] Erro ao carregar:", error);
      }
    };
    loadConfig();
  }, []);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione uma imagem válida");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 5MB");
      return;
    }

    setIsUploadingLogo(true);

    try {
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);

      const uploadFormData = new FormData();
      uploadFormData.append("logo", file);

      const response = await fetch("/api/admin/config/upload-logo", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error("Erro ao fazer upload do logo");
      }

      const data = await response.json();
      if (data.logoUrl) {
        URL.revokeObjectURL(previewUrl);
        setLogoPreview(data.logoUrl);
        setConfig((prev) => ({ ...prev, logoUrl: data.logoUrl }));
      }
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      alert("Erro ao fazer upload do logo. Tente novamente.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setConfig((prev) => ({ ...prev, logoUrl: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    
    try {
      const response = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: config.nome,
          marca: config.marca,
          logoUrl: logoPreview,
          emailSuporte: config.emailSuporte,
          emailNotificacoes: config.emailNotificacoes,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar configurações");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      
      // Recarregar a página para atualizar o layout
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar configurações. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações Administrativas"
        description="Gerencie as configurações gerais da plataforma"
      />

      {/* Configurações de Identidade */}
      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">
            Identidade do Painel
          </h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Nome da Marca
            </label>
            <input
              type="text"
              value={config.marca || ""}
              onChange={(e) => setConfig({ ...config, marca: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="EXPERIMENTE AI"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Este texto aparece acima do nome do painel no sidebar
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Logo do Painel
            </label>
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <div className="relative">
                    <div className="relative h-24 w-24 rounded-xl overflow-hidden border border-zinc-800/60">
                      <Image
                        src={logoPreview}
                        alt="Logo do painel"
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
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
                <p className="text-sm text-zinc-400">
                  O logo aparece no sidebar e no header do painel administrativo. Use uma imagem quadrada (recomendado: 512x512px).
                </p>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="admin-logo-upload"
                  />
                  <label
                    htmlFor="admin-logo-upload"
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
        </div>
      </div>

      {/* Configurações de Ambiente */}
      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Key className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">
            Variáveis de Ambiente
          </h2>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
            <p className="text-sm text-zinc-400 mb-2">
              As variáveis de ambiente são configuradas diretamente na Vercel.
            </p>
            <p className="text-xs text-zinc-500">
              Acesse: Vercel Dashboard → Projeto → Settings → Environment Variables
            </p>
          </div>
        </div>
      </div>

      {/* Configurações de Email */}
      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">
            Configurações de Email
          </h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Email de Suporte
            </label>
            <input
              type="email"
              value={config.emailSuporte || ""}
              onChange={(e) => setConfig({ ...config, emailSuporte: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="suporte@experimente.ai"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Email de Notificações
            </label>
            <input
              type="email"
              value={config.emailNotificacoes || ""}
              onChange={(e) => setConfig({ ...config, emailNotificacoes: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="notificacoes@experimente.ai"
            />
          </div>
        </div>
      </div>

      {/* Configurações de Banco de Dados */}
      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Database className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">
            Configurações de Banco de Dados
          </h2>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
            <p className="text-sm text-zinc-400 mb-2">
              Firebase Firestore está configurado e funcionando.
            </p>
            <p className="text-xs text-zinc-500">
              Coleções: lojas, produtos, composicoes, clientes, planos
            </p>
          </div>
        </div>
      </div>

      {/* Configurações de Segurança */}
      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">
            Configurações de Segurança
          </h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
            <div>
              <p className="text-sm font-medium text-zinc-300">
                Autenticação de Admin
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Apenas emails configurados em ADMIN_EMAILS podem acessar
              </p>
            </div>
            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
          </div>
          <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
            <div>
              <p className="text-sm font-medium text-zinc-300">
                Middleware de Proteção
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Rotas /admin/* protegidas por middleware
              </p>
            </div>
            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
          </div>
        </div>
      </div>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl border border-purple-400/50 bg-purple-500/10 px-6 py-3 text-sm font-semibold text-purple-200 transition hover:border-purple-300/60 hover:bg-purple-500/20 disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
              Salvando...
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Salvo!
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Configurações
            </>
          )}
        </button>
      </div>
    </div>
  );
}




