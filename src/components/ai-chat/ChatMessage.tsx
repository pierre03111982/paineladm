"use client";

import { useRouter } from "next/navigation";

type ChatMessageProps = {
  message: string;
  isUser?: boolean;
  timestamp?: Date;
  image?: string | null; // URL da imagem (base64 ou HTTP)
  lojistaId?: string; // ID do lojista para construir URLs corretas
  grounding?: {
    webSearchQueries?: string[];
    sources?: Array<{
      uri?: string;
      title?: string;
    }>;
  } | null;
};

/**
 * Componente de Mensagem do Chat
 * Renderiza botões de navegação detectados no padrão [[Label]](/url)
 * Renderiza imagens anexadas como miniaturas
 */
export function ChatMessage({ message, isUser = false, timestamp, image, lojistaId, grounding }: ChatMessageProps) {
  const router = useRouter();

  // Função para abrir Google Search com a query
  const handleSearchSuggestion = (query: string) => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };

  // Parser para detectar padrão [[Label]](/url) e {{CARD:...}}
  const parseMessage = (text: string) => {
    const parts: Array<{ 
      type: "text" | "button" | "card"; 
      content: string; 
      url?: string;
      cardData?: {
        type: "PRODUCT" | "LOOK";
        title: string;
        subtitle: string;
        imageUrl: string;
        actionLink: string;
      };
    }> = [];
    
    // Normalizar quebras de linha para facilitar parsing
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    let lastIndex = 0;
    
    // Padrão melhorado para Smart Cards: {{CARD:TYPE|TITLE|SUBTITLE|IMAGE_URL|ACTION_LINK}}
    // Aceita URLs HTTP/HTTPS e caminhos relativos
    const cardPattern = /\{\{CARD:(PRODUCT|LOOK)\|([^|]+)\|([^|]+)\|(http[^|]+|[^|]+)\|([^}]+)\}\}/g;
    let cardMatch;
    const cardMatches: Array<{ index: number; match: RegExpExecArray }> = [];
    
    // Resetar lastIndex do regex antes de usar
    cardPattern.lastIndex = 0;
    while ((cardMatch = cardPattern.exec(normalizedText)) !== null) {
      cardMatches.push({ index: cardMatch.index, match: cardMatch });
    }
    
    // Padrão para botões: [[Label]](/url) - aceita espaços opcionais entre ]] e (
    // Melhorado para capturar mesmo com quebras de linha e múltiplos espaços
    const buttonPattern = /\[\[([^\]]+)\]\s*\(\s*([^)]+)\s*\)/g;
    let buttonMatch;
    const buttonMatches: Array<{ index: number; match: RegExpExecArray }> = [];
    
    buttonPattern.lastIndex = 0;
    while ((buttonMatch = buttonPattern.exec(normalizedText)) !== null) {
      buttonMatches.push({ index: buttonMatch.index, match: buttonMatch });
    }
    
    // Log para debug (remover em produção se necessário)
    if (buttonMatches.length > 0) {
      console.log(`[ChatMessage] 🔗 ${buttonMatches.length} link(s) detectado(s) no texto`);
    }
    
    // Combinar todos os matches e ordenar por índice
    const allMatches = [
      ...cardMatches.map(m => ({ ...m, type: "card" as const })),
      ...buttonMatches.map(m => ({ ...m, type: "button" as const })),
    ].sort((a, b) => a.index - b.index);
    
    // Processar matches em ordem
    for (const { index, match, type } of allMatches) {
      // Adicionar texto antes do match
      if (index > lastIndex) {
        const textBefore = normalizedText.substring(lastIndex, index).trim();
        if (textBefore) {
          parts.push({
            type: "text",
            content: textBefore,
          });
        }
      }
      
      // Adicionar o match (card ou button)
      if (type === "card") {
        const [, cardType, title, subtitle, imageUrl, actionLink] = match;
        parts.push({
          type: "card",
          content: "",
          cardData: {
            type: cardType.trim() as "PRODUCT" | "LOOK",
            title: title.trim(),
            subtitle: subtitle.trim(),
            imageUrl: imageUrl.trim(),
            actionLink: actionLink.trim(),
          },
        });
      } else {
        // Limpar URL de espaços e caracteres extras
        const label = match[1].trim();
        const url = match[2].trim();
        
        console.log(`[ChatMessage] 🔗 Link detectado: "${label}" -> "${url}"`);
        
        parts.push({
          type: "button",
          content: label,
          url: url,
        });
      }
      
      lastIndex = index + match[0].length;
    }
    
    // Adicionar texto restante
    if (lastIndex < normalizedText.length) {
      const textAfter = normalizedText.substring(lastIndex).trim();
      if (textAfter) {
        parts.push({
          type: "text",
          content: textAfter,
        });
      }
    }
    
    // Se não encontrou nenhum match, retornar texto completo
    if (parts.length === 0) {
      return [{ type: "text" as const, content: text }];
    }
    
    return parts;
  };

  const messageParts = parseMessage(message);

  const handleButtonClick = (url: string) => {
    // Limpar URL e garantir que comece com /
    let cleanUrl = url.trim().startsWith('/') ? url.trim() : `/${url.trim()}`;
    
    // Adicionar lojistaId como query parameter se necessário
    // Rotas que precisam de lojistaId: /produtos, /clientes, /pedidos, etc.
    const routesNeedingLojistaId = ['/produtos', '/clientes', '/pedidos', '/composicoes', '/dashboard'];
    const needsLojistaId = routesNeedingLojistaId.some(route => cleanUrl.startsWith(route));
    
    if (needsLojistaId && lojistaId && !cleanUrl.includes('lojistaId=')) {
      const separator = cleanUrl.includes('?') ? '&' : '?';
      cleanUrl = `${cleanUrl}${separator}lojistaId=${lojistaId}`;
    }
    
    // Tratamento especial para /produtos/novo - redirecionar para /produtos com modal
    if (cleanUrl === '/produtos/novo' || cleanUrl.startsWith('/produtos/novo?')) {
      cleanUrl = `/produtos${lojistaId ? `?lojistaId=${lojistaId}` : ''}`;
      // Abrir modal de criação de produto (será implementado via state ou evento)
      console.log("[ChatMessage] 📝 Redirecionando para página de produtos (use o botão 'Adicionar Produto')");
    }
    
    console.log("[ChatMessage] 🔗 Navegando para:", cleanUrl);
    router.push(cleanUrl);
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
          {/* Exibir imagem anexada se houver */}
          {image && (
            <div className="mb-2">
              <img
                src={image}
                alt="Imagem anexada"
                className="max-w-[200px] max-h-[200px] rounded-lg border border-gray-300 dark:border-gray-700 object-cover"
                onError={(e) => {
                  // Fallback se a imagem não carregar
                  (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23ddd' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-family='Arial' font-size='14'%3EImagem não disponível%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
          )}
          
          <div className="flex flex-col gap-2">
          {messageParts.map((part, index) => {
            if (part.type === "card" && part.cardData) {
              const { type, title, subtitle, imageUrl, actionLink } = part.cardData;
              return (
                <div
                  key={index}
                  onClick={() => handleButtonClick(actionLink)}
                  className="block mt-3 mb-1 max-w-xs bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="relative w-full" style={{ aspectRatio: "9/16", maxHeight: "400px" }}>
                    <img
                      src={imageUrl}
                      alt={title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback se a imagem não carregar
                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='355'%3E%3Crect fill='%23ddd' width='200' height='355'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-family='Arial' font-size='14'%3EImagem não disponível%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate mb-1">
                      {title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {subtitle}
                    </div>
                    {type === "PRODUCT" && (
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                        Ver detalhes →
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            if (part.type === "button") {
              if (!part.url) {
                console.warn(`[ChatMessage] ⚠️ Botão sem URL: "${part.content}"`);
                return null;
              }
              
              return (
                <button
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`[ChatMessage] 🔗 Clicando no botão: "${part.content}" -> "${part.url}"`);
                    handleButtonClick(part.url!);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm cursor-pointer self-start"
                  type="button"
                >
                  {part.content}
                </button>
              );
            }
            return (
              <span key={index} className="whitespace-pre-wrap break-words">
                {part.content}
              </span>
            );
          })}
          </div>
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

        {/* Exibir Search Suggestions (Grounding) */}
        {!isUser && grounding?.webSearchQueries && grounding.webSearchQueries.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Sugestões de busca:
            </div>
            <div className="flex flex-wrap gap-2">
              {grounding.webSearchQueries.map((query, index) => (
                <button
                  key={index}
                  onClick={() => handleSearchSuggestion(query)}
                  className="px-3 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                  title={`Buscar: ${query}`}
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Exibir Sources (Fontes) */}
        {!isUser && grounding?.sources && grounding.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Fontes:
            </div>
            <div className="space-y-1">
              {grounding.sources.map((source, index) => {
                if (!source.uri) return null;
                return (
                  <a
                    key={index}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-blue-600 dark:text-blue-400 hover:underline truncate"
                    title={source.title || source.uri}
                  >
                    {source.title || source.uri}
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

