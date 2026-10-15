"use client";

import { Check, Circle } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { InputSenha } from "@/components/ui-extra/input-senha";
import {
  redefinirSenhaAction,
  type RedefinirState,
} from "@/lib/auth-actions";

export function RedefinirForm({
  primeiroAcesso,
}: {
  primeiroAcesso: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    RedefinirState,
    FormData
  >(redefinirSenhaAction, {});
  // Controlados: depois de um erro do servidor o que foi digitado continua lá.
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const regras = [
    { ok: senha.length >= 8, texto: "8 caracteres ou mais" },
    { ok: /[A-Za-z]/.test(senha), texto: "Uma letra" },
    { ok: /[0-9]/.test(senha), texto: "Um número" },
    { ok: senha.length > 0 && senha === confirmar, texto: "As duas senhas iguais" },
  ];
  const tudoOk = regras.every((r) => r.ok);

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader>
        <CardTitle>
          {primeiroAcesso ? "Defina sua senha" : "Nova senha"}
        </CardTitle>
        <CardDescription>
          {primeiroAcesso
            ? "Este é seu primeiro acesso. Crie uma senha pessoal para continuar."
            : "Escolha uma nova senha para sua conta."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="senha">Nova senha</Label>
            <InputSenha
              id="senha"
              name="senha"
              autoComplete="new-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmar">Confirmar senha</Label>
            <InputSenha
              id="confirmar"
              name="confirmar"
              autoComplete="new-password"
              required
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
            />
          </div>

          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm" aria-live="polite">
            {regras.map((r) => (
              <li
                key={r.texto}
                className={r.ok ? "flex items-center gap-1.5 text-emerald-700" : "flex items-center gap-1.5 text-muted-foreground"}
              >
                {r.ok ? <Check className="size-4" /> : <Circle className="size-4" />}
                {r.texto}
                <span className="sr-only">{r.ok ? " (ok)" : " (falta)"}</span>
              </li>
            ))}
          </ul>

          {state.erro ? (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.erro}
            </p>
          ) : null}

          <Button type="submit" className="w-full" loading={pending} disabled={!tudoOk}>
            {pending ? "Salvando…" : "Salvar senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
