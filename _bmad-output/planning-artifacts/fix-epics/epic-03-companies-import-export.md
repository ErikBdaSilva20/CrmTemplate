---
epic: 3
title: Companies — import/export confiável + componentização reutilizável
block: 'fix.md §3'
depends_on: []
enables: [2]
---

# Épico 03 — Companies: importar/exportar + componente reutilizável de CSV

## Objetivo

Em `/companies`, **garantir importar/exportar** e, como o `fix.md` sugere, **extrair um componente/util
reutilizável** de CSV que sirva tanto para empresas quanto para contatos, mudando apenas os dados de cada tela
para aproveitar código.

## Contexto atual (código)

- `src/components/crm/CSVImportModal.tsx` — **já é reutilizável** via prop `entityType: "contacts" | "companies"`
  (campos `contactFields`/`companyFields`, `createContact`/`createCompany`). O gargalo é o **parser**.
- `src/screens/CompaniesScreen.tsx` — usa `CSVImportModal` (`entityType="companies"`, linha ~295) e tem seu
  próprio `exportCSV` (linha ~127) — **duplicado** com o de `ContactsScreen`.

## Estratégia de reuso

- **Import:** manter o `CSVImportModal` único (já parametrizado por `entityType`); apenas consertar o parser
  (Story 3.1). É o "componente reutilizável mudando só os dados" que o `fix.md` pede.
- **Export:** extrair a lógica duplicada de `exportCSV` para um util/hook compartilhado (Story 3.2).

---

### Story 3.1: Corrigir o parser de CSV do `CSVImportModal`

Como **usuário que importa dados**,
quero **um parser de CSV correto**,
para que **arquivos reais (com vírgulas entre aspas, aspas escapadas e CRLF) sejam importados sem corromper**.

**Acceptance Criteria:**

**Given** um CSV com `"Empresa, LTDA"`, aspas duplas escapadas (`""`) e quebras de linha `\r\n`
**When** o arquivo é carregado no modal (contacts **ou** companies)
**Then** os campos são separados respeitando aspas (vírgula dentro de aspas não quebra coluna)
**And** `\r` residual é removido dos valores
**And** linhas totalmente vazias são ignoradas
**And** o auto-mapeamento por nome de cabeçalho continua funcionando
**And** existe cobertura de teste do parser (ex.: `csv.test.ts`) para os casos acima.

### Story 3.2: Extrair util/hook de exportação CSV compartilhado

Como **desenvolvedor**,
quero **uma única função de exportação CSV**,
para que **Contacts e Companies não dupliquem a serialização/escape/download**.

**Acceptance Criteria:**

**Given** uma lista de registros e uma definição de colunas (label → acessor)
**When** chamo o util compartilhado (ex.: `src/lib/csv.ts` `exportToCsv(rows, columns, filename)`)
**Then** ele gera o CSV com **escape correto** de aspas/vírgulas/quebras de linha e dispara o download
**And** `CompaniesScreen.exportCSV` e `ContactsScreen.exportCSV` passam a usá-lo (sem lógica própria)
**And** o toast "CSV exportado" continua sendo emitido pela tela.

### Story 3.3: Garantir importar/exportar empresas ponta a ponta

Como **vendedor**,
quero **importar e exportar empresas de forma confiável**,
para que **a base de empresas seja gerenciável em massa**.

**Acceptance Criteria:**

**Given** `/companies`
**When** uso "Importar" com um CSV de empresas
**Then** registros com `name` são criados via `createCompany` (sem `owner_id`), inválidos ignorados, total no toast
**And** a lista recarrega (`onImported` → `refreshCompanies`)
**When** uso "Exportar"
**Then** baixa um CSV das empresas visíveis usando o util compartilhado (Story 3.2)
**And** os botões "Importar"/"Exportar" ficam acessíveis também no mobile (hoje `hidden sm:flex` — avaliar
expor no menu mobile).

## Notas técnicas

- Sem schema novo (Companies não muda tabela).
- Após 3.2, remover imports/estados órfãos das duas telas; `tsc && vite build` limpo.
