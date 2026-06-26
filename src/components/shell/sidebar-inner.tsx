"use client";

import { LogoMarca } from "@/components/shell/logo-marca";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { UserCard } from "@/components/shell/user-card";
import type { Papel } from "@/lib/auth";
import { navPorPapel } from "@/lib/navegacao";

/**
 * Conteúdo da sidebar (fundo navy): marca, navegação e card do usuário.
 * Compartilhado entre a sidebar fixa (desktop) e o drawer (mobile).
 *
 * Deriva os itens a partir do `papel` aqui no client — os ícones (Lucide)
 * não podem cruzar a fronteira server→client como props.
 */
export function SidebarInner({
  papel,
  nome,
  onNavegar,
}: {
  papel: Papel;
  nome: string;
  onNavegar?: () => void;
}) {
  const itens = navPorPapel(papel);

  return (
    <div className="flex h-full flex-col gap-6 bg-[#033373] p-4">
      <div className="px-2 pt-2">
        <LogoMarca variante="navy" />
      </div>
      <SidebarNav itens={itens} onNavegar={onNavegar} />
      <UserCard nome={nome} papel={papel} />
    </div>
  );
}
