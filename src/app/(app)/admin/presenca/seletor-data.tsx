"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

import { progressoNavegacao } from "@/components/ui-extra/progresso-navegacao";
import { Input } from "@/components/ui/input";
import { CampoForm } from "@/components/ui-extra/campo-form";

/**
 * Escolhe a data cujas aulas o admin vai ver/marcar. Permite lançar presença
 * de dias anteriores (retroativo): o dono acerta o que ficou pendente.
 */
export function SeletorData({ data }: { data: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!pending) return;
    progressoNavegacao.iniciar();
    return () => {
      progressoNavegacao.terminar();
    };
  }, [pending]);

  return (
    <CampoForm label="Dia">
      <Input
        type="date"
        value={data}
        onChange={(e) => {
          const nova = e.target.value;
          if (!nova) return;
          startTransition(() => {
            router.push(`/admin/presenca?data=${nova}`);
          });
        }}
        className="w-44"
      />
    </CampoForm>
  );
}
