"use client";

import { useRouter } from "next/navigation";

type ChatMessageProps = {
  message: string;
  isUser?: boolean;
  timestamp?: Date;
};

/**
 * Componente de Mensagem do Chat
 * TAREFA 2: Renderiza botões de navegação detectados no padrão [[Label]](/url)
 */
export function ChatMessage({ message, isUser = false, timestamp }: ChatMessageProps) {
  const router = useRouter();

  // Parser para detectar padrão [[Label]](/url)
  const parseMessage = (text: string) => {
    const buttonPattern = /\[\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: Array<{ type: "text" | "button"; content: string; url?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = buttonPattern.exec(text)) !== null) {
      // Adicionar texto antes do botão
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: text.substring(lastIndex, match.index),
        });
      }

      // Adicionar botão
      parts.push({
        type: "button",
        content: match[1], // Label
        url: match[2], // URL
      });

      lastIndex = match.index + match[0].length;
    }

    // Adicionar texto restante
    if (lastIndex < text.length) {
      parts.push({
        type: "text",
        content: text.substring(lastIndex),
      });
    }

    // Se não encontrou nenhum botão, retornar texto completo
    if (parts.length === 0) {
      return [{ type: "text" as const, content: text }];
    }

    return parts;
  };

  const messageParts = parseMessage(message);

  const handleButtonClick = (url: string) => {
    router.push(url);
  };

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? "bg-indigo-600 text-white"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
        }`}
      >
        <div className="space-y-2">
          {messageParts.map((part, index) => {
            if (part.type === "button") {
              return (
                <div key={index} className="mt-2">
                  <button
                    onClick={() => handleButtonClick(part.url!)}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    {part.content}
                  </button>
                </div>
              );
            }
            return (
              <span key={index} className="whitespace-pre-wrap">
                {part.content}
              </span>
            );
          })}
        </div>
        {timestamp && (
          <div
            className={`text-xs mt-2 ${
              isUser ? "text-indigo-200" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {timestamp.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>
    </div>
  );
}

