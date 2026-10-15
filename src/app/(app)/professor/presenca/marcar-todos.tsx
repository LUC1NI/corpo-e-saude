"use client";

import { CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { marcarTodosPresentes } from "@/lib/acoes-presenca";

/** "Todos presentes": marca a turma inteira; depois é só desmarcar quem faltou. */
export function MarcarTodos({
  alunoIds,
  data,
  hora,
  professorId = null,
}: {
  alunoIds: string[];
  data: string;
  hora: string | null;
  professorId?: string | null;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  if (alunoIds.length < 2) return null;
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      loading={ocupado}
      onClick={async () => {
        setOcupado(true);
        const res = await marcarTodosPresentes(alunoIds, data, hora, professorId);
        setOcupado(false);
        if (!res.ok) {
          toast.error(res.erro);
          return;
        }
        toast.success("Todos marcados. Desmarque quem faltou.");
        router.refresh();
      }}
    >
      <CheckCheck className="size-4" />
      Todos presentes
    </Button>
  );
}
