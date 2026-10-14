# CLAUDE.md — Sistema de Gestão Corpo & Saúde

Contexto-mestre deste projeto. Leia este arquivo e também `Modelo_de_Dados_Corpo_e_Saude.md` (nesta pasta) antes de gerar ou alterar qualquer código. Mantenha sempre o alinhamento com o que está aqui.

---

## 1. Visão geral

Sistema de gestão sob medida para o **Corpo & Saúde — Personal Trainer Studio** (Mafra/SC), substituindo a ferramenta atual. Centraliza alunos, planos, finanças, presença, anamnese, avaliação física e prescrição de treino. Atende alunos **presenciais e online**.

É uma **aplicação web responsiva** que funciona também como **PWA** (instalável na tela do celular, com aparência de app — sem lojas de aplicativos).

---

## 2. Stack (definida — não trocar sem combinar)

- **Next.js (App Router) + TypeScript**
- **Supabase** — Auth, Postgres, Row Level Security (RLS), Storage
- **Tailwind CSS** + **shadcn/ui** (componentes acessíveis, tematizados à marca)
- **Recharts** — gráficos de evolução
- **React Hook Form + Zod** — formulários e validação
- **date-fns** — datas
- **PWA** — manifest + service worker (Serwist ou next-pwa)

Idioma do domínio: **português** (tabelas, campos e termos de negócio em pt-BR, iguais ao modelo de dados).

---

## 3. Perfis de acesso (3)

- **admin** (dono) — acesso total: financeiro, planos, alunos, relatórios.
- **professor** — vê apenas a **própria carteira de alunos**: anamnese, avaliação, prescrição/ajuste de treino, presença, horários.
- **aluno** — área individual: treinos, evolução, presenças, situação financeira. Acesso só aos **próprios dados**.

---

## 4. Modelo de dados

A fonte de verdade é `Modelo_de_Dados_Corpo_e_Saude.md`. Resumo das tabelas:
`usuarios`, `professores`, `alunos`, `planos`, `matriculas`, `pagamentos`, `despesas`, `categorias_despesa`, `horarios`, `presencas`, `anamneses`, `avaliacoes_fisicas`, `exercicios`, `treinos`, `treino_divisoes`, `treino_exercicios`.

Não invente tabelas ou campos fora do modelo; se algo for necessário, proponha antes de criar.

---

## 5. Regras de negócio

- **Acesso do aluno:** ao cadastrar o aluno, gera-se o `usuario` com **senha provisória**; no **primeiro login o aluno é obrigado a definir a própria senha**. O dono nunca guarda senha de aluno. Incluir fluxo de "esqueci minha senha".
- **Renovação automática:** a `matricula` mantém a cobrança ativa até ser cancelada. Uma rotina gera os `pagamentos` pendentes com base em `data_proxima_cobranca`.
- **Caminhos de acesso do aluno** (todos convergem para login → troca de senha no 1º acesso → guia de instalação em `/aluno/bem-vindo`): (1) mensagem pronta de WhatsApp no card de acesso (`gerar-acesso.tsx`); (2) Google (landing e `/login` indexáveis via `robots.ts`/`sitemap.ts`; área logada fora do índice); (3) QR code da recepção em Admin → Acesso dos alunos, apontando para `/entrar` (redirect para `/login`). Lógica de instalação PWA compartilhada em `src/lib/pwa.ts`.
- **Inadimplência e alertas:** derivam de `pagamentos` com status `pendente`/`vencido`; exibidos no painel do dono e na área do aluno.
- **Financeiro manual:** entradas e despesas são lançadas no sistema. **Sem integração bancária** (decisão de custo). Lançamento deve ser rápido (categorias pré-cadastradas, valor pré-preenchido na baixa).
- **Aluno presencial × online:** campo `tipo`, resolvido no servidor (layout do aluno). Menu do **presencial**: Início · Horários · Evolução · Mensalidade (uso principal: ver os próprios horários e a mensalidade; treina na aula, sem ficha no app). Menu do **online**: Início · Treino · Evolução · Mensalidade (ficha + modo treino). Presencial em `/aluno/treino` e online em `/aluno/horarios` veem estado vazio amigável.
- **Faltas** não são gravadas: falta = aula fixa (`aluno_horarios`) já passada sem `presenca` no dia (`src/lib/historico-aulas.ts`).
- **Datas "de hoje"** sempre no fuso do estúdio: `hojeISO()`/`agoraNoEstudio()` (`src/lib/financeiro.ts`). O servidor (Workers) roda em UTC.
- **Horários:** grade por professor, com **visão da quantidade de alunos em cada horário**.

---

## 6. SEGURANÇA (prioridade máxima)

Tratar como requisito inegociável. O sistema guarda dados financeiros e **dados de saúde (anamnese)** — sensíveis pela LGPD.

- **RLS habilitado em TODAS as tabelas.** Políticas: professor só acessa linhas dos seus alunos; aluno só acessa as próprias linhas; admin acesso total. Nada de tabela sem política.
- **Chaves Supabase:** somente a `anon key` no client. A `service_role key` **nunca** vai pro front-end nem pro repositório — só em ambiente de servidor.
- **Validação no servidor sempre.** Toda mutação passa por Server Action / Route Handler com validação Zod. Nunca confiar em dado vindo do client.
- **Autenticação:** Supabase Auth (hashing de senha gerenciado). Senha provisória forte e aleatória; troca obrigatória no primeiro acesso.
- **Autorização por papel** verificada no servidor em cada ação (não só escondendo botão na UI).
- **Proteções:** prevenir SQL injection (usar o query builder/prepared statements), XSS (escapar/sanitizar entradas), CSRF (proteções nativas do Next). **Rate limiting** em login e reset de senha.
- **HTTPS obrigatório** (exigido inclusive pelo PWA).
- **Segredos em variáveis de ambiente** (`.env.local`), nunca commitados. Manter `.gitignore` correto.
- **Princípio do menor privilégio** em todas as policies e acessos.
- **Backup automático** dos dados (rotina diária para destino externo) — configurar antes do go-live.
- **LGPD / dados de saúde:** acesso à anamnese restrito ao professor responsável e ao próprio aluno.

---

## 7. PERFORMANCE

- **Server Components por padrão**; usar Client Components só quando houver interatividade real.
- **Índices** nas FKs e nas colunas usadas em filtro/ordenação (`aluno_id`, `professor_id`, `status`, `vencimento`, `competencia`, `data`).
- **Evitar N+1**: buscar dados com selects/joins do Supabase numa consulta, não em loop.
- **Paginação** em todas as listas potencialmente grandes (alunos, pagamentos, presenças).
- **next/image** para imagens; lazy loading; code splitting (nativo do App Router).
- **Cache e revalidação** adequados nas leituras.
- **Service worker (PWA)** para carregamento rápido e resiliência básica offline.

---

## 8. DESIGN (precisa ser excelente)

Visual moderno, limpo e profissional — referência são os mockups já aprovados (painel, prescrição de treino, área do aluno, anamnese). Mesma identidade.

**Paleta da marca:**
- Ciano primário / destaque: `#0090D8` (variação clara `#00A8E4`)
- Azul-marinho (sidebar, cabeçalhos): `#033373`
- Texto: `#18181A`
- Fundos: `#FFFFFF` e `#F4F7FB`

**Diretrizes:**
- Estilo SaaS: cards arredondados, sombras suaves, bastante respiro, tipografia sans-serif com títulos em bold.
- **Design system consistente** via Tailwind (tokens de cor/spacing) + shadcn/ui tematizado à paleta acima. Componentes reutilizáveis, nada de estilos soltos repetidos.
- **Mobile-first**, especialmente a área do aluno (é a tela de uso no celular / PWA).
- **Acessibilidade:** contraste adequado, labels em formulários, navegação por teclado, foco visível.
- **Estados cuidados:** loading, vazio, erro e sucesso em todas as telas.
- **PWA:** `manifest` com o logo (`logo` desta pasta) como ícone, modo `standalone`, splash. Implementar a detecção de "modo app" (`display-mode: standalone` / `navigator.standalone`) para mostrar o lembrete de "adicionar à tela de início" só para quem ainda não instalou.

---

## 9. Ordem de construção (roadmap)

1. **Setup** — projeto Next + TypeScript + Tailwind + shadcn/ui + base PWA + `.env` + conexão Supabase.
2. **Banco** — criar todas as tabelas do modelo de dados + **políticas RLS** + índices.
3. **Auth e perfis** — login, papéis, senha provisória + primeiro acesso, "esqueci a senha", guards de rota por papel.
4. **Layout e design system** — navegação, sidebar, tema da marca, componentes base.
5. **Financeiro** — planos, matrículas, renovação automática, pagamentos, inadimplência, despesas, painel do dono.
6. **Presença e horários** — marcação, histórico, grade com contagem por horário.
7. **Anamnese e avaliação física** — fichas + gráficos de evolução.
8. **Treino** — biblioteca de exercícios, fichas, divisões (A/B/C), prescrição/ajuste.
9. **Área do aluno** (mobile/PWA) — treinos, evolução, presenças, situação financeira, alertas.
10. **Acabamento** — instalação PWA, backup automático, revisão de segurança/performance, deploy.

Construir e validar um módulo por vez, na ordem acima. Não pular para módulos avançados antes da base (auth + RLS) estar sólida.

---

## 10. Convenções

- TypeScript estrito. Validação com Zod em toda entrada.
- Mutações via Server Actions; checar papel/permissão no servidor.
- Componentes pequenos e reutilizáveis; evitar duplicação.
- Nomes de domínio em português (alinhados ao modelo de dados).
- Commits pequenos e descritivos.
- Nunca commitar segredos. Sempre revisar `.gitignore`.
- **Nenhuma URL absoluta hardcoded.** Endereço do site só via `SITE_URL`/`urlAbsoluta()` (`src/lib/site.ts`), que lê `NEXT_PUBLIC_SITE_URL`. No deploy a fonte é o `wrangler.jsonc` (`scripts/com-vars-wrangler.mjs` injeta no build). Trocar de domínio: `DEPLOY.md` §1.1.
