import { LogOut } from "lucide-react";

import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import type { Papel } from "@/lib/auth";
import { sairAction } from "@/lib/auth-actions";

const ROTULO_PAPEL: Record<Papel, string> = {
  admin: "Administrador",
  professor: "Professor",
  aluno: "Aluno",
};

/** Card do usuário logado no rodapé da sidebar, com botão de sair. */
export function UserCard({
  nome,
  papel,
}: {
  nome: string;
  papel: Papel;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
      <AvatarIniciais nome={nome} tamanho="md" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold text-white">{nome}</p>
        <p className="truncate text-xs text-white/60">{ROTULO_PAPEL[papel]}</p>
      </div>
      <form action={sairAction}>
        <button
          type="submit"
          aria-label="Sair"
          className="inline-flex size-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}
