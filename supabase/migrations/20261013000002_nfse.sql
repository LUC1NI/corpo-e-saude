-- ============================================================================
-- Corpo & Saúde — Migration: nota fiscal de serviço (NFS-e)
--
-- alunos_dados_fiscais: CPF + endereço do aluno (tomador). Tabela SEPARADA de
--   `alunos` de propósito: o RLS de `alunos` libera a linha inteira ao
--   professor, e CPF é dado pessoal (LGPD) que ele não precisa ver. Aqui:
--   admin total, aluno só lê o próprio, professor nada.
-- config_fiscal: linha única com a configuração de emissão (segredos ficam
--   FORA do banco: FOCUS_NFE_TOKEN e NFSE_WEBHOOK_SECRET são wrangler secrets).
-- notas_fiscais: uma nota por mensalidade paga (no máximo uma não cancelada
--   por pagamento). Referência única e idempotente para a API.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Dados fiscais do aluno (tomador)
-- ---------------------------------------------------------------------------
create table public.alunos_dados_fiscais (
  aluno_id         uuid primary key references public.alunos (id) on delete cascade,
  cpf              text check (cpf ~ '^[0-9]{11}$'),
  cep              text check (cep ~ '^[0-9]{8}$'),
  logradouro       text,
  numero           text,
  complemento      text,
  bairro           text,
  cidade           text,
  uf               text check (uf ~ '^[A-Z]{2}$'),
  -- Código IBGE do município (preenchido pelo ViaCEP), exigido pela API.
  codigo_municipio text check (codigo_municipio ~ '^[0-9]{7}$'),
  atualizado_em    timestamptz not null default now()
);

alter table public.alunos_dados_fiscais enable row level security;

create policy alunos_dados_fiscais_admin_all on public.alunos_dados_fiscais
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy alunos_dados_fiscais_aluno_select on public.alunos_dados_fiscais
  for select to authenticated
  using (public.aluno_e_eu(aluno_id));

-- ---------------------------------------------------------------------------
-- Configuração fiscal (linha única)
-- ---------------------------------------------------------------------------
create table public.config_fiscal (
  id                    smallint primary key default 1 check (id = 1),
  ativo                 boolean not null default false,
  ambiente              text not null default 'homologacao'
                        check (ambiente in ('homologacao', 'producao')),
  -- 'nfse' = NFS-e municipal (Mafra hoje: Publica/ABRASF);
  -- 'nfsen' = NFS-e Nacional (quando Mafra migrar para o Ambiente Nacional).
  api_nfse              text not null default 'nfse'
                        check (api_nfse in ('nfse', 'nfsen')),
  regime                text not null default 'simples_nacional'
                        check (regime in ('mei', 'simples_nacional', 'outro')),
  cnpj                  text check (cnpj ~ '^[0-9]{14}$'),
  inscricao_municipal   text,
  codigo_servico        text,        -- item da LC 116 (ex.: 06.04)
  codigo_tributacao_nacional text,   -- só NFS-e Nacional (ex.: 060401)
  aliquota_iss          numeric(5, 2) check (aliquota_iss >= 0 and aliquota_iss <= 5),
  natureza_operacao     text,        -- Mafra: códigos próprios 101 a 112
  descricao_servico_padrao text not null
                        default 'Mensalidade {plano}, competência {mes}/{ano}',
  emitir_automaticamente_na_baixa boolean not null default true,
  atualizado_em         timestamptz not null default now()
);

insert into public.config_fiscal (id) values (1) on conflict do nothing;

alter table public.config_fiscal enable row level security;

create policy config_fiscal_admin_all on public.config_fiscal
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Notas fiscais
-- ---------------------------------------------------------------------------
create table public.notas_fiscais (
  id                        uuid primary key default gen_random_uuid(),
  -- restrict: nota emitida é registro fiscal, não some junto com a cobrança.
  pagamento_id              uuid not null references public.pagamentos (id) on delete restrict,
  aluno_id                  uuid not null references public.alunos (id) on delete restrict,
  referencia                text not null unique,
  status                    text not null default 'aguardando_configuracao'
                            check (status in ('aguardando_configuracao', 'processando',
                                              'autorizada', 'erro', 'cancelada')),
  numero                    text,
  codigo_verificacao        text,
  url_pdf                   text,
  url_xml                   text,
  valor                     numeric(10, 2) not null,
  mensagem_erro             text,
  emitida_em                timestamptz,
  cancelada_em              timestamptz,
  justificativa_cancelamento text,
  criado_em                 timestamptz not null default now(),
  atualizado_em             timestamptz not null default now()
);

-- No máximo UMA nota não cancelada por pagamento.
create unique index uniq_nota_ativa_por_pagamento
  on public.notas_fiscais (pagamento_id)
  where status <> 'cancelada';

create index idx_notas_fiscais_aluno     on public.notas_fiscais (aluno_id);
create index idx_notas_fiscais_status    on public.notas_fiscais (status);
create index idx_notas_fiscais_criado_em on public.notas_fiscais (criado_em desc);

alter table public.notas_fiscais enable row level security;

create policy notas_fiscais_admin_all on public.notas_fiscais
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Aluno: só lê as PRÓPRIAS notas AUTORIZADAS (para baixar o PDF).
create policy notas_fiscais_aluno_select on public.notas_fiscais
  for select to authenticated
  using (public.aluno_e_eu(aluno_id) and status = 'autorizada');
