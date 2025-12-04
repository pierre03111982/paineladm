"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, MessageCircle, X, Paperclip, Image as ImageIcon } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { Button } from "@/components/ui/button";

type ChatInterfaceProps = {
  lojistaId: string;
  onClose?: () => void;
};

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  image?: string | null; // URL da imagem (base64 ou HTTP)
  grounding?: {
    webSearchQueries?: string[];
    sources?: Array<{
      uri?: string;
      title?: string;
    }>;
  } | null;
};

/**
 * Interface completa do Chat com Ana (IA Consultiva)
 */
export function ChatInterface({ lojistaId, onClose }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Olá! Sou a Ana, sua assistente inteligente. Como posso ajudar você hoje?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Carregar histórico do Firestore ao montar
  useEffect(() => {
    const loadHistory = async () => {
      if (historyLoaded) return;
      
      try {
        const response = await fetch(`/api/ai/chat/history?lojistaId=${lojistaId}`);
        const data = await response.json();
        
        if (data.success && data.messages && data.messages.length > 0) {
          // Converter mensagens do Firestore para o formato do componente
          const firestoreMessages: Message[] = data.messages.map((msg: any) => ({
            id: msg.id,
            text: msg.content,
            isUser: msg.role === 'user',
            timestamp: new Date(msg.createdAt),
          }));
          
          // Adicionar mensagem inicial se não houver mensagens
          if (firestoreMessages.length === 0) {
            setMessages([{
              id: "1",
              text: "Olá! Sou a Ana, sua assistente inteligente. Como posso ajudar você hoje?",
              isUser: false,
              timestamp: new Date(),
            }]);
          } else {
            setMessages(firestoreMessages);
          }
          
          console.log("[ChatInterface] 📚 Histórico carregado do Firestore:", firestoreMessages.length, "mensagens");
        }
      } catch (error) {
        console.error("[ChatInterface] Erro ao carregar histórico do Firestore:", error);
        // Continuar com mensagem inicial se houver erro
      } finally {
        setHistoryLoaded(true);
      }
    };

    loadHistory();
  }, [lojistaId, historyLoaded]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nota: O histórico agora é salvo automaticamente no Firestore pelo backend
  // Não precisamos mais salvar no localStorage

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Garantir que o input receba foco quando o chat for aberto
  useEffect(() => {
    // Focar no input quando o componente montar (chat aberto)
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Manter o foco no input quando não estiver carregando
  useEffect(() => {
    if (!loading && inputRef.current) {
      // Pequeno delay para garantir que o DOM foi atualizado
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione apenas imagens.");
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 5MB.");
      return;
    }

    // Converter para base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setSelectedImage(base64String);
    };
    reader.onerror = () => {
      alert("Erro ao ler a imagem. Tente novamente.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || loading) return;

    // Capturar valores antes de limpar o estado
    const messageText = input.trim();
    const imageToSend = selectedImage;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText || "",
      isUser: true,
      timestamp: new Date(),
      image: imageToSend || null,
    };

    // Preparar histórico ANTES de atualizar o estado, incluindo a nova mensagem do usuário
    const updatedMessages = [...messages, userMessage];
    const historyForApi = updatedMessages
      .filter((msg) => msg.text && msg.text.trim().length > 0) // Filtrar mensagens vazias
      .map((msg) => ({
        role: msg.isUser ? 'user' : 'model',
        content: msg.text.trim(),
      }));

    console.log("[ChatInterface] 📤 Enviando histórico para API:", {
      totalMensagens: historyForApi.length,
      primeiraMensagem: historyForApi[0] ? { role: historyForApi[0].role, content: historyForApi[0].content.substring(0, 50) } : null,
      ultimaMensagem: historyForApi[historyForApi.length - 1] ? { role: historyForApi[historyForApi.length - 1].role, content: historyForApi[historyForApi.length - 1].content.substring(0, 50) } : null,
    });

    setMessages(updatedMessages);
    setInput("");
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setLoading(true);
    
    // Garantir que o foco permaneça no input após limpar
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    try {

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageText || (imageToSend ? "Analise esta imagem" : ""),
          lojistaId,
          image: imageToSend || undefined,
          history: historyForApi,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          isUser: false,
          timestamp: new Date(),
          grounding: data.grounding || null,
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        throw new Error(data.error || "Erro ao processar mensagem");
      }
    } catch (error) {
      console.error("[ChatInterface] Erro:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      // Garantir que o foco permaneça no input após o carregamento terminar
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Verificar se é uma imagem
      if (item.type.indexOf("image") !== -1) {
        e.preventDefault();
        
        const file = item.getAsFile();
        if (!file) continue;

        // Validar tamanho (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert("A imagem colada deve ter no máximo 5MB.");
          continue;
        }

        // Converter para base64
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64String = event.target?.result as string;
          setSelectedImage(base64String);
        };
        reader.onerror = () => {
          alert("Erro ao processar a imagem colada. Tente novamente.");
        };
        reader.readAsDataURL(file);
        break; // Processar apenas a primeira imagem
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-white" />
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
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message.text}
            isUser={message.isUser}
            timestamp={message.timestamp}
            image={message.image}
            grounding={message.grounding}
          />
        ))}
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3 rounded-tl-none">
              <div className="flex space-x-1">
                <div 
                  className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" 
                  style={{ animationDelay: '0ms' }} 
                />
                <div 
                  className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" 
                  style={{ animationDelay: '150ms' }} 
                />
                <div 
                  className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" 
                  style={{ animationDelay: '300ms' }} 
                />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        {/* Preview da imagem selecionada */}
        {selectedImage && (
          <div className="mb-3 relative inline-block">
            <div className="relative">
              <img
                src={selectedImage}
                alt="Preview"
                className="max-w-[200px] max-h-[200px] rounded-lg border border-gray-300 dark:border-gray-700 object-cover"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Input de arquivo oculto */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Botão de anexar imagem */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            title="Anexar imagem"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            onPaste={handlePaste}
            placeholder="Digite sua mensagem ou cole uma imagem (Ctrl+V)..."
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || loading}
            className="rounded-lg bg-indigo-600 text-white p-2 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Pressione Enter para enviar • Clique no clipe ou cole uma imagem (Ctrl+V)
        </p>
      </div>
    </div>
  );
}

