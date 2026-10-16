import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Plano } from "@/lib/tipos";

import { PlanoForm } from "../plano-form";

export default async function EditarPlanoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUsuario(["admin"]);
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase
    .from("planos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const plano = data as Plano;

  return (
    <>
      <PageHeader titulo="Editar plano" subtitulo={plano.nome} />
      <PlanoForm
        planoId={plano.id}
        valoresIniciais={{
          nome: plano.nome,
          descricao: plano.descricao ?? "",
          valor: plano.valor,
          periodicidade: plano.periodicidade,
          duracao_meses: plano.duracao_meses ?? undefined,
          ativo: plano.ativo,
          tipo_aluno: plano.tipo_aluno ?? "ambos",
        }}
      />
    </>
  );
}
