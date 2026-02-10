"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Sparkles } from "lucide-react";

/** Duração do cross-fade (opacidade) entre imagem estática e vídeo — suaviza a troca e mascara pequenas diferenças de posição. */
const CROSS_FADE_DURATION_S = 0.8;
const DELAY_BEFORE_VIDEO_MS = 1200;

export type ProductMediaCardProps = {
  /** URL da foto de frente (estática). */
  imageUrl: string;
  /** URL do vídeo gerado pela IA. Se não informado, exibe apenas a imagem. */
  videoUrl?: string | null;
  /** Texto alternativo para acessibilidade. */
  alt?: string;
  /** Classes do container. */
  className?: string;
  /** Proporção do container (ex: aspect-[9/16]). */
  aspectRatio?: string;
  /** object-fit para imagem e vídeo (cover alinha melhor modelo; primeiro frame do vídeo = foto_frente). */
  objectFit?: "cover" | "contain";
  /** Duração do cross-fade em segundos (padrão 0.8). */
  crossFadeDuration?: number;
  /** Mostrar badge "IA" no canto quando houver vídeo. */
  showBadge?: boolean;
  /** Delay em ms antes de fazer cross-fade para o vídeo. */
  delayBeforeVideo?: number;
  /** Se true, inicia transição no hover em vez de por tempo. */
  triggerOnHover?: boolean;
  /** Se true, carrega e exibe o vídeo imediatamente (ex.: prévia do display), sem esperar IntersectionObserver. */
  skipLazy?: boolean;
};

/**
 * Card híbrido: exibe a foto de frente e, quando há vídeo, faz cross-fade suave
 * para o vídeo (loop, muted, playsInline). Vídeo só carrega quando o componente
 * está visível (lazy). object-fit igual em ambos para alinhar a modelo.
 */
export function ProductMediaCard({
  imageUrl,
  videoUrl,
  alt = "Produto",
  className = "",
  aspectRatio = "aspect-[9/16]",
  objectFit = "cover",
  showBadge = true,
  delayBeforeVideo = DELAY_BEFORE_VIDEO_MS,
  triggerOnHover = false,
  crossFadeDuration = CROSS_FADE_DURATION_S,
  skipLazy = false,
}: ProductMediaCardProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [isInView, setIsInView] = useState(skipLazy);
  const [videoCanPlay, setVideoCanPlay] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVideo = Boolean(videoUrl && videoUrl.trim());

  // Ao trocar de produto/mídia (ex.: slide no display), resetar estado para exibir imagem primeiro e depois vídeo se houver
  useEffect(() => {
    setShowVideo(false);
    setVideoCanPlay(false);
  }, [imageUrl, videoUrl]);

  // Lazy: só considerar "em view" quando o container entra no viewport (ou sempre se skipLazy)
  useEffect(() => {
    if (skipLazy) {
      setIsInView(true);
      return;
    }
    if (!containerRef.current || !hasVideo) return;
    const el = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setIsInView(true);
      },
      { rootMargin: "100px", threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasVideo, skipLazy]);

  // Após delay (ou nunca se triggerOnHover), fazer cross-fade para o vídeo
  useEffect(() => {
    if (!hasVideo || !isInView || triggerOnHover) return;
    const t = setTimeout(() => setShowVideo(true), delayBeforeVideo);
    return () => clearTimeout(t);
  }, [hasVideo, isInView, delayBeforeVideo, triggerOnHover]);

  // Fallback: quando skipLazy, considerar vídeo "pronto" após 2s para exibir mesmo se onCanPlay atrasar
  useEffect(() => {
    if (!skipLazy || !hasVideo || !isInView) return;
    const fallback = setTimeout(() => setVideoCanPlay((v) => v || true), 2000);
    return () => clearTimeout(fallback);
  }, [skipLazy, hasVideo, isInView]);

  const onVideoCanPlay = () => setVideoCanPlay(true);
  const onHoverStart = () => {
    if (triggerOnHover && hasVideo && isInView) setShowVideo(true);
  };
  const onHoverEnd = () => {
    if (triggerOnHover && hasVideo) setShowVideo(false);
  };

  const objectFitClass = objectFit === "cover" ? "object-cover object-center" : "object-contain object-center";

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${aspectRatio ? aspectRatio : "h-full"} overflow-hidden rounded-lg bg-white ${className}`}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      {/* Imagem de frente (foto_frente) — primeiro frame do vídeo deve ser idêntico a esta */}
      <motion.div
        className="absolute inset-0"
        style={{ transform: "scale(1.01)", filter: "contrast(1.03)" }}
        initial={false}
        animate={{ opacity: showVideo && videoCanPlay ? 0 : 1 }}
        transition={{ duration: crossFadeDuration, ease: "easeInOut" }}
      >
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className={objectFitClass}
          sizes="(max-width: 768px) 100vw, 320px"
          unoptimized
        />
      </motion.div>

      {/* Vídeo — carrega só quando em view; cross-fade quando canplay */}
      {hasVideo && isInView && (
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: showVideo && videoCanPlay ? 1 : 0 }}
          transition={{ duration: crossFadeDuration, ease: "easeInOut" }}
        >
          <video
            key={videoUrl}
            ref={videoRef}
            src={videoUrl}
            className={`product-video absolute inset-0 w-full h-full ${objectFitClass}`}
            style={{
              objectFit: "cover",
              transform: "scale(1.01)",
              filter: "contrast(1.03)",
            }}
            loop
            muted
            playsInline
            preload="auto"
            onCanPlay={onVideoCanPlay}
            onLoadedData={onVideoCanPlay}
          />
        </motion.div>
      )}

      {/* Reproduzir vídeo quando visível (autoplay em mute) */}
      {hasVideo && isInView && (
        <VideoPlaybackController videoRef={videoRef} showVideo={showVideo} videoCanPlay={videoCanPlay} />
      )}

      {/* Badge IA / Vídeo */}
      {showBadge && hasVideo && (
        <div
          className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 text-white text-xs font-medium"
          title="Visualização dinâmica com vídeo gerado por IA"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>IA</span>
        </div>
      )}
    </div>
  );
}

/** Garante play/pause do vídeo conforme showVideo e quando está pronto. */
function VideoPlaybackController({
  videoRef,
  showVideo,
  videoCanPlay,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  showVideo: boolean;
  videoCanPlay: boolean;
}) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (showVideo && videoCanPlay) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [videoRef, showVideo, videoCanPlay]);
  return null;
}
