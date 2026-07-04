import Image from "next/image";

import { Revelar } from "@/components/landing/revelar";

const NUMEROS = [
  { valor: "+15", rotulo: "anos de história em Mafra" },
  { valor: "+300", rotulo: "alunos atendidos" },
  { valor: "100%", rotulo: "treino individual" },
];

/** Sobre o estúdio: foto real do personal + números de destaque. */
export function Sobre() {
  return (
    <section id="sobre" className="scroll-mt-24 bg-white">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
        <Revelar className="relative mx-auto w-full max-w-md lg:max-w-none">
          {/* Detalhe decorativo atrás da foto */}
          <div
            aria-hidden
            className="absolute -top-4 -left-4 -z-10 size-28 rounded-3xl bg-[#0090D8]/10"
          />
          <div
            aria-hidden
            className="absolute -right-4 -bottom-4 -z-10 size-28 rounded-3xl bg-[#033373]/8"
          />
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-xl ring-1 ring-black/5">
            <Image
              src="/images/personal-bracos-cruzados.jpg"
              alt="Personal trainer do Corpo & Saúde de braços cruzados no estúdio"
              fill
              sizes="(min-width: 1024px) 480px, 100vw"
              className="object-cover object-top"
            />
          </div>
        </Revelar>

        <div>
          <Revelar>
            <p className="text-xs font-bold tracking-widest text-[#0090D8] uppercase">
              Sobre o estúdio
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#18181A] sm:text-4xl">
              Um estúdio de personal feito para o seu objetivo
            </h2>
            <p className="mt-5 text-base leading-relaxed text-[#5a6b80]">
              No Corpo &amp; Saúde o atendimento é personalizado de verdade:
              turmas reduzidas, avaliação física completa e um treino montado
              para a sua rotina. Atendemos presencialmente em Mafra e também no
              formato online, com acompanhamento à distância. Seus objetivos
              são os nossos objetivos.
            </p>
            <p className="mt-6 border-l-4 border-[#0090D8] pl-4 text-lg font-bold text-[#033373] italic">
              “Treinar é viver.”
            </p>
          </Revelar>

          <Revelar delay={0.12}>
            <dl className="mt-10 grid grid-cols-3 gap-6">
              {NUMEROS.map((n) => (
                <div key={n.rotulo}>
                  <dt className="sr-only">{n.rotulo}</dt>
                  <dd className="text-3xl font-extrabold tracking-tight text-[#033373] sm:text-4xl">
                    {n.valor}
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
