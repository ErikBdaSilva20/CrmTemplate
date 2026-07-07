# Deferred Work

## From: Kanban BANT qualification visibility (2026-07-06) — resolved in fix-epics 01/04 (2026-07-06)

- ~~Won/Lost kanban cards don't show the qualification bar.~~ **Resolved** — `CollapsibleStatusColumn` now renders `QualificationBar` when `qualification_score > 0` (Épico 04, Story 4.2, commit `ea64f87`).

- ~~`QualificationBar`/`LeadScoreBadge`/`getProgressColor`/`getScoreColor` live in `DealQualification.tsx`~~ **Resolved** — extracted to `src/components/crm/QualificationBar.tsx` (Épico 01, Story 1.1, commit `c4662c4`); `DealQualification.tsx` and `DealsKanban.tsx` both import from there now.

- **`qualification_score` of 0 conflates "never assessed" with "confirmed disqualified".** Still true at the `calcQualScore` level (would need a schema/calc change to fix properly — e.g. track criteria answered vs. criteria passed). Worked around, not fixed: `dealPriority` (`src/lib/analytics.ts`, Épico 04 Story 4.3) explicitly treats `qualification_score === 0` as "never assessed" and excludes it from the "risk" priority signal, per the epic's documented limitation clause.

## From: Deal status editing / reopen (2026-07-06) — resolved in fix-epic 04 (2026-07-06)

- ~~The pipeline stage `<Select>` in `DealDetailScreen.tsx` isn't gated by deal status~~ **Resolved** — `disabled={deal.status !== "open"}` added, matching the progress-bar click gate (Épico 04, Story 4.4, commit `ea64f87`).

- ~~`markAsWon`, `confirmLoss`, and `reopenDeal` have no error handling or re-entrancy guard.~~ **Resolved** — all three now have `try/catch` + `toast.error`, and a `statusActionPending` guard disables the action buttons while a request is in flight (Épico 04, Story 4.4, commit `ea64f87`).
