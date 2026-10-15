"use client";

import { FileDown, FileText, RefreshCw, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cancelarNota, emitirNota, emitirNotasPendentes } from "@/lib/acoes-nfse";
import type { StatusNota } from "@/lib/nfse/regras";
import { cn } from "@/lib/utils";
import { plural } from "@/lib/formato";

export interface NotaResumo {
  id: string;
  status: StatusNota;
  numero: string | null;
  url_pdf: string | null;
  mensagem_erro: string | null;
}

const SELO: Record<StatusNota | "sem_nota", { rotulo: string; classe: string }> = {
  sem_nota: { rotulo: "Sem nota", classe: "bg-secondary text-muted-foreground" },
  aguardando_configuracao: {
    rotulo: "Aguardando API",
    classe: "bg-slate-100 text-slate-700",
  },
  processando: { rotulo: "Processando", classe: "bg-sky-50 text-sky-700" },
  autorizada: { rotulo: "Autorizada", classe: "bg-emerald-50 text-emerald-700" },
  erro: { rotulo: "Erro", classe: "bg-red-50 text-red-700" },
  cancelada: { rotulo: "Cancelada", classe: "bg-secondary text-muted-foreground line-through" },
};

export function SeloNota({ nota }: { nota: NotaResumo | null }) {
  const s = SELO[nota?.status ?? "sem_nota"];
  return (
    <span
      title={nota?.mensagem_erro ?? undefined}
      className={cn("rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", s.classe)}
    >
      {s.rotulo}
      {nota?.status === "autorizada" && nota.numero ? ` nº ${nota.numero}` : ""}
    </span>
  );
}

/** Coluna "Nota" de um recebimento: selo + ações conforme o status. */
export function NotaAcoes({
  pagamentoId,
  nota,
}: {
  pagamentoId: string;
  nota: NotaResumo | null;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const status = nota?.status ?? null;
  const podeEmitir = !status || status === "cancelada" || status === "aguardando_configuracao" || status === "erro";

  async function emitir() {
    setOcupado(true);
    const res = await emitirNota(pagamentoId);
    setOcupado(false);
    if (res.ok) toast.success(res.dados?.mensagem ?? "Nota enviada.");
    else toast.error(res.erro);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <SeloNota nota={nota} />
      {podeEmitir ? (
        <Button size="sm" variant="outline" onClick={emitir} loading={ocupado} className="sm:h-7 sm:px-2 sm:text-xs">
          <RefreshCw className="size-3.5" />
          {status === "erro" ? "Reemitir" : "Emitir"}
        </Button>
      ) : null}
      {status === "autorizada" && nota?.url_pdf ? (
        <a
          href={nota.url_pdf}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium hover:bg-secondary"
        >
          <FileText className="size-3.5" />
          PDF
        </a>
      ) : null}
      {status === "autorizada" && nota ? <CancelarNotaDialog notaId={nota.id} /> : null}
      {status === "erro" && nota?.mensagem_erro ? (
        <p className="w-full text-right text-[11px] leading-tight text-red-700">
          {nota.mensagem_erro}
        </p>
      ) : null}
    </div>
  );
}

function CancelarNotaDialog({ notaId }: { notaId: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const curta = justificativa.trim().length < 15;

  async function cancelar() {
    setOcupado(true);
    const res = await cancelarNota(notaId, justificativa);
    setOcupado(false);
    if (res.ok) {
      toast.success("Nota cancelada.");
      setAberto(false);
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger
        render={
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive sm:h-7 sm:px-2 sm:text-xs">
            <XCircle className="size-3.5" />
            Cancelar
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar nota fiscal</DialogTitle>
          <DialogDescription>
            O cancelamento vai para a prefeitura e não pode ser desfeito. Depois
            dá para emitir uma nova nota para esta mensalidade.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="justificativa">Justificativa</Label>
          <Textarea
            id="justificativa"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            maxLength={255}
            placeholder="Ex.: nota emitida com valor errado, será reemitida."
          />
          <p className={cn("text-xs", curta ? "text-muted-foreground" : "text-emerald-700")}>
            {justificativa.trim().length}/15 caracteres no mínimo
          </p>
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={cancelar} disabled={curta} loading={ocupado}>
            Cancelar nota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Emite em lote o que ficou aguardando a API ou deu erro. */
export function EmitirPendentesButton({ quantidade }: { quantidade: number }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  if (quantidade === 0) return null;

  async function emitir() {
    setOcupado(true);
    const res = await emitirNotasPendentes();
    setOcupado(false);
    if (res.ok && res.dados) {
      const { autorizadas, processando, pendentes } = res.dados;
      toast.success(
        `${plural(autorizadas, "autorizada", "autorizadas")}, ${processando} em processamento, ${plural(pendentes, "ainda pendente", "ainda pendentes")}.`,
      );
    } else if (!res.ok) {
      toast.error(res.erro);
    }
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={emitir} loading={ocupado}>
      <FileDown className="size-4" />
      Emitir notas pendentes ({quantidade})
    </Button>
  );
}
