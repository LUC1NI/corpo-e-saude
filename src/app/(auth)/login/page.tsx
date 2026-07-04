import { ArrowLeft, Check } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { WHATSAPP_LINK } from "@/components/landing/dados";
import { IconeWhatsApp } from "@/components/landing/icone-whatsapp";
import Link from "@/components/ui-extra/link";
import { getUsuarioAtual, homePorPapel } from "@/lib/auth";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

const DESTAQUES = [
  "Personal do seu lado em cada série",
  "Treino sob medida para o seu objetivo",
  "Evolução acompanhada pelo aplicativo",
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  // Já logado? Vai direto para a área do seu papel (a landing pública em /
  // não redireciona mais; este é o ponto de entrada do sistema).
  const usuario = await getUsuarioAtual();
  if (usuario) {
    if (usuario.senhaProvisoria) redirect("/redefinir-senha?primeiro=1");
    redirect(homePorPapel(usuario.papel));
  }

  const { erro } = await searchParams;
  const mensagemInicial =
    erro === "inativo"
      ? "Sua conta está inativa. Fale com o studio."
      : erro === "link"
        ? "Link inválido ou expirado. Tente novamente."
        : undefined;

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Painel persuasivo (desktop): marca, promessa e convite para conhecer */}
      <section className="relative hidden overflow-hidden bg-[#033373] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-40 size-[420px] rounded-full bg-[#0090D8]/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-48 -left-48 size-[380px] rounded-full bg-[#00A8E4]/15 blur-3xl"
        />

        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
            <Image
              src="/icons/icon-192.png"
              alt="Logo Corpo & Saúde"
              width={36}
              height={36}
            />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold">Corpo &amp; Saúde</span>
            <span className="block text-[10px] font-medium tracking-wider text-white/60 uppercase">
              Personal Trainer Studio
            </span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <h1 className="text-4xl leading-[1.1] font-extrabold tracking-tight xl:text-5xl">
            Treinar é <span className="text-[#00A8E4]">viver</span>.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            Aqui você não treina sozinho: cada aluno tem um plano feito para o
            seu corpo, a sua rotina e o seu objetivo.
          </p>
          <ul className="mt-7 space-y-3.5">
            {DESTAQUES.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0090D8]/25 text-[#00A8E4]">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span className="text-sm font-medium text-white/90">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
          <p className="text-sm font-bold">Ainda não treina com a gente?</p>
          <p className="mt-1 text-sm leading-relaxed text-white/70">
            Agende uma aula experimental sem compromisso e conheça o estúdio.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0090D8] px-4 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(0,144,216,0.4)] transition-all hover:-translate-y-0.5 hover:bg-[#00A8E4] active:translate-y-0"
            >
              <IconeWhatsApp className="size-4" />
              Agendar pelo WhatsApp
            </a>
            <Link
              href="/"
              className="text-sm font-semibold text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Conhecer o estúdio
            </Link>
          </div>
        </div>
      </section>

      {/* Coluna do formulário */}
      <section className="flex flex-col bg-background p-6 sm:p-10">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar ao site
          </Link>
          {/* Marca compacta (só quando o painel navy está escondido) */}
          <span className="flex items-center gap-2 lg:hidden">
            <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white">
              <Image
                src="/icons/icon-192.png"
                alt="Logo Corpo & Saúde"
                width={26}
                height={26}
              />
            </span>
            <span className="text-sm font-bold text-[#033373]">
              Corpo &amp; Saúde
            </span>
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Bem-vindo de volta!
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Entre para ver seus treinos, sua evolução e suas mensalidades.
            </p>

            <div className="mt-7">
              <LoginForm mensagemInicial={mensagemInicial} />
            </div>

            {/* Convite para quem chegou aqui sem ser aluno (mobile) */}
            <div className="mt-8 rounded-2xl bg-[#033373] p-5 text-white lg:hidden">
              <p className="text-sm font-bold">Ainda não treina com a gente?</p>
              <p className="mt-1 text-sm leading-relaxed text-white/70">
                Agende uma aula experimental sem compromisso.
              </p>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0090D8] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#00A8E4]"
              >
                <IconeWhatsApp className="size-4" />
                Agendar pelo WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
