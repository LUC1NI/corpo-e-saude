import { differenceInCalendarDays, parseISO } from "date-fns";
import {
  AlertTriangle,
  ArrowUpRight,
  MessageCircle,
  PartyPopper,
  UserRound,
} from "lucide-react";
import Link from "@/components/ui-extra/link";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatCard } from "@/components/ui-extra/stat-card";
import { requireUsuario } from "@/lib/auth";
import { hojeISO, rotuloCompetencia } from "@/lib/financeiro";
import { formatBRL, formatData } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";

import { NavFinanceiro } from "../nav-financeiro";

interface Vencido {
  aluno_id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  alunos: { nome: string; telefone: string | null } | null;
}

interface Devedor {
  aluno_id: string;
  nome: string;
  telefone: string | null;
  total: number;
  mensalidades: { competencia: string; vencimento: string; valor: number }[];
  maisAntiga: string;
  diasAtraso: number;
}

/** Link de cobrança amigável no WhatsApp (se houver telefone). */
function linkWhatsApp(d: Devedor): string | null {
  if (!d.telefone) return null;
  let digitos = d.telefone.replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  if (digitos.length < 12) return null;
  const msg =
    `Olá, ${d.nome.split(" ")[0]}! Tudo bem? 😊\n\n` +
    `Passando para lembrar da mensalidade do Corpo & Saúde: ` +
    `${formatBRL(d.total)} em aberto (vencimento ${formatData(d.maisAntiga)}). ` +
    `Qualquer dúvida, estou à disposição!`;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(msg)}`;
}

export default async function InadimplentesPage() {
  await requireUsuario(["admin"]);
  const supabase = await createClient();
  const hoje = hojeISO();

  const { data } = await supabase
    .from("pagamentos")
    .select("aluno_id, competencia, vencimento, valor, alunos(nome, telefone)")
    .in("status", ["pendente", "vencido"])
    .lt("vencimento", hoje)
    .order("vencimento")
    .limit(300);

  const vencidos = (data ?? []) as unknown as Vencido[];

  // Agrupa por aluno com total, parcelas e atraso da mais antiga.
  const porAluno = new Map<string, Devedor>();
  for (const p of vencidos) {
    const atual = porAluno.get(p.aluno_id) ?? {
      aluno_id: p.aluno_id,
      nome: p.alunos?.nome ?? "Aluno",
      telefone: p.alunos?.telefone ?? null,
      total: 0,
      mensalidades: [],
      maisAntiga: p.vencimento,
      diasAtraso: 0,
    };
    atual.total += Number(p.valor);
    atual.mensalidades.push({
      competencia: p.competencia,
      vencimento: p.vencimento,
      valor: Number(p.valor),
    });
    if (p.vencimento < atual.maisAntiga) atual.maisAntiga = p.vencimento;
    porAluno.set(p.aluno_id, atual);
  }
  const devedores = [...porAluno.values()]
    .map((d) => ({
      ...d,
      diasAtraso: differenceInCalendarDays(
        parseISO(hoje),
        parseISO(d.maisAntiga),
      ),
    }))
    .sort((a, b) => b.total - a.total);

  const totalDevido = devedores.reduce((s, d) => s + d.total, 0);
  const maiorAtraso = devedores.reduce((m, d) => Math.max(m, d.diasAtraso), 0);

  return (
    <>
      <PageHeader
        titulo="Inadimplentes"
        subtitulo="Alunos com mensalidades vencidas — com atalho de cobrança pelo WhatsApp."
      />
      <NavFinanceiro ativa="/admin/financeiro/inadimplentes" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          titulo="Alunos inadimplentes"
          valor={String(devedores.length)}
          icone={UserRound}
          tomIcone={devedores.length > 0 ? "perigo" : "sucesso"}
          className="col-span-2 sm:col-span-1"
        />
        <StatCard
          titulo="Total vencido"
          valor={formatBRL(totalDevido)}
          icone={AlertTriangle}
          tomIcone={totalDevido > 0 ? "perigo" : "sucesso"}
        />
        <StatCard
          titulo="Maior atraso"
          valor={maiorAtraso > 0 ? `${maiorAtraso} dias` : "—"}
          icone={AlertTriangle}
          tomIcone={maiorAtraso > 30 ? "perigo" : "alerta"}
        />
      </div>

      {devedores.length === 0 ? (
        <Card>
          <PageEmpty
            icone={PartyPopper}
            titulo="Nenhum aluno inadimplente"
            descricao="Todas as mensalidades vencidas foram pagas. 🎉"
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {devedores.map((d) => {
            const whats = linkWhatsApp(d);
            return (
              <Card key={d.aluno_id} className="gap-0 p-0">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/admin/alunos/${d.aluno_id}`}
                      className="group flex min-w-0 items-center gap-3"
                    >
                      <AvatarIniciais nome={d.nome} tamanho="md" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold group-hover:text-primary">
                          {d.nome}
                          <ArrowUpRight className="ml-1 inline size-3.5 text-muted-foreground/50" />
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d.mensalidades.length} mensalidade(s) vencida(s) ·
                          há {d.diasAtraso} dia(s)
                        </p>
                      </div>
                    </Link>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold text-red-600 tabular-nums">
                        {formatBRL(d.total)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        total devido
                      </p>
                    </div>
                  </div>

                  <ul className="mt-4 divide-y rounded-lg border bg-muted/20">
                    {d.mensalidades.map((m, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {rotuloCompetencia(m.competencia)} · venceu{" "}
                          {formatData(m.vencimento)}
                        </span>
                        <span className="font-medium tabular-nums">
                          {formatBRL(m.valor)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {whats ? (
                      <a
                        href={whats}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 sm:flex-none"
                      >
                        <MessageCircle className="size-4" />
                        Cobrar no WhatsApp
                      </a>
                    ) : (
                      <span className="inline-flex flex-1 items-center justify-center rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground sm:flex-none">
                        Sem telefone cadastrado
                      </span>
                    )}
                    <Link
                      href={`/admin/alunos/${d.aluno_id}`}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border bg-card px-3.5 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 sm:flex-none"
                    >
                      Dar baixa
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
