"use client";

import { CheckCircle2, Clock, Copy, KeyRound, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { IconeWhatsApp } from "@/components/landing/icone-whatsapp";
import { Button } from "@/components/ui/button";
import { urlAbsoluta } from "@/lib/site";

import { gerarAcessoAluno, redefinirSenhaProvisoria } from "./actions";

export function GerarAcesso({
  alunoId,
  temAcesso,
  aguardandoPrimeiroAcesso = false,
  email,
  nome,
  telefone,
}: {
  alunoId: string;
  temAcesso: boolean;
  /** Tem acesso, mas o aluno ainda não definiu a própria senha. */
  aguardandoPrimeiroAcesso?: boolean;
  email: string | null;
  nome: string;
  /** Telefone do aluno no formato da máscara, para o link wa.me. */
  telefone: string | null;
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
        <CredencialBox
          email={emailGerado}
          senha={senha}
          nome={nome}
          telefone={telefone}
        />
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

/** Mensagem pronta para o estúdio mandar ao aluno pelo WhatsApp. */
function mensagemAcesso(nome: string, email: string | null, senha: string) {
  const primeiro = nome.split(" ")[0];
  return [
    `Olá, ${primeiro}! Sua área do aluno do Corpo & Saúde está pronta. 💪`,
    "",
    `Acesse: ${urlAbsoluta("/entrar")}`,
    `E-mail: ${email ?? ""}`,
    `Senha provisória: ${senha}`,
    "",
    "No primeiro acesso você cria a sua própria senha. Depois é só adicionar o app à tela de início do celular.",
  ].join("\n");
}

/** (47) 99999-0000 → 5547999990000 (formato do wa.me). */
function telefoneWhatsApp(telefone: string | null): string | null {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  return digitos.startsWith("55") && digitos.length > 11 ? digitos : `55${digitos}`;
}

function CredencialBox({
  email,
  senha,
  nome,
  telefone,
}: {
  email: string | null;
  senha: string;
  nome: string;
  telefone: string | null;
}) {
  const mensagem = mensagemAcesso(nome, email, senha);
  const fone = telefoneWhatsApp(telefone);
  // Sem telefone, o wa.me abre o WhatsApp para escolher o contato.
  const linkWhatsApp = `https://wa.me/${fone ?? ""}?text=${encodeURIComponent(mensagem)}`;

  async function copiar(texto: string, aviso: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(aviso);
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto e copie.");
    }
  }

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
      <div className="flex flex-wrap gap-2">
        <a
          href={linkWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          <IconeWhatsApp className="size-4" />
          Abrir no WhatsApp
        </a>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => copiar(mensagem, "Mensagem copiada. Cole no WhatsApp.")}
        >
          <Copy className="size-4" />
          Copiar mensagem para WhatsApp
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            copiar(`E-mail: ${email}\nSenha provisória: ${senha}`, "Copiado.")
          }
        >
          Copiar só os dados
        </Button>
      </div>
      {!fone ? (
        <p className="text-xs text-muted-foreground">
          Sem telefone no cadastro: o WhatsApp vai pedir para escolher o
          contato.
        </p>
      ) : null}
    </>
  );
}
