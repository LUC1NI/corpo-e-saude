"use client";

import { MotionConfig, motion } from "framer-motion";

/**
 * Revela o conteúdo com um fade + deslize sutil quando entra na viewport.
 *
 * `reducedMotion="user"` faz o próprio framer-motion desativar os transforms
 * para quem prefere menos movimento (mantendo só o fade) — sem branch de
 * render entre servidor e cliente, o que evita mismatch de hidratação.
 */
export function Revelar({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={className}
        initial={{ opacity: 0, y }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55, delay, ease: [0.21, 0.65, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
