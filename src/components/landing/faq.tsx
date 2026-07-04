import { Plus } from "lucide-react";

import { WHATSAPP_LINK } from "@/components/landing/dados";
import { Revelar } from "@/components/landing/revelar";

export const PERGUNTAS = [
  {
    pergunta: "Nunca treinei na vida. Posso começar?",
    resposta:
      "Pode, e esse é justamente o melhor cenário para ter um personal. A maioria dos nossos alunos começou do zero. O treino parte do seu nível atual e o professor acompanha cada movimento, então você aprende a execução correta desde o primeiro dia, sem medo de se machucar.",
  },
  {
    pergunta: "Qual a diferença para uma academia convencional?",
    resposta:
      "Em uma academia comum você recebe uma ficha e treina por conta própria. Aqui o atendimento é individual: horário reservado, treino montado para o seu objetivo e um profissional do seu lado corrigindo a técnica e ajustando as cargas. Você não divide a atenção com dezenas de pessoas.",
  },
  {
    pergunta: "Como funciona a aula experimental?",
    resposta:
      "É simples: você chama a gente no WhatsApp e agenda um horário. Na aula, você conhece o estúdio, conversa sobre seus objetivos e faz um treino adaptado ao seu nível, sem compromisso.",
  },
  {
    pergunta: "Tenho uma lesão ou restrição médica. Posso treinar?",
    resposta:
      "Na grande maioria dos casos, sim: o exercício orientado costuma ser parte da recuperação. Antes de começar você preenche uma anamnese completa (histórico de saúde, dores, cirurgias, medicamentos) e o treino é montado respeitando suas limitações. Quando necessário, alinhamos com o seu médico ou fisioterapeuta.",
  },
  {
    pergunta: "Como funciona o treino online?",
    resposta:
      "Depois da anamnese e da definição do objetivo, seu treino é montado sob medida e fica disponível no aplicativo, organizado por divisões (A, B, C...). O personal acompanha seu progresso à distância, faz ajustes periódicos e fica disponível para tirar dúvidas.",
  },
  {
    pergunta: "Quais são os horários de atendimento?",
    resposta:
      "O atendimento é com hora marcada, com opções de manhã, tarde e noite. Como as vagas por horário são limitadas (é isso que garante o atendimento individual), o ideal é consultar a disponibilidade atual pelo WhatsApp.",
  },
  {
    pergunta: "Quanto custa?",
    resposta:
      "O valor depende da frequência semanal e da modalidade (presencial ou online). Chame no WhatsApp que a gente monta o plano ideal para a sua rotina e passa os valores e condições sem compromisso.",
  },
  {
    pergunta: "O que preciso levar para treinar?",
    resposta:
      "Apenas roupa confortável para exercícios, tênis, uma garrafa de água e toalha. Equipamentos, acessórios e orientação ficam por nossa conta.",
  },
];

/** Perguntas frequentes em acordeões nativos (details/summary, sem JS). */
export function Faq() {
  return (
    <section id="duvidas" className="scroll-mt-24 bg-[#F4F7FB]">
      <div className="mx-auto w-full max-w-3xl px-4 py-20 lg:px-8 lg:py-28">
        <Revelar className="text-center">
          <p className="text-xs font-bold tracking-widest text-[#0090D8] uppercase">
            Perguntas frequentes
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#18181A] sm:text-4xl">
            Ficou com alguma dúvida?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#5a6b80]">
            Separamos as respostas para o que mais perguntam antes de começar.
          </p>
        </Revelar>

        <div className="mt-12 space-y-3">
          {PERGUNTAS.map((item, i) => (
            <Revelar key={item.pergunta} delay={Math.min(i * 0.05, 0.3)}>
              <details className="group rounded-2xl bg-white ring-1 ring-black/5 transition-shadow open:shadow-md hover:ring-[#0090D8]/20">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-left font-bold text-[#18181A] select-none [&::-webkit-details-marker]:hidden">
                  <span className="text-sm sm:text-base">{item.pergunta}</span>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0090D8]/10 text-[#0090D8] transition-transform duration-200 group-open:rotate-45">
                    <Plus className="size-4" strokeWidth={2.5} />
                  </span>
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-[#5a6b80] sm:text-[15px]">
                  {item.resposta}
                </p>
              </details>
            </Revelar>
          ))}
        </div>

        <Revelar className="mt-10 text-center">
          <p className="text-sm text-[#5a6b80]">
            Não achou sua resposta?{" "}
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#0090D8] underline-offset-4 transition-colors hover:text-[#033373] hover:underline"
            >
              Pergunte direto no WhatsApp
            </a>
            {" "}e a gente responde rapidinho.
          </p>
        </Revelar>
      </div>
    </section>
  );
}
