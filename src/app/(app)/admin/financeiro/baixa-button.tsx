"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { desfazerBaixa, marcarPagamentoPago } from "@/lib/acoes-financeiro";
import { formatBRL, formatMesAno } from "@/lib/formato";
import { FORMAS_PAGAMENTO } from "@/lib/schemas";
import { cn } from "@/lib/utils";

/** Data de hoje (yyyy-MM-dd) no fuso do estúdio, no navegador. */
function hojeNoEstudio(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/**
 * Botão "Recebi" da mensalidade: escolhe a forma (1 toque) e confirma.
 * Mostra de quem, qual mês e quanto — e oferece Desfazer no aviso.
 */
export function BaixaButton({
  pagamentoId,
  aluno,
  competencia,
  valor,
  rotulo,
  className,
}: {
  pagamentoId: string;
  aluno: string;
  competencia: string;
  valor: number;
  /** Texto do botão (padrão "Recebi"). */
  rotulo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(hojeNoEstudio);
  // Qual botão disparou a baixa (para o spinner aparecer só nele).
  const [formaEmCurso, setFormaEmCurso] = useState<string | null>(null);
  const primeiroNome = aluno.split(" ")[0];

  async function desfazer() {
    const res = await desfazerBaixa(pagamentoId);
    if (res.ok) {
      toast.success("Baixa desfeita.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  async function baixar(forma?: (typeof FORMAS_PAGAMENTO)[number]) {
    setFormaEmCurso(forma ?? "__sem__");
    const res = await marcarPagamentoPago({ pagamentoId, forma, data });
    setFormaEmCurso(null);
    if (!res.ok) {
      toast.error(res.erro);
      return;
    }
    setAberto(false);
    toast.success(`Recebido ${formatBRL(valor)} de ${primeiroNome}`, {
      description: [`${formatMesAno(competencia)}${forma ? ` · ${forma}` : ""}`, res.dados?.avisoNota]
        .filter(Boolean)
        .join(" — "),
      action: { label: "Desfazer", onClick: desfazer },
      duration: 8000,
    });
    router.refresh();
  }

  const ocupado = formaEmCurso !== null;

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (v) setData(hojeNoEstudio());
      }}
    >
      <DialogTrigger className={cn(buttonVariants({ size: "sm" }), "gap-1.5", className)}>
        <Check className="size-4" />
        {rotulo ?? "Recebi"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Receber de {aluno}</DialogTitle>
          <DialogDescription>
            {formatMesAno(competencia)} ·{" "}
            <strong className="text-foreground">{formatBRL(valor)}</strong>
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm font-medium">Como pagou?</p>
        <div className="grid grid-cols-2 gap-2">
          {FORMAS_PAGAMENTO.map((forma) => (
            <Button
              key={forma}
              type="button"
              variant="outline"
              disabled={ocupado || !data}
              loading={formaEmCurso === forma}
              onClick={() => baixar(forma)}
            >
              {forma}
            </Button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`data-${pagamentoId}`}>Pago em</Label>
          <Input
            id={`data-${pagamentoId}`}
            type="date"
            value={data}
            max={hojeNoEstudio()}
            onChange={(e) => setData(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          disabled={ocupado || !data}
          loading={formaEmCurso === "__sem__"}
          onClick={() => baixar()}
          className="w-full"
        >
          Registrar sem forma
        </Button>
      </DialogContent>
    </Dialog>
  );
}
