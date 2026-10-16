import { ArrowLeft, Check, Star } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { WHATSAPP_LINK } from "@/components/landing/dados";
import { IconeWhatsApp } from "@/components/landing/icone-whatsapp";
import Link from "@/components/ui-extra/link";
import { getUsuarioAtual, homePorPapel } from "@/lib/auth";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar na área do aluno",
  description:
    "Entre na área do aluno do Corpo & Saúde, estúdio de personal trainer em Mafra/SC: horários, treinos, evolução e mensalidade.",
};

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
      ? "Sua conta está inativa. Fale com o estúdio."
      : erro === "link"
        ? "Link inválido ou expirado. Tente novamente."
        : undefined;

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Painel persuasivo (desktop): marca, promessa e convite para conhecer */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#021f47] via-[#033373] to-[#0353a8] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-40 size-[420px] rounded-full bg-[#0090D8]/35 blur-3xl [animation:pulse_9s_ease-in-out_infinite]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-48 -left-48 size-[380px] rounded-full bg-[#00A8E4]/20 blur-3xl [animation:pulse_11s_ease-in-out_infinite]"
        />
        {/* Textura de pontos sutil */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(125,211,252,0.35)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_75%)]"
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
            Treinar é{" "}
            <span className="bg-gradient-to-r from-[#00A8E4] via-[#38bdf8] to-[#7dd3fc] bg-clip-text text-transparent">
              viver
            </span>
            .
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            Aqui você não treina sozinho: cada aluno tem um plano feito para o
            seu corpo, a sua rotina e o seu objetivo.
          </p>
          <ul className="mt-7 space-y-3.5">
            {DESTAQUES.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0090D8]/40 to-[#00A8E4]/20 text-[#7dd3fc]">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span className="text-sm font-medium text-white/90">
                  {item}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex items-center gap-3 text-sm text-white/70">
            <span className="flex text-[#facc15]">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-current" />
              ))}
            </span>
            <span>
              <strong className="font-semibold text-white">+300 alunos</strong>{" "}
              em 15 anos de estúdio
            </span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0090D8]/25 via-white/5 to-transparent p-6 ring-1 ring-white/15">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-[#00A8E4]/25 blur-3xl"
          />
          <p className="relative text-sm font-bold">
            Ainda não treina com a gente?
          </p>
          <p className="relative mt-1 text-sm leading-relaxed text-white/70">
            Agende uma aula experimental sem compromisso e conheça o estúdio.
          </p>
          <div className="relative mt-4 flex flex-wrap items-center gap-3">
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cta-de to-cta-ate px-4 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(0,144,216,0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,168,228,0.6)] active:translate-y-0"
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
      <section className="relative flex flex-col overflow-hidden bg-background p-6 sm:p-10">
        {/* Brilho sutil no fundo da coluna do formulário */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 size-[360px] rounded-full bg-[#0090D8]/8 blur-3xl"
        />

        <div className="relative flex items-center justify-between gap-4">
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

        <div className="relative flex flex-1 flex-col items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Entre na sua{" "}
              <span className="bg-gradient-to-r from-[#0090D8] to-[#033373] bg-clip-text text-transparent">
                conta
              </span>
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Entre para ver seus treinos, sua evolução e suas mensalidades.
            </p>

            <div className="mt-7">
              <LoginForm mensagemInicial={mensagemInicial} />
            </div>

            {/* Convite para quem chegou aqui sem ser aluno (mobile) */}
            <div className="relative mt-8 overflow-hidden rounded-2xl bg-gradient-to-br from-[#021f47] via-[#033373] to-[#0353a8] p-5 text-white lg:hidden">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-12 -right-12 size-32 rounded-full bg-[#0090D8]/30 blur-2xl"
              />
              <p className="relative text-sm font-bold">
                Ainda não treina com a gente?
              </p>
              <p className="relative mt-1 text-sm leading-relaxed text-white/70">
                Agende uma aula experimental sem compromisso.
              </p>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="relative mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cta-de to-cta-ate px-4 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(0,144,216,0.4)] transition-all hover:-translate-y-0.5 active:translate-y-0"
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
