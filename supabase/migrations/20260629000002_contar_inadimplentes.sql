-- ============================================================================
-- Corpo & Saúde — Migration 0008: contagem de inadimplentes no banco
--
-- Antes, o dashboard baixava TODAS as linhas de pagamentos vencidos/pendentes
-- e contava os alunos distintos em JavaScript — cresce sem limite ao longo
-- dos anos. Esta função faz o count(distinct) direto no Postgres (usa os
-- índices de status/vencimento) e devolve só um inteiro.
--
-- SECURITY INVOKER (padrão): o RLS continua valendo — só o admin enxerga
-- todos os pagamentos, então só ele obtém o total real. A data é parâmetro
-- para casar com o fuso usado no app (não usa current_date do servidor).
-- ============================================================================
create or replace function public.contar_inadimplentes(p_hoje date)
returns int
language sql
stable
security invoker
set search_path = public
as $$
  select count(distinct aluno_id)::int
  from public.pagamentos
  where status = 'vencido'
     or (status = 'pendente' and vencimento < p_hoje);
$$;

grant execute on function public.contar_inadimplentes(date) to authenticated;
