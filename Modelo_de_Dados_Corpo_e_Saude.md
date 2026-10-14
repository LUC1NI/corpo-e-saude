# Modelo de Dados — Sistema Corpo & Saúde

Fundação do sistema: tabelas, campos principais e relações. Nomes em português, padrão `snake_case`. Serve de blueprint para criar o banco e guiar todo o desenvolvimento.

---

## 1. Acesso e perfis

### `usuarios`
Controla login e papel de cada pessoa no sistema.
- `id` (PK)
- `email`
- `senha` — gerenciada pela camada de autenticação
- `papel` — `admin` | `professor` | `aluno`
- `ativo` (bool)
- `criado_em`

> Cada aluno e cada professor têm um registro aqui para poder logar. O `papel` define o que a pessoa enxerga.

### `professores`
- `id` (PK)
- `usuario_id` (FK → usuarios)
- `nome`
- `telefone`
- `especialidade`
- `ativo` (bool)
- `criado_em`

### `alunos`
- `id` (PK)
- `usuario_id` (FK → usuarios) — pode ficar vazio até gerar o acesso do aluno
- `professor_id` (FK → professores) — professor responsável
- `nome`
- `data_nascimento`
- `telefone`
- `email`
- `tipo` — `presencial` | `online`
- `status` — `ativo` | `inativo`
- `criado_em`

---

## 2. Financeiro

### `planos`
- `id` (PK)
- `nome`
- `descricao`
- `valor`
- `periodicidade` — `mensal` | `trimestral` | `semestral` | `anual`
- `duracao_meses`
- `ativo` (bool)

### `matriculas`
Vínculo do aluno a um plano. É o que sustenta a **renovação automática**.
- `id` (PK)
- `aluno_id` (FK → alunos)
- `plano_id` (FK → planos)
- `data_inicio`
- `data_proxima_cobranca`
- `renovacao_automatica` (bool)
- `status` — `ativa` | `cancelada`
- `criado_em`

> A cada virada de período, uma rotina gera um registro em `pagamentos` (pendente) com base na `data_proxima_cobranca`. A cobrança só para quando a matrícula é cancelada.

### `pagamentos`
Entradas (mensalidades). Alimenta a inadimplência e os alertas.
- `id` (PK)
- `matricula_id` (FK → matriculas)
- `aluno_id` (FK → alunos)
- `competencia` — mês/ano de referência
- `valor`
- `vencimento`
- `data_pagamento` — vazio = em aberto
- `status` — `pago` | `pendente` | `vencido`
- `forma_pagamento`
- `criado_em`

### `despesas`
Saídas. Lançamento manual.
- `id` (PK)
- `descricao`
- `categoria_id` (FK → categorias_despesa)
- `valor`
- `data`
- `criado_por` (FK → usuarios)
- `criado_em`

### `categorias_despesa`
Categorias pré-cadastradas para agilizar o lançamento (aluguel, material, etc.).
- `id` (PK)
- `nome`

---

## 3. Presença e horários

### `horarios`
Grade de horários dos profissionais.
- `id` (PK)
- `professor_id` (FK → professores)
- `dia_semana`
- `hora_inicio`
- `hora_fim`
- `capacidade` — opcional
- `criado_em`

### `presencas`
- `id` (PK)
- `aluno_id` (FK → alunos)
- `professor_id` (FK → professores) — opcional
- `data`
- `hora`
- `criado_em`

> A "quantidade de alunos em cada horário" sai do cruzamento entre `horarios` e as `presencas` (ou de um vínculo fixo aluno × horário, se a gente optar por agendar alunos em horários recorrentes).

---

## 4. Acompanhamento do aluno

### `anamneses`
Ficha de anamnese completa (uma por aluno, atualizável).
- `id` (PK)
- `aluno_id` (FK → alunos)
- `historico_saude`
- `lesoes_restricoes`
- `medicacao`
- `objetivos`
- `rotina_disponibilidade`
- `nivel_atividade`
- `criado_por` (FK → professores)
- `criado_em`, `atualizado_em`

### `avaliacoes_fisicas`
Histórico de avaliações (gera os gráficos de evolução).
- `id` (PK)
- `aluno_id` (FK → alunos)
- `data`
- `peso`
- `altura`
- `percentual_gordura`
- `imc` — calculado
- `medidas` — JSON (cintura, quadril, braço, coxa, etc.)
- `observacoes`
- `criado_por` (FK → professores)
- `criado_em`

---

## 5. Treino

### `exercicios`
Biblioteca de exercícios.
- `id` (PK)
- `nome`
- `grupo_muscular`
- `equipamento`
- `descricao`
- `midia_url` — imagem ou vídeo, opcional
- `criado_em`

### `treinos`
A ficha de treino de um aluno.
- `id` (PK)
- `aluno_id` (FK → alunos)
- `professor_id` (FK → professores)
- `nome`
- `objetivo`
- `ativo` (bool)
- `criado_em`, `atualizado_em`

### `treino_divisoes`
As divisões da ficha (Treino A, B, C…).
- `id` (PK)
- `treino_id` (FK → treinos)
- `nome` — ex: "A", "B", "C"
- `foco` — ex: "Superior", "Inferior"
- `ordem`

### `treino_exercicios`
Os exercícios de cada divisão, com séries/repetições/carga.
- `id` (PK)
- `divisao_id` (FK → treino_divisoes)
- `exercicio_id` (FK → exercicios)
- `series`
- `repeticoes`
- `carga`
- `descanso`
- `ordem`
- `observacao`

---

## 5.1 Notificações push

### `push_inscricoes`
Um registro por navegador/aparelho que ativou as notificações.
- `id` (PK)
- `usuario_id` (FK → usuarios)
- `endpoint` — único (URL do push service)
- `p256dh`, `auth` — chaves de criptografia do navegador
- `user_agent`
- `criado_em`

> RLS: o usuário gerencia só as próprias. O envio usa service_role no
> servidor; inscrição que responde 404/410 é apagada.

### `notificacoes_enviadas`
Trava para nunca enviar o mesmo aviso duas vezes.
- `id` (PK)
- `aluno_id` (FK → alunos)
- `tipo` — `mensalidade_antes` | `mensalidade_dia` | `mensalidade_atraso` | `treino_novo`
- `referencia_id` — id do pagamento, ou `<treino_id>:<data>` (treino: 1 aviso por ficha por dia)
- `enviada_em`
- único (`tipo`, `referencia_id`)

---

## 6. Mapa de relações (resumo)

- `usuarios` 1—1 `professores` / `alunos` (papel define o acesso)
- `professores` 1—N `alunos` (carteira de alunos)
- `alunos` 1—N `matriculas` → cada matrícula 1—N `pagamentos`
- `planos` 1—N `matriculas`
- `alunos` 1—N `presencas`; `professores` 1—N `horarios`
- `alunos` 1—1 `anamneses`; `alunos` 1—N `avaliacoes_fisicas`
- `alunos` 1—N `treinos` → `treino_divisoes` → `treino_exercicios` → `exercicios`
- `despesas` N—1 `categorias_despesa`

---

## 7. Decisões de projeto a lembrar

- **Acesso do aluno:** ao cadastrar, gera-se o `usuario` com senha provisória; no primeiro login o aluno define a própria senha. O dono não guarda senha de ninguém.
- **Renovação automática:** controlada por `matriculas.data_proxima_cobranca` + uma rotina que gera os `pagamentos` pendentes.
- **Inadimplência e alertas:** derivam de `pagamentos` com `status` pendente/vencido.
- **Isolamento de acesso (segurança):** professor enxerga apenas seus alunos; aluno enxerga apenas os próprios dados. (Com Supabase, via Row Level Security.)
- **Lançamento financeiro manual:** entradas e saídas lançadas no sistema; sem integração bancária.
