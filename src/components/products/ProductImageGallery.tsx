"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Slide = { type: "image"; url: string; label: string } | { type: "video"; url: string; label: string };

interface ProductImageGalleryProps {
  images: Array<{ url: string; label: string }>;
  /** Se informado, o vídeo aparece como segundo slide (logo após a foto principal). */
  videoUrl?: string | null;
  className?: string;
  aspectRatio?: string;
}

function buildSlides(images: Array<{ url: string; label: string }>, videoUrl?: string | null): Slide[] {
  const valid = images.filter((img) => img.url && img.url.trim() !== "");
  if (valid.length === 0) return [];
  if (!videoUrl || !videoUrl.trim()) {
    return valid.map((img) => ({ type: "image" as const, url: img.url.trim(), label: img.label }));
  }
  const first = valid[0];
  const rest = valid.slice(1);
  return [
    { type: "image", url: first.url, label: first.label },
    { type: "video", url: videoUrl.trim(), label: "Vídeo" },
    ...rest.map((img) => ({ type: "image" as const, url: img.url.trim(), label: img.label })),
  ];
}

export function ProductImageGallery({
  images,
  videoUrl,
  className = "",
  aspectRatio = "aspect-square",
}: ProductImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slides = useMemo(() => buildSlides(images, videoUrl), [images, videoUrl]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Reproduzir ou pausar vídeo quando mudar de slide
  useEffect(() => {
    const slide = slides[currentIndex];
    const video = videoRef.current;
    if (!video) return;
    if (slide?.type === "video") {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [currentIndex, slides]);

  // Resetar índice quando os slides mudarem
  useEffect(() => {
    if (slides.length > 0 && currentIndex >= slides.length) {
      setCurrentIndex(0);
    }
  }, [slides.length, currentIndex]);

  const goToPrevious = useCallback(() => {
    if (slides.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  }, [slides.length]);

  const goToNext = useCallback(() => {
    if (slides.length <= 1) return;
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  }, [slides.length]);

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentIndex(index);
    }
  }, [slides.length]);

  // Navegação por teclado (apenas quando o componente está em foco)
  useEffect(() => {
    if (slides.length <= 1) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [slides.length, goToPrevious, goToNext]);

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

  // Se não houver slides, retornar placeholder
  if (slides.length === 0) {
    return (
      <div className={`relative w-full ${aspectRatio} rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center ${className}`}>
        <p className="text-xs text-gray-400">Sem imagem</p>
      </div>
    );
  }

  const currentSlide = slides[currentIndex];
  const isVideo = currentSlide?.type === "video";

  // Um único slide: sem setas nem dots
  if (slides.length === 1) {
    return (
      <div className={`relative w-full ${aspectRatio} overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 ${className}`}>
        {isVideo ? (
          <video
            ref={videoRef}
            src={currentSlide.url}
            className="absolute inset-0 w-full h-full object-cover object-center"
            loop
            muted
            playsInline
            autoPlay
          />
        ) : (
          <Image
            src={currentSlide.url}
            alt={currentSlide.label}
            fill
            className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative w-full ${aspectRatio} overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 group ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide atual: foto ou vídeo */}
      <div className="relative w-full h-full">
        {isVideo ? (
          <video
            ref={videoRef}
            src={currentSlide.url}
            className="absolute inset-0 w-full h-full object-cover object-center"
            loop
            muted
            playsInline
            preload="auto"
            onCanPlay={() => videoRef.current?.play().catch(() => {})}
          />
        ) : (
          <Image
            src={currentSlide.url}
            alt={currentSlide.label}
            fill
            className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
            unoptimized
            priority={currentIndex === 0}
          />
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          goToPrevious();
        }}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full z-10 transition-opacity hover:opacity-100"
        aria-label="Anterior"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          goToNext();
        }}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full z-10 transition-opacity hover:opacity-100"
        aria-label="Próximo"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {slides.length > 1 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-10">
          {slides.map((slide, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                goToSlide(index);
              }}
              className={`transition-all duration-200 rounded-full w-2 h-2 ${
                index === currentIndex ? "bg-purple-500 shadow-md" : "bg-gray-400 hover:bg-gray-300"
              }`}
              aria-label={`Ir para ${slide.type === "video" ? "vídeo" : "imagem"} ${index + 1}`}
              title={slide.label}
            />
          ))}
        </div>
      )}
    </div>
  );
}
