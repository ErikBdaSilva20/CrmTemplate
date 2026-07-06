---
title: 'Tasks Kanban by Due-Date Bucket (Épico 05)'
type: 'feature'
created: '2026-07-06'
status: 'done'
route: 'fix-epics'
---

# Tasks Kanban by Due-Date Bucket (Épico 05)

## Intent

**Problem:** `/tasks` só tinha visão de lista/tabela. `fix.md` (bloco 5) pedia um Kanban para gerenciar
tarefas de forma organizada, mostrando responsável e empresa. O schema não tem coluna de "status" de tarefa —
só `due_date`/`completed_at` — então as colunas têm que ser buckets de prazo/estado derivados no front.

**Approach:** Buckets **Vencidas → Hoje → Próximas → Concluídas** (função pura `getTaskBucket`), um novo
`TasksKanban` no padrão `@dnd-kit` já usado em `ContactsKanbanByStatus`/`DealsKanban`, e um toggle Lista/Kanban
em `TasksScreen` que preserva a visão de lista/tabela exatamente como estava.

## Suggested Review Order

**Story 5.1 — Toggle Lista/Kanban**

- [`TasksScreen.tsx`](../../src/screens/TasksScreen.tsx) — `viewMode` (`"list" | "kanban"`, padrão `"list"`
  para não surpreender quem já usa a tela), no mesmo padrão visual do seletor de `ContactsScreen`/`DealsScreen`.
  A visão Lista (tabs de data + tabela) é preservada sem alteração de comportamento.

**Story 5.2 — Buckets de prazo**

- [`src/lib/tasks.ts`](../../src/lib/tasks.ts) — `getTaskBucket(task, now)`: `done` (tem `completed_at`) →
  `overdue` (due_date antes de hoje) → `today` → `upcoming` (inclusive quando não há `due_date`). Cobertura em
  [`tasks.test.ts`](../../src/lib/tasks.test.ts) (8 casos).

**Story 5.3 — Card com responsável/empresa/negócio**

- [`TasksKanban.tsx`](../../src/components/crm/TasksKanban.tsx) — `TaskCard` resolve `contact`/`deal` por
  `contact_id`/`deal_id` (list-then-filter) e `company` por `task.company_id` **ou** pelo `company_id` do
  deal/contato vinculado (sem get-by-id/join); "responsável" exibe o nome da sessão (modelo single-owner).
  Clicar no card abre o dialog de editar-tarefa já existente (`openEdit`).

**Story 5.4 — Drag & drop entre buckets**

- `dueDateForBucket` (`tasks.ts`) — devolve o `due_date` alvo (hoje/+7 dias/ontem) para cada bucket de prazo.
- `TasksScreen.handleKanbanDragEnd` — atualização **otimista** (espelha `activities` num state local, mesmo
  padrão de `ContactsScreen`/`DealsScreen`) com **revert** e `toast.error` se a request falhar. Mover para
  "Concluídas" seta `completed_at`; mover para qualquer bucket de prazo ajusta `due_date` **e** limpa
  `completed_at` — o que também cobre "arrastar de Concluídas reabre a tarefa" sem lógica duplicada.

## Verification

- `npx tsc -b` limpo.
- `npx vitest run` — 47 testes passando (8 novos de `getTaskBucket`/`dueDateForBucket`).
- `npx vite build` limpo.
