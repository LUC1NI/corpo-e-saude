"use client";

import Link from "@/components/ui-extra/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputSenha } from "@/components/ui-extra/input-senha";
import { loginAction, type LoginState } from "@/lib/auth-actions";

export function LoginForm({ mensagemInicial }: { mensagemInicial?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  const erro = state.erro ?? mensagemInicial;

  return (
    <Card className="w-full shadow-lg">
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              required
              aria-invalid={erro ? true : undefined}
              aria-describedby={erro ? "erro-login" : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <InputSenha
              id="senha"
              name="senha"
              autoComplete="current-password"
              required
              aria-invalid={erro ? true : undefined}
              aria-describedby={erro ? "erro-login" : undefined}
            />
          </div>

          {erro ? (
            <p
              id="erro-login"
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {erro}
            </p>
          ) : null}

          <Button type="submit" className="w-full" loading={pending}>
            {pending ? "Entrando…" : "Entrar"}
          </Button>
          {/* Depois do Entrar: na ordem do Tab, e-mail → senha → entrar. */}
          <p className="text-center">
            <Link href="/recuperar-senha" className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
              Esqueci minha senha
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
