import {
  CalendarClock,
  ClipboardList,
  Dumbbell,
  LineChart,
  Smartphone,
  UserRound,
} from "lucide-react";

import { Revelar } from "@/components/landing/revelar";

const ITENS = [
  {
    icone: UserRound,
    titulo: "Personal do seu lado",
    texto:
      "Acompanhamento atento e técnica em cada movimento. Você não precisa evoluir sozinho: tem cuidado durante toda a aula.",
  },
  {
    icone: ClipboardList,
    titulo: "Treino 100% individual",
    texto:
      "Cada treino nasce da sua anamnese, avaliação física e objetivo. Nada de planilha genérica copiada de outro aluno.",
  },
  {
    icone: CalendarClock,
    titulo: "Hora marcada, sem lotação",
    texto:
      "Você treina em horário reservado, sem fila de aparelho e sem se sentir perdido no meio de uma academia cheia.",
  },
  {
    icone: LineChart,
    titulo: "Evolução comprovada",
    texto:
      "Reavaliações físicas periódicas mostram em números o que mudou: peso, medidas e composição corporal.",
  },
  {
    icone: Smartphone,
    titulo: "Aplicativo do aluno",
    texto:
      "Seus treinos, presenças, evolução e mensalidades na palma da mão, com app instalável direto na tela do celular.",
  },
  {
    icone: Dumbbell,
    titulo: "Estrutura completa",
    texto:
      "Equipamentos e pesos livres bem cuidados para treinos de força, hipertrofia e condicionamento físico.",
  },
];

/** Diferenciais do estúdio em cards com ícones. */
export function Diferenciais() {
  return (
    <section id="diferenciais" className="scroll-mt-24 bg-[#F4F7FB]">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 lg:px-8 lg:py-28">
        <Revelar className="text-center">
          <p className="text-xs font-bold tracking-widest text-[#0090D8] uppercase">
            Por que treinar aqui
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#18181A] sm:text-4xl">
            Qual é o nosso diferencial?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#5a6b80]">
            A diferença entre treinar por treinar e treinar com segurança,
            eficiência e um plano feito para você.
          </p>
        </Revelar>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ITENS.map((item, i) => {
            const Icone = item.icone;
            return (
              <Revelar key={item.titulo} delay={(i % 3) * 0.1}>
                <article className="group h-full rounded-2xl bg-white p-7 shadow-sm ring-1 ring-black/5 transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-[#0090D8]/20">
                  <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[#033373] text-white shadow-md transition-colors group-hover:bg-[#0090D8]">
                    <Icone className="size-5.5" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-[#18181A]">
                    {item.titulo}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5a6b80]">
                    {item.texto}
                  </p>
                </article>
              </Revelar>
            );
          })}
        </div>
      </div>
    </section>
  );
}
