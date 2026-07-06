import {
  ClipboardCheck,
  Dumbbell,
  MessagesSquare,
  TrendingUp,
} from "lucide-react";

import { Revelar } from "@/components/landing/revelar";

const PASSOS = [
  {
    icone: MessagesSquare,
    titulo: "Conversa e anamnese",
    texto:
      "Tudo começa com uma conversa: seus objetivos, rotina, histórico de saúde e limitações. É o que garante um treino seguro e feito para você.",
  },
  {
    icone: ClipboardCheck,
    titulo: "Avaliação física completa",
    texto:
      "Medimos peso, circunferências e composição corporal para saber exatamente o ponto de partida e poder comprovar a evolução depois.",
  },
  {
    icone: Dumbbell,
    titulo: "Treino sob medida",
    texto:
      "Seu treino é montado do zero para o seu objetivo, com o personal ao lado corrigindo a execução em cada série.",
  },
  {
    icone: TrendingUp,
    titulo: "Evolução acompanhada",
    texto:
      "Reavaliações periódicas e ajustes constantes no treino. Você acompanha tudo pelo aplicativo: treinos, presenças e gráficos de evolução.",
  },
];

/** Passo a passo da jornada do aluno, do primeiro contato à evolução. */
export function ComoFunciona() {
  return (
    <section id="como-funciona" className="scroll-mt-24 bg-[#F4F7FB]">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 lg:px-8 lg:py-28">
        <Revelar className="text-center">
          <p className="text-xs font-bold tracking-widest text-[#0090D8] uppercase">
            Como funciona
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#18181A] sm:text-4xl">
            Seu primeiro treino em 4 passos
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#5a6b80]">
            Nada de chegar e se sentir perdido: aqui todo aluno passa pelo mesmo
            caminho cuidadoso, do primeiro contato ao resultado.
          </p>
        </Revelar>

        <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PASSOS.map((passo, i) => {
            const Icone = passo.icone;
            return (
              <Revelar key={passo.titulo} delay={i * 0.1} className="h-full">
                <li className="group relative h-full">
                  {/* Linha conectando os passos (só no desktop, exceto o último) */}
                  {i < PASSOS.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute top-12 left-[calc(100%-8px)] z-10 hidden h-0.5 w-[calc(2rem+16px)] bg-gradient-to-r from-[#0090D8]/50 to-[#0090D8]/10 lg:block"
                    />
                  )}
                  <div className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 transition-all group-hover:-translate-y-1 group-hover:shadow-lg group-hover:ring-[#0090D8]/25">
                    <span className="relative inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#033373] to-[#0090D8] text-white shadow-lg shadow-[#033373]/25 transition-transform group-hover:scale-105">
                      <Icone className="size-6" />
                      <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-[#00A8E4] text-[11px] font-bold text-white ring-2 ring-white">
                        {i + 1}
                      </span>
                    </span>
                    <h3 className="mt-5 text-base font-bold text-[#18181A]">
                      {passo.titulo}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#5a6b80]">
                      {passo.texto}
                    </p>
                  </div>
                </li>
              </Revelar>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
