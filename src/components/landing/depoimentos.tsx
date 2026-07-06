import { Star } from "lucide-react";

import { Revelar } from "@/components/landing/revelar";
import { cn } from "@/lib/utils";

const DEPOIMENTOS = [
  {
    texto:
      "Perdi 9 kg em 5 meses sem passar fome. O acompanhamento de perto faz toda a diferença, me sinto segura treinando.",
    nome: "Mariana Oliveira",
    detalhe: "Aluna há 4 meses",
    iniciais: "MO",
    tom: "bg-[#033373]",
  },
  {
    texto:
      "Voltei a treinar depois de uma lesão e o cuidado com a execução me deu confiança. Hoje treino sem dor e mais forte.",
    nome: "Pedro Henrique",
    detalhe: "Aluno há 1 ano",
    iniciais: "PH",
    tom: "bg-[#0090D8]",
  },
  {
    texto:
      "Faço o treino online e recebo tudo pelo app. Mesmo à distância parece que o personal está do meu lado. Recomendo demais!",
    nome: "Juliana Fernandes",
    detalhe: "Aluna há 7 meses",
    iniciais: "JF",
    tom: "bg-emerald-500",
  },
];

/** Depoimentos de alunos (prova social). */
export function Depoimentos() {
  return (
    <section id="depoimentos" className="scroll-mt-24 bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 lg:px-8 lg:py-28">
        <Revelar className="text-center">
          <p className="text-xs font-bold tracking-widest text-[#0090D8] uppercase">
            Quem treina, recomenda
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#18181A] sm:text-4xl">
            Depoimentos de alunos
          </h2>
        </Revelar>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DEPOIMENTOS.map((d, i) => (
            <Revelar key={d.nome} delay={i * 0.1} className="h-full">
              <figure className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-[#F4F7FB] p-7 ring-1 ring-black/5 transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-[#0090D8]/20">
                {/* Aspas decorativas */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-3 right-4 font-serif text-[88px] leading-none font-bold text-[#0090D8]/10 select-none"
                >
                  &ldquo;
                </span>
                <div
                  className="flex gap-1 text-[#0090D8]"
                  aria-label="5 de 5 estrelas"
                >
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="size-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-[#18181A]/80">
                  “{d.texto}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                      d.tom,
                    )}
                  >
                    {d.iniciais}
                  </span>
                  <span className="leading-tight">
                    <span className="block text-sm font-bold text-[#18181A]">
                      {d.nome}
                    </span>
                    <span className="block text-xs text-[#5a6b80]">
                      {d.detalhe}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </Revelar>
          ))}
        </div>
      </div>
    </section>
  );
}
