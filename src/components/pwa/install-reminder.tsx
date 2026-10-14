"use client";

import { Download, Share, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  dispensarInstalacao,
  instalacaoDispensada,
  instalarApp,
  plataforma,
  rodandoComoApp,
  usePromptInstalacao,
} from "@/lib/pwa";

/**
 * Lembrete de "adicionar à tela de início". Aparece só para quem ainda NÃO
 * instalou (não está em modo standalone) e pode ser dispensado. No
 * Chrome/Android usa o prompt nativo; no iOS mostra as instruções (lá não
 * existe `beforeinstallprompt`). Mobile only. Some na tela de boas-vindas,
 * que já é o guia completo.
 */
export function PwaInstallReminder() {
  const pathname = usePathname();
  const evento = usePromptInstalacao();
  const [{ elegivel, ios }, setEstado] = useState({ elegivel: false, ios: false });
  const setElegivel = (v: boolean) => setEstado((e) => ({ ...e, elegivel: v }));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- detecção de plataforma só é possível no cliente, após montar.
    setEstado({
      elegivel: !rodandoComoApp() && !instalacaoDispensada(),
      ios: plataforma() === "ios",
    });
  }, []);

  function fechar() {
    setElegivel(false);
    dispensarInstalacao();
  }

  if (!elegivel || pathname === "/aluno/bem-vindo") return null;
  if (!ios && !evento) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 px-4 lg:hidden">
      <div className="mx-auto flex w-full max-w-md items-center gap-3 rounded-xl border bg-card p-3 shadow-lg ring-1 ring-foreground/5">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Download className="size-4" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-sm font-semibold">Instale o app</p>
          {ios ? (
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
        {!ios ? (
          <button
            type="button"
            onClick={async () => {
              if (await instalarApp()) setElegivel(false);
            }}
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
