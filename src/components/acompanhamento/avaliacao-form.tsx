"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CampoForm } from "@/components/ui-extra/campo-form";
import { criarAvaliacao } from "@/lib/acoes-acompanhamento";
import { hojeISO } from "@/lib/financeiro";
import {
  avaliacaoSchema,
  MEDIDAS_CAMPOS,
  normalizarAltura,
  type AvaliacaoInput,
} from "@/lib/schemas";

/** IMC ao vivo: peso / altura². Só calcula com os dois valores válidos. */
function calcularIMC(peso?: string, altura?: string): number | null {
  const p = Number(String(peso ?? "").replace(",", "."));
  const a = normalizarAltura(altura) ?? 0;
  if (!p || !a || p <= 0 || a <= 0) return null;
  return Math.round((p / (a * a)) * 10) / 10;
}

/** Faixa do IMC (OMS) para dar um contexto rápido ao número. */
function faixaIMC(imc: number): { rotulo: string; cor: string } {
  if (imc < 18.5) return { rotulo: "Abaixo do peso", cor: "text-amber-600" };
  if (imc < 25) return { rotulo: "Peso normal", cor: "text-emerald-600" };
  if (imc < 30) return { rotulo: "Sobrepeso", cor: "text-amber-600" };
  return { rotulo: "Obesidade", cor: "text-red-600" };
}

export function AvaliacaoForm({
  alunoId,
  alturaPadrao,
}: {
  alunoId: string;
  /** Última altura conhecida do aluno — pré-preenche o campo (facilita o IMC). */
  alturaPadrao?: number | null;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  const { register, handleSubmit, reset, watch } = useForm<
    z.input<typeof avaliacaoSchema>,
    unknown,
    AvaliacaoInput
  >({
    resolver: zodResolver(avaliacaoSchema),
    defaultValues: {
      data: hojeISO(),
      altura: alturaPadrao != null ? String(alturaPadrao) : undefined,
    },
  });

  const pesoAtual = watch("peso");
  const alturaAtual = watch("altura");
  const imc = calcularIMC(pesoAtual as string, alturaAtual as string);

  async function onSubmit(values: AvaliacaoInput) {
    setSalvando(true);
    const res = await criarAvaliacao(alunoId, values);
    setSalvando(false);
    if (res.ok) {
      toast.success("Avaliação registrada.");
      reset({
        data: hojeISO(),
        altura: alturaAtual as string | undefined,
      });
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-4">
        <CampoForm label="Data" htmlFor="data" obrigatorio>
          <Input id="data" type="date" {...register("data")} />
        </CampoForm>
        <CampoForm label="Peso (kg)" htmlFor="peso">
          <Input id="peso" type="number" step="0.1" {...register("peso")} />
        </CampoForm>
        <CampoForm
          label="Altura"
          htmlFor="altura"
          dica="Ex.: 1,86 ou 186. Necessária para o IMC."
        >
          <Input
            id="altura"
            type="number"
            step="0.01"
            placeholder="1.70"
            {...register("altura")}
          />
        </CampoForm>
        <CampoForm label="% Gordura" htmlFor="pg">
          <Input
            id="pg"
            type="number"
            step="0.1"
            {...register("percentual_gordura")}
          />
        </CampoForm>
      </div>

      {/* IMC calculado ao vivo — deixa claro que ele depende de peso + altura. */}
      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
        <span className="text-sm font-medium text-muted-foreground">IMC</span>
        {imc != null ? (
          <>
            <span className="text-lg font-bold tabular-nums">{imc}</span>
            <span className={`text-xs font-medium ${faixaIMC(imc).cor}`}>
              {faixaIMC(imc).rotulo}
            </span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            Preencha <strong>peso</strong> e <strong>altura</strong> para
            calcular automaticamente.
          </span>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Medidas (cm)</p>
        <div className="grid gap-4 sm:grid-cols-5">
          {MEDIDAS_CAMPOS.map((m) => (
            <CampoForm key={m.chave} label={m.rotulo} htmlFor={m.chave}>
              <Input
                id={m.chave}
                type="number"
                step="0.1"
                {...register(m.chave)}
              />
            </CampoForm>
          ))}
        </div>
      </div>

      <CampoForm label="Observações" htmlFor="obs">
        <Textarea id="obs" rows={2} {...register("observacoes")} />
      </CampoForm>

      <Button type="submit" loading={salvando}>
        <Plus className="size-4" />
        {salvando ? "Salvando…" : "Registrar avaliação"}
      </Button>
    </form>
  );
}
