-- ============================================================================
-- Corpo & Saúde — Migration 0007: keep-alive (anti-pausa do Free)
--
-- O plano Free do Supabase PAUSA o projeto após 7 dias sem atividade. Esta
-- função existe só para ser chamada por um agendador externo (GitHub Action
-- ou cron-job.org) uma vez por dia, mantendo o banco ativo.
--
-- É SECURITY DEFINER e liberada para `anon` de propósito: o agendador usa só
-- a anon key (já pública). A função toca uma tabela (atividade real de banco)
-- mas devolve apenas o horário — nenhum dado é exposto.
-- ============================================================================
create or replace function public.keep_alive()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  _n int;
begin
  -- leitura trivial só para gerar atividade real no Postgres
  select count(*) into _n from public.usuarios;
  return now();
end;
$$;

-- Menor privilégio: ninguém por padrão; só execução pelo papel anon/authenticated.
revoke all on function public.keep_alive() from public;
grant execute on function public.keep_alive() to anon, authenticated;
