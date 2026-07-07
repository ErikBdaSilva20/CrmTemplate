---
title: 'Dashboard Deal Summary Card via EntityInfoCard (Épico 01)'
type: 'feature'
created: '2026-07-06'
status: 'done'
route: 'fix-epics'
---

# Dashboard Deal Summary Card via EntityInfoCard (Épico 01)

## Intent

**Problem:** O card "Pipeline por Estágio" (feito na sessão anterior, ver
`spec-dashboard-pipeline-expandable.md`) deixou as barras por estágio expansíveis, mas o `fix.md` (bloco 1)
pedia algo diferente: um card com os **principais deals** (BANT, contato, empresa, fechamento, atividades) via
um **componente reutilizável**. O card antigo não atendia esse pedido — auditoria confirmou que era o card
errado a expandir.

**Approach:** Extrair os presentacionais de BANT para um módulo próprio (elimina o import de um módulo
stateful só para pegar `QualificationBar`), criar `EntityInfoCard` (resumo completo e reutilizável de um deal)
e substituir o card antigo por uma lista expansível dos 4 deals mais relevantes, cada um expandindo para o
`EntityInfoCard` completo.

## Suggested Review Order

**Story 1.1 — Extração dos presentacionais de BANT**

- Novo arquivo `src/components/crm/QualificationBar.tsx` — `getScoreColor`, `getProgressColor`,
  `LeadScoreBadge`, `QualificationBar` (movidos de `DealQualification.tsx`, comportamento idêntico).
- `DealQualification.tsx` agora importa `getScoreColor`/`getProgressColor` do novo arquivo.
- `DealsKanban.tsx` importa `QualificationBar` do novo arquivo (antes importava de `DealQualification.tsx`).

**Story 1.2 — `EntityInfoCard`**

- [`src/components/crm/EntityInfoCard.tsx`](../../src/components/crm/EntityInfoCard.tsx) — puramente
  presentacional (`deal: DealWithRelations`, `activities: Activity[]` via props). Mostra empresa/contato,
  valor + close_date, badge de status (`DEAL_STATUS`), `QualificationBar` (só quando `qualification_score > 0`)
  e mini-timeline das últimas 3 atividades do deal (`activities.filter(a => a.deal_id === deal.id)`,
  list-then-filter, sem get-by-id). Clique no header navega para `/deals/:id`.

**Story 1.3 — Novo card no Dashboard**

- [`DashboardScreen.tsx`](../../src/screens/DashboardScreen.tsx) — card "Pipeline por Estágio" **substituído**
  por "Principais Negócios": lista de até 4 deals (via `selectTopDeals`), cada linha expansível revelando o
  `EntityInfoCard`; indicador "+N mais · Ver pipeline" quando há mais deals abertos que os 4 exibidos; empty
  state "Nenhum negócio ainda".
- Estado antigo (`funnelData`, `expandedStages`, `toggleStage`, `MAX_VISIBLE_STAGE_DEALS`,
  `computeFunnel`/`computeStageDeals` no Dashboard) removido — sem função/estado órfão.

**Story 1.4 — Seleção pura testada**

- [`selectTopDeals`](../../src/lib/analytics.ts#L148) — função pura genérica (`<T extends Deal>`, preserva
  `DealWithRelations` para o Dashboard) ordenando por `qualification_score` desc → `value` desc → `close_date`
  asc (sem data por último). Cobertura em
  [`analytics.test.ts`](../../src/lib/analytics.test.ts#L133) (3 casos: ordenação, limite, deals sem
  `close_date`).

## Verification

- `npx tsc -b` limpo.
- `npx vitest run` — 26 testes passando (3 novos de `selectTopDeals`).
- `npx vite build` limpo.
