---
epic: 5
title: Tasks — visão Kanban para gestão de tarefas
block: 'fix.md §5'
depends_on: []
enables: []
---

# Épico 05 — Tasks: Kanban de tarefas

## Objetivo

Em `/tasks`, adicionar um **Kanban** para gerenciar tarefas de forma organizada e intuitiva, exibindo
informações de **responsável, empresa** (e deal relacionado etc.).

## Contexto atual (código)

- `src/screens/TasksScreen.tsx` — hoje é **tabela/lista** com filtros por data (`DateFilter`:
  todo/overdue/today/tomorrow/this_week/done). Tarefas = `activities` com `type === "task"` (linha ~49).
- `src/lib/data/activities.repo.ts` — `toggleTaskDone`, `createActivity`, `updateActivity`.
- Padrão de Kanban com `@dnd-kit` já existe: `src/components/crm/ContactsKanbanByStatus.tsx` e
  `DealsKanban.tsx` — reaproveitar o padrão (colunas + draggable + droppable).
- Modelo de dados: `activities` tem `owner_id`, `contact_id`, `deal_id`, `company_id`, `due_date`,
  `completed_at`. **Não há campo de "status" de tarefa** além de `completed_at` + `due_date`.

## Decisão de modelagem das colunas

Sem campo de status dedicado, as **colunas do Kanban** serão **buckets de prazo/estado** derivados no front:
**Vencidas → Hoje → Próximas → Concluídas** (reutilizando as funções de `src/lib/date.ts`:
`startOfDay`/`endOfDay`/`getWeekRange`). Arrastar um card:
- para **Concluídas** → `toggleTaskDone(id, true)` (seta `completed_at`);
- para uma coluna de prazo → ajusta `due_date` para o bucket alvo (ex.: "Hoje" = hoje; "Próximas" = +7 dias);
- de **Concluídas** de volta → `toggleTaskDone(id, false)`.
(Não há migração de schema — é *front-only* sobre `activities`.)

---

### Story 5.1: Alternância de visão Lista/Kanban em Tasks

Como **usuário**,
quero **alternar entre lista e Kanban em `/tasks`**,
para que **eu escolha a visão que melhor gerencia minhas tarefas**.

**Acceptance Criteria:**

**Given** `/tasks`
**When** a tela carrega
**Then** há um seletor de visão (Kanban | Lista) no padrão do `DealsScreen` (`viewMode`)
**And** a visão Lista atual é preservada
**And** a preferência de visão é lembrada durante a sessão.

### Story 5.2: Kanban de tarefas por bucket de prazo

Como **usuário**,
quero **ver minhas tarefas em colunas por prazo/estado**,
para que **eu enxergue rapidamente o que está vencido, é de hoje ou está por vir**.

**Acceptance Criteria:**

**Given** tarefas (`activities` `type="task"`)
**When** abro o Kanban
**Then** vejo colunas **Vencidas / Hoje / Próximas / Concluídas** com a contagem por coluna
**And** cada tarefa aparece na coluna correta segundo `due_date`/`completed_at` (funções de `src/lib/date.ts`)
**And** há *empty state* por coluna.

### Story 5.3: Card de tarefa com responsável e empresa

Como **usuário**,
quero **cada card de tarefa mostrando responsável, empresa e deal relacionados**,
para que **eu tenha contexto sem abrir a tarefa**.

**Acceptance Criteria:**

**Given** uma tarefa com `contact_id`/`deal_id`/`company_id`
**When** vejo seu card
**Then** o card mostra título, `due_date`, **empresa** (resolvida no front por `company_id` ou via o deal/contato),
**responsável** (owner — no modelo single-owner, o usuário da sessão; exibir de forma clara) e o deal/contato vinculado
**And** relações são resolvidas por *list-then-filter* no front (sem get-by-id/join)
**And** clicar no card abre o editar-tarefa existente (`ActivityCreateEditModal`/fluxo atual).

### Story 5.4: Mover tarefa entre colunas (drag & drop)

Como **usuário**,
quero **arrastar tarefas entre colunas**,
para que **eu atualize prazo/conclusão rapidamente**.

**Acceptance Criteria:**

**Given** o Kanban de tarefas
**When** arrasto um card para **Concluídas**
**Then** `toggleTaskDone(id, true)` é chamado (update otimista + refresh)
**When** arrasto para uma coluna de prazo
**Then** `due_date` é ajustada para o bucket alvo via `updateActivity`
**And** falhas mostram `toast.error` e revertem o estado otimista
**And** arrastar de Concluídas para outra coluna reabre a tarefa (`toggleTaskDone(id, false)`).

## Notas técnicas

- Reaproveitar `@dnd-kit` e a estrutura de `ContactsKanbanByStatus.tsx`.
- Sem alteração de schema — nada a mudar em `0001_business_schema.sql`.
- "Responsável" é limitado pelo modelo single-owner (owner_id = sessão). Se o produto quiser atribuição a
  outros usuários no futuro, é um épico à parte (novo campo/relação) — fora deste lote.
