"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Minimize2, Maximize2, Zap } from "lucide-react";
import { ChatInterface } from "./ChatInterface";
import { AIIcon } from "../ui/AIIcon";

type ChatButtonProps = {
  lojistaId: string;
};

type Position = {
  x: number;
  y: number;
};

/**
 * Botão flutuante para abrir o chat com Ana
 * Com funcionalidades de drag and drop, minimizar e ícone melhorado
 */
export function ChatButton({ lojistaId }: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Calcular posição inicial (centro da tela)
  useEffect(() => {
    if (isOpen && !isMinimized) {
      const centerX = (window.innerWidth - 640) / 2; // max-w-2xl = 640px
      const centerY = (window.innerHeight - 600) / 2;
      setPosition({ x: centerX, y: centerY });
    }
  }, [isOpen, isMinimized]);

  // Handlers para drag and drop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!headerRef.current?.contains(e.target as Node)) return;
    if ((e.target as HTMLElement).closest('button')) return; // Não arrastar se clicar em botões
    
    setIsDragging(true);
    const rect = chatWindowRef.current?.getBoundingClientRect();
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || isMinimized) return;

      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Limitar dentro da viewport
      const maxX = window.innerWidth - (chatWindowRef.current?.offsetWidth || 640);
      const maxY = window.innerHeight - (chatWindowRef.current?.offsetHeight || 600);

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, dragStart, isMinimized]);

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  return (
    <>
      {/* Botão de Chat - Simples e Limpo */}
      {(!isOpen || isMinimized) && (
        <div className="fixed bottom-6 right-6 z-50">
          {/* Ondas de Pulso */}
          <div className="absolute inset-0 -m-3">
            <div className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping" style={{ animationDuration: '2s' }}></div>
          </div>

          {/* Botão Principal */}
          <button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            className="relative h-16 w-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-2xl hover:shadow-cyan-500/50 transition-all hover:scale-105 flex items-center justify-center group"
            title="Chat com Ana - Assistente IA"
          >
            {/* Ícone de Chat com IA */}
            <div className="relative flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-white" strokeWidth={2.5} />
              
              {/* Badge "IA" no canto */}
              <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-white rounded-full flex items-center justify-center shadow-lg">
                <span className="text-cyan-600 text-[10px] font-black">IA</span>
              </div>
            </div>
            
            {/* Badge quando minimizado */}
            {isMinimized && (
              <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse shadow-lg">
                !
              </div>
            )}
          </button>
        </div>
      )}

      {/* Janela do Chat */}
      {isOpen && (
        <div
          ref={chatWindowRef}
          className={`fixed z-50 transition-all duration-300 ${
            isMinimized
              ? 'bottom-6 right-6 w-80 h-20'
              : 'w-full max-w-2xl h-[600px]'
          }`}
          style={
            !isMinimized
              ? {
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  cursor: isDragging ? 'grabbing' : 'default',
                }
              : {}
          }
        >
          {isMinimized ? (
            // Estado Minimizado - Barra com Gradiente Animado
            <div className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 animate-gradient-flow rounded-xl shadow-xl flex items-center justify-between p-3 cursor-pointer hover:shadow-2xl transition-all relative overflow-hidden">
              {/* Overlay suave */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10"></div>
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-lg ring-2 ring-white/30">
                  <MessageCircle className="h-6 w-6 text-cyan-600" strokeWidth={2.5} />
                </div>
                <div className="text-white">
                  <p className="font-bold text-sm drop-shadow">Ana - Assistente IA</p>
                  <p className="text-xs opacity-95 drop-shadow">Online • Pronta para ajudar</p>
                </div>
              </div>
              <div className="flex items-center gap-1 relative z-10">
                <button
                  onClick={handleToggleMinimize}
                  className="p-2 rounded-lg hover:bg-white/20 transition-colors backdrop-blur-sm"
                  title="Expandir"
                >
                  <Maximize2 className="h-4 w-4 text-white drop-shadow" />
                </button>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-white/20 transition-colors backdrop-blur-sm"
                  title="Fechar"
                >
                  <X className="h-4 w-4 text-white drop-shadow" />
                </button>
              </div>
            </div>
          ) : (
            // Estado Expandido - Chat Completo
            <div className="h-full bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
              {/* Header com área de arrasto e gradiente animado */}
              <div
                ref={headerRef}
                onMouseDown={handleMouseDown}
                className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 relative overflow-hidden ${
                  isDragging ? 'cursor-grabbing' : 'cursor-move'
                }`}
              >
                {/* Fundo com Gradiente Animado */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 animate-gradient-flow opacity-100 dark:opacity-90"></div>
                
                {/* Camada de Overlay para suavizar */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/20 dark:to-black/20"></div>
                
                <div className="flex items-center gap-3 relative z-10">
                  {/* Ícone com Borda Branca */}
                  <div className="h-11 w-11 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center shadow-lg ring-2 ring-white/50">
                    <MessageCircle className="h-6 w-6 text-cyan-600 dark:text-cyan-400" strokeWidth={2.5} />
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-bold text-white drop-shadow-lg flex items-center gap-2">
                      Ana - Assistente Inteligente
                      <span className="inline-flex h-2 w-2 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50"></span>
                    </h3>
                    <p className="text-xs text-white/90 font-medium drop-shadow">
                      Consultoria de Vendas & Onboarding
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 relative z-10">
                  <button
                    onClick={handleToggleMinimize}
                    className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-black/20 transition-colors backdrop-blur-sm"
                    title="Minimizar"
                  >
                    <Minimize2 className="h-4 w-4 text-white drop-shadow" />
                  </button>
                  <button
                    onClick={handleClose}
                    className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-black/20 transition-colors backdrop-blur-sm"
                    title="Fechar"
                  >
                    <X className="h-4 w-4 text-white drop-shadow" />
                  </button>
                </div>
              </div>

              {/* Conteúdo do Chat */}
              <div className="flex-1 overflow-hidden">
                <ChatInterface lojistaId={lojistaId} onClose={handleClose} />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
