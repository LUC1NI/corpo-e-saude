import { AlertTriangle, CheckCircle2, Download, FileText, FlaskConical } from "lucide-react";
import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { formatBRL, plural } from "@/lib/formato";
import { situacaoEmissao } from "@/lib/nfse/provedor";
import { carregarConfigFiscal } from "@/lib/nfse/servico";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { SeloNota, type NotaResumo } from "../nota-acoes";
import { resolverMes } from "../periodo";
import { SeletorMes } from "../seletor-mes";
import { ConfigFiscalForm } from "./config-fiscal-form";

export const metadata: Metadata = { title: "Nota fiscal" };

export default async function NotaFiscalPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  await requireUsuario(["admin"]);
  const periodo = resolverMes((await searchParams).mes);
  const supabase = await createClient();

  const [config, { data: notasData }] = await Promise.all([
    carregarConfigFiscal(supabase),
    supabase
      .from("notas_fiscais")
      .select("id, status, numero, url_pdf, mensagem_erro, valor, alunos(nome)")
      .gte("criado_em", `${periodo.inicio}T00:00:00-03:00`)
      .lt("criado_em", `${periodo.fimExclusivo}T00:00:00-03:00`)
      .order("criado_em", { ascending: false })
      .limit(200),
  ]);
  const notas = (notasData ?? []) as unknown as (NotaResumo & {
    valor: number;
    alunos: { nome: string } | null;
  })[];
  const s = situacaoEmissao(config);
  const totalAutorizado = notas
    .filter((n) => n.status === "autorizada")
    .reduce((t, n) => t + Number(n.valor), 0);

  const aviso =
    s.tipo === "ativa"
      ? s.ambiente === "producao"
        ? { icone: CheckCircle2, tom: "border-emerald-200 bg-emerald-50 text-emerald-900", texto: "Valendo: as notas têm valor fiscal." }
        : { icone: FlaskConical, tom: "border-sky-200 bg-sky-50 text-sky-900", texto: "Modo teste: as notas não têm valor fiscal." }
      : s.tipo === "simulacao"
        ? { icone: FlaskConical, tom: "border-violet-200 bg-violet-50 text-violet-900", texto: "Modo simulação (só no desenvolvimento): as notas são autorizadas de mentira para testar as telas." }
        : { icone: AlertTriangle, tom: "border-amber-200 bg-amber-50 text-amber-900", texto: s.motivo };

  return (
    <>
      <PageHeader
        titulo="Nota fiscal"
        subtitulo="Configuração e relatório mensal para o contador."
      />

      <div
        role="status"
        className={cn("mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm", aviso.tom)}
      >
        <aviso.icone className="mt-0.5 size-4 shrink-0" />
        <p className="font-medium">{aviso.texto}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
        <Card>
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
            <CardDescription>
              Os dados abaixo vêm do contador. A chave do emissor e o
              certificado digital são instalados pelo suporte, não aqui.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {config ? (
              <ConfigFiscalForm config={config} />
            ) : (
              <PageEmpty
                icone={AlertTriangle}
                titulo="Configuração não encontrada"
                descricao="Fale com o suporte do sistema."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Relatório para o contador</CardTitle>
            <CardDescription>
              {plural(notas.length, "nota", "notas")} em {periodo.rotulo} ·{" "}
              {formatBRL(totalAutorizado)} autorizados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SeletorMes periodo={periodo} base="/admin/financeiro/nota-fiscal" />
              <a
                href={`/admin/financeiro/nota-fiscal/csv?mes=${periodo.chave}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Download className="size-4" />
                Baixar CSV
              </a>
            </div>
            {notas.length === 0 ? (
              <PageEmpty
                icone={FileText}
                titulo="Nenhuma nota neste mês"
                descricao="As notas aparecem aqui conforme as mensalidades são pagas."
              />
            ) : (
              <ul className="divide-y rounded-lg border">
                {notas.map((n) => (
                  <li key={n.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{n.alunos?.nome ?? "Aluno"}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatBRL(Number(n.valor))}
                      </p>
                    </div>
                    <SeloNota nota={n} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
