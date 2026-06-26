-- ============================================================================
-- Corpo & Saúde — Migration 0001: schema base (tabelas, tipos, índices)
-- Fonte de verdade: Modelo_de_Dados_Corpo_e_Saude.md
-- RLS e políticas ficam na migration 0002.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Tipos (enums) do domínio
-- ----------------------------------------------------------------------------
do $$ begin
  create type papel_usuario as enum ('admin', 'professor', 'aluno');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_aluno as enum ('presencial', 'online');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_aluno as enum ('ativo', 'inativo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type periodicidade_plano as enum ('mensal', 'trimestral', 'semestral', 'anual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_matricula as enum ('ativa', 'cancelada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_pagamento as enum ('pago', 'pendente', 'vencido');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- Trigger utilitário: mantém `atualizado_em`
-- ----------------------------------------------------------------------------
create or replace function public.tg_set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- ============================================================================
-- 1. ACESSO E PERFIS
-- ============================================================================

-- usuarios: espelha auth.users com o papel/estado no app.
-- A senha é gerenciada pelo Supabase Auth (auth.users), não aqui.
create table if not exists public.usuarios (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  papel      papel_usuario not null,
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

create table if not exists public.professores (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null unique references public.usuarios (id) on delete cascade,
  nome          text not null,
  telefone      text,
  especialidade text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now()
);

create table if not exists public.alunos (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid unique references public.usuarios (id) on delete set null,
  professor_id    uuid references public.professores (id) on delete set null,
  nome            text not null,
  data_nascimento date,
  telefone        text,
  email           text,
  tipo            tipo_aluno not null default 'presencial',
  status          status_aluno not null default 'ativo',
  criado_em       timestamptz not null default now()
);

create index if not exists idx_alunos_professor_id on public.alunos (professor_id);
create index if not exists idx_alunos_usuario_id   on public.alunos (usuario_id);
create index if not exists idx_alunos_status       on public.alunos (status);

-- ============================================================================
-- 2. FINANCEIRO
-- ============================================================================

create table if not exists public.planos (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  descricao     text,
  valor         numeric(10, 2) not null check (valor >= 0),
  periodicidade periodicidade_plano not null default 'mensal',
  duracao_meses integer check (duracao_meses is null or duracao_meses > 0),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now()
);

create table if not exists public.matriculas (
  id                    uuid primary key default gen_random_uuid(),
  aluno_id              uuid not null references public.alunos (id) on delete cascade,
  plano_id              uuid not null references public.planos (id) on delete restrict,
  data_inicio           date not null default current_date,
  data_proxima_cobranca date not null,
  renovacao_automatica  boolean not null default true,
  status                status_matricula not null default 'ativa',
  criado_em             timestamptz not null default now()
);

create index if not exists idx_matriculas_aluno_id    on public.matriculas (aluno_id);
create index if not exists idx_matriculas_plano_id    on public.matriculas (plano_id);
create index if not exists idx_matriculas_status      on public.matriculas (status);
create index if not exists idx_matriculas_prox_cobranca on public.matriculas (data_proxima_cobranca);

create table if not exists public.pagamentos (
  id              uuid primary key default gen_random_uuid(),
  matricula_id    uuid not null references public.matriculas (id) on delete cascade,
  aluno_id        uuid not null references public.alunos (id) on delete cascade,
  competencia     date not null, -- mês/ano de referência (usar dia 1)
  valor           numeric(10, 2) not null check (valor >= 0),
  vencimento      date not null,
  data_pagamento  date,
  status          status_pagamento not null default 'pendente',
  forma_pagamento text,
  criado_em       timestamptz not null default now()
);

create index if not exists idx_pagamentos_matricula_id on public.pagamentos (matricula_id);
create index if not exists idx_pagamentos_aluno_id     on public.pagamentos (aluno_id);
create index if not exists idx_pagamentos_status       on public.pagamentos (status);
create index if not exists idx_pagamentos_vencimento   on public.pagamentos (vencimento);
create index if not exists idx_pagamentos_competencia  on public.pagamentos (competencia);

create table if not exists public.categorias_despesa (
  id   uuid primary key default gen_random_uuid(),
  nome text not null unique
);

create table if not exists public.despesas (
  id           uuid primary key default gen_random_uuid(),
  descricao    text not null,
  categoria_id uuid references public.categorias_despesa (id) on delete set null,
  valor        numeric(10, 2) not null check (valor >= 0),
  data         date not null default current_date,
  criado_por   uuid references public.usuarios (id) on delete set null,
  criado_em    timestamptz not null default now()
);

create index if not exists idx_despesas_categoria_id on public.despesas (categoria_id);
create index if not exists idx_despesas_data         on public.despesas (data);

-- ============================================================================
-- 3. PRESENÇA E HORÁRIOS
-- ============================================================================

create table if not exists public.horarios (
  id           uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.professores (id) on delete cascade,
  dia_semana   smallint not null check (dia_semana between 0 and 6), -- 0 = domingo
  hora_inicio  time not null,
  hora_fim     time not null,
  capacidade   integer check (capacidade is null or capacidade > 0),
  criado_em    timestamptz not null default now(),
  check (hora_fim > hora_inicio)
);

create index if not exists idx_horarios_professor_id on public.horarios (professor_id);
create index if not exists idx_horarios_dia_semana   on public.horarios (dia_semana);

create table if not exists public.presencas (
  id           uuid primary key default gen_random_uuid(),
  aluno_id     uuid not null references public.alunos (id) on delete cascade,
  professor_id uuid references public.professores (id) on delete set null,
  data         date not null default current_date,
  hora         time,
  criado_em    timestamptz not null default now()
);

create index if not exists idx_presencas_aluno_id     on public.presencas (aluno_id);
create index if not exists idx_presencas_professor_id on public.presencas (professor_id);
create index if not exists idx_presencas_data         on public.presencas (data);

-- ============================================================================
-- 4. ACOMPANHAMENTO DO ALUNO
-- ============================================================================

-- anamnese: uma por aluno (atualizável) -> aluno_id unique.
create table if not exists public.anamneses (
  id                     uuid primary key default gen_random_uuid(),
  aluno_id               uuid not null unique references public.alunos (id) on delete cascade,
  historico_saude        text,
  lesoes_restricoes      text,
  medicacao              text,
  objetivos              text,
  rotina_disponibilidade text,
  nivel_atividade        text,
  criado_por             uuid references public.professores (id) on delete set null,
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now()
);

create index if not exists idx_anamneses_aluno_id on public.anamneses (aluno_id);

drop trigger if exists set_atualizado_em on public.anamneses;
create trigger set_atualizado_em
  before update on public.anamneses
  for each row execute function public.tg_set_atualizado_em();

create table if not exists public.avaliacoes_fisicas (
  id                 uuid primary key default gen_random_uuid(),
  aluno_id           uuid not null references public.alunos (id) on delete cascade,
  data               date not null default current_date,
  peso               numeric(6, 2) check (peso is null or peso > 0),     -- kg
  altura             numeric(4, 2) check (altura is null or altura > 0), -- metros
  percentual_gordura numeric(5, 2) check (percentual_gordura is null or percentual_gordura >= 0),
  imc                numeric(6, 2) generated always as (
                       case when altura is not null and altura > 0 and peso is not null
                         then round(peso / (altura * altura), 2)
                       end
                     ) stored,
  medidas            jsonb not null default '{}'::jsonb,
  observacoes        text,
  criado_por         uuid references public.professores (id) on delete set null,
  criado_em          timestamptz not null default now()
);

create index if not exists idx_avaliacoes_aluno_id on public.avaliacoes_fisicas (aluno_id);
create index if not exists idx_avaliacoes_data     on public.avaliacoes_fisicas (data);

-- ============================================================================
-- 5. TREINO
-- ============================================================================

create table if not exists public.exercicios (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  grupo_muscular  text,
  equipamento     text,
  descricao       text,
  midia_url       text,
  criado_em       timestamptz not null default now()
);

create index if not exists idx_exercicios_grupo_muscular on public.exercicios (grupo_muscular);

create table if not exists public.treinos (
  id            uuid primary key default gen_random_uuid(),
  aluno_id      uuid not null references public.alunos (id) on delete cascade,
  professor_id  uuid references public.professores (id) on delete set null,
  nome          text not null,
  objetivo      text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_treinos_aluno_id     on public.treinos (aluno_id);
create index if not exists idx_treinos_professor_id on public.treinos (professor_id);

drop trigger if exists set_atualizado_em on public.treinos;
create trigger set_atualizado_em
  before update on public.treinos
  for each row execute function public.tg_set_atualizado_em();

create table if not exists public.treino_divisoes (
  id        uuid primary key default gen_random_uuid(),
  treino_id uuid not null references public.treinos (id) on delete cascade,
  nome      text not null,  -- ex: "A", "B", "C"
  foco      text,           -- ex: "Superior", "Inferior"
  ordem     integer not null default 0
);

create index if not exists idx_treino_divisoes_treino_id on public.treino_divisoes (treino_id);

create table if not exists public.treino_exercicios (
  id           uuid primary key default gen_random_uuid(),
  divisao_id   uuid not null references public.treino_divisoes (id) on delete cascade,
  exercicio_id uuid not null references public.exercicios (id) on delete restrict,
  series       integer check (series is null or series > 0),
  repeticoes   text,    -- texto: "10-12", "até a falha", etc.
  carga        text,
  descanso     text,
  ordem        integer not null default 0,
  observacao   text
);

create index if not exists idx_treino_exercicios_divisao_id   on public.treino_exercicios (divisao_id);
create index if not exists idx_treino_exercicios_exercicio_id on public.treino_exercicios (exercicio_id);
