"use client";

import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

/**
 * Store mínima (fora do React) que conta quantas navegações estão em curso.
 * Alimentada tanto pelos links (via `useLinkStatus`) quanto por navegações
 * programáticas (`router.push`) através de `progressoNavegacao.iniciar()`.
 */
let emCurso = 0;
const ouvintes = new Set<() => void>();

function avisar() {
  for (const ouvinte of ouvintes) ouvinte();
}

export const progressoNavegacao = {
  iniciar() {
    emCurso += 1;
    avisar();
  },
  terminar() {
    if (emCurso > 0) emCurso -= 1;
    avisar();
  },
  /** Zera tudo — usado quando a rota já trocou (navegação concluída). */
  resetar() {
    if (emCurso !== 0) {
      emCurso = 0;
      avisar();
    }
  },
  subscribe(ouvinte: () => void) {
    ouvintes.add(ouvinte);
    return () => {
      ouvintes.delete(ouvinte);
    };
  },
  ativo() {
    return emCurso > 0;
  },
};

function useProgressoAtivo() {
  return useSyncExternalStore(
    progressoNavegacao.subscribe,
    progressoNavegacao.ativo,
    () => false,
  );
}

/**
 * Barra fina no topo da tela, visível enquanto há navegação pendente.
 * Renderize uma única vez no layout raiz.
 */
export function BarraProgressoNavegacao() {
  const ativo = useProgressoAtivo();
  const pathname = usePathname();

  // A rota mudou → a navegação terminou; zera o contador para a barra nunca
  // ficar presa caso algum "terminar" se perca.
  useEffect(() => {
    progressoNavegacao.resetar();
  }, [pathname]);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden transition-opacity duration-200",
        ativo ? "opacity-100" : "opacity-0",
      )}
    >
      <div className="h-full w-[30%] rounded-full bg-primary shadow-[0_0_8px_var(--primary)] [animation:barra-navegacao_1.1s_ease-in-out_infinite]" />
    </div>
  );
}

/**
 * Sensor que deve ser renderizado como filho de um `<Link>`: observa o estado
 * de carregamento daquele link e alimenta a store global. Renderiza nada.
 */
export function SensorProgressoLink() {
  const { pending } = useLinkStatus();

  useEffect(() => {
    if (!pending) return;
    progressoNavegacao.iniciar();
    return () => {
      progressoNavegacao.terminar();
    };
  }, [pending]);

  return null;
}
