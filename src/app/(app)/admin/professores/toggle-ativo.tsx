"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";

import { alternarAtivoProfessor } from "./actions";

export function ToggleAtivoProfessor({
  id,
  ativo,
}: {
  id: string;
  ativo: boolean;
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function alternar(novo: boolean) {
    setCarregando(true);
    const res = await alternarAtivoProfessor(id, novo);
    setCarregando(false);
    if (res.ok) {
      toast.success(novo ? "Professor ativado." : "Professor desativado.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      <Switch
        checked={ativo}
        onCheckedChange={alternar}
        disabled={carregando}
      />
      {ativo ? "Ativo" : "Inativo"}
    </label>
  );
}
