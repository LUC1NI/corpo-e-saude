"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

/** Evento não-padrão do Chrome/Android para instalar o PWA. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";

type Modo = "oculto" | "android" | "ios";

function rodandoComoApp(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function ehIos(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/**
 * Lembrete de "adicionar à tela de início". Aparece só para quem ainda NÃO
 * instalou (não está em modo standalone) e pode ser dispensado. No
 * Chrome/Android usa o prompt nativo; no iOS mostra as instruções (lá não
 * existe `beforeinstallprompt`). Mobile only.
 */
export function PwaInstallReminder() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [modo, setModo] = useState<Modo>("oculto");

  useEffect(() => {
    if (rodandoComoApp()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* localStorage indisponível — segue */
    }

    const aoPrompt = (e: Event) => {
      e.preventDefault();
      setEvento(e as BeforeInstallPromptEvent);
      setModo("android");
    };
    window.addEventListener("beforeinstallprompt", aoPrompt);

    // Detecção de plataforma no mount (iOS não dispara beforeinstallprompt).
    if (ehIos()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- detecção de plataforma só é possível no cliente, após montar.
      setModo("ios");
    }

    return () => window.removeEventListener("beforeinstallprompt", aoPrompt);
  }, []);

  function fechar() {
    setModo("oculto");
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function instalar() {
    if (!evento) return;
    await evento.prompt();
    const escolha = await evento.userChoice;
    setEvento(null);
    if (escolha.outcome === "accepted") fechar();
    else setModo("oculto");
  }

  if (modo === "oculto") return null;
  const dicaIos = modo === "ios";

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 px-4 lg:hidden">
      <div className="mx-auto flex w-full max-w-md items-center gap-3 rounded-xl border bg-card p-3 shadow-lg ring-1 ring-foreground/5">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Download className="size-4" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-sm font-semibold">Instale o app</p>
          {dicaIos ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              Toque em <Share className="inline size-3" /> e em “Adicionar à Tela
              de Início”.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Acesso rápido na tela inicial, como um aplicativo.
            </p>
          )}
        </div>
        {!dicaIos ? (
          <button
            type="button"
            onClick={instalar}
            className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Instalar
          </button>
        ) : null}
        <button
          type="button"
          onClick={fechar}
          aria-label="Dispensar"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
