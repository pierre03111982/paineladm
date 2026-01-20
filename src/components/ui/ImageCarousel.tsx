"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImageCarouselProps {
  images: Array<{
    url: string;
    label: string;
    alt: string;
  }>;
  onImageChange?: (index: number) => void;
  aspectRatio?: string;
  className?: string;
}

export function ImageCarousel({ 
  images, 
  onImageChange,
  aspectRatio = "aspect-[3/4]",
  className = ""
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const filteredImages = images.filter(img => img.url);

  useEffect(() => {
    if (onImageChange) {
      onImageChange(currentIndex);
    }
  }, [currentIndex, onImageChange]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? filteredImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === filteredImages.length - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Se não houver imagens, retornar placeholder
  if (filteredImages.length === 0) {
    return (
      <div className={`relative w-full ${aspectRatio} rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex items-center justify-center ${className}`}>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center px-4">
          Nenhuma imagem disponível
        </p>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      {/* Container do Carrossel */}
      <div className={`relative w-full ${aspectRatio} rounded-lg overflow-hidden border-2 border-slate-300 dark:border-slate-600 bg-white group`}>
        {/* Imagem Atual */}
        <div className="relative w-full h-full">
          <Image
            src={filteredImages[currentIndex].url}
            alt={filteredImages[currentIndex].alt || filteredImages[currentIndex].label}
            fill
            className="object-contain"
            unoptimized
            priority={currentIndex === 0}
          />
        </div>

        {/* Label da Imagem Atual - Overlay no topo */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-semibold z-10">
          {filteredImages[currentIndex].label}
        </div>

        {/* Seta Esquerda */}
        {filteredImages.length > 1 && (
          <button
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
            aria-label="Imagem anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Seta Direita */}
        {filteredImages.length > 1 && (
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
            aria-label="Próxima imagem"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Indicadores de Pontos */}
        {filteredImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
            {filteredImages.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentIndex
                    ? "bg-white w-6"
                    : "bg-white/50 hover:bg-white/75"
                }`}
                aria-label={`Ir para imagem ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
