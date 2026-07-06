-- ============================================================================
-- Corpo & Saúde — Migration: execuções de treino (modo treino do aluno)
--
-- O aluno "inicia" um treino no aplicativo, marca as séries feitas (com o
-- timer de descanso) e, ao finalizar, o registro fica disponível para o
-- professor como retorno: divisão treinada, duração, o que foi feito,
-- sensação e observação.
--
-- Guardamos um SNAPSHOT (nome da divisão + detalhes em jsonb) porque o
-- professor pode editar/apagar a ficha depois — o histórico não pode mudar.
-- ============================================================================

create table public.treino_execucoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  divisao_id uuid references public.treino_divisoes (id) on delete set null,
  nome_divisao text not null,
  foco_divisao text,
  iniciado_em timestamptz not null,
  finalizado_em timestamptz not null default now(),
  duracao_segundos integer not null check (duracao_segundos between 0 and 86400),
  exercicios_previstos smallint not null check (exercicios_previstos >= 0),
  exercicios_feitos smallint not null check (exercicios_feitos >= 0),
  -- [{ nome, series, series_feitas, carga }]
  detalhes jsonb not null default '[]'::jsonb,
  sensacao text check (sensacao in ('facil', 'na_medida', 'dificil')),
  observacao text,
  criado_em timestamptz not null default now()
);

create index idx_treino_execucoes_aluno
  on public.treino_execucoes (aluno_id, finalizado_em desc);

alter table public.treino_execucoes enable row level security;

-- Admin: tudo
create policy treino_execucoes_admin_all on public.treino_execucoes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Aluno: registra e lê as PRÓPRIAS execuções (sem update/delete — histórico)
create policy treino_execucoes_aluno_insert on public.treino_execucoes
  for insert to authenticated
  with check (public.aluno_e_eu(aluno_id));

create policy treino_execucoes_aluno_select on public.treino_execucoes
  for select to authenticated
  using (public.aluno_e_eu(aluno_id));

-- Professor: lê as execuções dos alunos da SUA carteira
create policy treino_execucoes_professor_select on public.treino_execucoes
  for select to authenticated
  using (public.aluno_e_meu(aluno_id));
