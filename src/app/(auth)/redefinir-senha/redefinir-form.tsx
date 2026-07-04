"use client";

import { useActionState } from "react";

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
            />
            <p className="text-xs text-muted-foreground">
              Mínimo de 8 caracteres, com letras e números.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmar">Confirmar senha</Label>
            <InputSenha
              id="confirmar"
              name="confirmar"
              autoComplete="new-password"
              required
            />
          </div>

          {state.erro ? (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.erro}
            </p>
          ) : null}

          <Button type="submit" className="w-full" loading={pending}>
            {pending ? "Salvando…" : "Salvar senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
