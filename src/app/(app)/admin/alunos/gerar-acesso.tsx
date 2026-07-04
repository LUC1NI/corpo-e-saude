"use client";

import { CheckCircle2, Clock, KeyRound, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { gerarAcessoAluno, redefinirSenhaProvisoria } from "./actions";

export function GerarAcesso({
  alunoId,
  temAcesso,
  aguardandoPrimeiroAcesso = false,
  email,
}: {
  alunoId: string;
  temAcesso: boolean;
  /** Tem acesso, mas o aluno ainda não definiu a própria senha. */
  aguardandoPrimeiroAcesso?: boolean;
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

  async function redefinir() {
    setCarregando(true);
    const res = await redefinirSenhaProvisoria(alunoId);
    setCarregando(false);
    if (res.ok && res.dados) {
      setSenha(res.dados.senha);
      setEmailGerado(res.dados.email);
      toast.success("Nova senha provisória gerada.");
    } else if (!res.ok) {
      toast.error(res.erro);
    }
  }

  // Credencial recém-gerada nesta sessão — mostra para o dono repassar.
  if (senha) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Repasse estes dados ao aluno: ele definirá a própria senha no
          primeiro login.
        </p>
        <CredencialBox email={emailGerado} senha={senha} />
      </div>
    );
  }

  // Acesso já existe e o aluno ainda não trocou a senha: o dono pode reobter
  // a credencial a qualquer momento (gera uma nova senha provisória).
  if (temAcesso && aguardandoPrimeiroAcesso) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <Clock className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-medium text-amber-900">
              Aguardando o primeiro acesso
            </p>
            <p className="text-amber-800/80">
              Acesso criado{email ? ` para ${email}` : ""}. O aluno ainda não
              definiu a própria senha. Precisa repassar de novo? Gere uma nova
              senha provisória.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={redefinir}
          loading={carregando}
        >
          <RefreshCw className="size-4" />
          {carregando ? "Gerando…" : "Gerar nova senha provisória"}
        </Button>
      </div>
    );
  }

  // Acesso ativo — o aluno já definiu a própria senha.
  if (temAcesso) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        <div className="text-sm">
          <p className="font-medium text-emerald-900">Acesso ativo</p>
          <p className="text-emerald-800/80">
            O aluno já definiu a própria senha{email ? ` (${email})` : ""}. Se
            ele esquecer, pode usar &quot;esqueci minha senha&quot; na tela de
            login.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Cria o login do aluno com uma senha provisória. No primeiro acesso, ele
        será obrigado a definir a própria senha.
      </p>
      <Button type="button" onClick={gerar} loading={carregando}>
        <KeyRound className="size-4" />
        {carregando ? "Gerando…" : "Gerar acesso"}
      </Button>
    </div>
  );
}

function CredencialBox({
  email,
  senha,
}: {
  email: string | null;
  senha: string;
}) {
  return (
    <>
      <div className="rounded-lg border bg-secondary/60 p-4 text-sm">
        <p>
          <span className="text-muted-foreground">E-mail:</span>{" "}
          <strong>{email}</strong>
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
            `E-mail: ${email}\nSenha provisória: ${senha}`,
          );
          toast.success("Copiado.");
        }}
      >
        Copiar dados
      </Button>
    </>
  );
}
