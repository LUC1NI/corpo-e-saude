import { redirect } from "next/navigation";

import { getUsuarioAtual, homePorPapel } from "@/lib/auth";

export default async function Home() {
  const usuario = await getUsuarioAtual();

  if (!usuario) redirect("/login");
  if (usuario.senhaProvisoria) redirect("/redefinir-senha?primeiro=1");

  redirect(homePorPapel(usuario.papel));
}
