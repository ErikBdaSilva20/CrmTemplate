---
epic: 2
title: Contacts — remover segmentos, garantir import/export e filtros
block: 'fix.md §2'
depends_on: [7]
enables: []
---

# Épico 02 — Contacts: limpeza de segmentos + import/export + filtros

## Objetivo

Em `/contacts`: **remover os selects de segmentos**, **garantir o funcionamento correto de importar/exportar
contatos** e **garantir que todos os filtros da tela funcionem**.

## Contexto atual (código)

- `src/screens/ContactsScreen.tsx`
  - `useSegments` + dropdown "Segmentos" (`applySegment`/`clearSegment`/`activeSegmentId`) — linhas ~78, ~123,
    ~263–271, ~331–366. **A remover.**
  - `exportCSV` (linha ~233) e `CSVImportModal` (import na linha 52, `entityType="contacts"`).
  - Filtros em `ContactFilters` (linha ~67): `status`, `companyId`, `createdFrom`, `createdTo` — aplicados no
    `filtered` (linha ~160) e no painel `showFilters` (linha ~399).
- `src/components/crm/CSVImportModal.tsx` — parser de CSV **ingênuo**: `text.split("\n")` e `line.split(",")`.

## Riscos / bugs conhecidos

- **Parser CSV quebra** com vírgulas dentro de aspas, `\r\n` (CRLF) e quebras de linha dentro de campo. É a
  causa provável de "import não funciona corretamente". Corrigido no Épico 03 (componente compartilhado);
  aqui garantimos o resultado em contatos.
- Remover segmentos aqui depende do Épico 07 (remoção global de `useSegments`/repo). Ordem: 07 → 02.

---

### Story 2.1: Remover os selects de segmentos de Contacts

Como **vendedor**,
quero **a tela de contatos sem o seletor de segmentos/filtros salvos**,
para que **a interface fique enxuta** (a feature de segmentos está sendo removida do produto — Épico 07).

**Acceptance Criteria:**

**Given** a `ContactsScreen`
**When** ela é renderizada
**Then** não há dropdown "Segmentos", nem `activeSegmentId`, `applySegment`, `clearSegment`, nem `useSegments`
**And** o import `useSegments` e o tipo `Segment` são removidos
**And** os demais filtros e ações continuam funcionando
**And** `tsc && vite build` passa sem imports/variáveis órfãos.

### Story 2.2: Garantir todos os filtros de Contacts

Como **vendedor**,
quero **filtrar contatos por status, empresa e período de criação de forma confiável**,
para que **eu encontre rapidamente os contatos certos**.

**Acceptance Criteria:**

**Given** uma lista de contatos
**When** aplico filtro por **status** (`lead/prospect/customer/churned`)
**Then** só aparecem contatos daquele status; "Todos" limpa o filtro
**And** o filtro por **empresa** (`companyId`) restringe corretamente por `contact.company_id`
**And** o filtro por **período** (`createdFrom`/`createdTo`) compara datas corretamente (inclusivo nas bordas)
**And** a **busca textual** (nome/email/telefone) combina com os filtros ativos (AND)
**And** um botão "Limpar filtros" zera todos os filtros
**And** o contador "N contatos" reflete o resultado filtrado.

> Verificação: exercitar cada filtro isolado e combinado (ver skill `verify`). Corrigir qualquer filtro que
> hoje não estreite o resultado (ex.: comparação de datas por string ISO precisa de bordas `>=`/`<=`).

### Story 2.3: Garantir importar contatos

Como **vendedor**,
quero **importar contatos de um CSV sem perder/coromper dados**,
para que **eu carregue minha base de uma vez**.

**Acceptance Criteria:**

**Given** um CSV com cabeçalho e linhas (incluindo campos com vírgula entre aspas e final de linha CRLF)
**When** importo por `/contacts` → "Importar"
**Then** as colunas são auto-mapeadas e mapeáveis manualmente para os campos de contato
**And** cada linha vira um contato via `createContact` (sem enviar `owner_id`)
**And** registros sem `first_name` são ignorados e o total importado é reportado por toast
**And** campos com vírgula entre aspas **não** são quebrados em colunas erradas (depende da correção do parser
no Épico 03 — Story 3.1)
**And** a lista de contatos é recarregada após a importação (`onImported`).

### Story 2.4: Garantir exportar contatos

Como **vendedor**,
quero **exportar a lista (já filtrada) de contatos para CSV**,
para que **eu leve os dados para fora**.

**Acceptance Criteria:**

**Given** a lista filtrada atual
**When** clico em "Exportar"
**Then** um `.csv` é baixado com os contatos visíveis, com campos devidamente escapados (aspas/vírgulas)
**And** o cabeçalho corresponde aos campos exportados
**And** o toast "CSV exportado" confirma a ação
**And** o `exportCSV` usa o util compartilhado criado no Épico 03 (Story 3.2), sem lógica duplicada.

## Notas técnicas

- Sem schema novo aqui (Contacts não muda tabela). Import/export permanecem *front-only*.
- Manter escopo por `owner_id` implícito (o gateway filtra); nunca enviar `owner_id`.
