-- ============================================================================
-- Corpo & Saúde — Migration: log de erros (monitoramento sem custo)
--
-- O plano Free do Supabase e ferramentas como Sentry exigem conta paga (ou
-- cadastro em serviço de terceiro) para monitoramento de verdade. Enquanto
-- isso, guardamos os erros do próprio app aqui — só o admin lê; a escrita é
-- sempre via service_role (rotas de cron e Server Actions), nunca do client.
-- ============================================================================

create table public.logs_erro (
  id uuid primary key default gen_random_uuid(),
  origem text not null, -- ex.: "cron/renovar", "cron/backup", "client:app-error"
  mensagem text not null,
  detalhes jsonb,
  criado_em timestamptz not null default now()
);

create index idx_logs_erro_criado_em on public.logs_erro (criado_em desc);

alter table public.logs_erro enable row level security;

-- Só o admin lê. Sem policy de insert/update/delete: só service_role escreve.
create policy logs_erro_admin_select on public.logs_erro
  for select to authenticated
  using (public.is_admin());
