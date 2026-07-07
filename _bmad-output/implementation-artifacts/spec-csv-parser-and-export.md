---
title: 'Reliable CSV Parser and Shared Export Util (Épico 03)'
type: 'feature'
created: '2026-07-06'
status: 'done'
route: 'fix-epics'
---

# Reliable CSV Parser and Shared Export Util (Épico 03)

## Intent

**Problem:** `CSVImportModal` parseava CSV com `text.split("\n")` / `line.split(",")` — quebrava em campos
com vírgula entre aspas, aspas escapadas e CRLF (a causa provável de "import não funciona corretamente").
Além disso, `CompaniesScreen` e `ContactsScreen` duplicavam a mesma lógica de serialização/escape/download
de export.

**Approach:** Parser CSV próprio (`parseCsv`) respeitando aspas RFC4180, e um util de export compartilhado
(`exportToCsv`) usado pelas duas telas.

## Suggested Review Order

**Story 3.1 — Parser**

- [`src/lib/csv.ts`](../../src/lib/csv.ts) — `parseCsv(text): string[][]`. Trata vírgula/quebra de linha
  dentro de aspas, `""` como aspa escapada, normaliza CRLF/CR solto para `\n`, e descarta linhas totalmente
  vazias. Cobertura em [`csv.test.ts`](../../src/lib/csv.test.ts) (7 casos).
- `CSVImportModal.tsx` — troca o parser ingênuo por `parseCsv`; auto-mapeamento de colunas inalterado.

**Story 3.2 — Export compartilhado**

- `exportToCsv<T>(rows, columns, filename)` em `csv.ts` — escapa aspas/vírgulas/quebras de linha
  corretamente e dispara o download.
- `CompaniesScreen.exportCSV` e `ContactsScreen.exportCSV` agora montam apenas `CsvColumn<T>[]`
  (label + accessor) e delegam a `exportToCsv`; sem serialização própria.

**Story 3.3 — Import/export ponta a ponta em Companies**

- Botões "Importar"/"Exportar" de `CompaniesScreen` deixam de ficar `hidden` no mobile — o ícone aparece
  sempre, o rótulo de texto some só abaixo de `sm` (mesmo padrão do seletor de visualização já usado na tela).

## Verification

- `npx tsc -b` limpo.
- `npx vitest run` — 33 testes passando (7 novos de `parseCsv`).
- `npx vite build` limpo.
