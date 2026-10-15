import { CheckCircle2, Circle, Clock } from "lucide-react";

import { IconeWhatsApp } from "@/components/landing/icone-whatsapp";
import { buttonVariants } from "@/components/ui/button";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import { FrequenciaInline } from "@/components/ui-extra/frequencia";
import Link from "@/components/ui-extra/link";
import { StatusBadge } from "@/components/ui-extra/status-badge";
import type { FrequenciaAluno } from "@/lib/frequencia";
import { cn } from "@/lib/utils";

export type Aba = "financeiro" | "saude" | "treino" | "horarios" | "dados";

const ROTULO_ABA: Record<Aba, string> = {
  financeiro: "Financeiro",
  saude: "Saúde",
  treino: "Treino",
  horarios: "Horários",
  dados: "Dados",
};

/** Aba válida a partir do ?aba= (ou a padrão do perfil). */
export function resolverAba(valor: string | undefined, disponiveis: Aba[]): Aba {
  return disponiveis.includes(valor as Aba) ? (valor as Aba) : disponiveis[0]!;
}

/** wa.me a partir do telefone mascarado. */
export function linkWhatsApp(telefone: string | null): string | null {
  const d = (telefone ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.startsWith("55") && d.length > 11 ? d : `55${d}`}`;
}

/** Cabeçalho-resumo da ficha: quem é, situação e atalhos — sempre visível. */
export function CabecalhoAluno({
  nome,
  tipo,
  professorNome,
  status,
  telefone,
  horarios,
  frequencia,
  financeiro,
}: {
  nome: string;
  tipo: "presencial" | "online";
  professorNome: string | null;
  status: "ativo" | "inativo";
  telefone: string | null;
  /** "Seg e Qua às 07:00" — só presencial. */
  horarios: string | null;
  frequencia: FrequenciaAluno;
  /** Só para o admin. */
  financeiro?: { tom: "sucesso" | "alerta" | "perigo"; texto: string } | null;
}) {
  const wa = linkWhatsApp(telefone);
  return (
    <div className="mb-5 flex flex-wrap items-start gap-4">
      <AvatarIniciais nome={nome} tamanho="lg" className="size-14 text-lg" />
      <div className="min-w-0 flex-1 basis-56 space-y-2">
        <h1 className="font-heading text-2xl leading-tight font-bold">{nome}</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge tom={tipo === "online" ? "info" : "neutro"}>
            {tipo === "online" ? "Online" : "Presencial"}
          </StatusBadge>
          {status === "inativo" ? <StatusBadge tom="perigo">Inativo</StatusBadge> : null}
          {financeiro ? <StatusBadge tom={financeiro.tom}>{financeiro.texto}</StatusBadge> : null}
          {tipo === "presencial" && (frequencia.pct !== null || frequencia.novo) ? (
            <FrequenciaInline pct={frequencia.pct} novo={frequencia.novo} />
          ) : null}
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {professorNome ? <span>Prof. {professorNome}</span> : <span>Sem professor</span>}
          {tipo === "presencial" ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {horarios ?? "Sem horário fixo"}
            </span>
          ) : null}
        </p>
      </div>
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline" }), "w-full text-emerald-700 sm:w-auto")}
        >
          <IconeWhatsApp className="size-4" />
          WhatsApp
        </a>
      ) : null}
    </div>
  );
}

/** O que falta para o aluno ficar redondo (some quando está tudo ok). */
export function ChecklistAluno({
  itens,
}: {
  itens: { ok: boolean; texto: string; href: string }[];
}) {
  const faltam = itens.filter((i) => !i.ok);
  if (faltam.length === 0) return null;
  return (
    <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p className="mb-2 text-sm font-semibold">
        {faltam.length === 1 ? "Falta 1 passo" : `Faltam ${faltam.length} passos`} para este aluno ficar completo
      </p>
      <ul className="flex flex-wrap gap-2">
        {itens.map((i) => (
          <li key={i.texto}>
            {i.ok ? (
              <span className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm text-emerald-700 sm:h-9">
                <CheckCircle2 className="size-4" />
                {i.texto}
              </span>
            ) : (
              <Link
                href={i.href}
                className="inline-flex h-11 items-center gap-1.5 rounded-full bg-card px-3 text-sm font-medium ring-1 ring-border hover:ring-primary sm:h-9"
              >
                <Circle className="size-4 text-muted-foreground" />
                {i.texto}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Abas da ficha (links ?aba=, renderizadas no servidor). */
export function AbasFicha({
  base,
  atual,
  abas,
}: {
  base: string;
  atual: Aba;
  abas: Aba[];
}) {
  return (
    <nav
      aria-label="Seções da ficha do aluno"
      className="sticky top-16 z-20 -mx-4 mb-5 overflow-x-auto border-b bg-background/95 px-4 backdrop-blur lg:static lg:mx-0 lg:px-0"
    >
      <ul className="flex min-w-max gap-1">
        {abas.map((a) => (
          <li key={a}>
            <Link
              href={`${base}?aba=${a}`}
              aria-current={a === atual ? "page" : undefined}
              scroll={false}
              className={cn(
                "inline-flex h-12 items-center border-b-2 px-4 text-sm font-semibold transition-colors",
                a === atual
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {ROTULO_ABA[a]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
