import { format, startOfMonth } from "date-fns";
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  LineChart,
  Moon,
} from "lucide-react";
import Link from "@/components/ui-extra/link";

import { Card } from "@/components/ui/card";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import { requireUsuario } from "@/lib/auth";
import { getAlunoAtual } from "@/lib/aluno";
import { createClient } from "@/lib/supabase/server";
import { getTreinosDoAluno } from "@/lib/treino";
import { diaDaSemanaHoje } from "@/lib/treino-utils";
import { DIAS_SEMANA, type TreinoComTudo } from "@/lib/tipos";

export default async function AlunoHome() {
  const usuario = await requireUsuario(["aluno"]);
  const primeiro = usuario.nome.split(" ")[0];
  const diaHoje = diaDaSemanaHoje();

  const aluno = await getAlunoAtual();
  let treinos: TreinoComTudo[] = [];
  let pendencias = 0;
  let temAvaliacoes = false;
  let presencasMes = 0;

  if (aluno) {
    const supabase = await createClient();
    const inicioMes = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const [treinosData, { count: pend }, { count: avals }, { count: pres }] =
      await Promise.all([
        getTreinosDoAluno(aluno.id),
        supabase
          .from("pagamentos")
          .select("id", { count: "exact", head: true })
          .eq("aluno_id", aluno.id)
          .neq("status", "pago"),
        supabase
          .from("avaliacoes_fisicas")
          .select("id", { count: "exact", head: true })
          .eq("aluno_id", aluno.id),
        supabase
          .from("presencas")
          .select("id", { count: "exact", head: true })
          .eq("aluno_id", aluno.id)
          .gte("data", inicioMes),
      ]);
    treinos = treinosData;
    pendencias = pend ?? 0;
    temAvaliacoes = (avals ?? 0) > 0;
    presencasMes = pres ?? 0;
  }

  const ativos = treinos.filter((t) => t.ativo);
  const principal = ativos[0] ?? null;
  const divisaoHoje =
    principal?.divisoes.find((d) => d.dias_semana.includes(diaHoje)) ?? null;
  const emDia = pendencias === 0;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-[#033373] p-5 text-white shadow-sm lg:p-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70">Olá,</p>
            <p className="text-xl font-bold lg:text-2xl">{primeiro} 👋</p>
          </div>
          <AvatarIniciais
            nome={usuario.nome}
            tamanho="lg"
            className="ring-2 ring-white/20"
          />
        </div>

        <Link
          href="/aluno/mensalidade"
          className="mt-4 flex items-center gap-3 rounded-xl bg-white/10 p-3 transition-colors hover:bg-white/15 lg:max-w-sm"
        >
          <span
            className={
              emDia
                ? "inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/90 text-white"
                : "inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white"
            }
          >
            {emDia ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <AlertCircle className="size-4" />
            )}
          </span>
          <div className="flex-1 text-sm leading-tight">
            <p className="font-medium">Situação financeira</p>
            <p className="text-xs text-white/60">
              {emDia ? "Tudo em dia" : `${pendencias} mensalidade(s) em aberto`}
            </p>
          </div>
          <ChevronRight className="size-4 text-white/50" />
        </Link>
      </section>

      {/* Treino de hoje */}
      <section>
        <h2 className="mb-2 font-heading text-base font-bold">Treino de hoje</h2>

        {divisaoHoje ? (
          <Link href="/aluno/treino">
            <Card className="gap-3 p-5 transition-colors hover:border-primary/40 hover:bg-secondary/30">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                  {divisaoHoje.nome}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {divisaoHoje.foco || `Treino ${divisaoHoje.nome}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {divisaoHoje.exercicios.length} exercício(s) ·{" "}
                    {DIAS_SEMANA[diaHoje]}
                  </p>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" />
              </div>

              {divisaoHoje.exercicios.length ? (
                <ul className="flex flex-wrap gap-1.5">
                  {divisaoHoje.exercicios.slice(0, 5).map((ex) => (
                    <li
                      key={ex.id}
                      className="rounded-md bg-secondary px-2 py-0.5 text-xs"
                    >
                      {ex.exercicio?.nome ?? "Exercício"}
                    </li>
                  ))}
                  {divisaoHoje.exercicios.length > 5 ? (
                    <li className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      +{divisaoHoje.exercicios.length - 5}
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </Card>
          </Link>
        ) : principal ? (
          <Link href="/aluno/treino">
            <Card className="flex-row items-center gap-3 p-5 transition-colors hover:border-primary/40 hover:bg-secondary/30">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                <Moon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Dia de descanso</p>
                <p className="text-xs text-muted-foreground">
                  Nada agendado para hoje. Toque para ver sua ficha completa.
                </p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Card>
          </Link>
        ) : (
          <Card className="flex-row items-center gap-3 p-5">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
              <Dumbbell className="size-5" />
            </span>
            <div>
              <p className="font-semibold">Treino em breve</p>
              <p className="text-xs text-muted-foreground">
                Seu treino aparece aqui quando o professor montar a ficha.
              </p>
            </div>
          </Card>
        )}
      </section>

      {/* Frequência do mês */}
      <Card className="flex-row items-center gap-3 p-5">
        <span
          className={
            presencasMes > 0
              ? "inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
              : "inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground"
          }
        >
          <CalendarCheck className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {presencasMes > 0
              ? `${presencasMes} treino${presencasMes > 1 ? "s" : ""} este mês`
              : "Nenhum treino este mês"}
          </p>
          <p className="text-xs text-muted-foreground">
            {presencasMes > 0
              ? "Continue nesse ritmo! 💪"
              : "Suas presenças aparecem aqui quando registradas."}
          </p>
        </div>
      </Card>

      {/* Evolução */}
      <Link href="/aluno/evolucao">
        <Card className="flex-row items-center gap-3 p-5 transition-colors hover:border-primary/40 hover:bg-secondary/30">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LineChart className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Sua evolução</p>
            <p className="text-xs text-muted-foreground">
              {temAvaliacoes
                ? "Acompanhe peso, % de gordura e medidas."
                : "Seus gráficos chegam com a avaliação física."}
            </p>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Card>
      </Link>
    </div>
  );
}
