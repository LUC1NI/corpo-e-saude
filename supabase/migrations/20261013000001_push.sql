-- ============================================================================
-- Corpo & Saúde — Migration: notificações push (Web Push)
--
-- push_inscricoes: um registro por navegador/aparelho inscrito (endpoint do
--   push service + chaves de criptografia). O usuário só mexe nas próprias;
--   o ENVIO roda no servidor com service_role.
-- notificacoes_enviadas: trava de idempotência. unique (tipo, referencia_id)
--   garante que o mesmo aviso (ex.: "vence em 3 dias" do pagamento X) nunca
--   seja enviado duas vezes, mesmo se o cron rodar de novo.
-- ============================================================================

create table public.push_inscricoes (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  criado_em  timestamptz not null default now()
);

create index idx_push_inscricoes_usuario on public.push_inscricoes (usuario_id);

alter table public.push_inscricoes enable row level security;

-- O usuário vê, cria e remove só as próprias inscrições.
create policy push_inscricoes_proprias on public.push_inscricoes
  for all to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

create table public.notificacoes_enviadas (
  id            uuid primary key default gen_random_uuid(),
  aluno_id      uuid not null references public.alunos (id) on delete cascade,
  -- mensalidade_antes | mensalidade_dia | mensalidade_atraso | treino_novo
  tipo          text not null check (
    tipo in ('mensalidade_antes', 'mensalidade_dia', 'mensalidade_atraso', 'treino_novo')
  ),
  -- id do pagamento (mensalidade) ou "<treino_id>:<yyyy-mm-dd>" (treino:
  -- no máximo um aviso por ficha por dia, mesmo com várias edições).
  referencia_id text not null,
  enviada_em    timestamptz not null default now(),
  unique (tipo, referencia_id)
);

create index idx_notificacoes_enviadas_aluno on public.notificacoes_enviadas (aluno_id);

alter table public.notificacoes_enviadas enable row level security;

-- Só o admin consulta (auditoria). Escrita apenas via service_role.
create policy notificacoes_enviadas_admin_select on public.notificacoes_enviadas
  for select to authenticated
  using (public.is_admin());
