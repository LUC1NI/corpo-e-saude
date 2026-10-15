import { CadastroRapido } from "@/components/alunos/cadastro-rapido";
import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { horariosComOcupacao } from "@/lib/horarios";
import { createClient } from "@/lib/supabase/server";

export default async function NovoAlunoPage() {
  await requireUsuario(["admin"]);
  const supabase = await createClient();
  const [{ data: profs }, { data: planos }, horarios] = await Promise.all([
    supabase.from("professores").select("id, nome").eq("ativo", true).order("nome"),
    supabase.from("planos").select("id, nome, valor, periodicidade").eq("ativo", true).order("valor"),
    horariosComOcupacao(supabase),
  ]);

  return (
    <>
      <PageHeader titulo="Novo aluno" />
      <CadastroRapido
        modo="admin"
        professores={(profs ?? []) as { id: string; nome: string }[]}
        planos={(planos ?? []) as { id: string; nome: string; valor: number; periodicidade: string }[]}
        horarios={horarios}
        destinoBase="/admin/alunos"
      />
    </>
  );
}
