import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";

import { PlanoForm } from "../plano-form";

export default async function NovoPlanoPage() {
  await requireUsuario(["admin"]);
  return (
    <>
      <PageHeader titulo="Novo plano" subtitulo="Cadastre um plano do studio." />
      <PlanoForm />
    </>
  );
}
