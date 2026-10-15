"use client";

import { Bell, LogOut } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import Link from "@/components/ui-extra/link";
import { sairAction } from "@/lib/auth-actions";

/** Avatar do aluno no topo: abre o menu com Notificações e Sair (longe do toque acidental). */
export function MenuAluno({ nome }: { nome: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Abrir menu da conta"
        className="rounded-full p-0.5 outline-none focus-visible:ring-3 focus-visible:ring-primary/40"
      >
        <AvatarIniciais nome={nome} tamanho="md" className="size-11" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel className="truncate">{nome}</DropdownMenuLabel>
        <DropdownMenuItem render={<Link href="/aluno/mensalidade#notificacoes" />} className="min-h-11">
          <Bell className="size-4" />
          Notificações
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void sairAction()} className="min-h-11 text-destructive">
          <LogOut className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
