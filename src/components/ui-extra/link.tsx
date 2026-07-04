"use client";

import NextLink from "next/link";

import { SensorProgressoLink } from "@/components/ui-extra/progresso-navegacao";

/**
 * Substituto do `next/link` que aciona a barra de progresso de navegação.
 * Uso idêntico ao `Link` do Next — importe daqui no lugar de "next/link" para
 * que qualquer clique dê feedback imediato ("algo está acontecendo").
 *
 * O `SensorProgressoLink` é um filho que não renderiza nada; ele apenas lê o
 * estado de carregamento deste link (`useLinkStatus`) e alimenta a barra.
 */
export default function Link({
  children,
  ...props
}: React.ComponentProps<typeof NextLink>) {
  return (
    <NextLink {...props}>
      {children}
      <SensorProgressoLink />
    </NextLink>
  );
}
