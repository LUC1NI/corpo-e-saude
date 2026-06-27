-- ============================================================================
-- Passo 9/10 — Agenda do treino por dia da semana
-- ----------------------------------------------------------------------------
-- Cada divisão (Treino A/B/C) pode ser agendada em um ou mais dias da semana
-- (0 = domingo ... 6 = sábado). A partir disso a área do aluno mostra o
-- "treino de hoje". Mantém o RLS da própria tabela (sem novas policies).
-- ============================================================================

alter table public.treino_divisoes
  add column if not exists dias_semana smallint[] not null default '{}';

-- Garante valores válidos (0..6) quando houver dias informados.
alter table public.treino_divisoes
  drop constraint if exists treino_divisoes_dias_semana_validos;

alter table public.treino_divisoes
  add constraint treino_divisoes_dias_semana_validos
  check (dias_semana <@ array[0,1,2,3,4,5,6]::smallint[]);
