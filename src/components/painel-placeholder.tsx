import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogoutButton } from "@/components/logout-button";
import type { Papel } from "@/lib/auth";

const ROTULO_PAPEL: Record<Papel, string> = {
  admin: "Administrador (dono)",
  professor: "Professor",
  aluno: "Aluno",
};

/**
 * Placeholder de painel por papel — confirma o guard de rota funcionando.
 * Substituído pelos dashboards reais no passo 4 (layout e design system).
 */
export function PainelPlaceholder({
  papel,
  email,
}: {
  papel: Papel;
  email: string;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Painel · {ROTULO_PAPEL[papel]}</CardTitle>
              <CardDescription className="mt-1">{email}</CardDescription>
            </div>
            <LogoutButton />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Acesso autenticado e autorizado como{" "}
            <span className="font-medium text-foreground">
              {ROTULO_PAPEL[papel]}
            </span>
            . As telas deste perfil serão construídas nos próximos passos do
            roadmap.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
