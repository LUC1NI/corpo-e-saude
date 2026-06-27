-- ============================================================================
-- Passo 10 — Rate limit durável (login / reset de senha)
-- ----------------------------------------------------------------------------
-- Substitui o limitador em memória (que não sobrevive a múltiplas instâncias
-- serverless). Uma função SECURITY DEFINER faz o incremento atômico e devolve
-- se a tentativa é permitida. A tabela fica com RLS ligado e SEM policies —
-- só a função (definer) e o service_role acessam.
-- ============================================================================

create table if not exists public.rate_limits (
  chave     text primary key,
  count     integer not null default 0,
  reset_em  timestamptz not null
);

alter table public.rate_limits enable row level security;

create or replace function public.rl_hit(
  p_chave text,
  p_max integer,
  p_janela_seg integer
)
returns table (ok boolean, restante integer, retorna_em_seg integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rate_limits;
  agora timestamptz := now();
begin
  select * into r from public.rate_limits where chave = p_chave for update;

  if not found or agora > r.reset_em then
    insert into public.rate_limits (chave, count, reset_em)
      values (p_chave, 1, agora + make_interval(secs => p_janela_seg))
      on conflict (chave) do update
        set count = 1, reset_em = excluded.reset_em;
    return query select true, p_max - 1, 0;
    return;
  end if;

  if r.count >= p_max then
    return query
      select false, 0, ceil(extract(epoch from (r.reset_em - agora)))::integer;
    return;
  end if;

  update public.rate_limits set count = count + 1 where chave = p_chave;
  return query select true, p_max - r.count - 1, 0;
end;
$$;

revoke all on function public.rl_hit(text, integer, integer) from public;
grant execute on function public.rl_hit(text, integer, integer)
  to anon, authenticated, service_role;

-- Limpeza oportunista de janelas expiradas (chamável pelo cron).
create or replace function public.rl_limpar()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limits where reset_em < now();
$$;

revoke all on function public.rl_limpar() from public;
grant execute on function public.rl_limpar() to service_role;
