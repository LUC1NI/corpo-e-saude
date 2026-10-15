import Image from "next/image";

import { Contador } from "@/components/landing/contador";
import { Revelar } from "@/components/landing/revelar";

const NUMEROS = [
  { ate: 15, prefixo: "+", rotulo: "anos de história em Mafra" },
  { ate: 300, prefixo: "+", rotulo: "alunos atendidos" },
  { ate: 100, sufixo: "%", rotulo: "treino individual" },
];

/** Sobre o estúdio: foto real dos personal trainers + números animados. */
export function Sobre() {
  return (
    <section id="sobre" className="scroll-mt-24 bg-white">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
        <Revelar className="relative mx-auto w-full max-w-md lg:max-w-none">
          {/* Detalhes decorativos atrás da foto */}
          <div
            aria-hidden
            className="absolute -top-5 -left-5 -z-10 size-32 rounded-3xl bg-gradient-to-br from-[#0090D8]/20 to-[#0090D8]/5"
          />
          <div
            aria-hidden
            className="absolute -right-5 -bottom-5 -z-10 size-32 rounded-3xl bg-gradient-to-tl from-[#033373]/15 to-transparent"
          />
          <div className="rounded-3xl bg-gradient-to-br from-[#0090D8]/50 via-[#033373]/10 to-transparent p-[3px] shadow-xl">
            <div className="relative aspect-square overflow-hidden rounded-[calc(1.5rem-3px)]">
              <Image
                src="/images/donos-estudio.jpg"
                alt="Os dois personal trainers do Corpo & Saúde lado a lado no estúdio"
                fill
                sizes="(min-width: 1024px) 480px, 100vw"
                className="object-cover"
              />
            </div>
          </div>

          {/* Selo flutuante com o slogan */}
          <div className="animar-flutuar absolute -bottom-5 right-6 rounded-2xl bg-brand-navy px-5 py-3 shadow-xl [animation:flutuar_7s_ease-in-out_infinite]">
            <p className="text-sm font-bold text-white italic">
              “Treinar é viver.”
            </p>
          </div>
        </Revelar>

        <div>
          <Revelar>
            <p className="text-xs font-bold tracking-widest text-[#0090D8] uppercase">
              Sobre o estúdio
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#18181A] sm:text-4xl">
              Um estúdio de personal feito{" "}
              <span className="bg-gradient-to-r from-[#0090D8] to-[#033373] bg-clip-text text-transparent">
                para o seu objetivo
              </span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-[#5a6b80]">
              No Corpo &amp; Saúde o atendimento é personalizado de verdade:
              turmas reduzidas, avaliação física completa e um treino montado
              para a sua rotina. Atendemos presencialmente em Mafra e também no
              formato online, com acompanhamento à distância. Seus objetivos
              são os nossos objetivos.
            </p>
          </Revelar>

          <Revelar delay={0.12}>
            <dl className="mt-10 grid grid-cols-3 gap-6">
              {NUMEROS.map((n) => (
                <div
                  key={n.rotulo}
                  className="rounded-2xl bg-[#F4F7FB] p-4 ring-1 ring-black/5"
                >
                  <dt className="sr-only">{n.rotulo}</dt>
                  <dd className="bg-gradient-to-r from-[#033373] to-[#0090D8] bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
                    <Contador
                      ate={n.ate}
                      prefixo={n.prefixo ?? ""}
                      sufixo={n.sufixo ?? ""}
                    />
                  </dd>
                  <p className="mt-1 text-xs leading-snug text-[#5a6b80] sm:text-sm">
                    {n.rotulo}
                  </p>
                </div>
              ))}
            </dl>
          </Revelar>
        </div>
      </div>
    </section>
  );
}
