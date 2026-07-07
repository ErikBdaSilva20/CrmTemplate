---
title: 'Deal Status Editing (Won/Lost Misclick Recovery)'
type: 'feature'
created: '2026-07-06'
status: 'done'
route: 'one-shot'
---

# Deal Status Editing (Won/Lost Misclick Recovery)

## Intent

**Problem:** Once a deal was marked "Ganho" or "Perdido", there was no way to change it back — a misclick permanently stuck the deal in that status, and a stale loss reason could linger on a deal later marked won.

**Approach:** Make the deal-detail action row always show a status transition (Ganho/Perdido/Reabrir depending on current status) instead of hiding entirely once closed, and fix `markDealWon` (the single shared repo helper, used by this screen, the deals list, kanban, and batch actions) to clear `loss_reason` so it can't outlive a win.

## Suggested Review Order

**Status transition actions**

- Entry point — the action row now always renders, showing the buttons relevant to the current status.
  [`DealDetailScreen.tsx:241`](../../src/screens/DealDetailScreen.tsx#L241)

- `reopenDeal` — new action, deliberately does *not* clear `loss_reason` (a misclick here shouldn't destroy the historical reason).
  [`DealDetailScreen.tsx:150`](../../src/screens/DealDetailScreen.tsx#L150)

- `openLossModal` — resets the loss-reason dialog fields on open, matching the sibling implementation in `DealsScreen.tsx`.
  [`DealDetailScreen.tsx:144`](../../src/screens/DealDetailScreen.tsx#L144)

**Stale loss-reason fix**

- Single source of truth: `markDealWon` now clears `loss_reason`, fixing the bug for every caller (this screen, deals list, kanban, batch actions), not just this one.
  [`deals.repo.ts:29`](../../src/lib/data/deals.repo.ts#L29)

- `markAsWon` now delegates to the shared helper instead of duplicating the `updateDeal` call inline.
  [`DealDetailScreen.tsx:128`](../../src/screens/DealDetailScreen.tsx#L128)

- "Motivo da perda" card gated on `status === "lost"` (not just `loss_reason` truthy), so a reopened deal doesn't show a stale loss reason as if it were still lost.
  [`DealDetailScreen.tsx:391`](../../src/screens/DealDetailScreen.tsx#L391)
