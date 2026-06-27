-- ============================================================================
-- Passo 9/10 — Professor pode cadastrar alunos na própria carteira
-- ----------------------------------------------------------------------------
-- O professor passa a poder INSERIR alunos, mas só atribuídos a ele mesmo
-- (professor_id = seu próprio id). Continua sem poder cadastrar na carteira
-- de outro professor (with check). Admin segue com acesso total.
-- ============================================================================

drop policy if exists alunos_professor_insert on public.alunos;
create policy alunos_professor_insert on public.alunos
  for insert to authenticated
  with check (professor_id = public.meu_professor_id());
