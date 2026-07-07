---
title: 'Fix: deals invisible with zero pipelines (no way to create one after Épico 08)'
type: 'bugfix'
created: '2026-07-06'
status: 'done'
route: 'user-reported'
---

# Fix: deals invisible with zero pipelines

## Intent

**Problem:** User reported 3 active deals not showing up in the `/deals` Kanban. Root cause (confirmed via
direct read of the local Postgres DB): `pipelines` and `pipeline_stages` were both empty — the Kanban has no
stage columns to render deals into (falls into `DealsKanban`'s "Nenhum dado encontrado" branch), and the 3
deals had `stage_id = NULL` (created while no stage existed to default to). Digging further: after Épico 08
removed `/settings`, there was **no UI path left to create a pipeline from scratch** — "Personalizar
pipeline" in `DealsScreen` only edits stages of an existing pipeline (`disabled={!selectedPipeline}`), and
`/setup` is a one-shot onboarding route, not something you'd revisit. This is exactly the risk flagged when
Épico 08's Option 1 was chosen — it materialized here.

**Approach:** Data fix (create the missing pipeline/stages for this environment, assign the 3 orphaned deals
to the first stage) + a code fix so this can't silently strand deals again: `DealsScreen` shows a "create
your first pipeline" bootstrap state whenever `pipelines.length === 0`.

## Data fix (this environment only, not a code change)

Ran directly against the local Postgres container (`masia_local_db2`): created a `Pipeline de Vendas`
pipeline (`is_default: true`) with the same 5 default stages as `/setup` (Lead → Qualificado → Proposta →
Negociação → Fechado), then set `stage_id` to `Lead` for the 3 deals that had `stage_id IS NULL`.

## Code fix

- [`src/lib/constants.ts`](../../src/lib/constants.ts) — `DEFAULT_STAGES` extracted (was inlined only in
  `SetupScreen.tsx`), now shared by both `/setup` and the new bootstrap flow.
- [`SetupScreen.tsx`](../../src/screens/SetupScreen.tsx) — imports `DEFAULT_STAGES` from constants instead of
  redefining it; fixed a stale copy line pointing users to "Configurações" (removed in Épico 08) for
  adjusting stages — now points to "Negócios → Personalizar pipeline".
- [`DealsScreen.tsx`](../../src/screens/DealsScreen.tsx) — when `pipelines.length === 0`, renders a bootstrap
  empty-state instead of the (silently empty) Kanban/List: admin/manager gets a name field + "Criar pipeline"
  button (creates the pipeline + 5 default stages, same as `/setup`); other roles see a message to ask an
  admin/manager. This restores the "create a pipeline from nothing" capability that only used to live in the
  now-removed `SettingsScreen`, without bringing that screen back.

## Verification

- `npx tsc -b` limpo.
- `npx vitest run` — 56 testes passando (sem regressão; nenhuma lógica nova aqui é pura o suficiente pra
  merecer teste isolado além do que `createPipeline`/`createStage` já cobrem via `SetupScreen`'s existing
  behavior).
- `npx vite build` limpo.
- Confirmado via `docker exec masia_local_db2 psql`: os 3 deals do usuário agora resolvem para o estágio
  "Lead" e devem aparecer no Kanban ao recarregar o app.
