"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoForm } from "@/components/ui-extra/campo-form";
import { formatarTelefone } from "@/lib/mascaras";
import { atualizarProfessor } from "./actions";

/** Edição do cadastro do professor (o e-mail é o login e não muda aqui). */
export function ProfessorForm({
  id,
  nome,
  telefone,
  especialidade,
}: {
  id: string;
  nome: string;
  telefone: string | null;
  especialidade: string | null;
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [vNome, setNome] = useState(nome);
  const [vTelefone, setTelefone] = useState(telefone ?? "");
  const [vEspecialidade, setEspecialidade] = useState(especialidade ?? "");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    const res = await atualizarProfessor(id, {
      nome: vNome,
      telefone: vTelefone,
      especialidade: vEspecialidade,
    });
    setCarregando(false);
    if (res.ok) {
      toast.success("Cadastro atualizado.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <CampoForm label="Nome" htmlFor="prof-nome" obrigatorio>
        <Input
          id="prof-nome"
          value={vNome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
      </CampoForm>
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoForm label="Telefone" htmlFor="prof-telefone">
          <Input
            id="prof-telefone"
            inputMode="numeric"
            value={vTelefone}
            onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
            placeholder="(47) 99999-9999"
          />
        </CampoForm>
        <CampoForm label="Especialidade" htmlFor="prof-especialidade">
          <Input
            id="prof-especialidade"
            value={vEspecialidade}
            onChange={(e) => setEspecialidade(e.target.value)}
            placeholder="Ex.: Musculação, Funcional"
          />
        </CampoForm>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={carregando}>
          {carregando ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
