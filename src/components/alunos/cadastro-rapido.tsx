"use client";

import { CheckCircle2, Mail, Phone, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CredencialBox } from "@/app/(app)/admin/alunos/gerar-acesso";
import { cadastrarAluno } from "@/app/(app)/admin/alunos/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Link from "@/components/ui-extra/link";
import { formatBRL, plural } from "@/lib/formato";
import { formatarTelefone } from "@/lib/mascaras";
import { cn } from "@/lib/utils";

export interface HorarioOpcao {
  id: string;
  professor_id: string;
  dia_semana: number;
  hora_inicio: string;
  capacidade: number | null;
  ocupados: number;
}

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const POR_PERIODO: Record<string, string> = {
  mensal: "mês",
  trimestral: "trimestre",
  semestral: "semestre",
  anual: "ano",
};

function hojeNoEstudio(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** Botões de escolha única, grandes (substitui select de 2–3 opções). */
function Segmentado<T extends string>({
  valor,
  opcoes,
  onChange,
  rotulo,
}: {
  valor: T;
  opcoes: { valor: T; rotulo: string }[];
  onChange: (v: T) => void;
  rotulo: string;
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="grid grid-cols-2 gap-2">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          onClick={() => onChange(o.valor)}
          className={cn(
            "h-11 rounded-lg border text-sm font-semibold transition-colors sm:h-10",
            valor === o.valor
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-background hover:bg-muted",
          )}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{titulo}</h2>
      {children}
    </section>
  );
}

/**
 * Cadastro do aluno numa tela só: dados → plano → horários → acesso.
 * Admin escolhe professor e plano; professor cadastra na própria carteira.
 */
export function CadastroRapido({
  modo,
  professores,
  planos,
  horarios,
  professorFixoId,
  destinoBase,
}: {
  modo: "admin" | "professor";
  professores: { id: string; nome: string }[];
  planos: { id: string; nome: string; valor: number; periodicidade: string }[];
  horarios: HorarioOpcao[];
  professorFixoId?: string;
  destinoBase: string;
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState<"presencial" | "online">("presencial");
  const [professorId, setProfessorId] = useState(
    professorFixoId ?? (professores.length === 1 ? professores[0]!.id : ""),
  );
  const [planoId, setPlanoId] = useState("");
  const [inicio, setInicio] = useState(hojeNoEstudio);
  const [dias, setDias] = useState<number[]>([]);
  const [hora, setHora] = useState("");
  const [gerarAcesso, setGerarAcesso] = useState(true);
  const [primeiraPaga, setPrimeiraPaga] = useState<"" | "Pix" | "Dinheiro" | "Cartão">("");
  const [salvando, setSalvando] = useState(false);
  const [erroNome, setErroNome] = useState<string | null>(null);
  const [pronto, setPronto] = useState<null | {
    id: string;
    acesso?: { email: string; senha: string };
    avisos: string[];
    resumo: string[];
  }>(null);

  const doProfessor = useMemo(
    () => horarios.filter((h) => h.professor_id === professorId),
    [horarios, professorId],
  );
  // Dias em que o professor tem aula; horas disponíveis nos dias escolhidos.
  const diasComAula = [...new Set(doProfessor.map((h) => h.dia_semana))].sort();
  const horas = [
    ...new Set(
      doProfessor
        .filter((h) => dias.length === 0 || dias.includes(h.dia_semana))
        .map((h) => h.hora_inicio.slice(0, 5)),
    ),
  ].sort();
  const escolhidos = dias
    .map((d) => doProfessor.find((h) => h.dia_semana === d && h.hora_inicio.slice(0, 5) === hora))
    .filter((h): h is HorarioOpcao => !!h);
  const diasSemHorario = hora
    ? dias.filter((d) => !doProfessor.some((h) => h.dia_semana === d && h.hora_inicio.slice(0, 5) === hora))
    : [];
  const plano = planos.find((p) => p.id === planoId);

  function alternarDia(d: number) {
    setDias((atual) => (atual.includes(d) ? atual.filter((x) => x !== d) : [...atual, d].sort()));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (nome.trim().length < 2) {
      setErroNome("Informe o nome do aluno.");
      return;
    }
    setSalvando(true);
    const acessoAgora = gerarAcesso && email.trim() !== "";
    const res = await cadastrarAluno({
      nome,
      telefone,
      email,
      tipo,
      professor_id: modo === "admin" ? professorId : undefined,
      plano_id: modo === "admin" ? planoId : undefined,
      data_inicio: inicio,
      horario_ids: tipo === "presencial" ? escolhidos.map((h) => h.id) : [],
      gerar_acesso: acessoAgora,
      primeira_paga: modo === "admin" && planoId && primeiraPaga ? primeiraPaga : undefined,
    });
    setSalvando(false);
    if (!res.ok || !res.dados) {
      toast.error(res.ok ? "Não foi possível cadastrar." : res.erro);
      return;
    }
    const resumo: string[] = [];
    if (plano)
      resumo.push(
        primeiraPaga
          ? `${plano.nome} · 1ª mensalidade paga (${primeiraPaga})`
          : `${plano.nome} · 1ª mensalidade vence ${inicio.split("-").reverse().join("/")}`,
      );
    if (escolhidos.length > 0)
      resumo.push(`${escolhidos.map((h) => DIAS[h.dia_semana]).join(", ")} às ${hora}`);
    setPronto({ ...res.dados, resumo });
    router.refresh();
  }

  if (pronto) {
    return (
      <Card className="mx-auto max-w-xl gap-5 p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-6" />
          </span>
          <div>
            <p className="font-heading text-lg font-bold">Cadastro de {nome.split(" ")[0]} concluído</p>
            {pronto.resumo.map((r) => (
              <p key={r} className="text-sm text-muted-foreground">{r}</p>
            ))}
          </div>
        </div>
        {pronto.avisos.length > 0 ? (
          <ul className="space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            {pronto.avisos.map((a) => (
              <li key={a}>• {a}</li>
            ))}
          </ul>
        ) : null}
        {pronto.acesso ? (
          <div className="space-y-3">
            <p className="font-semibold">Mande o acesso para o aluno:</p>
            <CredencialBox
              email={pronto.acesso.email}
              senha={pronto.acesso.senha}
              nome={nome}
              telefone={telefone || null}
            />
          </div>
        ) : null}
        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row">
          <Link
            href={`${destinoBase}/${pronto.id}`}
            className={cn(buttonVariants({ variant: pronto.acesso ? "outline" : "default" }), "sm:flex-1")}
          >
            Abrir ficha do aluno
          </Link>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setPronto(null);
              setNome("");
              setTelefone("");
              setEmail("");
              setDias([]);
              setHora("");
              setPlanoId("");
            }}
          >
            Cadastrar outro
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={salvar} className="mx-auto max-w-xl space-y-8 pb-24 sm:pb-0">
      <Secao titulo="Aluno">
        <div className="space-y-2">
          <Label htmlFor="nome">
            Nome completo<span className="ml-0.5 text-destructive">*</span>
          </Label>
          <div className="relative">
            <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="nome"
              autoFocus
              autoComplete="off"
              className="pl-9"
              value={nome}
              aria-invalid={!!erroNome}
              onChange={(e) => {
                setNome(e.target.value);
                setErroNome(null);
              }}
            />
          </div>
          {erroNome ? <p className="text-sm text-destructive">{erroNome}</p> : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="telefone">WhatsApp</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="telefone"
                type="tel"
                inputMode="tel"
                className="pl-9"
                placeholder="(47) 99999-0000"
                value={telefone}
                onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                className="pl-9"
                placeholder="para entrar no app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Como treina</Label>
          <Segmentado
            rotulo="Como treina"
            valor={tipo}
            onChange={setTipo}
            opcoes={[
              { valor: "presencial", rotulo: "Presencial" },
              { valor: "online", rotulo: "Online" },
            ]}
          />
        </div>
        {modo === "admin" && professores.length > 1 ? (
          <div className="space-y-2">
            <Label htmlFor="professor">Professor</Label>
            <select
              id="professor"
              value={professorId}
              onChange={(e) => {
                setProfessorId(e.target.value);
                setHora("");
              }}
              className="h-11 w-full rounded-lg border border-input bg-muted/50 px-3 text-base sm:h-9 sm:text-sm"
            >
              <option value="">Escolha o professor</option>
              {professores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </Secao>

      {modo === "admin" ? (
        <Secao titulo="Plano">
          <div className="grid gap-2">
            {planos.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={planoId === p.id}
                onClick={() => setPlanoId(planoId === p.id ? "" : p.id)}
                className={cn(
                  "flex min-h-12 items-center justify-between gap-3 rounded-lg border px-4 py-2 text-left transition-colors",
                  planoId === p.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted",
                )}
              >
                <span className="font-medium">{p.nome}</span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {formatBRL(p.valor)}/{POR_PERIODO[p.periodicidade] ?? p.periodicidade}
                </span>
              </button>
            ))}
            {planos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum plano ativo. Cadastre em Planos.</p>
            ) : null}
          </div>
          {plano ? (
            <div className="space-y-2">
              <Label htmlFor="inicio">1ª mensalidade vence em</Label>
              <Input id="inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
              <p className="text-sm text-muted-foreground">
                Depois renova sozinho todo {POR_PERIODO[plano.periodicidade] ?? "período"} nesse dia.
              </p>
              <Label className="pt-2">Já pagou a 1ª?</Label>
              <div role="radiogroup" aria-label="Já pagou a 1ª mensalidade?" className="flex flex-wrap gap-2">
                {(["", "Pix", "Dinheiro", "Cartão"] as const).map((f) => (
                  <button
                    key={f || "nao"}
                    type="button"
                    role="radio"
                    aria-checked={primeiraPaga === f}
                    onClick={() => setPrimeiraPaga(f)}
                    className={cn(
                      "h-11 rounded-full border px-4 text-sm font-semibold transition-colors sm:h-9",
                      primeiraPaga === f ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                    )}
                  >
                    {f === "" ? "Ainda não" : f}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem plano agora? Dá para matricular depois.</p>
          )}
        </Secao>
      ) : null}

      {tipo === "presencial" && professorId ? (
        <Secao titulo="Horários fixos">
          {diasComAula.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este professor ainda não tem horários na grade.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Dias</Label>
                <div className="flex flex-wrap gap-2">
                  {diasComAula.map((d) => (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={dias.includes(d)}
                      onClick={() => alternarDia(d)}
                      className={cn(
                        "h-11 min-w-14 rounded-full border px-4 text-sm font-semibold transition-colors sm:h-9",
                        dias.includes(d) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                      )}
                    >
                      {DIAS[d]}
                    </button>
                  ))}
                </div>
              </div>
              {dias.length > 0 ? (
                <div className="space-y-2">
                  <Label>Horário</Label>
                  <div className="flex flex-wrap gap-2">
                    {horas.map((h) => {
                      const lotados = dias.filter((d) => {
                        const s = doProfessor.find((x) => x.dia_semana === d && x.hora_inicio.slice(0, 5) === h);
                        return s && s.capacidade != null && s.ocupados >= s.capacidade;
                      });
                      return (
                        <button
                          key={h}
                          type="button"
                          aria-pressed={hora === h}
                          disabled={lotados.length > 0}
                          onClick={() => setHora(hora === h ? "" : h)}
                          title={lotados.length ? `Cheio: ${lotados.map((d) => DIAS[d]).join(", ")}` : undefined}
                          className={cn(
                            "h-11 rounded-full border px-4 text-sm font-semibold tabular-nums transition-colors sm:h-9",
                            hora === h ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                            lotados.length > 0 && "cursor-not-allowed border-dashed text-muted-foreground opacity-60",
                          )}
                        >
                          {h}
                          {lotados.length > 0 ? " · cheio" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {escolhidos.length > 0 ? (
                <p className="text-sm">
                  <span className="font-medium">
                    {escolhidos.map((h) => DIAS[h.dia_semana]).join(", ")} às {hora}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}· {plural(escolhidos.length, "aula", "aulas")} por semana
                  </span>
                </p>
              ) : null}
              {diasSemHorario.length > 0 ? (
                <p className="text-sm text-amber-700">
                  Sem aula às {hora} em {diasSemHorario.map((d) => DIAS[d]).join(", ")}. Ajuste depois na grade.
                </p>
              ) : null}
            </>
          )}
        </Secao>
      ) : null}

      <Secao titulo="Acesso ao app">
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <span>
            <span className="block font-medium">Criar acesso agora</span>
            <span className="block text-sm text-muted-foreground">
              {email.trim() ? "Gera a senha e a mensagem pronta para o WhatsApp." : "Precisa do e-mail do aluno."}
            </span>
          </span>
          <Switch
            checked={gerarAcesso && email.trim() !== ""}
            disabled={email.trim() === ""}
            onCheckedChange={(v) => setGerarAcesso(v === true)}
          />
        </label>
      </Secao>

      {/* Botão fixo na zona do polegar no celular */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto flex max-w-xl gap-2">
          <Button type="submit" size="lg" className="flex-1" loading={salvando}>
            {gerarAcesso && email.trim() ? "Salvar e gerar acesso" : "Salvar aluno"}
          </Button>
          <Link href={destinoBase} className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}>
            Cancelar
          </Link>
        </div>
      </div>
    </form>
  );
}
