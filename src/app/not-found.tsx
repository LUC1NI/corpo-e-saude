import Link from "@/components/ui-extra/link";

import { buttonVariants } from "@/components/ui/button";
import { LogoMarca } from "@/components/shell/logo-marca";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <LogoMarca />
      <div className="space-y-2">
        <p className="font-heading text-5xl font-bold text-primary">404</p>
        <h1 className="font-heading text-xl font-bold">Página não encontrada</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          O endereço acessado não existe ou foi movido.
        </p>
      </div>
      <Link href="/" className={cn(buttonVariants())}>
        Voltar ao início
      </Link>
    </main>
  );
}
