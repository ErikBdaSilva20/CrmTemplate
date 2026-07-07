---
title: 'Loss Reasons management + lost-deals review panel on /deals'
type: 'feature'
created: '2026-07-06'
status: 'done'
route: 'user-requested'
---

# Loss Reasons management + lost-deals review panel on /deals

## Intent

**Problem:** Loss reason management (create/remove) only existed in `SettingsScreen`, deleted in fix-epic 08.
The user asked to bring it back, but on `/deals` instead of a dedicated screen, plus a way to review deals
already marked as lost and revert that status "just in case" — and asked for the Won/Lost transition
buttons (`onMarkWon`/`confirmLoss`) to get the same error-handling treatment `DealDetailScreen` already got in
fix-epic 04. Also asked for the Kanban to use more of the screen's width.

**Approach:** A large, clearly-visible button at the top of `/deals` opens a Sheet with two parts: the
recovered "Razões de Perda" card (same markup as the deleted `SettingsScreen`, reusing `createLossReason`/
`deleteLossReason` — those repo functions were never deleted, only the screen that called them) and a grid
of individual cards — one per lost deal — each with its own "Ganho"/"Reabrir" buttons.

## Suggested Review Order

- [`DealsScreen.tsx`](../../src/screens/DealsScreen.tsx) — `onMarkWon`/`confirmLoss` now wrapped in
  `try/catch` + `toast.error` (previously bare, unlike `DealsScreen`'s own batch actions or
  `DealDetailScreen` after fix-epic 04's Story 4.4).
- Big dashed destructive-toned button right below the header row: "Motivos de Perda · N negócios perdidos"
  (count only shown when > 0) — opens `lossReasonsSheetOpen`.
- The Sheet:
  - "Razões de Perda" card — recovered verbatim from `SettingsScreen.tsx` (git history, commit before
    `5810435`): input + create button (admin/manager only via `canManage`), badges with a remove `X` per
    reason.
  - "Negócios Perdidos" grid — **one `<Card>` per deal** (not rows sharing a div), computed from the full
    `deals` list (`allLostDeals`, independent of the Kanban's active pipeline/filters — this is a review
    panel, not a filtered view). Each card's buttons close over that card's own `deal.id` from the `.map()`
    callback, so hover/click always targets the card actually being interacted with — no shared state between
    cards. "Ganho" reuses the now-hardened `onMarkWon`; "Reabrir" is a new `reopenLostDeal` (sets
    `status: "open"`, mirrors `DealDetailScreen.reopenDeal`).
- [`DealsKanban.tsx`](../../src/components/crm/DealsKanban.tsx) — stage columns changed from a fixed
  `w-[220px] sm:w-[240px] shrink-0` to `flex-1 min-w-[220px] sm:min-w-[240px]` (stretch to fill available
  space instead of a fixed strip), and the board's outer row gets `min-w-[70vw]` so the whole Kanban always
  occupies at least 70% of the viewport width, even with just one or two stages. Still scrolls horizontally
  (`overflow-x-auto`) once columns' combined minimum widths exceed the container.

## Verification

- `npx tsc -b` limpo.
- `npx vitest run` — 61 testes (sem regressão; a lógica nova aqui é composição de UI/estado de tela, sem
  função pura nova que justifique teste isolado — segue o padrão já usado pelas outras ações de status em
  `DealsScreen`/`DealDetailScreen`, nenhuma das quais tem testes unitários hoje).
- `npx vite build` limpo.
