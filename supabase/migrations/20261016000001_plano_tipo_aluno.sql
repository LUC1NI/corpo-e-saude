-- Plano por tipo de aluno: o cadastro mostra só os planos que servem ao tipo escolhido.
-- null = serve para presencial e online (planos existentes continuam valendo para os dois).
alter table public.planos
  add column if not exists tipo_aluno tipo_aluno;

comment on column public.planos.tipo_aluno is
  'Para qual tipo de aluno o plano serve; null = ambos.';
