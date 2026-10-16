import { getUsuarioAtual } from "@/lib/auth";
import { formatarCpf } from "@/lib/cpf";
import { linhaCsv } from "@/lib/nfse/regras";
import { createClient } from "@/lib/supabase/server";

import { resolverMes } from "../../periodo";

export const dynamic = "force-dynamic";

const ROTULO_STATUS: Record<string, string> = {
  aguardando_configuracao: "Guardada (aguardando emissão)",
  processando: "Processando",
  autorizada: "Autorizada",
  erro: "Erro",
  cancelada: "Cancelada",
};

/** CSV das notas do mês para o contador (número, data, aluno, CPF, valor, status). */
export async function GET(request: Request): Promise<Response> {
  const usuario = await getUsuarioAtual();
  if (!usuario?.ativo || usuario.papel !== "admin") {
    return new Response("Não autorizado.", { status: 403 });
  }

  const periodo = resolverMes(new URL(request.url).searchParams.get("mes") ?? undefined);
  const supabase = await createClient();
  const { data } = await supabase
    .from("notas_fiscais")
    .select("numero, emitida_em, criado_em, valor, status, aluno_id, alunos(nome)")
    .gte("criado_em", `${periodo.inicio}T00:00:00-03:00`)
    .lt("criado_em", `${periodo.fimExclusivo}T00:00:00-03:00`)
    .order("criado_em");
  const notas = (data ?? []) as unknown as {
    numero: string | null;
    emitida_em: string | null;
    criado_em: string;
    valor: number;
    status: string;
    aluno_id: string;
    alunos: { nome: string } | null;
  }[];

  // CPFs numa consulta só (tabela separada, só admin lê).
  const ids = [...new Set(notas.map((n) => n.aluno_id))];
  const { data: fiscais } = ids.length
    ? await supabase.from("alunos_dados_fiscais").select("aluno_id, cpf").in("aluno_id", ids)
    : { data: [] };
  const cpfPorAluno = new Map(
    ((fiscais ?? []) as { aluno_id: string; cpf: string | null }[]).map((f) => [f.aluno_id, f.cpf]),
  );

  const data_br = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const linhas = [
    linhaCsv(["Número", "Data", "Aluno", "CPF", "Valor", "Status"]),
    ...notas.map((n) => {
      const cpf = cpfPorAluno.get(n.aluno_id);
      return linhaCsv([
        n.numero,
        data_br(n.emitida_em ?? n.criado_em),
        n.alunos?.nome,
        cpf ? formatarCpf(cpf) : "",
        Number(n.valor).toFixed(2).replace(".", ","),
        ROTULO_STATUS[n.status] ?? n.status,
      ]);
    }),
  ];

  // BOM: o Excel abre com acentos certos.
  return new Response(`﻿${linhas.join("\r\n")}\r\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="notas-fiscais-${periodo.chave}.csv"`,
      "cache-control": "no-store",
    },
  });
}
