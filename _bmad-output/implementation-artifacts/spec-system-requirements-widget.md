---
title: 'System Requirements Widget — collapsible setup checklist in the header'
type: 'feature'
created: '2026-07-06'
status: 'done'
route: 'user-requested'
---

# System Requirements Widget — collapsible setup checklist in the header

## Intent

**Problem:** The `/deals` empty-pipeline incident showed a general gap: structural prerequisites (pipeline,
loss reasons — both only creatable from the now-removed `/settings`) can silently block a screen with no
visible path to fix it. The user asked for something present on every screen, but explicitly **not** a
banner that adds visual clutter — a collapsible button instead.

**Approach:** One small icon button in `AppHeader` (present on every authenticated screen via `AppLayout`),
closed by default, with a red count badge only when something *blocking* is missing. Clicking it opens a
popover listing each requirement — met (✓) or not — with an inline fix where one makes sense, so there's
always a real next step, not just a warning.

## Suggested Review Order

- [`src/lib/systemRequirements.ts`](../../src/lib/systemRequirements.ts) — pure `computeSystemRequirements()`,
  no `db` calls. Three checks: **pipeline** (≥1 pipeline **and** ≥1 stage — blocking, this is what stranded
  the user's 3 deals), **loss_reason** (≥1 row — blocking, needed to mark a deal as lost; also has zero rows
  right now and, like pipeline, has had no creation UI since `/settings` was removed), **company**
  (recommended, not blocking — deals/contacts work fine without one). Cobertura em
  [`systemRequirements.test.ts`](../../src/lib/systemRequirements.test.ts) (5 casos).
- [`SystemRequirementsWidget.tsx`](../../src/components/layout/SystemRequirementsWidget.tsx) — the
  collapsible button + popover. Unmet `pipeline`/`loss_reason` (both admin/manager-only, matching the
  existing `roleAtLeast(role, "manager")` convention for pipeline/lookup writes) get an inline mini-form
  right there instead of just a description; `company` links to `/companies?action=new`. Non-managers see
  "Peça a um admin/manager" instead of a form they can't use.
- [`AppHeader.tsx`](../../src/components/layout/AppHeader.tsx) — widget mounted once, next to the existing
  quick-actions button, so it's on every screen without touching each screen individually.
- [`pipelines.repo.ts`](../../src/lib/data/pipelines.repo.ts) — extracted `createDefaultPipeline(name)`
  (pipeline + the 5 default stages) so `SetupScreen`, `DealsScreen`'s own empty-state, and this widget all
  call the same function instead of three copies of the same loop.

## Verification

- `npx tsc -b` limpo.
- `npx vitest run` — 61 testes passando (5 novos de `computeSystemRequirements`).
- `npx vite build` limpo.
- **Nota:** o ambiente local ainda tem 0 `loss_reasons` (confirmado via `docker exec ... psql`) — ao contrário
  do pipeline, não mexi nisso no banco; o widget vai mostrar esse item como pendente até você criar um pela
  UI (é justamente o caminho que o widget existe pra oferecer).
