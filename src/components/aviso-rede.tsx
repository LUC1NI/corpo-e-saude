"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { ERRO_REDE } from "@/lib/acoes";

/**
 * Rede de segurança: qualquer chamada ao servidor que falhe por rede e não
 * foi tratada na tela vira um aviso claro, em vez de um botão girando mudo.
 */
export function AvisoRede() {
  useEffect(() => {
    const aoFalhar = (e: PromiseRejectionEvent) => {
      const msg = String((e.reason as Error | undefined)?.message ?? e.reason ?? "");
      if (/fetch|network|Failed to fetch|NetworkError|Load failed/i.test(msg) || !navigator.onLine) {
        toast.error(ERRO_REDE, { id: "rede" });
      }
    };
    const offline = () => toast.error(ERRO_REDE, { id: "rede" });
    window.addEventListener("unhandledrejection", aoFalhar);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("unhandledrejection", aoFalhar);
      window.removeEventListener("offline", offline);
    };
  }, []);
  return null;
}
