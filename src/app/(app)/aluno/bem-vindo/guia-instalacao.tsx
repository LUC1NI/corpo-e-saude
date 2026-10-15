"use client";

import {
  BellRing,
  Download,
  EllipsisVertical,
  type LucideIcon,
  Share,
  SquarePlus,
  Smartphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  dispensarInstalacao,
  instalarApp,
  plataforma,
  rodandoComoApp,
  usePromptInstalacao,
  type Plataforma,
} from "@/lib/pwa";

interface Passo {
  icone: LucideIcon;
  texto: React.ReactNode;
}

const PASSOS_IOS: Passo[] = [
  {
    icone: Share,
    texto: (
      <>
        No <strong>Safari</strong>, toque em <strong>Compartilhar</strong> (o
        quadrado com a seta, na barra de baixo).
      </>
    ),
  },
  {
    icone: SquarePlus,
    texto: (
      <>
        Role a lista e toque em <strong>Adicionar à Tela de Início</strong>.
      </>
    ),
  },
  {
    icone: Smartphone,
    texto: (
      <>
        Toque em <strong>Adicionar</strong>. O ícone do Corpo &amp; Saúde
        aparece na tela do celular.
      </>
    ),
  },
];

const PASSOS_ANDROID: Passo[] = [
  {
    icone: EllipsisVertical,
    texto: (
      <>
        No <strong>Chrome</strong>, toque no menu <strong>⋮</strong> (canto de
        cima).
      </>
    ),
  },
  {
    icone: Download,
    texto: (
      <>
        Toque em <strong>Instalar app</strong> ou{" "}
        <strong>Adicionar à tela inicial</strong>.
      </>
    ),
  },
  {
    icone: Smartphone,
    texto: <>Confirme. O ícone do Corpo &amp; Saúde aparece na tela do celular.</>,
  },
];

/**
 * Guia de "adicionar à tela de início" mostrado uma vez, logo depois de o
 * aluno criar a senha. "Pular"/"Continuar" grava a mesma marca do lembrete,
 * então nenhum dos dois aparece de novo.
 */
export function GuiaInstalacao({ nome }: { nome: string }) {
  const router = useRouter();
  const evento = usePromptInstalacao();
  const [plat, setPlat] = useState<Plataforma | null>(null);

  useEffect(() => {
    // Já está no app instalado: nada a ensinar.
    if (rodandoComoApp()) {
      router.replace("/aluno");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- detecção de plataforma só é possível no cliente, após montar.
    setPlat(plataforma());
  }, [router]);

  function continuar() {
    dispensarInstalacao();
    router.replace("/aluno");
  }

  async function instalar() {
    if (await instalarApp()) continuar();
  }

  const passos = plat === "ios" ? PASSOS_IOS : PASSOS_ANDROID;

  return (
    <div className="mx-auto max-w-md space-y-5">
      <section className="rounded-2xl bg-brand-navy p-6 text-white shadow-sm">
        <p className="text-sm text-white/70">Senha criada com sucesso.</p>
        <h1 className="mt-1 text-2xl font-extrabold">
          Bem-vindo(a), {nome.split(" ")[0]}! 🎉
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/80">
          Coloque o Corpo &amp; Saúde na tela do seu celular para abrir em um
          toque, como um aplicativo.
        </p>
      </section>

      {plat === null ? null : plat === "outro" ? (
        <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
          Para instalar, abra este mesmo endereço no <strong>navegador do seu
          celular</strong> e entre com o seu e-mail e a senha que você acabou de
          criar.
        </div>
      ) : (
        <section className="space-y-3 rounded-2xl border bg-card p-5">
          <h2 className="font-heading text-base font-bold">
            {plat === "ios" ? "No iPhone" : "No Android"}
          </h2>

          {plat === "android" && evento ? (
            <Button size="lg" className="w-full" onClick={instalar}>
              <Download className="size-4" />
              Instalar o app agora
            </Button>
          ) : (
            <ol className="space-y-3">
              {passos.map((p, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <p.icone className="size-5" />
                    <span className="absolute -top-1.5 -left-1.5 inline-flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                  </span>
                  <p className="pt-1 text-sm leading-relaxed">{p.texto}</p>
                </li>
              ))}
            </ol>
          )}

          {plat === "ios" ? (
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              <BellRing className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <p>
                No iPhone, os <strong>avisos de mensalidade e de treino</strong>{" "}
                só funcionam depois de adicionar à tela de início. Abra sempre
                pelo ícone.
              </p>
            </div>
          ) : null}
        </section>
      )}

      <div className="flex flex-col gap-2">
        <Button size="lg" onClick={continuar}>
          {plat === "outro" ? "Ir para a minha área" : "Já instalei, continuar"}
        </Button>
        {plat !== "outro" ? (
          <Button variant="ghost" onClick={continuar}>
            Pular
          </Button>
        ) : null}
      </div>
    </div>
  );
}
