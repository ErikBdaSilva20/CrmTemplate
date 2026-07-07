---
title: 'Show BANT Qualification on Kanban Cards'
type: 'feature'
created: '2026-07-06'
status: 'done'
route: 'one-shot'
---

# Show BANT Qualification on Kanban Cards

## Intent

**Problem:** The admin couldn't tell which open deals were well-qualified without opening each one, and didn't understand what the BANT score percentage actually meant once they did open a deal.

**Approach:** Surface each deal's existing `qualification_score` as a small progress bar directly on its Kanban card (reusing the already-exported `QualificationBar` component), and add a short caption to the BANT card explaining that each of the 4 criteria answered "Sim" is worth an equal share of 100%, while "Não"/"N/A" contribute nothing.

## Suggested Review Order

**Kanban card qualification indicator**

- Entry point — renders `QualificationBar` on the card, only when a deal has been assessed.
  [`DealsKanban.tsx:110`](../../src/components/crm/DealsKanban.tsx#L110)

- Import wiring the shared bar component into the Kanban module.
  [`DealsKanban.tsx:3`](../../src/components/crm/DealsKanban.tsx#L3)

**BANT score explanation**

- New caption derived from `bantCriteria` (not hardcoded) so it can't drift from the real scoring logic.
  [`DealQualification.tsx:92`](../../src/components/crm/DealQualification.tsx#L92)

**Accessibility follow-up on the now-visible bar**

- `QualificationBar` was previously unused (dead code); making it visible here is what surfaced the missing ARIA semantics, now added.
  [`DealQualification.tsx:167`](../../src/components/crm/DealQualification.tsx#L167)
