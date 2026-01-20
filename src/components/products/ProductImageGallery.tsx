"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductImageGalleryProps {
  images: Array<{
    url: string;
    label: string;
  }>;
  className?: string;
  aspectRatio?: string;
}

export function ProductImageGallery({
  images,
  className = "",
  aspectRatio = "aspect-square"
}: ProductImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const filteredImages = images.filter(img => img.url && img.url.trim() !== "");
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Resetar índice quando as imagens mudarem
  useEffect(() => {
    if (filteredImages.length > 0 && currentIndex >= filteredImages.length) {
      setCurrentIndex(0);
    }
  }, [filteredImages.length, currentIndex]);
  
  // Definir funções de navegação ANTES do useEffect do teclado
  const goToPrevious = useCallback(() => {
    if (filteredImages.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? filteredImages.length - 1 : prev - 1));
  }, [filteredImages.length]);

  const goToNext = useCallback(() => {
    if (filteredImages.length <= 1) return;
    setCurrentIndex((prev) => (prev === filteredImages.length - 1 ? 0 : prev + 1));
  }, [filteredImages.length]);

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < filteredImages.length) {
      setCurrentIndex(index);
    }
  }, [filteredImages.length]);

  // Navegação por teclado (apenas quando o componente está em foco)
  useEffect(() => {
    if (filteredImages.length <= 1) return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [filteredImages.length, goToPrevious, goToNext]);

  // Touch handlers para swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        // Swipe left (próxima imagem)
        goToNext();
      } else {
        // Swipe right (imagem anterior)
        goToPrevious();
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Se não houver imagens, retornar placeholder
  if (filteredImages.length === 0) {
    return (
      <div className={`relative w-full ${aspectRatio} rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center ${className}`}>
        <p className="text-xs text-gray-400 dark:text-gray-500">Sem imagem</p>
      </div>
    );
  }

  // Se houver apenas uma imagem, mostrar sem controles
  if (filteredImages.length === 1) {
    return (
      <div className={`relative w-full ${aspectRatio} overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 ${className}`}>
        <Image
          src={filteredImages[0].url}
          alt={filteredImages[0].label}
          fill
          className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div 
      className={`relative w-full ${aspectRatio} overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 group ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Imagem Atual */}
      <div className="relative w-full h-full">
        <Image
          src={filteredImages[currentIndex].url}
          alt={filteredImages[currentIndex].label}
          fill
          className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
          unoptimized
          priority={currentIndex === 0}
        />
      </div>

      {/* Seta Esquerda */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          goToPrevious();
        }}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
        aria-label="Imagem anterior"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Seta Direita */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          goToNext();
        }}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
        aria-label="Próxima imagem"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Indicadores de Pontos - Círculos simples sempre visíveis na parte inferior */}
      {filteredImages.length > 1 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-10">
          {filteredImages.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                goToSlide(index);
              }}
              className={`transition-all duration-200 rounded-full w-2 h-2 ${
                index === currentIndex
                  ? "bg-purple-500 shadow-md"
                  : "bg-gray-400 hover:bg-gray-300"
              }`}
              aria-label={`Ir para imagem ${index + 1}: ${filteredImages[index].label}`}
              title={filteredImages[index].label}
            />
          ))}
        </div>
      )}
    </div>
  );
}
