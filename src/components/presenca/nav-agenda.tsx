import { CalendarCheck, Clock, TrendingUp } from "lucide-react";

import { AbasLinks } from "@/components/ui-extra/abas-links";

type AbaAgenda = "chamada" | "grade" | "frequencia";

/** Agenda = chamada do dia + grade de horários (+ frequência, só para o dono). */
export function NavAgenda({ papel, ativa, data }: { papel: "admin" | "professor"; ativa: AbaAgenda; data?: string }) {
  const base = `/${papel}`;
  const sufixo = data ? `data=${data}` : "";
  const itens = [
    { id: "chamada", href: `${base}/presenca${sufixo ? `?${sufixo}` : ""}`, rotulo: "Chamada do dia", icone: CalendarCheck },
    { id: "grade", href: `${base}/horarios`, rotulo: "Grade", icone: Clock },
    ...(papel === "admin" ? [{ id: "frequencia", href: `${base}/presenca?aba=frequencia`, rotulo: "Frequência", icone: TrendingUp }] : []),
  ];
  return <AbasLinks rotulo="Seções da agenda" itens={itens.map(({ id, ...i }) => ({ ...i, ativa: id === ativa }))} />;
}
