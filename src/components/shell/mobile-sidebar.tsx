"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { SidebarInner } from "@/components/shell/sidebar-inner";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Papel } from "@/lib/auth";

/** Botão de menu + drawer com a navegação (apenas mobile/tablet). */
export function MobileSidebar({
  papel,
  nome,
}: {
  papel: Papel;
  nome: string;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger
        aria-label="Abrir menu"
        className="inline-flex size-11 items-center justify-center rounded-lg border bg-background text-foreground hover:bg-muted lg:hidden"
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 border-0 bg-brand-navy p-0">
        <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
        <SidebarInner
          papel={papel}
          nome={nome}
          onNavegar={() => setAberto(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
