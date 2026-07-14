"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mede a largura do container e a repassa em pixels para o gráfico.
 *
 * O `ResponsiveContainer` do Recharts 3.9 com React 19 mede largura 0 na
 * montagem e não re-mede — os gráficos ficavam em branco (dashboard e
 * evolução do aluno). Aqui medimos via ResizeObserver e passamos
 * `width`/`height` explícitos para o `<BarChart>`/`<LineChart>`, que é o
 * caminho confiável.
 */
export function ChartBox({
  height = 260,
  children,
}: {
  height?: number;
  children: (size: { width: number; height: number }) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // useLayoutEffect + medida imediata: o gráfico aparece já no primeiro
  // paint, sem depender do primeiro tick do ResizeObserver (que em alguns
  // ambientes demora ou não dispara na montagem).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => {
      const w = el.clientWidth;
      setWidth((prev) => (prev !== w ? w : prev));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ width: "100%", height }}>
      {width > 0 ? children({ width, height }) : null}
    </div>
  );
}
