-- ============================================================================
-- Corpo & Saúde — Migration: unicidade de cobrança por aluno/competência
--
-- Impede, no nível do banco, duas cobranças para o mesmo aluno no mesmo mês
-- de referência (competência). É a garantia definitiva contra cobrança
-- duplicada — vale mesmo em rodadas concorrentes da renovação ou rematrícula.
-- ============================================================================

-- 1. Limpa duplicatas já existentes, mantendo a "melhor" por (aluno, competência):
--    prefere a já recebida (pago); senão, a cobrança mais antiga.
with ranked as (
  select
    id,
    row_number() over (
      partition by aluno_id, competencia
      order by (status = 'pago') desc, criado_em asc
    ) as rn
  from public.pagamentos
)
delete from public.pagamentos p
using ranked r
where p.id = r.id
  and r.rn > 1;

-- 2. Garante unicidade daqui pra frente.
create unique index if not exists uq_pagamentos_aluno_competencia
  on public.pagamentos (aluno_id, competencia);

-- ============================================================================
-- Unicidade de presença: um aluno é marcado no máximo uma vez por
-- dia/horário. `nulls not distinct` cobre também a presença "sem horário"
-- (hora = null), que o Postgres trataria como sempre distinta.
-- ============================================================================

-- 3. Limpa presenças duplicadas, mantendo a mais antiga.
with ranked_presencas as (
  select
    id,
    row_number() over (
      partition by aluno_id, data, hora
      order by criado_em asc
    ) as rn
  from public.presencas
)
delete from public.presencas p
using ranked_presencas r
where p.id = r.id
  and r.rn > 1;

-- 4. Garante unicidade daqui pra frente.
create unique index if not exists uq_presencas_aluno_data_hora
  on public.presencas (aluno_id, data, hora) nulls not distinct;
