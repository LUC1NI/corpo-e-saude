"use client";

import { CheckCircle2, Copy, QrCode } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { CNPJ, PIX_CHAVE, WHATSAPP_PRINCIPAL } from "@/components/landing/dados";
import { IconeWhatsApp } from "@/components/landing/icone-whatsapp";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatBRL } from "@/lib/formato";
import { pixCopiaECola } from "@/lib/pix";
import { cn } from "@/lib/utils";

/** Lembra (só neste aparelho) que o comprovante já foi enviado. */
const CHAVE_ENVIO = "cs-comprovante-enviado";
const SETE_DIAS = 7 * 86_400_000;

/**
 * Botão "Realizar pagamento" que abre o passo a passo do PIX: chave (CNPJ),
 * valor conforme o plano/pendências e o lembrete de enviar o comprovante.
 */
export function PagamentoPix({
  valor,
  descricao,
  variante = "principal",
  tamanho = "lg",
  aluno,
}: {
  valor: number;
  descricao: string;
  /** principal = botão azul · destaque = branco sobre cor · discreto = contorno */
  variante?: "principal" | "destaque" | "discreto";
  tamanho?: "lg" | "default";
  /** Nome do aluno, para o dono identificar o comprovante. */
  aluno?: string;
}) {
  // Lê o localStorage sem quebrar a hidratação (no servidor é sempre false).
  const salvoNoAparelho = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return Date.now() - Number(localStorage.getItem(`${CHAVE_ENVIO}:${valor}`) ?? 0) < SETE_DIAS;
      } catch {
        return false;
      }
    },
    () => false,
  );
  const [enviadoAgora, setEnviado] = useState(false);
  const enviado = salvoNoAparelho || enviadoAgora;

  const copiaECola = pixCopiaECola({
    chave: PIX_CHAVE,
    nome: "Corpo e Saude",
    cidade: "Mafra",
    valor,
    txid: "MENSALIDADE",
  });
  const linkComprovante = `https://wa.me/${WHATSAPP_PRINCIPAL}?text=${encodeURIComponent(
    `Olá! ${aluno ? `Sou ${aluno} e ` : ""}acabei de pagar ${descricao} (${formatBRL(valor)}) via Pix. Segue o comprovante.`,
  )}`;

  function marcarEnviado() {
    try {
      localStorage.setItem(`${CHAVE_ENVIO}:${valor}`, String(Date.now()));
    } catch {
      /* ignora */
    }
    setEnviado(true);
  }

  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(copiaECola);
      toast.success("Código Pix copiado! Cole no app do banco.");
    } catch {
      toast.error("Não foi possível copiar. Use a chave CNPJ abaixo.");
    }
  }
  async function copiarChave() {
    try {
      await navigator.clipboard.writeText(PIX_CHAVE);
      toast.success("Chave PIX copiada!");
    } catch {
      toast.error("Não foi possível copiar. Anote a chave: " + CNPJ);
    }
  }

  return (
    <>
    <Dialog>
      <DialogTrigger
        render={
          <Button
            size={tamanho}
            variant={variante === "principal" ? "default" : "outline"}
            className={cn(
              "w-full sm:w-auto",
              variante === "destaque" &&
                "border-0 bg-white text-foreground hover:bg-white/90",
              variante === "discreto" &&
                "border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white",
            )}
          >
            <QrCode className="size-4" />
            {variante === "discreto" ? "Pagar adiantado" : "Pagar com Pix"}
          </Button>
        }
      />
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Pagar com PIX</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-secondary/60 p-4 text-center">
          <p className="text-sm text-muted-foreground">Valor a pagar</p>
          <p className="font-heading text-3xl font-bold text-primary">
            {formatBRL(valor)}
          </p>
        </div>

        <ol className="space-y-4">
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              1
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-medium">Copie o código Pix (já com o valor)</p>
              <Button type="button" onClick={copiarCodigo} className="w-full">
                <Copy className="size-4" />
                Copiar Pix copia e cola
              </Button>
              <p className="pt-1 text-xs text-muted-foreground">Ou use a chave CNPJ:</p>
              <button
                type="button"
                onClick={copiarChave}
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-secondary/40"
              >
                <span className="truncate font-mono text-sm">{CNPJ}</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  <Copy className="size-3.5" />
                  Copiar
                </span>
              </button>
              <p className="text-xs text-muted-foreground">
                Favorecido: Corpo &amp; Saúde Personal Trainer Studio
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              2
            </span>
            <p className="text-sm font-medium">
              No app do banco, escolha Pix copia e cola e cole o código.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              3
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-medium">
                Envie o comprovante ao estúdio — não esqueça! É assim que sua
                mensalidade é confirmada.
              </p>
              <a
                href={linkComprovante}
                onClick={marcarEnviado}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <IconeWhatsApp className="size-4" />
                Enviar comprovante no WhatsApp
              </a>
            </div>
          </li>
        </ol>
      </DialogContent>
    </Dialog>
    {enviado ? (
      <p className={cn("mt-2 flex items-center justify-center gap-1.5 text-sm", variante === "principal" ? "text-emerald-700" : "text-white")}>
        <CheckCircle2 className="size-4" />
        Comprovante enviado. O studio confirma em breve.
      </p>
    ) : null}
    </>
  );
}