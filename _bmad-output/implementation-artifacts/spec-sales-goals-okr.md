---
title: 'Sales Goals OKR — deal/company link + richer UI (Épico 06 + 09)'
type: 'feature'
created: '2026-07-06'
status: 'done'
route: 'fix-epics'
---

# Sales Goals OKR — deal/company link + richer UI (Épico 06 + 09)

## Intent

**Problem:** `/sales-goals` só suportava metas globais por período/owner, e a tela era uma tabela simples com
cards de resumo agrupados por tipo. `fix.md` (bloco 6) pedia permitir atrelar uma meta a um deal ou empresa
(conceito OKR) e melhorar a interface.

**Approach:** Colunas aditivas `deal_id`/`company_id` em `sales_goals` (Épico 09), um cálculo de "realizado"
escopado pelo vínculo (`computeGoalActual`), e a tela redesenhada como grid de cards por meta (um card = um
"resultado-chave"), cada um com % de progresso, status de ritmo e projeção linear.

## Suggested Review Order

**Story 9.1/6.1 — Schema**

- [`0001_business_schema.sql:229`](../../supabase/migrations/0001_business_schema.sql#L229) —
  `alter table sales_goals add column if not exists deal_id/company_id ...` (idempotente, nullable,
  `on delete set null`), logo após a criação da tabela.
- `types.gen.ts` — `sales_goals` Row/Insert/Update ganham `deal_id`/`company_id`.

**Story 6.2 — Vínculo no formulário**

- [`SalesGoalsScreen.tsx`](../../src/screens/SalesGoalsScreen.tsx) — novo `linkType` (`none | deal | company`)
  no form; só o vínculo escolhido é enviado (mutuamente exclusivo). `openEdit` deriva `linkType`/`linkId` a
  partir de `deal_id`/`company_id` existentes.

**Story 6.3 — Progresso escopado pelo vínculo**

- [`computeGoalActual`](../../src/lib/analytics.ts#L286) — função pura: meta com `company_id` soma/conta só
  os registros daquela empresa (revenue/deals_closed via `deals.company_id`, activities via
  `activities.company_id`, new_contacts via `contacts.company_id`); meta com `deal_id` mede o próprio deal
  (won → valor/contagem; activities filtradas por `deal_id`); sem vínculo, mantém o cálculo global anterior.
  Cobertura em [`analytics.test.ts`](../../src/lib/analytics.test.ts) (4 casos).

**Story 6.4 — UI OKR**

- Cards por meta substituem a antiga tabela + cards-resumo-por-tipo: realizado vs. alvo vs. restante, barra de
  progresso, badge de ritmo (`computeGoalPace` → "Atingida"/"No ritmo"/"Atrás", comparando % de progresso com
  a fração do período já decorrida) e projeção linear (`computeGoalProjection`). Metas vinculadas mostram o
  nome do deal/empresa (🎯) abaixo do tipo. Empty state preservado.

## Verification

- `npx tsc -b` limpo.
- `npx vitest run` — 56 testes passando (9 novos: `computeGoalActual`/`computeGoalPace`/`computeGoalProjection`).
- `npx vite build` limpo.
- **Pendente:** aplicar a migration num Postgres local (`docker compose exec -T db psql ...`) fica a cargo do
  usuário — não executado nesta sessão.
