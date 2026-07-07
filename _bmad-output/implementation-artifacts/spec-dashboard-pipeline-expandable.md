---
title: 'Expandable Pipeline-by-Stage List on Dashboard'
type: 'feature'
created: '2026-07-06'
status: 'done'
route: 'one-shot'
---

# Expandable Pipeline-by-Stage List on Dashboard

## Intent

**Problem:** The Dashboard's "Pipeline por Estágio" card only showed an aggregate bar (name, count, total value) per stage — there was no way to see which deals were actually in a stage without leaving the dashboard.

**Approach:** Make each stage row expandable: clicking toggles a chevron and reveals up to 4 of that stage's open deals (highest value first), each clickable to jump to its detail page, with a "+N mais" indicator and an empty state — while keeping the existing aggregate bar.

## Suggested Review Order

**Data plumbing**

- `computeStageDeals` — new pure function (filter + sort by value desc), extracted to match this file's own stated purpose of keeping calculations testable and out of JSX.
  [`analytics.ts:142`](../../src/lib/analytics.ts#L142)

- `FunnelStage` gained an `id` field so the Dashboard can look up a stage's deals after the aggregate was already computed.
  [`analytics.ts:118`](../../src/lib/analytics.ts#L118)

**Expand/collapse UI**

- Entry point — toggle handler and expansion state.
  [`DashboardScreen.tsx:102`](../../src/screens/DashboardScreen.tsx#L102)

- Deal list only computed for the expanded stage (not on every render for every stage), capped at `MAX_VISIBLE_STAGE_DEALS`.
  [`DashboardScreen.tsx:360`](../../src/screens/DashboardScreen.tsx#L360)

- Deal rows are real `<button>`s (keyboard-operable) with `min-w-0 flex-1` on the title so `truncate` actually clips instead of overflowing.
  [`DashboardScreen.tsx:401`](../../src/screens/DashboardScreen.tsx#L401)

- `aria-controls` links the toggle button to the revealed panel.
  [`DashboardScreen.tsx:370`](../../src/screens/DashboardScreen.tsx#L370)

**Tests**

- `computeFunnel`/`computeStageDeals` coverage, including the new `id` field.
  [`analytics.test.ts:70`](../../src/lib/analytics.test.ts#L70)
