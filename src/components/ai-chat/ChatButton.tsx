"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { ChatInterface } from "./ChatInterface";

type ChatButtonProps = {
  lojistaId: string;
};

/**
 * Botão flutuante para abrir o chat com Ana
 */
export function ChatButton({ lojistaId }: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Botão Flutuante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all hover:scale-110 flex items-center justify-center"
          title="Falar com Ana - Assistente Inteligente"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Modal do Chat */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl h-[600px]">
            <ChatInterface lojistaId={lojistaId} onClose={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}



