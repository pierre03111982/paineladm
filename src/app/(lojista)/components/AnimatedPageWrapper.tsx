"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import type { ReactNode } from "react";

type AnimatedPageWrapperProps = {
  children: ReactNode;
};

export function AnimatedPageWrapper({ children }: AnimatedPageWrapperProps) {
  // Efeito para staggered animation do conteúdo
  useEffect(() => {
    // Resetar todas as classes show
    const items = document.querySelectorAll('.tab-content-item');
    items.forEach(item => item.classList.remove('show'));
    
    // Adicionar classe show com delay escalonado
    setTimeout(() => {
      items.forEach((item, index) => {
        setTimeout(() => {
          item.classList.add('show');
        }, index * 100);
      });
    }, 50);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

