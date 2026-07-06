---
stepsCompleted: ['step-01-validate-prerequisites']
inputDocuments:
  - IDEIAS-CRM.md
  - Importantdoc.md
  - doc.md
  - docs/01-visao.md
  - docs/02-arquitetura-de-comunicacao.md
  - docs/05.design.md
  - src/lib/data/types.gen.ts
  - masi.template.json
---

# CellRM — Epic Breakdown

## Overview

Este documento decompõe as ideias aprovadas em `IDEIAS-CRM.md` (conceitos trazidos do template
de Time Tracking e adaptados para o CRM de vendas **CellRM**) em épicos e stories implementáveis,
respeitando o contrato de arquitetura da fundação MasIA (`Importantdoc.md`) e o modelo de dados
atual (`types.gen.ts`).

**Contexto do produto:** CellRM é um SPA React 19 + Vite, sem backend próprio, que fala apenas
com o **tenant-gateway** via CRUD genérico (`/data/:table`). Entidades atuais: `companies`,
`contacts`, `deals` (BANT), `activities`, `tags` (+ contact_tags/deal_tags), `sales_goals`,
`segments`, `pipelines`, `pipeline_stages`, `loss_reasons`.

**Ordem definida com o usuário:** do **mais importante/maior valor** para o **mais simples**.

## Requirements Inventory

### Functional Requirements

**Snapshot no fechamento do deal**
FR1: Ao marcar um deal como `won` ou `lost`, o sistema deve congelar na própria linha do deal um snapshot com: `company_name`, `contact_name`, `stage_name_at_close`, `owner_name`, `closed_value`, `closed_at`.
FR2: Telas e relatórios de deals fechados devem exibir os valores do snapshot (histórico), não os valores atuais das entidades relacionadas.
FR3: O snapshot deve ser preenchido resolvendo os nomes a partir das listas já carregadas no front (companies, contacts, pipeline_stages, sessão do usuário) — sem depender de join no gateway.
FR4: Se uma empresa/contato relacionado for renomeado ou excluído após o fechamento, o snapshot do deal permanece inalterado.

**Timeline por entidade**
FR5: Cada deal, contato e empresa deve exibir uma timeline cronológica (mais recente primeiro) de suas `activities`.
FR6: Cada item da timeline renderiza o tipo da activity (`call`/`email`/`meeting`/`note`/`task`) com ícone lucide, título, corpo e data relevante (`completed_at` ou `created_at`).
FR7: A timeline é montada por list-then-filter no front (filtra `activities` por `deal_id`/`contact_id`/`company_id`) — sem get-by-id/join.
FR8: A timeline deve ter estado vazio (empty state) quando não houver activities, e permitir criar uma nova activity a partir dali.

**Metas com progresso**
FR9: Cada meta (`sales_goals`) deve exibir realizado vs. alvo vs. restante e o percentual de progresso.
FR10: O valor realizado deve ser calculado no front somando os deals `won` do período (por `owner_id` e `goal_type`), nunca persistido como total.
FR11: A tela de metas deve exibir uma projeção linear de fechamento do período com base no dia atual do mês/período.
FR12: A meta deve sinalizar visualmente o status (no ritmo / atrás / atingida).

**Calendário de atividades**
FR13: Uma tela de calendário deve exibir `activities` com `due_date` nas visões dia/semana/mês.
FR14: A partir do calendário, o usuário pode marcar uma activity como concluída (`completed_at`) e abrir seu detalhe.

**Busca global**
FR15: Um campo de busca único deve pesquisar `contacts`, `companies`, `deals` e `activities`.
FR16: Os resultados devem ser agrupados por tipo, com navegação direta para a entidade selecionada.
FR17: A busca opera sobre dados já listados no front (list-then-filter), respeitando o escopo do usuário (owner_id).

### NonFunctional Requirements

NFR1: Todo acesso a dados deve passar pelo `db`/`auth` de `src/lib/data/client.ts`. Proibido Supabase/Firebase, fetch cru ao banco ou backend próprio.
NFR2: O modelo genérico não tem get-by-id nem join — todas as telas usam list-then-filter; relações são resolvidas no front ou via snapshot.
NFR3: Toda tabela escrita pelo rep tem `owner_id text references "user"(id)` (inclusive filhas); `owner_id` é setado pelo gateway e **nunca** enviado do front.
NFR4: Schema em `snake_case`; sem RLS/`auth.uid()`/`profiles`; sem nomes de tabela reservados.
NFR5: TypeScript strict, zero imports não usados; `tsc && vite build` passa limpo.
NFR6: `role` (admin/manager/rep) usado só para UI; a autorização real é no gateway.
NFR7: Consistência do Design System — reutilizar componentes shadcn/ui existentes e o padrão de CRUD/telas; não reinventar componentes.
NFR8: Arquivos protegidos (`client.ts`, `types.gen.ts`, `auth.tsx`, `components/ui/**`, `utils.ts`, `main.tsx`, migrations) não são alterados como código de aplicação.

### Additional Requirements

- **Mudanças aditivas apenas:** Snapshot e Metas exigem migration aditiva (colunas nullable) em `supabase/migrations/0001_business_schema.sql`, com espelhamento em `types.gen.ts`. Timeline, Calendário e Busca são **somente front** (sem schema novo).
- **Reuso de entidades existentes:** `deals` (snapshot), `activities` (timeline/calendário), `sales_goals` (metas). Nenhuma entidade nova é obrigatória para os 5 requisitos priorizados.
- **Helpers de dados existentes:** `deals.repo.ts` já expõe `markDealWon`/`markDealLost` — o snapshot entra nesse ponto. `enrichDeals()` é o padrão de cruzamento no front (base para timeline/busca).
- **Telas/componentes a reutilizar ou criar:** `DealDetailScreen`, `ContactDrawer`, `CompanyDrawer`, `SalesGoalsScreen` (existentes); `EntityTimeline` + `TimelineItem`, `CalendarScreen`, `GlobalSearch` (a criar em `components/crm/` e `screens/`).
- **Deals fechados sem snapshot (retrocompat.):** telas devem ter fallback para deals fechados antes da feature (snapshot nulo) — usar o dado relacionado atual como fallback.

### UX Design Requirements

UX-DR1: **TimelineItem** — componente reutilizável de item de timeline (ícone por tipo de activity, título, corpo truncável, timestamp relativo via date-fns), com variantes por `ActivityType`.
UX-DR2: **EntityTimeline** — container de timeline com ordenação desc, agrupamento por data (Hoje/Ontem/data), empty state e ação "Nova atividade".
UX-DR3: **GoalProgress** — barra/anel de progresso reutilizável com realizado/alvo/restante, badge de status (no ritmo/atrás/atingida) e linha de projeção.
UX-DR4: **CalendarView** — grade de calendário (dia/semana/mês) com chips de activity coloridos por tipo, seguindo tokens do tema atual do CellRM.
UX-DR5: **GlobalSearch (Command palette)** — input de busca (usar `cmdk`/`command.tsx` já presente) com resultados agrupados por entidade e navegação por teclado.
UX-DR6: **Consistência visual** — todos os novos componentes seguem os tokens de `src/index.css`/`theme.md` do CellRM (não o tema dark-slate do doc 05, que era do produto de time tracking).

### FR Coverage Map

{{requirements_coverage_map}}

## Epic List

{{epics_list}}
