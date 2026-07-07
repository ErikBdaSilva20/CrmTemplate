---
title: 'Deals Kanban Detail, Won/Lost BANT, Priority Signal, Status Hygiene (Épico 04)'
type: 'feature'
created: '2026-07-06'
status: 'done'
route: 'fix-epics'
---

# Deals Kanban Detail, Won/Lost BANT, Priority Signal, Status Hygiene (Épico 04)

## Intent

**Problem:** O Kanban de gestão de `/deals` (ativos) precisava de mais contexto por card, os cards
Won/Lost não mostravam BANT (pendência de `deferred-work.md`), não havia sinalização de prioridade, e o
`DealDetailScreen` tinha as pendências herdadas: `<Select>` de estágio não gated por status, e
`markAsWon`/`confirmLoss`/`reopenDeal` sem `try/catch` nem guard de re-entrância.

**Approach:** Enriquecer `DealCard` (status + close_date + prioridade), adicionar `QualificationBar` aos
cards compactos de `CollapsibleStatusColumn`, criar `dealPriority` (função pura) para sinalizar e ordenar
deals que precisam de atenção, e trazer `DealDetailScreen` para o mesmo padrão de tratamento de erro já usado
em `DealsScreen`.

## Suggested Review Order

**Story 4.1 — Card do Kanban mais detalhado**

- [`DealsKanban.tsx`](../../src/components/crm/DealsKanban.tsx) — `DealCard` ganha badge de status
  (`DEAL_STATUS`) e `close_date` formatada, além do que já existia (empresa/contato/valor/BANT).

**Story 4.2 — BANT nos cards Won/Lost**

- `CollapsibleStatusColumn` — `QualificationBar` renderizada nos cards compactos quando
  `qualification_score > 0`.

**Story 4.3 — Sinalização de prioridade**

- [`dealPriority`](../../src/lib/analytics.ts#L148) — função pura: `urgent` (close_date vencido/mês atual —
  granularidade de mês, ver `MonthYearSelect`), `stale` (sem atividade há >14 dias, usando a atividade mais
  recente do deal, não `created_at`), `risk` (BANT < 50% num deal ≥ R$10.000). `qualification_score === 0` é
  tratado como "nunca avaliado", não conta para `risk`. Cobertura em
  [`analytics.test.ts`](../../src/lib/analytics.test.ts) (6 casos).
- `DealsKanban.tsx` — cards urgentes/risco/parados ganham borda e badge coloridos; `sortByPriority` ordena
  cada coluna (urgente → risco → parado → sem sinal) sem embaralhar deals do mesmo nível.

**Story 4.4 — Higiene do fluxo de status (`DealDetailScreen`)**

- [`DealDetailScreen.tsx`](../../src/screens/DealDetailScreen.tsx) — `<Select>` de estágio ganha
  `disabled={deal.status !== "open"}`, alinhado ao gate que já existia nos cliques da barra de progresso.
- `markAsWon`/`confirmLoss`/`reopenDeal` — `try/catch` + `toast.error`, e um guard `statusActionPending` que
  desabilita os botões de ação (Ganho/Perdido/Reabrir/Confirmar Perda) enquanto a request está em voo,
  prevenindo duplo-clique.

**Story 4.5 — Remover dropdown de segmentos**

- Já removido no Épico 07 (`5810435`) — `DealsScreen` não tem mais `useSegments`/`applySegment`.

## Verification

- `npx tsc -b` limpo.
- `npx vitest run` — 39 testes passando (6 novos de `dealPriority`).
- `npx vite build` limpo.
