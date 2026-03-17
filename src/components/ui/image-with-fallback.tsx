"use client";

import React, { useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { ImageOff } from "lucide-react";

interface ImageWithFallbackProps extends Omit<ImageProps, "onError"> {
  fallbackSrc?: string;
  showErrorIcon?: boolean;
}

export function ImageWithFallback({
  src,
  alt,
  fallbackSrc,
  showErrorIcon = true,
  className,
  ...props
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (error) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-gray-100 text-gray-400 ${className}`}
        style={{ width: '100%', height: '100%', minHeight: '100%' }}
      >
        <ImageOff className="h-8 w-8 mb-2 opacity-50" />
        <span className="text-[10px] text-gray-400 font-medium">Imagem indisponível</span>
      </div>
    );
  }

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        console.warn(`[ImageWithFallback] Erro ao carregar imagem: ${src}`);
        setError(true);
      }}
    />
  );
}
