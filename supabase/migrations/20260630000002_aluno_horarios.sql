-- ============================================================================
-- Corpo & Saúde — Migration: vínculo aluno × horário (agendamento recorrente)
--
-- Previsto no Modelo de Dados: "um vínculo fixo aluno × horário, se a gente
-- optar por agendar alunos em horários recorrentes". Permite que a tela de
-- presença mostre apenas os alunos daquela aula/horário.
-- ============================================================================

create table if not exists public.aluno_horarios (
  id         uuid primary key default gen_random_uuid(),
  aluno_id   uuid not null references public.alunos (id) on delete cascade,
  horario_id uuid not null references public.horarios (id) on delete cascade,
  criado_em  timestamptz not null default now(),
  unique (aluno_id, horario_id)
);

create index if not exists idx_aluno_horarios_horario on public.aluno_horarios (horario_id);
create index if not exists idx_aluno_horarios_aluno   on public.aluno_horarios (aluno_id);

alter table public.aluno_horarios enable row level security;

-- admin: total
drop policy if exists aluno_horarios_admin_all on public.aluno_horarios;
create policy aluno_horarios_admin_all on public.aluno_horarios
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- professor: gerencia vínculos dos SEUS alunos nos SEUS horários
drop policy if exists aluno_horarios_professor_all on public.aluno_horarios;
create policy aluno_horarios_professor_all on public.aluno_horarios
  for all to authenticated
  using (
    public.aluno_e_meu(aluno_id)
    and exists (
      select 1 from public.horarios h
      where h.id = horario_id and h.professor_id = public.meu_professor_id()
    )
  )
  with check (
    public.aluno_e_meu(aluno_id)
    and exists (
      select 1 from public.horarios h
      where h.id = horario_id and h.professor_id = public.meu_professor_id()
    )
  );

-- aluno: vê os próprios agendamentos
drop policy if exists aluno_horarios_aluno_select on public.aluno_horarios;
create policy aluno_horarios_aluno_select on public.aluno_horarios
  for select to authenticated using (public.aluno_e_eu(aluno_id));
