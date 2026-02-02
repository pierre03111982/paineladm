"use client";

import { useEffect } from "react";

/**
 * Bloqueia o scroll do html/body quando o layout lojista está ativo.
 * Apenas a área principal (main) deve rolar; header e sidebar ficam fixos.
 */
export function LojistaScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevHtmlHeight = html.style.height;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyHeight = body.style.height;
    const prevBodyMinHeight = body.style.minHeight;

    html.style.overflow = "hidden";
    html.style.height = "100%";
    body.style.overflow = "hidden";
    body.style.height = "100%";
    body.style.minHeight = "100%";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      html.style.height = prevHtmlHeight;
      body.style.overflow = prevBodyOverflow;
      body.style.height = prevBodyHeight;
      body.style.minHeight = prevBodyMinHeight;
    };
  }, []);

  return null;
}
