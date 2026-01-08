"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface AnimatedIconProps {
  icon: LucideIcon;
  className?: string;
  size?: number | string;
  delay?: number;
}

/**
 * Componente de ícone animado que inicia uma animação e depois pausa
 * A animação é: pulso + escala + brilho que roda uma vez e para
 */
export function AnimatedIcon({ 
  icon: Icon, 
  className = "", 
  size = 24,
  delay = 0 
}: AnimatedIconProps) {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    // Após 1.5 segundos, pausar a animação
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 1500 + delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <motion.div
      className={className}
      animate={isAnimating ? {
        scale: [1, 1.15, 1],
        opacity: [1, 0.9, 1],
      } : {}}
      transition={{
        duration: 1.5,
        delay: delay,
        ease: "easeInOut",
        repeat: 0, // Roda apenas uma vez
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon 
        size={size} 
        className={isAnimating ? "drop-shadow-lg" : ""}
        style={{
          filter: isAnimating ? "drop-shadow(0 0 8px currentColor)" : "none",
          transition: "filter 0.3s ease-out",
        }}
      />
    </motion.div>
  );
}



