-- ============================================================================
-- Corpo & Saúde — Migration 0003: seed inicial
-- Categorias de despesa pré-cadastradas para agilizar o lançamento.
-- ============================================================================

insert into public.categorias_despesa (nome) values
  ('Aluguel'),
  ('Material e equipamentos'),
  ('Manutenção'),
  ('Energia e água'),
  ('Internet e telefone'),
  ('Marketing'),
  ('Salários e pró-labore'),
  ('Impostos e taxas'),
  ('Limpeza'),
  ('Outros')
on conflict (nome) do nothing;
