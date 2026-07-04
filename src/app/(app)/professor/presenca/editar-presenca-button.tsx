"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CampoForm } from "@/components/ui-extra/campo-form";
import { atualizarPresenca } from "@/lib/acoes-presenca";

export function EditarPresencaButton({
  id,
  nome,
  data,
  hora,
}: {
  id: string;
  nome: string;
  data: string;
  hora: string | null;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [novaData, setNovaData] = useState(data);
  // input type=time usa HH:MM; o banco guarda HH:MM:SS.
  const [novaHora, setNovaHora] = useState(hora ? hora.slice(0, 5) : "");

  async function salvar() {
    setCarregando(true);
    const res = await atualizarPresenca(id, novaData, novaHora || null);
    setCarregando(false);
    if (res.ok) {
      setAberto(false);
      toast.success("Presença corrigida.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger
        aria-label="Editar presença"
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Pencil className="size-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Corrigir presença</DialogTitle>
          <DialogDescription>
            Ajuste a data ou o horário da presença de {nome}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoForm label="Data" htmlFor={`data-${id}`}>
            <Input
              id={`data-${id}`}
              type="date"
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
            />
          </CampoForm>
          <CampoForm
            label="Horário"
            htmlFor={`hora-${id}`}
            dica="Deixe vazio para “sem horário”."
          >
            <Input
              id={`hora-${id}`}
              type="time"
              value={novaHora}
              onChange={(e) => setNovaHora(e.target.value)}
            />
          </CampoForm>
        </div>
        <DialogFooter>
          <DialogClose
            render={<Button type="button" variant="outline" />}
            disabled={carregando}
          >
            Cancelar
          </DialogClose>
          <Button type="button" onClick={salvar} loading={carregando}>
            {carregando ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
