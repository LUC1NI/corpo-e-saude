"use client";

import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * Número que "conta" de 0 até o valor quando entra na viewport (uma vez).
 * Com preferência por menos movimento, mostra o valor final direto.
 */
export function Contador({
  ate,
  prefixo = "",
  sufixo = "",
  duracao = 1.8,
}: {
  ate: number;
  prefixo?: string;
  sufixo?: string;
  duracao?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const emVista = useInView(ref, { once: true, margin: "-40px" });
  const menosMovimento = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!emVista || !el) return;

    if (menosMovimento) {
      el.textContent = `${prefixo}${ate}${sufixo}`;
      return;
    }

    const controls = animate(0, ate, {
      duration: duracao,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = `${prefixo}${Math.round(v)}${sufixo}`;
      },
    });
    return () => controls.stop();
  }, [emVista, ate, prefixo, sufixo, duracao, menosMovimento]);

  return (
    <span ref={ref}>
      {prefixo}0{sufixo}
    </span>
  );
}
