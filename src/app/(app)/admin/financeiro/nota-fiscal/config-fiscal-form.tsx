"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

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
import { Textarea } from "@/components/ui/textarea";
import { CampoForm } from "@/components/ui-extra/campo-form";
import { comRede } from "@/lib/acoes";
import { salvarConfigFiscal } from "@/lib/acoes-nfse";
import type { ConfigFiscal } from "@/lib/nfse/regras";
import { configFiscalSchema, type ConfigFiscalInput } from "@/lib/schemas";

/** Códigos próprios de Mafra (guia da Focus NFe). Confirme com o contador. */
const NATUREZAS: Record<string, string> = {
  "101": "101 · ISS devido a Mafra",
  "102": "102 · ISS devido a outro município",
  "103": "103 · Isenta",
  "104": "104 · Imune",
  "105": "105 · ISS retido",
  "106": "106 · ISS fixo",
  "107": "107 · Simples Nacional",
  "108": "108 · Simples Nacional, outro município",
  "109": "109 · MEI",
  "110": "110 · Simples Nacional, ISS retido",
  "111": "111 · Prestador sediado em Mafra",
  "112": "112 · Retido por instituição financeira",
};

const AMBIENTES = { homologacao: "Teste (sem valor fiscal)", producao: "Valendo (nota de verdade)" };
const APIS = {
  nfse: "Municipal (Mafra hoje)",
  nfsen: "Nacional",
};
const REGIMES = { mei: "MEI", simples_nacional: "Simples Nacional", outro: "Outro" };

function SelectSimples({
  value,
  onChange,
  itens,
}: {
  value: string;
  onChange: (v: string) => void;
  itens: Record<string, string>;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")} items={itens}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecione" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(itens).map(([v, r]) => (
          <SelectItem key={v} value={v}>
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ConfigFiscalForm({ config }: { config: ConfigFiscal }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<z.input<typeof configFiscalSchema>, unknown, ConfigFiscalInput>({
    resolver: zodResolver(configFiscalSchema),
    defaultValues: {
      ...config,
      cnpj: config.cnpj ?? "",
      inscricao_municipal: config.inscricao_municipal ?? "",
      codigo_servico: config.codigo_servico ?? "",
      codigo_tributacao_nacional: config.codigo_tributacao_nacional ?? "",
      aliquota_iss: config.aliquota_iss ?? "",
      natureza_operacao: config.natureza_operacao ?? "",
    },
  });
  const api = useWatch({ control, name: "api_nfse" });

  async function onSubmit(values: ConfigFiscalInput) {
    setSalvando(true);
    const res = await comRede(salvarConfigFiscal(values));
    setSalvando(false);
    if (res.ok) {
      toast.success("Configuração salva.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  const interruptor = (
    nome: "ativo" | "emitir_automaticamente_na_baixa",
    titulo: string,
    texto: string,
  ) => (
    <Controller
      control={control}
      name={nome}
      render={({ field }) => (
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border p-4">
          <span>
            <span className="block text-sm font-semibold">{titulo}</span>
            <span className="block text-xs text-muted-foreground">{texto}</span>
          </span>
          <Switch checked={!!field.value} onCheckedChange={field.onChange} />
        </label>
      )}
    />
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {interruptor(
          "ativo",
          "Emissão ligada",
          "Desligada: as notas ficam guardadas e saem todas de uma vez quando você ligar.",
        )}
        {interruptor(
          "emitir_automaticamente_na_baixa",
          "Nota automática ao receber",
          "Ao marcar uma mensalidade como recebida, a nota sai sozinha (com a emissão ligada).",
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <CampoForm label="Ambiente" erro={errors.ambiente?.message}>
          <Controller
            control={control}
            name="ambiente"
            render={({ field }) => (
              <SelectSimples value={field.value} onChange={field.onChange} itens={AMBIENTES} />
            )}
          />
        </CampoForm>
        <CampoForm label="Tipo de NFS-e" erro={errors.api_nfse?.message}>
          <Controller
            control={control}
            name="api_nfse"
            render={({ field }) => (
              <SelectSimples value={field.value} onChange={field.onChange} itens={APIS} />
            )}
          />
        </CampoForm>
        <CampoForm label="Regime tributário" erro={errors.regime?.message}>
          <Controller
            control={control}
            name="regime"
            render={({ field }) => (
              <SelectSimples value={field.value} onChange={field.onChange} itens={REGIMES} />
            )}
          />
        </CampoForm>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <CampoForm label="CNPJ do estúdio" htmlFor="cnpj" erro={errors.cnpj?.message}>
          <Input id="cnpj" inputMode="numeric" {...register("cnpj")} placeholder="Só números" />
        </CampoForm>
        <CampoForm
          label="Inscrição municipal"
          htmlFor="inscricao_municipal"
          erro={errors.inscricao_municipal?.message}
        >
          <Input id="inscricao_municipal" {...register("inscricao_municipal")} />
        </CampoForm>
      </div>

      {api === "nfse" ? (
        <div className="grid gap-5 sm:grid-cols-3">
          <CampoForm
            label="Código de serviço (LC 116)"
            htmlFor="codigo_servico"
            dica="Ex.: 06.04 (atividades físicas)."
            erro={errors.codigo_servico?.message}
          >
            <Input id="codigo_servico" {...register("codigo_servico")} placeholder="06.04" />
          </CampoForm>
          <CampoForm
            label="Alíquota de ISS (%)"
            htmlFor="aliquota_iss"
            erro={errors.aliquota_iss?.message}
          >
            <Input id="aliquota_iss" inputMode="decimal" {...register("aliquota_iss")} placeholder="2,00" />
          </CampoForm>
          <CampoForm label="Natureza da operação" erro={errors.natureza_operacao?.message}>
            <Controller
              control={control}
              name="natureza_operacao"
              render={({ field }) => (
                <SelectSimples
                  value={(field.value as string | undefined) ?? ""}
                  onChange={field.onChange}
                  itens={NATUREZAS}
                />
              )}
            />
          </CampoForm>
        </div>
      ) : (
        <CampoForm
          label="Código de tributação nacional"
          htmlFor="codigo_tributacao_nacional"
          dica="6 dígitos, ex.: 060401. Confirme com o contador."
          erro={errors.codigo_tributacao_nacional?.message}
        >
          <Input
            id="codigo_tributacao_nacional"
            {...register("codigo_tributacao_nacional")}
            placeholder="060401"
            className="sm:max-w-48"
          />
        </CampoForm>
      )}

      <CampoForm
        label="Descrição do serviço na nota"
        htmlFor="descricao_servico_padrao"
        dica="Use {plano}, {mes}, {ano} e {aluno}. Ex.: Mensalidade {plano}, competência {mes}/{ano}."
        erro={errors.descricao_servico_padrao?.message}
      >
        <Textarea id="descricao_servico_padrao" rows={2} {...register("descricao_servico_padrao")} />
      </CampoForm>

      <div className="border-t pt-5">
        <Button type="submit" loading={salvando}>
          {salvando ? "Salvando…" : "Salvar configuração"}
        </Button>
      </div>
    </form>
  );
}
