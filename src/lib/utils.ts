import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Devolve `data` de uma consulta do Supabase ou lança o erro. Use nas telas
 * de dinheiro: um erro vira a tela de erro, nunca um "zero" enganoso.
 */
export function exigir<T>(
  res: { data: T | null; error: { message: string } | null },
  oque: string,
): T {
  if (res.error) throw new Error(`Falha ao carregar ${oque}: ${res.error.message}`);
  return (res.data ?? []) as T;
}
