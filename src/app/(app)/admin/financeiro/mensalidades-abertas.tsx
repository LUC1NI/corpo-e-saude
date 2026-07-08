"use client";

import { CheckCircle2, Search } from "lucide-react";
import { useState } from "react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { StatusPagamento } from "@/components/ui-extra/status-badge";
import { TabelaResponsiva } from "@/components/ui-extra/tabela-responsiva";
import { rotuloCompetencia } from "@/lib/financeiro";
import { formatBRL, formatData } from "@/lib/formato";
import type { StatusPagamento as TStatusPagamento } from "@/lib/tipos";

import { BaixaButton } from "./baixa-button";
import { ExcluirPagamentoButton } from "./excluir-pagamento-button";

export interface PagamentoAberto {
  id: string;
  aluno_id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  status: TStatusPagamento;
  alunos: { nome: string } | null;
}

/** Ignora acentos e caixa na busca (ex.: "joao" encontra "João"). */
function normaliza(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();
}

export function MensalidadesAbertas({
  abertos,
  hoje,
}: {
  abertos: PagamentoAberto[];
  hoje: string;
}) {
  const [busca, setBusca] = useState("");
  const termo = normaliza(busca.trim());
  const filtrados = termo
    ? abertos.filter((p) => normaliza(p.alunos?.nome ?? "").includes(termo))
    : abertos;

  return (
    <Card className="mt-6 overflow-hidden p-0">
      <CardHeader className="gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Mensalidades em aberto</CardTitle>
        {abertos.length > 0 ? (
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar aluno…"
              aria-label="Buscar aluno nas mensalidades em aberto"
              className="pl-9"
            />
          </div>
        ) : null}
      </CardHeader>

      {abertos.length === 0 ? (
        <PageEmpty
          icone={CheckCircle2}
          titulo="Nenhuma mensalidade em aberto"
          descricao="As cobranças são geradas automaticamente conforme as matrículas ativas. Confirme cada recebimento pelo botão Confirmar."
        />
      ) : filtrados.length === 0 ? (
        <PageEmpty
          icone={Search}
          titulo="Nenhum aluno encontrado"
          descricao="Nenhuma mensalidade em aberto para essa busca."
        />
      ) : (
        <div className="p-3 sm:p-0">
          <TabelaResponsiva
            dados={filtrados}
            getKey={(p) => p.id}
            colunas={[
              {
                cabecalho: "Aluno",
                principal: true,
                celula: (p) => p.alunos?.nome ?? "-",
              },
              {
                cabecalho: "Competência",
                celula: (p) => rotuloCompetencia(p.competencia),
              },
              {
                cabecalho: "Vencimento",
                celula: (p) => {
                  const venc = p.status === "pendente" && p.vencimento < hoje;
                  return (
                    <span className={venc ? "text-destructive" : undefined}>
                      {formatData(p.vencimento)}
                    </span>
                  );
                },
              },
              { cabecalho: "Valor", celula: (p) => formatBRL(p.valor) },
              {
                cabecalho: "Status",
                celula: (p) => (
                  <StatusPagamento
                    status={
                      p.status === "pendente" && p.vencimento < hoje
                        ? "vencido"
                        : p.status
                    }
                  />
                ),
              },
              {
                cabecalho: "Ação",
                alinhar: "right",
                semRotuloMobile: true,
                celula: (p) => (
                  <div className="flex items-center justify-end gap-1">
                    <BaixaButton pagamentoId={p.id} />
                    <ExcluirPagamentoButton pagamentoId={p.id} />
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}
    </Card>
  );
}
