"use client";

import Link from "@/components/ui-extra/link";
import { useActionState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  recuperarSenhaAction,
  type RecuperarState,
} from "@/lib/auth-actions";
import { cn } from "@/lib/utils";

export function RecuperarForm() {
  const [state, formAction, pending] = useActionState<
    RecuperarState,
    FormData
  >(recuperarSenhaAction, {});

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader>
        <CardTitle>Recuperar senha</CardTitle>
        <CardDescription>
          Enviaremos um link de redefinição para o seu e-mail.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state.ok ? (
          <div className="space-y-4">
            <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-foreground/80">
              Se o e-mail estiver cadastrado, você receberá as instruções em
              instantes. Verifique também a caixa de spam.
            </p>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
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
              {pending ? "Enviando…" : "Enviar link"}
            </Button>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "w-full",
              )}
            >
              Voltar para o login
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
