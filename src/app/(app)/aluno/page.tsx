import { CheckCircle2, Dumbbell, LineChart } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { requireUsuario } from "@/lib/auth";

export default async function AlunoHome() {
  const usuario = await requireUsuario(["aluno"]);
  const primeiro = usuario.nome.split(" ")[0];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-[#033373] p-5 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70">Olá,</p>
            <p className="text-xl font-bold">{primeiro} 👋</p>
          </div>
          <AvatarIniciais
            nome={usuario.nome}
            tamanho="lg"
            className="ring-2 ring-white/20"
          />
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/10 p-3">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/90 text-white">
            <CheckCircle2 className="size-4" />
          </span>
          <div className="text-sm leading-tight">
            <p className="font-medium">Situação financeira</p>
            <p className="text-xs text-white/60">Disponível em Mensalidade</p>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Seu treino de hoje</CardTitle>
        </CardHeader>
        <PageEmpty
          icone={Dumbbell}
          titulo="Treino em breve"
          descricao="Seus treinos aparecem aqui quando o professor montar a ficha."
        />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sua evolução</CardTitle>
        </CardHeader>
        <PageEmpty
          icone={LineChart}
          titulo="Sem dados ainda"
          descricao="Os gráficos de evolução chegam com a Avaliação Física."
        />
      </Card>
    </div>
  );
}
