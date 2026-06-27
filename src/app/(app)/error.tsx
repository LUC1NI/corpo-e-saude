"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Em produção, ligar a um serviço de monitoramento (ex.: Sentry).
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <div className="space-y-2">
        <h1 className="font-heading text-xl font-bold">Algo deu errado</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Não foi possível carregar esta tela. Tente novamente; se persistir,
          fale com o administrador.
        </p>
      </div>
      <Button onClick={reset}>
        <RotateCcw className="size-4" />
        Tentar de novo
      </Button>
    </div>
  );
}
