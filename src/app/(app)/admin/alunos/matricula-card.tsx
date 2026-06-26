"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CampoForm } from "@/components/ui-extra/campo-form";
import { StatusBadge } from "@/components/ui-extra/status-badge";
import {
  cancelarMatricula,
  criarMatricula,
} from "@/lib/acoes-financeiro";
import { formatBRL, formatData } from "@/lib/formato";
import { hojeISO } from "@/lib/financeiro";
import { ROTULO_PERIODICIDADE, type Periodicidade } from "@/lib/tipos";

interface PlanoOpcao {
  id: string;
  nome: string;
  valor: number;
  periodicidade: Periodicidade;
}

export interface MatriculaAtiva {
  id: string;
  plano_nome: string;
  valor: number;
  periodicidade: Periodicidade;
  data_proxima_cobranca: string;
  renovacao_automatica: boolean;
}

export function MatriculaCard({
  alunoId,
  planos,
  matricula,
}: {
  alunoId: string;
  planos: PlanoOpcao[];
  matricula: MatriculaAtiva | null;
}) {
  const router = useRouter();
  const [planoId, setPlanoId] = useState("");
  const [dataInicio, setDataInicio] = useState(hojeISO());
  const [renovacao, setRenovacao] = useState(true);
  const [salvando, setSalvando] = useState(false);

  async function matricular() {
    if (!planoId) {
      toast.error("Selecione um plano.");
      return;
    }
    setSalvando(true);
    const res = await criarMatricula(alunoId, {
      plano_id: planoId,
      data_inicio: dataInicio,
      renovacao_automatica: renovacao,
    });
    setSalvando(false);
    if (res.ok) {
      toast.success("Aluno matriculado.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  async function cancelar() {
    if (!matricula) return;
    setSalvando(true);
    const res = await cancelarMatricula(matricula.id, alunoId);
    setSalvando(false);
    if (res.ok) {
      toast.success("Matrícula cancelada.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  if (matricula) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{matricula.plano_nome}</p>
            <p className="text-sm text-muted-foreground">
              {formatBRL(matricula.valor)} ·{" "}
              {ROTULO_PERIODICIDADE[matricula.periodicidade]}
            </p>
          </div>
          <StatusBadge tom="sucesso">Matrícula ativa</StatusBadge>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Próxima cobrança:</span>{" "}
            {formatData(matricula.data_proxima_cobranca)}
          </p>
          <p>
            <span className="text-muted-foreground">Renovação automática:</span>{" "}
            {matricula.renovacao_automatica ? "Sim" : "Não"}
          </p>
        </div>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={cancelar}
          disabled={salvando}
        >
          Cancelar matrícula
        </Button>
      </div>
    );
  }

  if (planos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Cadastre um plano ativo antes de matricular o aluno.
      </p>
    );
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoForm label="Plano" obrigatorio>
          <Select
            value={planoId}
            onValueChange={(v) => setPlanoId(v ?? "")}
            items={Object.fromEntries(
              planos.map((p) => [p.id, `${p.nome} — ${formatBRL(p.valor)}`]),
            )}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um plano" />
            </SelectTrigger>
            <SelectContent>
              {planos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome} — {formatBRL(p.valor)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CampoForm>

        <CampoForm label="Início" htmlFor="data_inicio" obrigatorio>
          <Input
            id="data_inicio"
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </CampoForm>
      </div>

      <label className="flex items-center gap-3">
        <Switch checked={renovacao} onCheckedChange={setRenovacao} />
        <span className="text-sm font-medium">Renovação automática</span>
      </label>

      <Button type="button" onClick={matricular} disabled={salvando}>
        {salvando ? "Matriculando…" : "Matricular aluno"}
      </Button>
    </div>
  );
}
