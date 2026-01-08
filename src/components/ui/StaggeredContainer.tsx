"use client";

import { useEffect, useRef, type ReactNode } from "react";

type StaggeredContainerProps = {
  children: ReactNode;
  /**
   * Chave única que identifica o conteúdo atual (ex: id da aba ativa)
   * Quando muda, a animação é reiniciada
   */
  activeKey: string | number;
  /**
   * Delay entre cada item (em ms)
   * @default 100
   */
  staggerDelay?: number;
  /**
   * Variante de velocidade: 'fast' | 'normal' | 'slow'
   * @default 'normal'
   */
  variant?: "fast" | "normal" | "slow";
  /**
   * Classe CSS customizada para os itens
   * @default 'stagger-item'
   */
  itemClassName?: string;
};

export function StaggeredContainer({
  children,
  activeKey,
  staggerDelay = 100,
  variant = "normal",
  itemClassName,
}: StaggeredContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Determinar a classe base baseada na variante
    const baseClass =
      itemClassName ||
      (variant === "fast"
        ? "stagger-item-fast"
        : variant === "slow"
        ? "stagger-item-slow"
        : "stagger-item");

    // Resetar: remover classe .show de todos os itens
    const items = containerRef.current.querySelectorAll(`.${baseClass}`);
    items.forEach((item) => {
      item.classList.remove("show");
    });

    // Pequeno delay para garantir que o DOM foi atualizado
    const timeout = setTimeout(() => {
      // Adicionar classe .show com delay escalonado
      items.forEach((item, index) => {
        setTimeout(() => {
          item.classList.add("show");
        }, index * staggerDelay);
      });
    }, 50);

    return () => clearTimeout(timeout);
  }, [activeKey, staggerDelay, variant, itemClassName]);

  return (
    <div ref={containerRef} className="stagger-container">
      {children}
    </div>
  );
}























