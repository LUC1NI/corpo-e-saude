-- ============================================================================
-- Corpo & Saúde — Migration 0002: RLS + políticas de acesso
--
-- Regra geral:
--   admin      -> acesso total
--   professor  -> apenas linhas dos SEUS alunos (carteira)
--   aluno      -> apenas os próprios dados (leitura)
--   anon       -> nada
--
-- O client `service_role` (usado no servidor para provisionar acessos)
-- ignora o RLS por padrão.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helpers de autorização (SECURITY DEFINER para não recursar no RLS)
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.usuarios u
    where u.id = auth.uid() and u.papel = 'admin' and u.ativo
  );
$$;

create or replace function public.meu_professor_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select p.id from public.professores p where p.usuario_id = auth.uid();
$$;

-- O aluno informado pertence ao professor logado?
create or replace function public.aluno_e_meu(p_aluno_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.alunos a
    where a.id = p_aluno_id
      and a.professor_id = public.meu_professor_id()
  );
$$;

-- O aluno informado é o próprio usuário logado?
create or replace function public.aluno_e_eu(p_aluno_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.alunos a
    where a.id = p_aluno_id and a.usuario_id = auth.uid()
  );
$$;

-- A divisão de treino pertence a um aluno do professor logado?
create or replace function public.divisao_e_minha(p_divisao_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.treino_divisoes d
    join public.treinos t on t.id = d.treino_id
    where d.id = p_divisao_id and public.aluno_e_meu(t.aluno_id)
  );
$$;

-- A divisão de treino é do próprio aluno logado?
create or replace function public.divisao_e_minha_aluno(p_divisao_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.treino_divisoes d
    join public.treinos t on t.id = d.treino_id
    where d.id = p_divisao_id and public.aluno_e_eu(t.aluno_id)
  );
$$;

-- ----------------------------------------------------------------------------
-- Habilita RLS em TODAS as tabelas
-- ----------------------------------------------------------------------------
alter table public.usuarios            enable row level security;
alter table public.professores         enable row level security;
alter table public.alunos              enable row level security;
alter table public.planos              enable row level security;
alter table public.matriculas          enable row level security;
alter table public.pagamentos          enable row level security;
alter table public.categorias_despesa  enable row level security;
alter table public.despesas            enable row level security;
alter table public.horarios            enable row level security;
alter table public.presencas           enable row level security;
alter table public.anamneses           enable row level security;
alter table public.avaliacoes_fisicas  enable row level security;
alter table public.exercicios          enable row level security;
alter table public.treinos             enable row level security;
alter table public.treino_divisoes     enable row level security;
alter table public.treino_exercicios   enable row level security;

-- ============================================================================
-- usuarios
-- ============================================================================
drop policy if exists usuarios_admin_all on public.usuarios;
create policy usuarios_admin_all on public.usuarios
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists usuarios_self_select on public.usuarios;
create policy usuarios_self_select on public.usuarios
  for select to authenticated using (id = auth.uid());

-- ============================================================================
-- professores  (lista de professores não é sensível; escrita só admin)
-- ============================================================================
drop policy if exists professores_select on public.professores;
create policy professores_select on public.professores
  for select to authenticated using (true);

drop policy if exists professores_admin_write on public.professores;
create policy professores_admin_write on public.professores
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- alunos
-- ============================================================================
drop policy if exists alunos_admin_all on public.alunos;
create policy alunos_admin_all on public.alunos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- professor: vê e edita apenas os alunos da própria carteira
drop policy if exists alunos_professor_select on public.alunos;
create policy alunos_professor_select on public.alunos
  for select to authenticated using (professor_id = public.meu_professor_id());

drop policy if exists alunos_professor_update on public.alunos;
create policy alunos_professor_update on public.alunos
  for update to authenticated
  using (professor_id = public.meu_professor_id())
  with check (professor_id = public.meu_professor_id());

-- aluno: vê o próprio cadastro
drop policy if exists alunos_self_select on public.alunos;
create policy alunos_self_select on public.alunos
  for select to authenticated using (usuario_id = auth.uid());

-- ============================================================================
-- planos  (catálogo: leitura para autenticados; escrita só admin)
-- ============================================================================
drop policy if exists planos_select on public.planos;
create policy planos_select on public.planos
  for select to authenticated using (true);

drop policy if exists planos_admin_write on public.planos;
create policy planos_admin_write on public.planos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- matriculas  (financeiro = admin; aluno vê as próprias)
-- ============================================================================
drop policy if exists matriculas_admin_all on public.matriculas;
create policy matriculas_admin_all on public.matriculas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists matriculas_aluno_select on public.matriculas;
create policy matriculas_aluno_select on public.matriculas
  for select to authenticated using (public.aluno_e_eu(aluno_id));

-- ============================================================================
-- pagamentos  (financeiro = admin; aluno vê os próprios)
-- ============================================================================
drop policy if exists pagamentos_admin_all on public.pagamentos;
create policy pagamentos_admin_all on public.pagamentos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists pagamentos_aluno_select on public.pagamentos;
create policy pagamentos_aluno_select on public.pagamentos
  for select to authenticated using (public.aluno_e_eu(aluno_id));

-- ============================================================================
-- categorias_despesa / despesas  (apenas admin)
-- ============================================================================
drop policy if exists categorias_despesa_admin_all on public.categorias_despesa;
create policy categorias_despesa_admin_all on public.categorias_despesa
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists despesas_admin_all on public.despesas;
create policy despesas_admin_all on public.despesas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- horarios  (leitura para autenticados; admin total; professor gere a própria grade)
-- ============================================================================
drop policy if exists horarios_select on public.horarios;
create policy horarios_select on public.horarios
  for select to authenticated using (true);

drop policy if exists horarios_admin_all on public.horarios;
create policy horarios_admin_all on public.horarios
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists horarios_professor_write on public.horarios;
create policy horarios_professor_write on public.horarios
  for all to authenticated
  using (professor_id = public.meu_professor_id())
  with check (professor_id = public.meu_professor_id());

-- ============================================================================
-- presencas  (admin total; professor dos seus alunos; aluno vê as próprias)
-- ============================================================================
drop policy if exists presencas_admin_all on public.presencas;
create policy presencas_admin_all on public.presencas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists presencas_professor_all on public.presencas;
create policy presencas_professor_all on public.presencas
  for all to authenticated
  using (public.aluno_e_meu(aluno_id))
  with check (public.aluno_e_meu(aluno_id));

drop policy if exists presencas_aluno_select on public.presencas;
create policy presencas_aluno_select on public.presencas
  for select to authenticated using (public.aluno_e_eu(aluno_id));

-- ============================================================================
-- anamneses  (LGPD: restrito ao professor responsável e ao próprio aluno)
-- ============================================================================
drop policy if exists anamneses_admin_all on public.anamneses;
create policy anamneses_admin_all on public.anamneses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists anamneses_professor_all on public.anamneses;
create policy anamneses_professor_all on public.anamneses
  for all to authenticated
  using (public.aluno_e_meu(aluno_id))
  with check (public.aluno_e_meu(aluno_id));

drop policy if exists anamneses_aluno_select on public.anamneses;
create policy anamneses_aluno_select on public.anamneses
  for select to authenticated using (public.aluno_e_eu(aluno_id));

-- ============================================================================
-- avaliacoes_fisicas
-- ============================================================================
drop policy if exists avaliacoes_admin_all on public.avaliacoes_fisicas;
create policy avaliacoes_admin_all on public.avaliacoes_fisicas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists avaliacoes_professor_all on public.avaliacoes_fisicas;
create policy avaliacoes_professor_all on public.avaliacoes_fisicas
  for all to authenticated
  using (public.aluno_e_meu(aluno_id))
  with check (public.aluno_e_meu(aluno_id));

drop policy if exists avaliacoes_aluno_select on public.avaliacoes_fisicas;
create policy avaliacoes_aluno_select on public.avaliacoes_fisicas
  for select to authenticated using (public.aluno_e_eu(aluno_id));

-- ============================================================================
-- exercicios  (biblioteca: leitura para autenticados; escrita admin/professor)
-- ============================================================================
drop policy if exists exercicios_select on public.exercicios;
create policy exercicios_select on public.exercicios
  for select to authenticated using (true);

drop policy if exists exercicios_admin_all on public.exercicios;
create policy exercicios_admin_all on public.exercicios
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists exercicios_professor_write on public.exercicios;
create policy exercicios_professor_write on public.exercicios
  for all to authenticated
  using (public.meu_professor_id() is not null)
  with check (public.meu_professor_id() is not null);

-- ============================================================================
-- treinos
-- ============================================================================
drop policy if exists treinos_admin_all on public.treinos;
create policy treinos_admin_all on public.treinos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists treinos_professor_all on public.treinos;
create policy treinos_professor_all on public.treinos
  for all to authenticated
  using (public.aluno_e_meu(aluno_id))
  with check (public.aluno_e_meu(aluno_id));

drop policy if exists treinos_aluno_select on public.treinos;
create policy treinos_aluno_select on public.treinos
  for select to authenticated using (public.aluno_e_eu(aluno_id));

-- ============================================================================
-- treino_divisoes  (acesso resolvido via treino -> aluno)
-- ============================================================================
drop policy if exists treino_divisoes_admin_all on public.treino_divisoes;
create policy treino_divisoes_admin_all on public.treino_divisoes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists treino_divisoes_professor_all on public.treino_divisoes;
create policy treino_divisoes_professor_all on public.treino_divisoes
  for all to authenticated
  using (exists (
    select 1 from public.treinos t
    where t.id = treino_id and public.aluno_e_meu(t.aluno_id)
  ))
  with check (exists (
    select 1 from public.treinos t
    where t.id = treino_id and public.aluno_e_meu(t.aluno_id)
  ));

drop policy if exists treino_divisoes_aluno_select on public.treino_divisoes;
create policy treino_divisoes_aluno_select on public.treino_divisoes
  for select to authenticated
  using (exists (
    select 1 from public.treinos t
    where t.id = treino_id and public.aluno_e_eu(t.aluno_id)
  ));

-- ============================================================================
-- treino_exercicios  (acesso resolvido via divisão -> treino -> aluno)
-- ============================================================================
drop policy if exists treino_exercicios_admin_all on public.treino_exercicios;
create policy treino_exercicios_admin_all on public.treino_exercicios
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists treino_exercicios_professor_all on public.treino_exercicios;
create policy treino_exercicios_professor_all on public.treino_exercicios
  for all to authenticated
  using (public.divisao_e_minha(divisao_id))
  with check (public.divisao_e_minha(divisao_id));

drop policy if exists treino_exercicios_aluno_select on public.treino_exercicios;
create policy treino_exercicios_aluno_select on public.treino_exercicios
  for select to authenticated using (public.divisao_e_minha_aluno(divisao_id));
