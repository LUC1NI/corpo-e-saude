"use client";

import { Copy, QrCode } from "lucide-react";
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
import { cn } from "@/lib/utils";

const WHATSAPP_COMPROVANTE = `https://wa.me/${WHATSAPP_PRINCIPAL}?text=${encodeURIComponent(
  "Olá, Juliano! Acabei de pagar a mensalidade via PIX e estou enviando o comprovante.",
)}`;

/**
 * Botão "Realizar pagamento" que abre o passo a passo do PIX: chave (CNPJ),
 * valor conforme o plano/pendências e o lembrete de enviar o comprovante.
 */
export function PagamentoPix({
  valor,
  descricao,
  variante = "principal",
}: {
  valor: number;
  descricao: string;
  /** principal = botão azul · destaque = branco sobre cor · discreto = contorno */
  variante?: "principal" | "destaque" | "discreto";
}) {
  async function copiarChave() {
    try {
      await navigator.clipboard.writeText(PIX_CHAVE);
      toast.success("Chave PIX copiada!");
    } catch {
      toast.error("Não foi possível copiar. Anote a chave: " + CNPJ);
    }
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            size="lg"
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
              <p className="text-sm font-medium">Copie a chave PIX (CNPJ)</p>
              <button
                type="button"
                onClick={copiarChave}
                className="flex w-full items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-secondary/40"
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
              Abra o app do seu banco e pague usando a chave copiada.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              3
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-medium">
                Envie o comprovante ao Juliano — não esqueça! É assim que sua
                mensalidade é confirmada.
              </p>
              <a
                href={WHATSAPP_COMPROVANTE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <IconeWhatsApp className="size-4" />
                Enviar comprovante no WhatsApp
              </a>
            </div>
          </li>
        </ol>
      </DialogContent>
    </Dialog>
  );
}
