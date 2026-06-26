import { z } from "zod";

/**
 * Validação centralizada das variáveis de ambiente.
 *
 * As funções validam sob demanda (não no carregamento do módulo) para
 * que o build não quebre antes das credenciais estarem configuradas.
 * Em runtime, lançam um erro claro se algo faltar.
 *
 * - `getPublicEnv()`: seguro para o client (somente `NEXT_PUBLIC_*`).
 * - `getServerEnv()`: contém segredos (service role). NUNCA chame em
 *   Client Components — só em Server Components, Server Actions ou
 *   Route Handlers.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Defina NEXT_PUBLIC_SUPABASE_URL no .env.local"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "Defina NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

export function getPublicEnv() {
  return publicSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
}

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "Defina SUPABASE_SERVICE_ROLE_KEY no .env.local (somente servidor)"),
});

export function getServerEnv() {
  return serverSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
