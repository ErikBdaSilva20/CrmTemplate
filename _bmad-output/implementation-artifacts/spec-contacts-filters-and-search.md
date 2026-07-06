---
title: 'Contacts Filters Fix and Text Search (Épico 02)'
type: 'feature'
created: '2026-07-06'
status: 'done'
route: 'fix-epics'
---

# Contacts Filters Fix and Text Search (Épico 02)

## Intent

**Problem:** `fix.md` pedia para "garantir todos os filtros" de `/contacts`. Auditoria encontrou dois problemas
reais: (1) o filtro por período (`createdFrom`/`createdTo`) comparava a string ISO completa
(`created_at`, com hora) contra a data pura do `<input type="date">`, o que fazia um contato criado no
próprio dia do "até" ser **excluído incorretamente** (a timestamp completa é lexicograficamente maior que a
data sozinha); (2) **não existia busca textual** — o AC "busca textual (nome/email/telefone) combina com os
filtros ativos" não tinha nenhuma UI correspondente. Remoção de segmentos e correção do parser/export CSV já
foram feitas nos Épicos 07 e 03.

**Approach:** Comparar apenas a parte de data (`YYYY-MM-DD`) de `created_at` nos filtros de período, e
adicionar um campo de busca textual que combina em AND com os demais filtros.

## Suggested Review Order

- [`ContactsScreen.tsx`](../../src/screens/ContactsScreen.tsx) — `filtered` (memo): `createdDate =
  c.created_at.slice(0, 10)` comparado contra `createdFrom`/`createdTo`, corrigindo a borda inclusiva.
- Novo campo de busca (header, ao lado do seletor de visualização) — filtra por
  `first_name`/`last_name`/`email`/`phone` (substring case-insensitive), com botão de limpar (`X`) quando há
  texto.

## Not changed here (já cobertos em outros épicos)

- Remoção dos selects de segmentos — Épico 07 (`5810435`).
- Parser CSV e `exportToCsv` compartilhado — Épico 03 (`a896346`), já usados por esta tela.

## Verification

- `npx tsc -b` limpo.
- `npx vitest run` — 33 testes passando (suíte inalterada; filtro é lógica inline de tela, sem função pura
  extraída, seguindo o padrão já usado em `DealsScreen`/`CompaniesScreen`).
- `npx vite build` limpo.
