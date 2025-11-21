"use client";

import { useState, useEffect } from "react";
import { Smartphone, Check, ExternalLink, Wifi, Battery, Signal, Save, ChevronLeft, ChevronRight } from "lucide-react";

type ModeloAppSelectorProps = {
  modeloAtual: "1" | "2" | "3" | null;
  lojistaId: string;
  onModeloChange: (modelo: "1" | "2" | "3") => void;
};

const MODELOS = [
  {
    id: "1" as const,
    nome: "Modelo 1",
    descricao: "Design minimalista e elegante. Foco total no produto.",
    disponivel: true,
  },
  {
    id: "2" as const,
    nome: "Modelo 2",
    descricao: "Interface moderna e vibrante. Experiência imersiva.",
    disponivel: true,
  },
  {
    id: "3" as const,
    nome: "Modelo 3",
    descricao: "Layout Premium High-End. Para marcas exclusivas.",
    disponivel: true,
  },
];

export function ModeloAppSelector({ modeloAtual, lojistaId, onModeloChange }: ModeloAppSelectorProps) {
  const [modeloSelecionado, setModeloSelecionado] = useState<"1" | "2" | "3">(modeloAtual || "1");
  const [previewModelo, setPreviewModelo] = useState<"1" | "2" | "3">(modeloAtual || "1");
  const [previewScreen, setPreviewScreen] = useState<1 | 2 | 3>(1); // Estado da tela de preview (1, 2, 3)

  const handleModeloSelect = (modelo: "1" | "2" | "3") => {
    setModeloSelecionado(modelo);
    setPreviewModelo(modelo);
    onModeloChange(modelo);
    setPreviewScreen(1); // Reseta para tela 1 ao trocar modelo
  };

  // Navegação entre telas do preview
  const handlePrevScreen = (e: React.MouseEvent) => {
    e.preventDefault();
    setPreviewScreen(prev => prev > 1 ? (prev - 1) as 1 | 2 | 3 : 3);
  };

  const handleNextScreen = (e: React.MouseEvent) => {
    e.preventDefault();
    setPreviewScreen(prev => prev < 3 ? (prev + 1) as 1 | 2 | 3 : 1);
  };

  // Construir URL de preview baseada no modelo e tela
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    const portMap: Record<"1" | "2" | "3", string> = {
      "1": process.env.NEXT_PUBLIC_MODELO_1_PORT || "3004",
      "2": process.env.NEXT_PUBLIC_MODELO_2_PORT || "3005",
      "3": process.env.NEXT_PUBLIC_MODELO_3_PORT || "3010",
    };

    const modeloUrls: Record<"1" | "2" | "3", string> = {
      "1": process.env.NEXT_PUBLIC_MODELO_1_URL || "https://app.experimenteai.com.br",
      "2": process.env.NEXT_PUBLIC_MODELO_2_URL || "https://app2.experimenteai.com.br",
      "3": process.env.NEXT_PUBLIC_MODELO_3_URL || "https://app3.experimenteai.com.br",
    };

    let url = "";
    const baseUrl = (typeof window !== "undefined" && window.location.hostname === "localhost")
      ? `http://localhost:${portMap[previewModelo]}`
      : modeloUrls[previewModelo];

    // Apontar para a rota /demo com o parâmetro de tela
    url = `${baseUrl}/demo?tela=${previewScreen}`;

    setPreviewUrl(url);
  }, [previewModelo, lojistaId, previewScreen]);


  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Modelo do App Cliente</h3>
        <p className="text-sm text-zinc-400">
          Escolha qual layout do aplicativo cliente será usado para sua loja.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr,auto] gap-8 items-start relative">
        
        {/* Coluna Esquerda: Lista de Modelos */}
        <div className="space-y-4 flex-1">
          {MODELOS.map((modelo) => {
            const isSelected = modeloSelecionado === modelo.id;

            return (
              <div
                key={modelo.id}
                onClick={() => handleModeloSelect(modelo.id)}
                className={`
                  relative flex items-start gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all
                  ${
                    isSelected
                      ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20"
                      : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-900/80"
                  }
                `}
              >
                {/* Radio Circle */}
                <div
                  className={`
                    flex h-6 w-6 items-center justify-center rounded-full border-2 mt-0.5 flex-shrink-0 transition-colors
                    ${
                      isSelected
                        ? "border-purple-500 bg-purple-500"
                        : "border-zinc-600 bg-transparent"
                    }
                  `}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className={`text-base font-semibold ${isSelected ? "text-white" : "text-zinc-300"}`}>
                      {modelo.nome}
                    </h4>
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <span className="text-xs font-medium text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                          Ativo
                        </span>
                      )}
                      {isSelected && (
                        <button
                          type="submit"
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg shadow-lg font-semibold text-xs transition-transform active:scale-95"
                        >
                          <Save className="h-3 w-3" />
                          Salvar
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                    {modelo.descricao}
                  </p>
                </div>
              </div>
            );
          })}

          <div className="mt-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
             <p className="text-xs text-yellow-200/90 leading-relaxed">
               <strong>Dica:</strong> Ao trocar o modelo aqui, os novos clientes receberão o link atualizado. 
               Clientes antigos que já têm o link continuarão acessando o modelo anterior até receberem um novo link.
             </p>
          </div>
        </div>

        {/* Coluna Direita: Preview do Celular Android 6.67" */}
        <div className="flex flex-col items-center relative">
          <h4 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2 uppercase tracking-wider text-[10px]">
            <Smartphone className="h-3 w-3" />
            Android Preview (6.67")
          </h4>
          
          {/* Frame de Celular Android */}
          <div className="relative w-[340px] h-[720px] bg-zinc-950 rounded-[2.5rem] shadow-2xl border-[6px] border-zinc-800 ring-1 ring-white/10 flex flex-col overflow-hidden group">
            
            {/* Botões Laterais (Volume/Power) */}
            <div className="absolute -right-[8px] top-24 h-12 w-[4px] bg-zinc-700 rounded-r-md"></div>
            <div className="absolute -right-[8px] top-40 h-20 w-[4px] bg-zinc-700 rounded-r-md"></div>

            {/* Status Bar Android */}
            <div className="h-8 bg-black w-full flex items-center justify-between px-6 text-white z-20 select-none shrink-0">
                <span className="text-xs font-medium tracking-wide">12:30</span>
                <div className="flex items-center gap-1.5">
                    <Signal className="h-3 w-3" />
                    <Wifi className="h-3 w-3" />
                    <Battery className="h-3 w-3" />
                </div>
            </div>

            {/* Câmera "Punch Hole" */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-black rounded-full z-30 border border-zinc-800/50"></div>
            
            {/* Setas de Navegação Sobrepostas */}
            <button 
                onClick={handlePrevScreen}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm border border-white/10 transition-all hover:scale-110"
            >
                <ChevronLeft className="h-6 w-6" />
            </button>
            
            <button 
                onClick={handleNextScreen}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm border border-white/10 transition-all hover:scale-110"
            >
                <ChevronRight className="h-6 w-6" />
            </button>

            {/* Tela (Iframe) */}
            <div className="flex-1 w-full relative bg-zinc-900 overflow-hidden">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title={`Preview Modelo ${previewModelo}`}
                  sandbox="allow-same-origin allow-scripts allow-forms"
                  style={{ 
                    width: "100%",
                    height: "100%",
                    backgroundColor: "#000"
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-500 text-xs">
                  Carregando preview...
                </div>
              )}
              
              {/* Indicador de Tela (Dots) */}
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                {[1, 2, 3].map((i) => (
                    <div 
                        key={i} 
                        className={`h-2 w-2 rounded-full transition-all ${previewScreen === i ? "bg-white w-4" : "bg-white/30"}`}
                    />
                ))}
              </div>

              {/* Botão Flutuante para abrir em nova aba */}
              <a 
                href={previewUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="absolute top-4 right-4 z-30 bg-zinc-900/90 p-1.5 rounded-full text-white hover:bg-purple-600 transition-colors backdrop-blur-md border border-white/10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                title="Abrir em nova aba"
              >
                <ExternalLink className="h-3 w-3" />
              </a>

            </div>

            {/* Android Navigation Bar */}
            <div className="h-5 bg-black w-full flex items-center justify-center shrink-0 z-20">
                <div className="w-32 h-1 bg-zinc-600 rounded-full"></div>
            </div>
          </div>
          
          <p className="mt-4 text-[10px] text-zinc-500 text-center max-w-[250px] uppercase tracking-widest">
            Visualização simulada
          </p>
        </div>

      </div>
    </div>
  );
}
