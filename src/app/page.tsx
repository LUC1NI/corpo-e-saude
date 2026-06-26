import Image from "next/image";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function StatusItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden
        className={`inline-flex size-2.5 rounded-full ${
          ok ? "bg-primary" : "bg-muted-foreground/40"
        }`}
      />
      <span className="text-sm text-foreground/80">{label}</span>
      <span
        className={`ml-auto text-xs font-medium ${
          ok ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {ok ? "ok" : "pendente"}
      </span>
    </li>
  );
}

export default function Home() {
  const supabaseConfigurado = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="items-center text-center">
          <div className="mb-2 overflow-hidden rounded-2xl border bg-white p-3">
            <Image
              src="/icons/icon-192.png"
              alt="Corpo & Saúde"
              width={72}
              height={72}
              priority
            />
          </div>
          <CardTitle className="text-xl">
            Corpo &amp; Saúde
            <span className="mt-1 block text-sm font-normal text-muted-foreground">
              Personal Trainer Studio
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Base do projeto configurada. Próximos passos do roadmap: banco de
            dados e RLS, depois autenticação.
          </p>
          <ul className="space-y-2 rounded-lg bg-secondary/60 p-4">
            <StatusItem ok label="Next.js + TypeScript" />
            <StatusItem ok label="Tailwind + shadcn/ui (tema da marca)" />
            <StatusItem ok label="PWA (manifest + service worker)" />
            <StatusItem
              ok={supabaseConfigurado}
              label="Supabase (.env.local configurado)"
            />
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
