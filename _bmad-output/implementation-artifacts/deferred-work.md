# Deferred Work

## From: Kanban BANT qualification visibility (2026-07-06)

- **Won/Lost kanban cards don't show the qualification bar.** `QualificationBar` was wired into `DealCard` (active-stage columns) only; `CollapsibleStatusColumn` (Won/Lost, `src/components/crm/DealsKanban.tsx`) uses its own compact card markup and wasn't touched. Retrospective BANT score could still be useful there, but the layout is already tight (grid of small cards) and the fix.md ask was specifically about prioritizing *open* deals. Revisit if the user wants it on closed deals too.

- **`QualificationBar`/`LeadScoreBadge`/`getProgressColor`/`getScoreColor` live in `DealQualification.tsx`**, a stateful module (`useState`, `updateDeal`, `toast`, `Card`/`Input`), which `DealsKanban.tsx` now imports just for the one presentational export. Works fine today (no cycle exists), but if `DealQualification.tsx` ever needs anything from `DealsKanban.tsx` this becomes a circular import. Consider extracting the four presentational helpers into their own file (e.g. `src/components/crm/QualificationBar.tsx`) if that ever happens.

- **`qualification_score` of 0 conflates "never assessed" with "confirmed disqualified".** `calcQualScore` (`DealQualification.tsx`) only adds points for criteria answered "Sim" — both an untouched deal (all criteria `null`) and one where every criterion was answered "Não" score 0, so the Kanban bar (and any other score-based UI) can't tell prioritization-relevant "still needs a BANT conversation" apart from "we know this is a bad fit." Would need a schema/calc change (e.g. track criteria answered vs. criteria passed) to fix properly — out of scope for a one-shot UI change.

## From: Deal status editing / reopen (2026-07-06)

- **The pipeline stage `<Select>` in `DealDetailScreen.tsx` isn't gated by deal status**, only the progress-bar clicks are (`deal.status === "open" && changeStage(s.id)`). A user can already change `stage_id` on a won/lost deal via the dropdown with no guard — pre-existing, not introduced by the status-editing change, but worth fixing for consistency now that won/lost is treated as a first-class revisitable state (a whole action row was added for it).

- **`markAsWon`, `confirmLoss`, and `reopenDeal` have no error handling or re-entrancy guard.** All three fire a bare `await updateDeal(...)` with no `try/catch`/`toast.error` on failure (so a failed request silently leaves the UI on stale data) and no button-disabling while the request is in flight (rapid double-clicks can fire duplicate requests). Pre-existing pattern in this file — `DealsScreen.tsx` already does this correctly (try/catch + `toast.error`) for its own mutations, so this file should eventually be brought in line.
