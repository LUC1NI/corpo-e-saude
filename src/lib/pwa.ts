import { useSyncExternalStore } from "react";

/**
 * Instalação do PWA ("adicionar à tela de início"), compartilhada entre o
 * lembrete (`install-reminder.tsx`) e o guia de boas-vindas do 1º acesso.
 * Só para Client Components.
 */

/** Evento não-padrão do Chrome/Android para instalar o PWA. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Quem dispensou (lembrete ou guia) não vê de novo. */
const DISMISS_KEY = "pwa-install-dismissed";

export type Plataforma = "ios" | "android" | "outro";

export function rodandoComoApp(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function plataforma(): Plataforma {
  if (typeof window === "undefined") return "outro";
  const ua = window.navigator.userAgent;
  // iPadOS se apresenta como Mac; o toque denuncia.
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  return /android/i.test(ua) ? "android" : "outro";
}

export function instalacaoDispensada(): boolean {
  try {
    return !!localStorage.getItem(DISMISS_KEY);
  } catch {
    return false; // localStorage indisponível (aba anônima etc.)
  }
}

export function dispensarInstalacao(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}

// O `beforeinstallprompt` dispara UMA vez por carregamento: guardamos aqui
// para qualquer componente montado depois (ex.: o guia) conseguir usar.
let eventoGuardado: BeforeInstallPromptEvent | null = null;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    eventoGuardado = e as BeforeInstallPromptEvent;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    eventoGuardado = null;
    dispensarInstalacao();
    avisar();
  });
}

/** Prompt nativo de instalação (Android/Chrome), ou null se indisponível. */
export function usePromptInstalacao(): BeforeInstallPromptEvent | null {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => eventoGuardado,
    () => null,
  );
}

/** Abre o prompt nativo. Retorna true se a pessoa aceitou instalar. */
export async function instalarApp(): Promise<boolean> {
  const evento = eventoGuardado;
  if (!evento) return false;
  await evento.prompt();
  const { outcome } = await evento.userChoice;
  eventoGuardado = null; // o evento só pode ser usado uma vez
  avisar();
  if (outcome === "accepted") dispensarInstalacao();
  return outcome === "accepted";
}
