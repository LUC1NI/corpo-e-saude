"use client";

import { Bell, Check, CheckCircle2 } from "lucide-react";
import Link from "@/components/ui-extra/link";
import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import { StatusBadge } from "@/components/ui-extra/status-badge";
import { cn } from "@/lib/utils";

/** Notificação genérica: cada papel vê o que é do papel dele. */
export interface AlertaNotificacao {
  id: string;
  titulo: string;
  descricao: string;
  href: string;
  rotulo: string;
  tom: "sucesso" | "alerta" | "perigo" | "neutro" | "info";
}

const CHAVE_LIDAS = "cs_notificacoes_lidas";

function carregarLidas(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const bruto = window.localStorage.getItem(CHAVE_LIDAS);
    return new Set(bruto ? (JSON.parse(bruto) as string[]) : []);
  } catch {
    return new Set();
  }
}

/**
 * Sino de notificações. Os itens vêm prontos do servidor, JÁ montados por
 * papel (admin = financeiro; professor = treinos/fichas — nunca financeiro).
 * O contador vermelho mostra só as não lidas; "marcar como lidas" zera o
 * aviso, mas os itens seguem acessíveis.
 */
export function NotificacoesButton({
  itens,
  mensagemVazia,
}: {
  itens: AlertaNotificacao[];
  mensagemVazia: string;
}) {
  const [lidas, setLidas] = useState<Set<string>>(new Set());
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    // localStorage só existe no cliente; lê as lidas após montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura de estado persistido só é possível no cliente, após montar.
    setLidas(carregarLidas());
    setMontado(true);
  }, []);

  function persistir(novo: Set<string>) {
    setLidas(novo);
    try {
      window.localStorage.setItem(CHAVE_LIDAS, JSON.stringify([...novo]));
    } catch {
      // localStorage indisponível — segue só em memória.
    }
  }

  function marcarTodasLidas() {
    persistir(new Set(itens.map((a) => a.id)));
  }

  const total = itens.length;
  // Antes de montar no client, assume tudo não lido (evita flicker de badge).
  const naoLidas = montado
    ? itens.filter((a) => !lidas.has(a.id)).length
    : total;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Notificações${naoLidas ? ` (${naoLidas} não lidas)` : ""}`}
        className="relative inline-flex size-11 items-center lg:size-9 justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <Bell className="size-4" />
        {naoLidas > 0 ? (
          <span className="absolute -top-1 -right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-background">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 max-w-[calc(100vw-2rem)] p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Notificações</p>
          {naoLidas > 0 ? (
            <button
              type="button"
              onClick={marcarTodasLidas}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Check className="size-3.5" />
              Marcar como lidas
            </button>
          ) : total > 0 ? (
            <span className="text-xs text-muted-foreground">Tudo lido</span>
          ) : null}
        </div>

        {total === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
            <CheckCircle2 className="size-6 text-emerald-500" />
            <p className="text-sm font-medium text-foreground">Sem novidades</p>
            <p className="text-xs text-muted-foreground">{mensagemVazia}</p>
          </div>
        ) : (
          <ul className="max-h-80 divide-y overflow-y-auto">
            {itens.map((a) => {
              const lida = montado && lidas.has(a.id);
              return (
                <li key={a.id}>
                  <Link
                    href={a.href}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <span className="relative">
                      <AvatarIniciais nome={a.titulo} tamanho="sm" />
                      {!lida ? (
                        <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-red-500 ring-2 ring-popover" />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm text-foreground",
                          lida ? "font-normal" : "font-medium",
                        )}
                      >
                        {a.titulo}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.descricao}
                      </p>
                    </div>
                    <StatusBadge tom={a.tom}>{a.rotulo}</StatusBadge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
