"use client";

import { KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { gerarAcessoAluno } from "./actions";

export function GerarAcesso({
  alunoId,
  temAcesso,
  email,
}: {
  alunoId: string;
  temAcesso: boolean;
  email: string | null;
}) {
  const [carregando, setCarregando] = useState(false);
  const [senha, setSenha] = useState<string | null>(null);
  const [emailGerado, setEmailGerado] = useState<string | null>(null);

  async function gerar() {
    setCarregando(true);
    const res = await gerarAcessoAluno(alunoId);
    setCarregando(false);
    if (res.ok && res.dados) {
      setSenha(res.dados.senha);
      setEmailGerado(res.dados.email);
      toast.success("Acesso criado com sucesso.");
    } else if (!res.ok) {
      toast.error(res.erro);
    }
  }

  // Senha recém-gerada — mostra uma única vez para o dono repassar.
  if (senha) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Acesso criado para <strong>{emailGerado}</strong>. Repasse estes dados
          ao aluno — ele definirá a própria senha no primeiro login.
        </p>
        <div className="rounded-lg border bg-secondary/60 p-4 text-sm">
          <p>
            <span className="text-muted-foreground">E-mail:</span>{" "}
            <strong>{emailGerado}</strong>
          </p>
          <p className="mt-1">
            <span className="text-muted-foreground">Senha provisória:</span>{" "}
            <strong className="font-mono">{senha}</strong>
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            navigator.clipboard?.writeText(
              `E-mail: ${emailGerado}\nSenha provisória: ${senha}`,
            );
            toast.success("Copiado.");
          }}
        >
          Copiar dados
        </Button>
      </div>
    );
  }

  if (temAcesso) {
    return (
      <p className="text-sm text-muted-foreground">
        Acesso já criado{email ? ` para ${email}` : ""}. O aluno define a
        própria senha no primeiro login (e pode usar &quot;esqueci minha
        senha&quot; quando precisar).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Cria o login do aluno com uma senha provisória. No primeiro acesso, ele
        será obrigado a definir a própria senha.
      </p>
      <Button type="button" onClick={gerar} disabled={carregando}>
        <KeyRound className="size-4" />
        {carregando ? "Gerando…" : "Gerar acesso"}
      </Button>
    </div>
  );
}
