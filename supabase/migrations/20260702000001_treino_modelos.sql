-- ============================================================================
-- Corpo & Saúde — Migration: treinos-modelo (reutilizáveis)
--
-- Permite ao professor montar treinos prontos na aba Treinos e aplicá-los a
-- qualquer aluno com um clique (a aplicação copia divisões e exercícios; a
-- ficha do aluno fica independente do modelo).
--
--   modelo = true  -> treino reutilizável, sem aluno (aluno_id null)
--   modelo = false -> ficha de um aluno (comportamento original)
-- ============================================================================

alter table public.treinos alter column aluno_id drop not null;
alter table public.treinos add column if not exists modelo boolean not null default false;

-- Coerência: modelo nunca tem aluno; ficha de aluno sempre tem.
alter table public.treinos drop constraint if exists treinos_modelo_coerente;
alter table public.treinos add constraint treinos_modelo_coerente check (
  (modelo and aluno_id is null) or (not modelo and aluno_id is not null)
);

create index if not exists idx_treinos_modelo on public.treinos (modelo) where modelo;

-- ----------------------------------------------------------------------------
-- RLS: modelos são do studio — qualquer professor vê (para aplicar aos seus
-- alunos); edita apenas quem criou. Admin já tem acesso total pela policy
-- existente (treinos_admin_all). Alunos não veem modelos (aluno_e_eu(null)
-- é sempre falso).
-- ----------------------------------------------------------------------------
drop policy if exists treinos_modelo_select on public.treinos;
create policy treinos_modelo_select on public.treinos
  for select to authenticated
  using (modelo and public.meu_professor_id() is not null);

drop policy if exists treinos_modelo_professor_write on public.treinos;
create policy treinos_modelo_professor_write on public.treinos
  for all to authenticated
  using (modelo and professor_id = public.meu_professor_id())
  with check (modelo and professor_id = public.meu_professor_id());

-- Divisões de modelos: leitura para todos os professores; escrita do criador.
drop policy if exists treino_divisoes_modelo_select on public.treino_divisoes;
create policy treino_divisoes_modelo_select on public.treino_divisoes
  for select to authenticated
  using (
    public.meu_professor_id() is not null
    and exists (
      select 1 from public.treinos t
      where t.id = treino_id and t.modelo
    )
  );

drop policy if exists treino_divisoes_modelo_write on public.treino_divisoes;
create policy treino_divisoes_modelo_write on public.treino_divisoes
  for all to authenticated
  using (exists (
    select 1 from public.treinos t
    where t.id = treino_id
      and t.modelo
      and t.professor_id = public.meu_professor_id()
  ))
  with check (exists (
    select 1 from public.treinos t
    where t.id = treino_id
      and t.modelo
      and t.professor_id = public.meu_professor_id()
  ));

-- Exercícios das divisões de modelos (via divisão -> treino).
drop policy if exists treino_exercicios_modelo_select on public.treino_exercicios;
create policy treino_exercicios_modelo_select on public.treino_exercicios
  for select to authenticated
  using (
    public.meu_professor_id() is not null
    and exists (
      select 1
      from public.treino_divisoes d
      join public.treinos t on t.id = d.treino_id
      where d.id = divisao_id and t.modelo
    )
  );

drop policy if exists treino_exercicios_modelo_write on public.treino_exercicios;
create policy treino_exercicios_modelo_write on public.treino_exercicios
  for all to authenticated
  using (exists (
    select 1
    from public.treino_divisoes d
    join public.treinos t on t.id = d.treino_id
    where d.id = divisao_id
      and t.modelo
      and t.professor_id = public.meu_professor_id()
  ))
  with check (exists (
    select 1
    from public.treino_divisoes d
    join public.treinos t on t.id = d.treino_id
    where d.id = divisao_id
      and t.modelo
      and t.professor_id = public.meu_professor_id()
  ));
