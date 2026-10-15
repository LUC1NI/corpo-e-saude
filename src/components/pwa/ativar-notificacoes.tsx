"use client";

import { Bell, BellOff, BellRing, Share, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { removerInscricaoPush, salvarInscricaoPush } from "@/lib/acoes-push";
import { plataforma, rodandoComoApp } from "@/lib/pwa";

const CHAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

type Estado =
  | "carregando"
  | "ios_fora_do_app"
  | "nao_suportado"
  | "negado"
  | "disponivel"
  | "ativado";

/** base64url → bytes (formato que o pushManager.subscribe aceita em todo navegador). */
function chaveParaBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function registroSw(): Promise<ServiceWorkerRegistration | null> {
  // O SW só existe no build (no `next dev` o Serwist fica desligado).
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

function inscricaoParaServidor(sub: PushSubscription) {
  const json = sub.toJSON() as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  return {
    endpoint: json.endpoint,
    keys: json.keys,
    userAgent: navigator.userAgent.slice(0, 300),
  };
}

/**
 * Card "Ativar notificações" da área do aluno. Pede permissão SÓ no clique
 * (nunca automático) e cobre: navegador sem suporte; iPhone fora do modo app
 * (só funciona instalado); permissão negada; e ativado (com desativar).
 */
/**
 * convite  = só aparece quando dá para ativar (Início): uma linha + botão.
 * completo = mostra todos os estados, com o "como liberar" (Mensalidade).
 */
export function AtivarNotificacoes({
  modo = "completo",
}: {
  modo?: "convite" | "completo";
}) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      let e: Estado;
      if (plataforma() === "ios" && !rodandoComoApp()) e = "ios_fora_do_app";
      else if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        e = "nao_suportado";
      } else if (Notification.permission === "denied") e = "negado";
      else {
        const reg = await registroSw();
        const sub = await reg?.pushManager.getSubscription();
        if (!reg) e = "nao_suportado";
        else if (sub) {
          e = "ativado";
          // Re-sincroniza com o servidor (ex.: inscrição apagada lá).
          void salvarInscricaoPush(inscricaoParaServidor(sub));
        } else e = "disponivel";
      }
      if (vivo) setEstado(e);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  async function ativar() {
    setOcupado(true);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? "negado" : "disponivel");
        return;
      }
      const reg = await registroSw();
      if (!reg) {
        setEstado("nao_suportado");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: chaveParaBytes(CHAVE_PUBLICA),
      });
      const res = await salvarInscricaoPush(inscricaoParaServidor(sub));
      if (!res.ok) {
        await sub.unsubscribe();
        toast.error(res.erro);
        return;
      }
      setEstado("ativado");
      toast.success("Notificações ativadas!");
    } catch {
      toast.error("Não foi possível ativar as notificações neste aparelho.");
    } finally {
      setOcupado(false);
    }
  }

  async function desativar() {
    setOcupado(true);
    try {
      const sub = await (await registroSw())?.pushManager.getSubscription();
      if (sub) {
        await removerInscricaoPush(sub.endpoint);
        await sub.unsubscribe();
      }
      setEstado("disponivel");
      toast.success("Notificações desativadas.");
    } catch {
      toast.error("Não foi possível desativar. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  if (!CHAVE_PUBLICA || estado === "carregando") return null;

  if (modo === "convite") {
    if (estado !== "disponivel") return null;
    return (
      <Card className="flex-row items-center gap-3 p-4">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Bell className="size-5" />
        </span>
        <p className="min-w-0 flex-1 text-sm font-medium">
          Receber lembrete da mensalidade
        </p>
        <Button onClick={ativar} loading={ocupado} size="sm">
          Ativar
        </Button>
      </Card>
    );
  }

  const conteudo: Record<
    Exclude<Estado, "carregando">,
    { icone: typeof Bell; tom: string; titulo: string; texto: React.ReactNode }
  > = {
    disponivel: {
      icone: Bell,
      tom: "bg-primary/10 text-primary",
      titulo: "Ativar notificações",
      texto: "Receba o aviso da mensalidade antes de vencer e quando seu treino mudar.",
    },
    ativado: {
      icone: BellRing,
      tom: "bg-emerald-50 text-emerald-600",
      titulo: "Notificações ativadas",
      texto: "Você recebe os avisos neste aparelho.",
    },
    negado: {
      icone: BellOff,
      tom: "bg-amber-50 text-amber-600",
      titulo: "Notificações bloqueadas",
      texto: (
        <>
          Você bloqueou os avisos. Para liberar: toque no{" "}
          <strong>cadeado</strong> ao lado do endereço (ou em Configurações do
          app) → <strong>Notificações</strong> → <strong>Permitir</strong>, e
          recarregue a página.
        </>
      ),
    },
    ios_fora_do_app: {
      icone: Smartphone,
      tom: "bg-amber-50 text-amber-600",
      titulo: "Instale o app para receber avisos",
      texto: (
        <>
          No iPhone, as notificações só funcionam pelo app instalado. No
          Safari, toque em <Share className="inline size-3.5" /> e em{" "}
          <strong>Adicionar à Tela de Início</strong>. Depois abra pelo ícone.
        </>
      ),
    },
    nao_suportado: {
      icone: BellOff,
      tom: "bg-secondary text-muted-foreground",
      titulo: "Notificações indisponíveis",
      texto: "Este navegador não recebe avisos. No celular, use o Chrome (Android) ou o app instalado (iPhone).",
    },
  };
  const c = conteudo[estado];

  return (
    <Card className="gap-3 p-5">
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ${c.tom}`}
        >
          <c.icone className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{c.titulo}</p>
          {estado === "negado" || estado === "ios_fora_do_app" ? (
            <details className="text-sm text-muted-foreground">
              <summary className="cursor-pointer py-1 font-medium text-primary">
                Como liberar
              </summary>
              <p className="leading-relaxed">{c.texto}</p>
            </details>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">{c.texto}</p>
          )}
        </div>
      </div>
      {estado === "disponivel" ? (
        <Button onClick={ativar} loading={ocupado} className="w-full sm:w-auto">
          <Bell className="size-4" />
          Ativar notificações
        </Button>
      ) : estado === "ativado" ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={desativar}
          loading={ocupado}
          className="self-start"
        >
          Desativar neste aparelho
        </Button>
      ) : null}
    </Card>
  );
}
