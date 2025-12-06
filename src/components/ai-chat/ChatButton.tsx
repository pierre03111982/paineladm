"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Minimize2, Maximize2, Zap } from "lucide-react";
import { ChatInterface } from "./ChatInterface";

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
      {/* Botão Flutuante - Mostrar quando fechado OU quando minimizado */}
      {(!isOpen || isMinimized) && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className={`fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-110 flex items-center justify-center group ${
            isMinimized ? 'animate-pulse' : ''
          }`}
          title="Falar com Ana - Assistente Inteligente"
        >
          {/* Ícone melhorado com efeito de brilho */}
          <div className="relative">
            <MessageCircle className="h-7 w-7 group-hover:scale-110 transition-transform" />
            <Zap className="h-3 w-3 absolute -top-1 -right-1 text-yellow-300 animate-pulse fill-yellow-300" />
          </div>
          
          {/* Badge quando minimizado */}
          {isMinimized && (
            <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse">
              !
            </div>
          )}
        </button>
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
            // Estado Minimizado - Mostrar indicador
            <div className="h-full bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-xl flex items-center justify-between p-4 cursor-pointer hover:shadow-2xl transition-all">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <MessageCircle className="h-8 w-8 text-white" />
                  <Zap className="h-4 w-4 absolute -top-1 -right-1 text-yellow-300 animate-pulse fill-yellow-300" />
                </div>
                <div className="text-white">
                  <p className="font-semibold text-sm">Ana está aqui!</p>
                  <p className="text-xs opacity-90">Clique para abrir</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleMinimize}
                  className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                  title="Expandir"
                >
                  <Maximize2 className="h-5 w-5 text-white" />
                </button>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                  title="Fechar"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          ) : (
            // Estado Expandido - Chat Completo
            <div className="h-full bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
              {/* Header com área de arrasto */}
              <div
                ref={headerRef}
                onMouseDown={handleMouseDown}
                className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 ${
                  isDragging ? 'cursor-grabbing' : 'cursor-move'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                      <MessageCircle className="h-6 w-6 text-white" />
                    </div>
                    <Zap className="h-4 w-4 absolute -top-1 -right-1 text-yellow-400 animate-pulse fill-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Ana - Assistente Inteligente
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Consultoria de Vendas & Onboarding
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleMinimize}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Minimizar"
                  >
                    <Minimize2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={handleClose}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Fechar"
                  >
                    <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
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
