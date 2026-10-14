import type { Metadata } from "next";

import { requireUsuario } from "@/lib/auth";

import { GuiaInstalacao } from "./guia-instalacao";

export const metadata: Metadata = { title: "Bem-vindo" };

/** Destino do aluno logo depois de criar a senha no primeiro acesso. */
export default async function BemVindoPage() {
  const usuario = await requireUsuario(["aluno"]);
  return <GuiaInstalacao nome={usuario.nome} />;
}
