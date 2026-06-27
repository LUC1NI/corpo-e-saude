"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { aplicarTemplate } from "@/lib/acoes-treino";
import { TEMPLATES_TREINO } from "@/lib/templates-treino";

export function AplicarTemplate({ alunoId }: { alunoId: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [aplicando, setAplicando] = useState<string | null>(null);

  async function aplicar(id: string) {
    setAplicando(id);
    const res = await aplicarTemplate(alunoId, id);
    setAplicando(null);
    if (res.ok) {
      toast.success("Modelo aplicado. Ajuste o que quiser.");
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
          <Button variant="outline">
            <Sparkles className="size-4" />
            Usar modelo
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modelos de treino</DialogTitle>
          <DialogDescription>
            Gera uma ficha pronta (divisões, agenda e exercícios). Você ajusta o
            que quiser depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {TEMPLATES_TREINO.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.nome}</p>
                <p className="text-xs text-muted-foreground">{t.resumo}</p>
              </div>
              <Button
                size="sm"
                onClick={() => aplicar(t.id)}
                disabled={aplicando !== null}
              >
                {aplicando === t.id ? "Aplicando…" : "Aplicar"}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
