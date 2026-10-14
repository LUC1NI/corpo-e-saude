import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "backups";
const RETENCAO_DIAS = 14;

/** Tabelas de dado real (exclui `_migrations`, que é bookkeeping interno). */
const TABELAS = [
  "usuarios",
  "professores",
  "alunos",
  "planos",
  "matriculas",
  "pagamentos",
  "categorias_despesa",
  "despesas",
  "horarios",
  "aluno_horarios",
  "presencas",
  "anamneses",
  "avaliacoes_fisicas",
  "exercicios",
  "treinos",
  "treino_divisoes",
  "treino_exercicios",
  "treino_execucoes",
  "alunos_dados_fiscais",
  "config_fiscal",
  "notas_fiscais",
] as const;

/**
 * Backup diário "pobre": dump de todas as tabelas em um único JSON, guardado
 * no Supabase Storage (bucket privado `backups`, mesmo projeto — sem serviço
 * novo, sem custo). O plano Free do Supabase não inclui backup automático;
 * isto cobre a lacuna até o estúdio migrar para um plano pago (que traz PITR
 * de verdade). Mantém os últimos `RETENCAO_DIAS` dumps e apaga o resto.
 */
export async function executarBackup(
  supabase: SupabaseClient,
): Promise<{ arquivo: string; tabelas: number; linhas: number }> {
  const dump: Record<string, unknown[]> = {};
  let linhas = 0;

  for (const tabela of TABELAS) {
    const { data, error } = await supabase.from(tabela).select("*");
    if (error) throw new Error(`Falha ao ler ${tabela}: ${error.message}`);
    dump[tabela] = data ?? [];
    linhas += dump[tabela].length;
  }

  const agora = new Date().toISOString();
  const arquivo = `dump-${agora.slice(0, 10)}.json`;
  const conteudo = JSON.stringify({ geradoEm: agora, tabelas: dump }, null, 0);

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(arquivo, new Blob([conteudo], { type: "application/json" }), {
      upsert: true,
    });
  if (erroUpload) throw new Error(`Falha ao subir backup: ${erroUpload.message}`);

  await limparBackupsAntigos(supabase);

  return { arquivo, tabelas: TABELAS.length, linhas };
}

/** Apaga dumps além dos últimos `RETENCAO_DIAS` (o bucket é só backups diários). */
async function limparBackupsAntigos(supabase: SupabaseClient): Promise<void> {
  const { data: arquivos, error } = await supabase.storage.from(BUCKET).list("", {
    sortBy: { column: "name", order: "desc" },
  });
  if (error || !arquivos) return;

  const antigos = arquivos
    .filter((a) => a.name.startsWith("dump-"))
    .slice(RETENCAO_DIAS)
    .map((a) => a.name);
  if (antigos.length > 0) {
    await supabase.storage.from(BUCKET).remove(antigos);
  }
}
