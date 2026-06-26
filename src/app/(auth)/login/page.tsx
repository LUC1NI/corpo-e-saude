import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const mensagemInicial =
    erro === "inativo"
      ? "Sua conta está inativa. Fale com o studio."
      : erro === "link"
        ? "Link inválido ou expirado. Tente novamente."
        : undefined;

  return <LoginForm mensagemInicial={mensagemInicial} />;
}
